import React from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  CartesianGrid 
} from 'recharts';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Activity, 
  Layers, 
  Timer, 
  TrendingUp,
  MapPin,
  Utensils,
  Bus
} from 'lucide-react';

const BENEFIT_COLORS = {
  VR: '#f97316',
  VT: '#0284c7',
  AMBOS: '#8b5cf6',
  OUTRO: '#64748b'
};

export default function SlaDashboard({ metrics, onSelectTicket }) {
  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Carregando indicadores...
      </div>
    );
  }

  const {
    total,
    openCount,
    resolvedCount,
    withinSlaCount,
    breachedSlaCount,
    alertSlaCount,
    slaComplianceRate,
    avgResolutionTimeHours,
    workplaceChart = [],
    benefitChart = [],
    criticalTickets = []
  } = metrics;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Título da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard de Gestão & SLAs</h2>
          <p className="text-xs text-slate-500">Monitoramento em tempo real de conformidade, tempo de resposta e volume de ocorrências.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
          <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span>SLA Alvo da Operação: 95%</span>
        </div>
      </div>

      {/* Cards de Métricas Principais (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Taxa de SLA */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conformidade SLA</span>
            <div className={`p-2 rounded-xl ${slaComplianceRate >= 90 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {slaComplianceRate}%
            </h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span>{withinSlaCount} de {withinSlaCount + breachedSlaCount} no prazo</span>
            </p>
          </div>
        </div>

        {/* Chamados Abertos */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Em Aberto</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {openCount}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {resolvedCount} chamados já finalizados
            </p>
          </div>
        </div>

        {/* SLAs Estourados / Alerta */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">SLA Crítico / Risco</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-extrabold text-rose-600 tracking-tight">
                {breachedSlaCount}
              </h3>
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                +{alertSlaCount} em alerta
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Requerem ação imediata</p>
          </div>
        </div>

        {/* Tempo Médio de Resolução */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">TMA Resolução</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Timer className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {avgResolutionTimeHours}h
            </h3>
            <p className="text-xs text-slate-500 mt-1">Tempo médio de fechamento</p>
          </div>
        </div>

      </div>

      {/* Seção de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico 1: Ocorrências por Posto de Trabalho (Top 8) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Postos de Trabalho com Mais Ocorrências</h3>
              <p className="text-xs text-slate-500">Distribuição dos problemas relatados por filial / posto</p>
            </div>
            <MapPin className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 w-full">
            {workplaceChart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Nenhum dado registrado
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workplaceChart} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px', border: 'none' }}
                  />
                  <Bar dataKey="chamados" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Gráfico 2: Divisão por Benefício (VR vs VT) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Distribuição por Benefício</h3>
            <p className="text-xs text-slate-500">VR vs VT vs Ambos</p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            {benefitChart.every(b => b.quantidade === 0) ? (
              <div className="text-xs text-slate-400">Nenhum dado</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={benefitChart}
                    dataKey="quantidade"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                  >
                    {benefitChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={BENEFIT_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px', border: 'none' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Legenda customizada */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            {benefitChart.map(item => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: BENEFIT_COLORS[item.name] || '#94a3b8' }} />
                <span className="font-semibold text-slate-700">{item.name}:</span>
                <span className="text-slate-500 font-mono">{item.quantidade}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Lista de Chamados com Risco de SLA */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Atenção Prioritária (SLA Crítico ou Próximo do Vencimento)</h3>
            <p className="text-xs text-slate-500">Ocorrências que exigem resposta rápida para não impactar os colaboradores</p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {criticalTickets.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              <span>Excelente! Nenhum chamado está com o SLA estourado ou em alerta no momento.</span>
            </div>
          ) : (
            criticalTickets.map(t => (
              <div 
                key={t.id} 
                onClick={() => onSelectTicket(t)}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-xl cursor-pointer transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700">{t.protocol}</span>
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {t.benefitType}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-600">
                      {t.employeeName} ({t.workplace})
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1">{t.summary || t.description}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                    t.slaStatus === 'ESTOURADO'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {t.slaStatus === 'ESTOURADO' ? '🔴 Estourado' : '🟡 Em Alerta'}
                  </span>
                  <span className="text-xs text-slate-400">
                    Vence às {new Date(t.slaDueAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
