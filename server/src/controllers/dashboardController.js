import { prisma } from '../prisma.js';
import { evaluateSlaStatus } from '../services/slaService.js';

export async function getDashboardMetrics(req, res) {
  try {
    const tickets = await prisma.ticket.findMany({
      include: {
        treatments: true
      }
    });

    const total = tickets.length;
    let openCount = 0;
    let resolvedCount = 0;
    let withinSlaCount = 0;
    let breachedSlaCount = 0;
    let alertSlaCount = 0;

    let totalResolutionTimeHours = 0;
    let resolvedWithTimeCount = 0;

    // Métricas por tipo de benefício
    const byBenefit = {
      VR: 0,
      VT: 0,
      SAUDE: 0,
      UNIFORME: 0,
      MULTIPLOS: 0,
      OUTRO: 0
    };

    // Métricas por posto de trabalho
    const byWorkplace = {};
    // Métricas por região operacional Shopee
    const byRegion = {};

    // Métricas por status
    const byStatus = {
      NOVO: 0,
      EM_ANALISE: 0,
      AGUARDANDO_FORNECEDOR: 0,
      EM_TRATATIVA: 0,
      RESOLVIDO: 0,
      CANCELADO: 0
    };

    tickets.forEach(ticket => {
      const slaCurrent = evaluateSlaStatus(ticket);

      // Status do ticket
      if (byStatus[ticket.status] !== undefined) {
        byStatus[ticket.status]++;
      }

      // Tipo de benefício
      if (byBenefit[ticket.benefitType] !== undefined) {
        byBenefit[ticket.benefitType]++;
      } else {
        byBenefit.OUTRO++;
      }

      // Posto de trabalho
      const wp = ticket.workplace || 'Não informado';
      byWorkplace[wp] = (byWorkplace[wp] || 0) + 1;

      // Região Operacional Shopee
      const reg = ticket.workplaceRegion || 'Não informada';
      byRegion[reg] = (byRegion[reg] || 0) + 1;

      // SLA
      if (ticket.status === 'RESOLVIDO') {
        resolvedCount++;
        if (slaCurrent === 'CUMPRIDO') {
          withinSlaCount++;
        } else {
          breachedSlaCount++;
        }

        if (ticket.resolvedAt && ticket.createdAt) {
          const diffHours = (new Date(ticket.resolvedAt) - new Date(ticket.createdAt)) / (1000 * 60 * 60);
          totalResolutionTimeHours += Math.max(0, diffHours);
          resolvedWithTimeCount++;
        }
      } else if (ticket.status !== 'CANCELADO') {
        openCount++;
        if (slaCurrent === 'ESTOURADO') {
          breachedSlaCount++;
        } else if (slaCurrent === 'ALERTA') {
          alertSlaCount++;
          withinSlaCount++;
        } else {
          withinSlaCount++;
        }
      }
    });

    const slaComplianceRate = total > 0
      ? Number(((withinSlaCount / (withinSlaCount + breachedSlaCount || 1)) * 100).toFixed(1))
      : 100;

    const avgResolutionTimeHours = resolvedWithTimeCount > 0
      ? Number((totalResolutionTimeHours / resolvedWithTimeCount).toFixed(1))
      : 0;

    // Transforma byWorkplace em array para gráficos ordenados
    const workplaceChart = Object.keys(byWorkplace)
      .map(name => ({ name, chamados: byWorkplace[name] }))
      .sort((a, b) => b.chamados - a.chamados)
      .slice(0, 8); // Top 8 postos com mais chamados

    const regionChart = Object.keys(byRegion)
      .map(name => ({ name, chamados: byRegion[name] }))
      .sort((a, b) => b.chamados - a.chamados);

    const benefitChart = Object.keys(byBenefit).map(type => ({
      name: type,
      quantidade: byBenefit[type]
    }));

    // Chamados críticos ou em risco
    const criticalTickets = tickets
      .filter(t => t.status !== 'RESOLVIDO' && t.status !== 'CANCELADO')
      .map(t => ({
        ...t,
        slaStatus: evaluateSlaStatus(t)
      }))
      .filter(t => t.slaStatus === 'ESTOURADO' || t.slaStatus === 'ALERTA' || t.priority === 'CRITICA')
      .slice(0, 6);

    res.json({
      total,
      openCount,
      resolvedCount,
      withinSlaCount,
      breachedSlaCount,
      alertSlaCount,
      slaComplianceRate,
      avgResolutionTimeHours,
      byStatus,
      workplaceChart,
      regionChart,
      benefitChart,
      criticalTickets
    });
  } catch (error) {
    console.error('Erro ao gerar métricas do dashboard:', error);
    res.status(500).json({ error: 'Erro ao gerar métricas' });
  }
}
