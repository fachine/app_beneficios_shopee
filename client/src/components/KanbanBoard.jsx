import React, { useState } from 'react';
import TicketCard from './TicketCard';
import { 
  Plus, 
  Search, 
  Filter, 
  Sparkles, 
  Layers,
  Inbox,
  Clock,
  CheckCircle,
  Truck,
  FileSearch
} from 'lucide-react';

const COLUMNS = [
  { id: 'NOVO', title: 'Novo / Triagem IA', icon: Inbox, color: 'border-t-blue-500', headerBg: 'bg-blue-50/60' },
  { id: 'EM_ANALISE', title: 'Em Análise RH', icon: FileSearch, color: 'border-t-amber-500', headerBg: 'bg-amber-50/60' },
  { id: 'AGUARDANDO_FORNECEDOR', title: 'Aguardando Operadora', icon: Truck, color: 'border-t-purple-500', headerBg: 'bg-purple-50/60' },
  { id: 'EM_TRATATIVA', title: 'Em Tratativa', icon: Clock, color: 'border-t-indigo-500', headerBg: 'bg-indigo-50/60' },
  { id: 'RESOLVIDO', title: 'Resolvido', icon: CheckCircle, color: 'border-t-emerald-500', headerBg: 'bg-emerald-50/60' }
];

export default function KanbanBoard({ tickets, onUpdateTicketStatus, onSelectTicket, canManage = false }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBenefit, setFilterBenefit] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterSla, setFilterSla] = useState('ALL');
  const [dragOverCol, setDragOverCol] = useState(null);

  // Filtragem dos cards
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.protocol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.workplace.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.workplaceRegion && ticket.workplaceRegion.toLowerCase().includes(searchTerm.toLowerCase())) ||
      ticket.summary?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBenefit = filterBenefit === 'ALL' || ticket.benefitType === filterBenefit;
    const matchesPriority = filterPriority === 'ALL' || ticket.priority === filterPriority;
    const matchesSla = filterSla === 'ALL' || ticket.slaStatus === filterSla;

    return matchesSearch && matchesBenefit && matchesPriority && matchesSla;
  });

  // Drag and Drop handlers
  const handleDragStart = (e, ticketId) => {
    if (!canManage) return;
    e.dataTransfer.setData('text/plain', ticketId);
  };

  const handleDragOver = (e, columnId) => {
    if (!canManage) return;
    e.preventDefault();
    setDragOverCol(columnId);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (e, columnId) => {
    if (!canManage) return;
    e.preventDefault();
    setDragOverCol(null);
    const ticketId = e.dataTransfer.getData('text/plain');
    if (!ticketId) return;

    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket && ticket.status !== columnId) {
      await onUpdateTicketStatus(ticketId, columnId);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 sm:p-6 max-w-7xl mx-auto w-full">
      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por colaborador, matrícula, posto, região ou protocolo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Filtro Benefício */}
          <select
            value={filterBenefit}
            onChange={(e) => setFilterBenefit(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Todos os Assuntos</option>
            <option value="VR">🍔 VR / Alimentação</option>
            <option value="VT">🚌 VT (Transporte)</option>
            <option value="SAUDE">🏥 Plano de Saúde</option>
            <option value="UNIFORME">👕 Uniforme / EPI</option>
            <option value="MULTIPLOS">⚡ Múltiplos Itens</option>
            <option value="OUTRO">📋 Outro Assunto</option>
          </select>

          {/* Filtro Prioridade */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Todas Prioridades</option>
            <option value="CRITICA">Crítica</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Média</option>
            <option value="BAIXA">Baixa</option>
          </select>

          {/* Filtro SLA */}
          <select
            value={filterSla}
            onChange={(e) => setFilterSla(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Todos os SLAs</option>
            <option value="ESTOURADO">🔴 Estourados</option>
            <option value="ALERTA">🟡 Em Alerta</option>
            <option value="DENTRO_PRAZO">🟢 Dentro do Prazo</option>
            <option value="CUMPRIDO">✅ Cumpridos</option>
          </select>

          {(searchTerm || filterBenefit !== 'ALL' || filterPriority !== 'ALL' || filterSla !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterBenefit('ALL');
                setFilterPriority('ALL');
                setFilterSla('ALL');
              }}
              className="text-indigo-600 hover:text-indigo-800 font-medium underline px-1 cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Grid de Colunas do Kanban */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const colTickets = filteredTickets.filter(t => t.status === col.id);
          const isOver = dragOverCol === col.id;
          const Icon = col.icon;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex flex-col bg-slate-100/70 rounded-2xl border ${col.color} border-t-4 p-3 transition-all min-w-[280px] max-h-[calc(100vh-12rem)] ${
                isOver ? 'bg-indigo-50/70 ring-2 ring-indigo-400 border-indigo-400' : 'border-slate-200'
              }`}
            >
              {/* Header da Coluna */}
              <div className={`flex items-center justify-between p-2.5 rounded-xl ${col.headerBg} border border-slate-200/60 mb-3`}>
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-slate-700" />
                  <span className="font-bold text-xs text-slate-800 tracking-tight">{col.title}</span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 shadow-2xs">
                  {colTickets.length}
                </span>
              </div>

              {/* Lista de Cards com Scroll */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {colTickets.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl p-4">
                    <p className="text-xs font-medium">Nenhum chamado</p>
                    <p className="text-[11px] text-slate-400">{canManage ? 'Arraste para cá' : 'Sem registros'}</p>
                  </div>
                ) : (
                  colTickets.map(ticket => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      onClick={onSelectTicket}
                      onDragStart={handleDragStart}
                      canDrag={canManage}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
