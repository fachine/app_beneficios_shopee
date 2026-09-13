import { prisma } from '../prisma.js';
import { evaluateSlaStatus, calculateSlaDueDate } from '../services/slaService.js';
import { sendTelegramMessage } from '../services/telegramService.js';
import { parseEmployeeMessageWithAI } from '../services/aiService.js';

/**
 * Lista todos os chamados com status de SLA recalculado
 */
export async function getTickets(req, res) {
  try {
    const { status, benefitType, priority, search } = req.query;

    const where = {};
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
        }
      }
    });

    // Atualiza status dinâmico de SLA
    const updatedTickets = tickets.map(ticket => {
      const currentSlaStatus = evaluateSlaStatus(ticket);
      return {
        ...ticket,
        slaStatus: currentSlaStatus
      };
    });

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
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
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
 * Criação manual de chamado (via painel ou webhook externo)
 */
export async function createTicket(req, res) {
  try {
    const { rawText, employeeName, employeeId, workplace, benefitType, priority } = req.body;

    let ticketData = {
      employeeName,
      employeeId,
      workplace,
      benefitType: benefitType || 'VR',
      priority: priority || 'MEDIA',
      description: rawText || 'Abertura manual pelo painel',
      summary: rawText ? rawText.slice(0, 100) : 'Abertura manual',
      missingInfo: null
    };

    // Se forneceu apenas o texto livre, usa a IA para parsear
    if (rawText && (!employeeName || !employeeId || !workplace)) {
      const parsedAI = await parseEmployeeMessageWithAI(rawText);
      ticketData = {
        employeeName: employeeName || parsedAI.employeeName,
        employeeId: employeeId || parsedAI.employeeId,
        workplace: workplace || parsedAI.workplace,
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
        protocol,
        ...ticketData,
        status: 'NOVO',
        slaHours: hours,
        slaDueAt: dueDate,
        slaStatus: 'DENTRO_PRAZO',
        treatments: {
          create: {
            author: req.body.author || 'Operador RH',
            action: 'ABERTURA_CHAMADO',
            notes: 'Chamado registrado manualmente no painel.'
          }
        }
      },
      include: {
        treatments: true
      }
    });

    req.app.get('io')?.emit('ticket:created', ticket);
    res.status(201).json(ticket);
  } catch (error) {
    console.error('Erro ao criar chamado:', error);
    res.status(500).json({ error: 'Erro ao criar chamado' });
  }
}

/**
 * Atualiza status (ex: arrastar card no Kanban)
 */
export async function updateTicketStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, author, notes, notifyTelegram } = req.body;

    const currentTicket = await prisma.ticket.findUnique({ where: { id } });
    if (!currentTicket) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
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
            author: author || 'Operador RH',
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
        }
      }
    });

    const slaStatus = evaluateSlaStatus(updated);
    const finalTicket = { ...updated, slaStatus };

    // Se solicitado e houver telegramChatId, notifica o funcionário
    if (notifyTelegram && currentTicket.telegramChatId) {
      const statusLabels = {
        'NOVO': 'Novo / Na Fila',
        'EM_ANALISE': 'Em Análise pelo RH',
        'AGUARDANDO_FORNECEDOR': 'Aguardando Operadora (VR/VT)',
        'EM_TRATATIVA': 'Em Tratativa de Recarga/Segunda Via',
        'RESOLVIDO': 'Resolvido ✅',
        'CANCELADO': 'Cancelado ❌'
      };

      const msg = `📢 *Atualização de Chamado*\nProtocolo: \`${currentTicket.protocol}\`\nNovo Status: *${statusLabels[status] || status}*\n\n${notes ? `Mensagem: _${notes}_\n\n` : ''}Qualquer dúvida estamos à disposição!`;
      await sendTelegramMessage(null, currentTicket.telegramChatId, msg);
    }

    req.app.get('io')?.emit('ticket:updated', finalTicket);
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
    const { author, notes, notifyTelegram } = req.body;

    if (!notes || notes.trim() === '') {
      return res.status(400).json({ error: 'A nota da tratativa é obrigatória' });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    const treatment = await prisma.treatmentLog.create({
      data: {
        ticketId: id,
        author: author || 'Operador RH',
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
        }
      }
    });

    const finalTicket = { ...fullTicket, slaStatus: evaluateSlaStatus(fullTicket) };
    req.app.get('io')?.emit('ticket:updated', finalTicket);

    res.status(201).json(finalTicket);
  } catch (error) {
    console.error('Erro ao adicionar tratativa:', error);
    res.status(500).json({ error: 'Erro ao adicionar tratativa' });
  }
}
