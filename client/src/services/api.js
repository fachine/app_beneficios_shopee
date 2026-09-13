import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE = '/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Socket.io instance
export const socket = io({
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000
});

// Chamados & Kanban
export const getTickets = (params) => api.get('/tickets', { params });
export const getTicketById = (id) => api.get(`/tickets/${id}`);
export const createTicket = (data) => api.post('/tickets', data);
export const updateTicketStatus = (id, data) => api.patch(`/tickets/${id}/status`, data);
export const addTreatment = (id, data) => api.post(`/tickets/${id}/treatments`, data);

// Dashboard & SLAs
export const getDashboardMetrics = () => api.get('/dashboard/metrics');

// Settings & IA / Telegram
export const getSettingsStatus = () => api.get('/settings/status');
export const startTelegram = (token) => api.post('/settings/telegram/start', { token });
export const stopTelegram = () => api.post('/settings/telegram/stop');
export const saveOpenRouter = (data) => api.post('/settings/openrouter', data);
export const testAiParse = (data) => api.post('/ai/test-parse', data);
