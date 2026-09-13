import React, { useState } from 'react';
import { 
  X, 
  Send, 
  User, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  MessageSquare, 
  SendHorizontal,
  FileText,
  BadgeAlert,
  ArrowRight
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'NOVO', label: 'Novo / Triagem IA' },
  { value: 'EM_ANALISE', label: 'Em Análise RH' },
  { value: 'AGUARDANDO_FORNECEDOR', label: 'Aguardando Operadora' },
  { value: 'EM_TRATATIVA', label: 'Em Tratativa' },
  { value: 'RESOLVIDO', label: 'Resolvido' },
  { value: 'CANCELADO', label: 'Cancelado' }
];

export default function TicketModal({ ticket, onClose, onUpdateStatus, onAddTreatment }) {
  const [newStatus, setNewStatus] = useState(ticket.status);
  const [treatmentNote, setTreatmentNote] = useState('');
  const [author, setAuthor] = useState('Operador RH');
  const [notifyTelegram, setNotifyTelegram] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!ticket) return null;

  const handleStatusChange = async () => {
    if (newStatus === ticket.status) return;
    setIsSubmitting(true);
    await onUpdateStatus(ticket.id, newStatus, {
      author,
      notes: `Status alterado de ${ticket.status} para ${newStatus}`,
      notifyTelegram
    });
    setIsSubmitting(false);
  };

  const handleAddTreatmentSubmit = async (e) => {
    e.preventDefault();
    if (!treatmentNote.trim()) return;

    setIsSubmitting(true);
    await onAddTreatment(ticket.id, {
      author,
      notes: treatmentNote,
      notifyTelegram
    });
    setTreatmentNote('');
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header do Modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-200">
              {ticket.protocol}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
              {ticket.benefitType}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
              Prioridade: {ticket.priority}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Informações do Funcionário e Posto */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Colaborador</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <User className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="font-semibold text-sm text-slate-800">{ticket.employeeName}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Matrícula: {ticket.employeeId}</p>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Posto de Trabalho</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="font-semibold text-sm text-slate-800">{ticket.workplace}</span>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">SLA Limite</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="font-semibold text-sm text-slate-800">
                  {new Date(ticket.slaDueAt).toLocaleString('pt-BR')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Prazo acordado: {ticket.slaHours}h</p>
            </div>
          </div>

          {/* Resumo da Triagem por IA */}
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                Triagem Inteligente (OpenRouter)
              </h4>
            </div>
            <p className="text-sm font-medium text-slate-800 leading-relaxed">
              {ticket.summary}
            </p>
            {ticket.missingInfo && (
              <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                <BadgeAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Pendente: {ticket.missingInfo}</span>
              </div>
            )}
          </div>

          {/* Relato Original do Funcionário no Telegram */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Mensagem Original enviada no Telegram
            </h4>
            <div className="bg-slate-100 p-3.5 rounded-xl border border-slate-200 text-sm text-slate-700 italic">
              "{ticket.description}"
            </div>
          </div>

          {/* Ação de Mudança de Status */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Avançar no Kanban
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleStatusChange}
                disabled={newStatus === ticket.status || isSubmitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Salvar Novo Status</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Histórico de Tratativas (Timeline) */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <span>Histórico e Tratativas ({ticket.treatments?.length || 0})</span>
            </h4>

            <div className="space-y-3">
              {ticket.treatments?.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Nenhuma tratativa registrada ainda.</p>
              ) : (
                ticket.treatments?.map(tr => (
                  <div key={tr.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{tr.author}</span>
                      <span className="text-slate-400">
                        {new Date(tr.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{tr.notes}</p>
                    {tr.action === 'RESPOSTA_TELEGRAM' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        <SendHorizontal className="w-3 h-3" /> Enviado ao Telegram do funcionário
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Formulário para Adicionar Nova Tratativa */}
          <form onSubmit={handleAddTreatmentSubmit} className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Registrar Nova Tratativa / Nota Interna
            </h4>
            <textarea
              rows={3}
              placeholder="Ex: Cartão solicitado à operadora, previsão de entrega em 3 dias úteis..."
              value={treatmentNote}
              onChange={(e) => setTreatmentNote(e.target.value)}
              className="w-full p-3 text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyTelegram}
                  onChange={(e) => setNotifyTelegram(e.target.checked)}
                  disabled={!ticket.telegramChatId}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  {ticket.telegramChatId 
                    ? 'Enviar esta atualização também para o Telegram do colaborador'
                    : 'Colaborador sem chat Telegram vinculado'}
                </span>
              </label>

              <button
                type="submit"
                disabled={!treatmentNote.trim() || isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Adicionar Tratativa</span>
              </button>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
}
