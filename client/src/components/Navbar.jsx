import React from 'react';
import { 
  LayoutDashboard, 
  Kanban, 
  Bot, 
  Sliders, 
  PlusCircle, 
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenNewTicket, onOpenSettings, isTelegramActive, onRefresh }) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Título */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-800 tracking-tight">BenefíciosOps</span>
                <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200">
                  VR & VT
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Gestão de Ocorrências com Triagem IA & Telegram</p>
            </div>
          </div>

          {/* Abas de Navegação */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('kanban')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'kanban'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-4 h-4" />
              <span>Quadro Kanban</span>
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard & SLAs</span>
            </button>
          </div>

          {/* Ações / Status */}
          <div className="flex items-center gap-2.5">
            {/* Indicador do Telegram Bot */}
            <div className={`hidden md:flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full border ${
              isTelegramActive 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isTelegramActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <Bot className="w-3.5 h-3.5" />
              <span>Telegram: {isTelegramActive ? 'Conectado' : 'Aguardando Token'}</span>
            </div>

            <button
              onClick={onRefresh}
              title="Atualizar dados"
              className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenSettings}
              title="Configurações e Chaves de API"
              className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            >
              <Sliders className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenNewTicket}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-3.5 py-2 rounded-lg shadow-sm hover:shadow transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Chamado</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
