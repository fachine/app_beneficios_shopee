/**
 * Utilitários para regras e cálculos de SLA
 */

export function calculateSlaDueDate(priority = 'MEDIA', customHours = null) {
  let hours = customHours;
  if (!hours) {
    switch (priority) {
      case 'CRITICA':
        hours = 6;
        break;
      case 'ALTA':
        hours = 12;
        break;
      case 'MEDIA':
        hours = 24;
        break;
      case 'BAIXA':
      default:
        hours = 48;
        break;
    }
  }

  const dueDate = new Date();
  dueDate.setHours(dueDate.getHours() + hours);
  return { hours, dueDate };
}

/**
 * Avalia o status atual do SLA com base na data limite e se já foi resolvido
 */
export function evaluateSlaStatus(ticket) {
  const now = new Date();
  const due = new Date(ticket.slaDueAt);

  if (ticket.status === 'RESOLVIDO') {
    const resolved = ticket.resolvedAt ? new Date(ticket.resolvedAt) : now;
    return resolved <= due ? 'CUMPRIDO' : 'DESCUMPRIDO';
  }

  if (now > due) {
    return 'ESTOURADO';
  }

  // Se faltar menos de 25% do tempo total ou menos de 4 horas
  const created = new Date(ticket.createdAt);
  const totalMs = due.getTime() - created.getTime();
  const remainingMs = due.getTime() - now.getTime();

  if (remainingMs <= totalMs * 0.25 || remainingMs <= 4 * 60 * 60 * 1000) {
    return 'ALERTA';
  }

  return 'DENTRO_PRAZO';
}

/**
 * Formata o tempo restante ou excedido de forma amigável
 */
export function formatRemainingTime(slaDueAt, isResolved = false) {
  const now = new Date().getTime();
  const due = new Date(slaDueAt).getTime();
  const diffMs = due - now;

  if (isResolved) return 'Concluído';

  const absDiff = Math.abs(diffMs);
  const hours = Math.floor(absDiff / (1000 * 60 * 60));
  const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));

  if (diffMs < 0) {
    return `Atrasado há ${hours}h ${minutes}m`;
  } else {
    return `${hours}h ${minutes}m restantes`;
  }
}
