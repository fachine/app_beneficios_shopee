import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import KanbanBoard from './components/KanbanBoard';
import SlaDashboard from './components/SlaDashboard';
import TicketModal from './components/TicketModal';
import NewTicketModal from './components/NewTicketModal';
import SettingsModal from './components/SettingsModal';
import { 
  getTickets, 
  getDashboardMetrics, 
  updateTicketStatus, 
  addTreatment, 
  createTicket, 
  getSettingsStatus,
  startTelegram,
  stopTelegram,
  saveOpenRouter,
  testAiParse,
  socket 
} from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('kanban'); // 'kanban' ou 'dashboard'
  const [tickets, setTickets] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Carrega lista de chamados
  const fetchTickets = useCallback(async () => {
    try {
      const res = await getTickets();
      setTickets(res.data);
    } catch (err) {
      console.error('Erro ao carregar tickets:', err);
    }
  }, []);

  // Carrega métricas do Dashboard
  const fetchMetrics = useCallback(async () => {
    try {
      const res = await getDashboardMetrics();
      setMetrics(res.data);
    } catch (err) {
      console.error('Erro ao carregar métricas:', err);
    }
  }, []);

  // Carrega status das configurações
  const fetchSettings = useCallback(async () => {
    try {
      const res = await getSettingsStatus();
      setSettings(res.data);
    } catch (err) {
      console.error('Erro ao carregar settings:', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchTickets(), fetchMetrics(), fetchSettings()]);
    setLoading(false);
  }, [fetchTickets, fetchMetrics, fetchSettings]);

  useEffect(() => {
    refreshAll();

    // Eventos de WebSocket em tempo real
    socket.on('ticket:created', (newTicket) => {
      setTickets(prev => [newTicket, ...prev]);
      fetchMetrics();
    });

    socket.on('ticket:updated', (updatedTicket) => {
      setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
      if (selectedTicket && selectedTicket.id === updatedTicket.id) {
        setSelectedTicket(updatedTicket);
      }
      fetchMetrics();
    });

    return () => {
      socket.off('ticket:created');
      socket.off('ticket:updated');
    };
  }, [fetchMetrics, selectedTicket, refreshAll]);

  // Ações de alteração de chamados
  const handleUpdateStatus = async (ticketId, status, extraData = {}) => {
    try {
      const res = await updateTicketStatus(ticketId, { status, ...extraData });
      setTickets(prev => prev.map(t => t.id === ticketId ? res.data : t));
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(res.data);
      }
      fetchMetrics();
    } catch (err) {
      console.error('Erro ao mover ticket:', err);
    }
  };

  const handleAddTreatment = async (ticketId, data) => {
    try {
      const res = await addTreatment(ticketId, data);
      setTickets(prev => prev.map(t => t.id === ticketId ? res.data : t));
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(res.data);
      }
    } catch (err) {
      console.error('Erro ao adicionar tratativa:', err);
    }
  };

  const handleCreateTicket = async (data) => {
    try {
      const res = await createTicket(data);
      setTickets(prev => [res.data, ...prev]);
      fetchMetrics();
    } catch (err) {
      console.error('Erro ao criar ticket:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Barra de Navegação Superior */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewTicket={() => setIsNewTicketOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isTelegramActive={settings?.telegram?.isPolling}
        onRefresh={refreshAll}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-96 text-slate-400 text-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3" />
            Carregando sistema de benefícios...
          </div>
        ) : activeTab === 'kanban' ? (
          <KanbanBoard
            tickets={tickets}
            onUpdateTicketStatus={handleUpdateStatus}
            onSelectTicket={(ticket) => setSelectedTicket(ticket)}
            onOpenNewTicket={() => setIsNewTicketOpen(true)}
          />
        ) : (
          <SlaDashboard
            metrics={metrics}
            onSelectTicket={(ticket) => {
              setSelectedTicket(ticket);
              setActiveTab('kanban');
            }}
          />
        )}
      </main>

      {/* Modais */}
      {selectedTicket && (
        <TicketModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onUpdateStatus={handleUpdateStatus}
          onAddTreatment={handleAddTreatment}
        />
      )}

      {isNewTicketOpen && (
        <NewTicketModal
          onClose={() => setIsNewTicketOpen(false)}
          onCreateTicket={handleCreateTicket}
          onTestAI={async (text) => {
            const res = await testAiParse({ text });
            return res.data;
          }}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onStartTelegram={async (token) => {
            const res = await startTelegram(token);
            fetchSettings();
            return res;
          }}
          onStopTelegram={async () => {
            await stopTelegram();
            fetchSettings();
          }}
          onSaveOpenRouter={async (data) => {
            await saveOpenRouter(data);
            fetchSettings();
          }}
        />
      )}
    </div>
  );
}
