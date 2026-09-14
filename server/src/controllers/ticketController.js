import { prisma } from '../prisma.js';
import { evaluateSlaStatus, calculateSlaDueDate } from '../services/slaService.js';
import { sendTelegramMessage } from '../services/telegramService.js';
import { parseEmployeeMessageWithAI } from '../services/aiService.js';

/**
 * Obtém ou resolve o tenant padrão caso nenhum seja fornecido
 */
async function resolveTenantId(req) {
  if (req.user?.role !== 'ADMIN') return req.user.tenantId;

  const headerTenant = req.headers['x-tenant-id'] || req.query.tenantId;
  if (headerTenant) {
    // Pode ser o ID ou o SLUG
    const found = await prisma.tenant.findFirst({
      where: { OR: [{ id: headerTenant }, { slug: headerTenant }] }
    });
    if (found) return found.id;
  }
  // Fallback para o tenant Shopee
  const defaultTenant = await prisma.tenant.findFirst({ where: { slug: 'shopee' } });
  return defaultTenant ? defaultTenant.id : 'shopee_default';
}

function canAccessTicket(req, ticket) {
  return req.user?.role === 'ADMIN' || ticket.tenantId === req.user?.tenantId;
}

function emitTicketEvent(req, event, ticket) {
  const io = req.app.get('io');
  if (!io || !ticket?.tenantId) return;
  io.to(`tenant:${ticket.tenantId}`).to('role:admin').emit(event, ticket);
}

/**
 * Lista todos os chamados do Tenant selecionado
 */
export async function getTickets(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    const { status, benefitType, priority, search } = req.query;

    const where = { tenantId };
    if (status) where.status = status;
    if (benefitType) where.benefitType = benefitType;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { protocol: { contains: search } },
        { employeeName: { contains: search } },
        { employeeId: { contains: search } },
        { workplace: { contains: search } },
        { summary: { contains: search } }
      ];
    }

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        treatments: {
          orderBy: { createdAt: 'desc' }
        },
        tenant: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    const updatedTickets = tickets.map(ticket => ({
      ...ticket,
      slaStatus: evaluateSlaStatus(ticket)
    }));

    res.json(updatedTickets);
  } catch (error) {
    console.error('Erro ao listar chamados:', error);
    res.status(500).json({ error: 'Erro ao buscar chamados' });
  }
}

/**
 * Retorna detalhes de um chamado específico
 */
export async function getTicketById(req, res) {
  try {
    const { id } = req.params;
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        treatments: {
          orderBy: { createdAt: 'desc' }
        },
        tenant: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }
    if (!canAccessTicket(req, ticket)) {
      return res.status(403).json({ error: 'Seu perfil não pode acessar este chamado.' });
    }

    res.json({
      ...ticket,
      slaStatus: evaluateSlaStatus(ticket)
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar chamado' });
  }
}

/**
 * Criação de chamado vinculada ao Tenant
 */
export async function createTicket(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    const { rawText, employeeName, employeeId, workplace, workplaceCode, workplaceRegion, benefitType, priority } = req.body;

    let ticketData = {
      employeeName,
      employeeId,
      workplace,
      workplaceCode,
      workplaceRegion,
      benefitType: benefitType || 'VR',
      priority: priority || 'MEDIA',
      description: rawText || 'Abertura manual pelo painel',
      summary: rawText ? rawText.slice(0, 100) : 'Abertura manual',
      missingInfo: null
    };

    if (rawText && (!employeeName || !employeeId || !workplace)) {
      const parsedAI = await parseEmployeeMessageWithAI(rawText);
      ticketData = {
        employeeName: employeeName || parsedAI.employeeName,
        employeeId: employeeId || parsedAI.employeeId,
        workplace: workplace || parsedAI.workplace,
        workplaceCode: workplaceCode || parsedAI.workplaceCode,
        workplaceRegion: workplaceRegion || parsedAI.workplaceRegion,
        benefitType: benefitType || parsedAI.benefitType,
        priority: priority || parsedAI.priority,
        description: rawText,
        summary: parsedAI.summary,
        missingInfo: parsedAI.missingInfo
      };
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const protocol = `BENEF-${new Date().getFullYear()}-${randomSuffix}`;
    const { hours, dueDate } = calculateSlaDueDate(ticketData.priority);

    const ticket = await prisma.ticket.create({
      data: {
        tenantId,
        protocol,
        ...ticketData,
        status: 'NOVO',
        slaHours: hours,
        slaDueAt: dueDate,
        slaStatus: 'DENTRO_PRAZO',
        treatments: {
          create: {
            author: req.user.name,
            action: 'ABERTURA_CHAMADO',
            notes: 'Chamado registrado no painel.'
          }
        }
      },
      include: {
        treatments: true,
        tenant: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    emitTicketEvent(req, 'ticket:created', ticket);
    res.status(201).json(ticket);
  } catch (error) {
    console.error('Erro ao criar chamado:', error);
    res.status(500).json({ error: 'Erro ao criar chamado' });
  }
}

/**
 * Atualiza status (arraste no Kanban)
 */
export async function updateTicketStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, notes, notifyTelegram } = req.body;

    const currentTicket = await prisma.ticket.findUnique({ where: { id } });
    if (!currentTicket) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }
    if (!canAccessTicket(req, currentTicket)) {
      return res.status(403).json({ error: 'Seu perfil não pode alterar este chamado.' });
    }

    const isFirstResponse = !currentTicket.firstResponseAt && currentTicket.status === 'NOVO' && status !== 'NOVO';
    const isResolving = status === 'RESOLVIDO' && currentTicket.status !== 'RESOLVIDO';

    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        status,
        firstResponseAt: isFirstResponse ? new Date() : undefined,
        resolvedAt: isResolving ? new Date() : (status !== 'RESOLVIDO' ? null : undefined),
        treatments: {
          create: {
            author: req.user.name,
            action: 'MUDANCA_STATUS',
            prevStatus: currentTicket.status,
            newStatus: status,
            notes: notes || `Status alterado de ${currentTicket.status} para ${status}`
          }
        }
      },
      include: {
        treatments: {
          orderBy: { createdAt: 'desc' }
        },
        tenant: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    const slaStatus = evaluateSlaStatus(updated);
    const finalTicket = { ...updated, slaStatus };

    if (notifyTelegram && currentTicket.telegramChatId) {
      const statusLabels = {
        'NOVO': 'Novo / Na Fila',
        'EM_ANALISE': 'Em Análise pelo RH',
        'AGUARDANDO_FORNECEDOR': 'Aguardando Operadora',
        'EM_TRATATIVA': 'Em Tratativa de Recarga/Segunda Via',
        'RESOLVIDO': 'Resolvido ✅',
        'CANCELADO': 'Cancelado ❌'
      };

      const msg = `📢 *Atualização de Chamado*\nProtocolo: \`${currentTicket.protocol}\`\nNovo Status: *${statusLabels[status] || status}*\n\n${notes ? `Mensagem: _${notes}_\n\n` : ''}Qualquer dúvida estamos à disposição!`;
      await sendTelegramMessage(null, currentTicket.telegramChatId, msg);
    }

    emitTicketEvent(req, 'ticket:updated', finalTicket);
    res.json(finalTicket);
  } catch (error) {
    console.error('Erro ao atualizar status do chamado:', error);
    res.status(500).json({ error: 'Erro ao atualizar chamado' });
  }
}

/**
 * Adiciona uma nota/tratativa interna ao chamado
 */
export async function addTreatment(req, res) {
  try {
    const { id } = req.params;
    const { notes, notifyTelegram } = req.body;

    if (!notes || notes.trim() === '') {
      return res.status(400).json({ error: 'A nota da tratativa é obrigatória' });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }
    if (!canAccessTicket(req, ticket)) {
      return res.status(403).json({ error: 'Seu perfil não pode alterar este chamado.' });
    }

    await prisma.treatmentLog.create({
      data: {
        ticketId: id,
        author: req.user.name,
        action: notifyTelegram ? 'RESPOSTA_TELEGRAM' : 'NOTA_INTERNA',
        notes
      }
    });

    if (notifyTelegram && ticket.telegramChatId) {
      const msg = `💬 *Nova mensagem sobre seu chamado*\nProtocolo: \`${ticket.protocol}\`\n\n_${notes}_`;
      await sendTelegramMessage(null, ticket.telegramChatId, msg);
    }

    const fullTicket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        treatments: {
          orderBy: { createdAt: 'desc' }
        },
        tenant: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    const finalTicket = { ...fullTicket, slaStatus: evaluateSlaStatus(fullTicket) };
    emitTicketEvent(req, 'ticket:updated', finalTicket);

    res.status(201).json(finalTicket);
  } catch (error) {
    console.error('Erro ao adicionar tratativa:', error);
    res.status(500).json({ error: 'Erro ao adicionar tratativa' });
  }
}

/**
 * 🔒 EXCLUSÃO DE CHAMADO PROTEGIDA POR SENHA DE ADMINISTRADOR
 */
export async function deleteTicket(req, res) {
  try {
    const { id } = req.params;
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { tenant: true }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Chamado não encontrado.' });
    }
    if (!canAccessTicket(req, ticket)) {
      return res.status(403).json({ error: 'Seu perfil não pode excluir este chamado.' });
    }

    // Exclusão definitiva (as tratativas têm onDelete: Cascade no schema)
    await prisma.ticket.delete({
      where: { id }
    });

    console.log(`[Exclusão Admin] Ticket ${ticket.protocol} excluído com sucesso.`);

    // Emite evento WebSocket para remover o card da tela em tempo real
    emitTicketEvent(req, 'ticket:deleted', { id, protocol: ticket.protocol, tenantId: ticket.tenantId });

    res.json({
      success: true,
      message: `Solicitação ${ticket.protocol} excluída com sucesso pelo Administrador.`
    });
  } catch (error) {
    console.error('Erro ao excluir chamado:', error);
    res.status(500).json({ error: 'Erro ao excluir solicitação' });
  }
}
