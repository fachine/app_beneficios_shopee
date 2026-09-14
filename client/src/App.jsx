import React, { useCallback, useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import KanbanBoard from './components/KanbanBoard';
import SlaDashboard from './components/SlaDashboard';
import TicketModal from './components/TicketModal';
import NewTicketModal from './components/NewTicketModal';
import NewTenantModal from './components/NewTenantModal';
import SettingsModal from './components/SettingsModal';
import LoginPage from './components/LoginPage';
import ChangePasswordPage from './components/ChangePasswordPage';
import UserManagementModal from './components/UserManagementModal';
import {
  addTreatment,
  changePassword,
  connectSocket,
  createTenant,
  createTicket,
  createUser,
  deleteTicket,
  disconnectSocket,
  getCurrentUser,
  getDashboardMetrics,
  getSettingsStatus,
  getTenants,
  getTickets,
  getUsers,
  login,
  saveOpenRouter,
  socket,
  startTelegram,
  stopTelegram,
  testAiParse,
  updateTicketStatus,
  updateUser
} from './services/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('kanban');
  const [tenants, setTenants] = useState([]);
  const [activeTenantId, setActiveTenantId] = useState(localStorage.getItem('active_tenant_id') || '');
  const [tickets, setTickets] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [isNewTenantOpen, setIsNewTenantOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUsersOpen, setIsUsersOpen] = useState(false);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const hasPermission = useCallback(
    (permission) => currentUser?.permissions?.includes(permission) || false,
    [currentUser]
  );

  const handleLogout = useCallback(() => {
    disconnectSocket();
    localStorage.removeItem('auth_token');
    localStorage.removeItem('active_tenant_id');
    setCurrentUser(null);
    setTickets([]);
    setMetrics(null);
    setSettings(null);
    setSelectedTicket(null);
    setActiveTab('kanban');
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const response = await getCurrentUser();
        const user = response.data.user;
        setCurrentUser(user);
        if (!localStorage.getItem('active_tenant_id')) {
          localStorage.setItem('active_tenant_id', user.tenantId);
          setActiveTenantId(user.tenantId);
        }
        if (!user.mustChangePassword) connectSocket(token);
      } catch {
        handleLogout();
      } finally {
        setAuthLoading(false);
      }
    };

    const onExpired = () => handleLogout();
    window.addEventListener('auth:expired', onExpired);
    restoreSession();
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [handleLogout]);

  const handleLogin = async (credentials) => {
    const response = await login(credentials);
    const { token, user } = response.data;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('active_tenant_id', user.tenantId);
    setActiveTenantId(user.tenantId);
    setCurrentUser(user);
    if (!user.mustChangePassword) connectSocket(token);
  };

  const handleChangePassword = async (data) => {
    const response = await changePassword(data);
    const user = response.data.user;
    setCurrentUser(user);
    connectSocket(localStorage.getItem('auth_token'));
  };

  const fetchTenants = useCallback(async () => {
    if (!currentUser) return;
    try {
      const response = await getTenants();
      if (Array.isArray(response.data) && response.data.length > 0) {
        setTenants(response.data);
        const saved = localStorage.getItem('active_tenant_id');
        const found = response.data.find((tenant) => tenant.id === saved || tenant.slug === saved);
        const selected = found || response.data[0];
        setActiveTenantId(selected.id);
        localStorage.setItem('active_tenant_id', selected.id);
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  }, [currentUser]);

  const fetchTickets = useCallback(async () => {
    if (!hasPermission('tickets:read')) return;
    try {
      const response = await getTickets();
      setTickets(response.data);
    } catch (error) {
      console.error('Erro ao carregar chamados:', error);
    }
  }, [hasPermission]);

  const fetchMetrics = useCallback(async () => {
    if (!hasPermission('dashboard:read')) {
      setMetrics(null);
      return;
    }
    try {
      const response = await getDashboardMetrics();
      setMetrics(response.data);
    } catch (error) {
      console.error('Erro ao carregar indicadores:', error);
    }
  }, [hasPermission]);

  const fetchSettings = useCallback(async () => {
    if (!hasPermission('settings:manage')) {
      setSettings(null);
      return;
    }
    try {
      const response = await getSettingsStatus();
      setSettings(response.data);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  }, [hasPermission]);

  const refreshAll = useCallback(async () => {
    if (!currentUser || currentUser.mustChangePassword) return;
    setLoading(true);
    await Promise.all([fetchTenants(), fetchTickets(), fetchMetrics(), fetchSettings()]);
    setLoading(false);
  }, [currentUser, fetchMetrics, fetchSettings, fetchTenants, fetchTickets]);

  useEffect(() => {
    if (!currentUser || currentUser.mustChangePassword) return undefined;
    refreshAll();

    const onCreated = (ticket) => {
      if (ticket.tenantId !== localStorage.getItem('active_tenant_id')) return;
      setTickets((previous) => [ticket, ...previous.filter((item) => item.id !== ticket.id)]);
      fetchMetrics();
    };
    const onUpdated = (ticket) => {
      if (ticket.tenantId !== localStorage.getItem('active_tenant_id')) return;
      setTickets((previous) => previous.map((item) => item.id === ticket.id ? ticket : item));
      setSelectedTicket((previous) => previous?.id === ticket.id ? ticket : previous);
      fetchMetrics();
    };
    const onDeleted = ({ id, tenantId }) => {
      if (tenantId !== localStorage.getItem('active_tenant_id')) return;
      setTickets((previous) => previous.filter((item) => item.id !== id));
      setSelectedTicket((previous) => previous?.id === id ? null : previous);
      fetchMetrics();
    };

    socket.on('ticket:created', onCreated);
    socket.on('ticket:updated', onUpdated);
    socket.on('ticket:deleted', onDeleted);
    return () => {
      socket.off('ticket:created', onCreated);
      socket.off('ticket:updated', onUpdated);
      socket.off('ticket:deleted', onDeleted);
    };
  }, [currentUser, fetchMetrics, refreshAll]);

  const handleChangeTenant = async (tenantId) => {
    setActiveTenantId(tenantId);
    localStorage.setItem('active_tenant_id', tenantId);
    setLoading(true);
    setSelectedTicket(null);
    await Promise.all([fetchTickets(), fetchMetrics()]);
    setLoading(false);
  };

  const handleCreateTenant = async (data) => {
    const response = await createTenant(data);
    await fetchTenants();
    await handleChangeTenant(response.data.id);
  };

  const handleUpdateStatus = async (ticketId, status, extraData = {}) => {
    const response = await updateTicketStatus(ticketId, { status, ...extraData });
    setTickets((previous) => previous.map((ticket) => ticket.id === ticketId ? response.data : ticket));
    setSelectedTicket((previous) => previous?.id === ticketId ? response.data : previous);
    fetchMetrics();
  };

  const handleAddTreatment = async (ticketId, data) => {
    const response = await addTreatment(ticketId, data);
    setTickets((previous) => previous.map((ticket) => ticket.id === ticketId ? response.data : ticket));
    setSelectedTicket((previous) => previous?.id === ticketId ? response.data : previous);
  };

  const handleDeleteTicket = async (ticketId) => {
    await deleteTicket(ticketId);
    setTickets((previous) => previous.filter((ticket) => ticket.id !== ticketId));
    setSelectedTicket(null);
    fetchMetrics();
  };

  const handleCreateTicket = async (data) => {
    const response = await createTicket(data);
    setTickets((previous) => [response.data, ...previous.filter((ticket) => ticket.id !== response.data.id)]);
    fetchMetrics();
  };

  if (authLoading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-sm">Carregando acesso seguro...</div>;
  }
  if (!currentUser) return <LoginPage onLogin={handleLogin} />;
  if (currentUser.mustChangePassword) {
    return <ChangePasswordPage user={currentUser} onChangePassword={handleChangePassword} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewTicket={() => setIsNewTicketOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenUsers={() => setIsUsersOpen(true)}
        onLogout={handleLogout}
        isTelegramActive={settings?.telegram?.isPolling}
        onRefresh={refreshAll}
        tenants={tenants}
        activeTenantId={activeTenantId}
        onChangeTenant={handleChangeTenant}
        onOpenNewTenant={() => setIsNewTenantOpen(true)}
        user={currentUser}
        canCreateTicket={hasPermission('tickets:create')}
        canCreateTenant={hasPermission('tenants:create')}
        canManageSettings={hasPermission('settings:manage')}
        canManageUsers={hasPermission('users:manage')}
        canViewDashboard={hasPermission('dashboard:read')}
      />

      <main className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-96 text-slate-400 text-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3" />
            Carregando ambiente...
          </div>
        ) : activeTab === 'dashboard' && hasPermission('dashboard:read') ? (
          <SlaDashboard metrics={metrics} onSelectTicket={(ticket) => { setSelectedTicket(ticket); setActiveTab('kanban'); }} />
        ) : (
          <KanbanBoard
            tickets={tickets}
            onUpdateTicketStatus={handleUpdateStatus}
            onSelectTicket={setSelectedTicket}
            canManage={hasPermission('tickets:update')}
          />
        )}
      </main>

      {selectedTicket && (
        <TicketModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onUpdateStatus={handleUpdateStatus}
          onAddTreatment={handleAddTreatment}
          onDeleteTicket={handleDeleteTicket}
          canManage={hasPermission('tickets:update') && hasPermission('tickets:treat')}
          canDelete={hasPermission('tickets:delete')}
          currentUser={currentUser}
        />
      )}

      {isNewTicketOpen && hasPermission('tickets:create') && (
        <NewTicketModal
          onClose={() => setIsNewTicketOpen(false)}
          onCreateTicket={handleCreateTicket}
          onTestAI={async (text) => (await testAiParse({ text })).data}
        />
      )}

      {isNewTenantOpen && hasPermission('tenants:create') && (
        <NewTenantModal onClose={() => setIsNewTenantOpen(false)} onCreateTenant={handleCreateTenant} />
      )}

      {isUsersOpen && hasPermission('users:manage') && (
        <UserManagementModal
          onClose={() => setIsUsersOpen(false)}
          onGetUsers={getUsers}
          onCreateUser={createUser}
          onUpdateUser={updateUser}
        />
      )}

      {isSettingsOpen && hasPermission('settings:manage') && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onStartTelegram={async (token) => { const response = await startTelegram(token); fetchSettings(); return response; }}
          onStopTelegram={async () => { await stopTelegram(); fetchSettings(); }}
          onSaveOpenRouter={async (data) => { await saveOpenRouter(data); fetchSettings(); }}
        />
      )}
    </div>
  );
}
