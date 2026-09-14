import React from 'react';
import { 
  LayoutDashboard, 
  Kanban, 
  Bot, 
  Sliders, 
  PlusCircle, 
  RefreshCw,
  Sparkles,
  Building2,
  Users,
  LogOut,
  Shield
} from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  onOpenNewTicket,
  onOpenSettings,
  isTelegramActive,
  onRefresh,
  tenants = [],
  activeTenantId,
  onChangeTenant,
  onOpenNewTenant,
  onOpenUsers,
  onLogout,
  user,
  canCreateTicket = false,
  canCreateTenant = false,
  canManageSettings = false,
  canManageUsers = false,
  canViewDashboard = false
}) {
  const currentTenant = tenants.find(t => t.id === activeTenantId || t.slug === activeTenantId) || tenants[0];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Seletor de Tenant (Multitenant) */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-100 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-800 tracking-tight">BenefíciosOps</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded border border-slate-200">
                  Multi-Tenant
                </span>
              </div>

              {/* Seletor de Empresa / Operação Ativa */}
              <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-semibold mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                <select
                  value={activeTenantId || ''}
                  onChange={(e) => {
                    if (e.target.value === '__NEW__') {
                      onOpenNewTenant();
                    } else {
                      onChangeTenant(e.target.value);
                    }
                  }}
                  className="bg-transparent font-medium text-slate-800 hover:text-indigo-600 cursor-pointer focus:outline-hidden text-xs py-0.5 pr-2"
                >
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                  {canCreateTenant && <option value="__NEW__">➕ Cadastrar Nova Empresa / Operação...</option>}
                </select>
              </div>
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
            {canViewDashboard && (
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
            )}
          </div>

          {/* Ações / Status */}
          <div className="flex items-center gap-2.5">
            {/* Indicador do Telegram Bot */}
            {canManageSettings && <div className={`hidden xl:flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full border ${
              isTelegramActive 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isTelegramActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <Bot className="w-3.5 h-3.5" />
              <span>Telegram: {isTelegramActive ? 'Conectado' : 'Aguardando Token'}</span>
            </div>}

            <button
              onClick={onRefresh}
              title="Atualizar dados"
              className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {canManageUsers && (
              <button onClick={onOpenUsers} title="Usuários e permissões" className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer">
                <Users className="w-4 h-4" />
              </button>
            )}

            {canManageSettings && (
              <button
                onClick={onOpenSettings}
                title="Configurações e Chaves de API"
                className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer"
              >
                <Sliders className="w-4 h-4" />
              </button>
            )}

            {canCreateTicket && (
              <button
                onClick={onOpenNewTicket}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-3.5 py-2 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Novo Chamado</span>
              </button>
            )}

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="hidden lg:block text-right leading-tight">
                <p className="text-xs font-bold text-slate-800">{user?.name}</p>
                <p className="text-[10px] uppercase tracking-wider text-indigo-600 font-semibold flex items-center justify-end gap-1"><Shield className="w-3 h-3" />{user?.role}</p>
              </div>
              <button onClick={onLogout} title="Sair" className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 cursor-pointer"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
