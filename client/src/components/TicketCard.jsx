import React from 'react';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  MapPin, 
  User, 
  BadgeAlert,
  Calendar,
  MessageSquare,
  Building2
} from 'lucide-react';

export default function TicketCard({ ticket, onClick, onDragStart, canDrag = false }) {
  const isResolved = ticket.status === 'RESOLVIDO';

  // Configuração visual de SLA
  let slaBadge = {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
    label: 'No Prazo'
  };

  if (ticket.slaStatus === 'ESTOURADO') {
    slaBadge = {
      bg: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />,
      label: 'SLA Estourado'
    };
  } else if (ticket.slaStatus === 'ALERTA') {
    slaBadge = {
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
      label: 'SLA em Alerta'
    };
  } else if (ticket.slaStatus === 'CUMPRIDO') {
    slaBadge = {
      bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />,
      label: 'SLA Cumprido'
    };
  } else if (ticket.slaStatus === 'DESCUMPRIDO') {
    slaBadge = {
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />,
      label: 'SLA Violado'
    };
  }

  // Cores por tipo de benefício
  const benefitBadge = {
    VR: 'bg-orange-50 text-orange-700 border-orange-200',
    VT: 'bg-sky-50 text-sky-700 border-sky-200',
    SAUDE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    UNIFORME: 'bg-amber-50 text-amber-700 border-amber-200',
    MULTIPLOS: 'bg-purple-50 text-purple-700 border-purple-200',
    OUTRO: 'bg-slate-100 text-slate-700 border-slate-200'
  }[ticket.benefitType] || 'bg-slate-100 text-slate-700 border-slate-200';

  const benefitLabel = {
    VR: '🍔 VR',
    VT: '🚌 VT',
    SAUDE: '🏥 Saúde',
    UNIFORME: '👕 Uniforme',
    MULTIPLOS: '⚡ Múltiplos',
    OUTRO: '📋 Outro'
  }[ticket.benefitType] || ticket.benefitType;

  // Cores por prioridade
  const priorityBadge = {
    CRITICA: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
    ALTA: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
    MEDIA: 'bg-blue-50 text-blue-700 border-blue-200',
    BAIXA: 'bg-slate-50 text-slate-600 border-slate-200'
  }[ticket.priority] || 'bg-slate-50 text-slate-600 border-slate-200';

  // Formatação de data limite
  const dueDateTime = new Date(ticket.slaDueAt);
  const formattedDue = dueDateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' de ' + dueDateTime.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  return (
    <div
      draggable={canDrag}
      onDragStart={(e) => onDragStart(e, ticket.id)}
      onClick={() => onClick(ticket)}
      className={`bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-md transition-all hover:border-indigo-300 group relative ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
    >
      {/* Topo do card: Protocolo e Tipo de Benefício */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="font-mono text-xs font-semibold text-slate-500 group-hover:text-indigo-600 transition-colors">
          {ticket.protocol}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${benefitBadge}`}>
            {benefitLabel}
          </span>
          <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${priorityBadge}`}>
            {ticket.priority}
          </span>
        </div>
      </div>

      {/* Resumo da IA */}
      <h4 className="text-sm font-medium text-slate-900 line-clamp-2 mb-3 leading-snug">
        {ticket.summary || ticket.description}
      </h4>

      {/* Dados do Colaborador e Posto */}
      <div className="space-y-1.5 text-xs text-slate-600 mb-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
        <div className="flex items-center gap-1.5 truncate">
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-medium text-slate-800 truncate">{ticket.employeeName}</span>
          <span className="text-slate-400 text-[11px]">(Matr. {ticket.employeeId})</span>
        </div>
        <div className="flex items-center gap-1.5 truncate">
          <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="truncate font-medium text-slate-700">{ticket.workplace}</span>
        </div>
        {ticket.workplaceRegion && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pl-5">
            <span>Região: {ticket.workplaceRegion}</span>
          </div>
        )}
      </div>

      {/* Rodapé: SLA e Tratativas */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-medium ${slaBadge.bg}`}>
          {slaBadge.icon}
          <span>{slaBadge.label}</span>
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <span title={`SLA Limite: ${formattedDue}`} className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formattedDue}</span>
          </span>
          {ticket.treatments?.length > 0 && (
            <span title={`${ticket.treatments.length} tratativas registradas`} className="flex items-center gap-0.5 text-indigo-500 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded">
              <MessageSquare className="w-3 h-3" />
              <span>{ticket.treatments.length}</span>
            </span>
          )}
        </div>
      </div>

      {/* Alerta se houver dado pendente detectado pela IA */}
      {ticket.missingInfo && (
        <div className="mt-2 text-[10px] bg-amber-50 text-amber-800 p-1.5 rounded border border-amber-200 flex items-center gap-1">
          <BadgeAlert className="w-3 h-3 text-amber-600 shrink-0" />
          <span className="truncate">{ticket.missingInfo}</span>
        </div>
      )}
    </div>
  );
}
