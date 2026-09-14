import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE = '/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para injetar o tenant atual em todas as requisições
api.interceptors.request.use((config) => {
  const currentTenant = localStorage.getItem('active_tenant_id') || 'shopee';
  const authToken = localStorage.getItem('auth_token');
  config.headers['x-tenant-id'] = currentTenant;
  if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(error);
  }
);

// Socket.io instance
export const socket = io({
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000
});

export const connectSocket = (token) => {
  socket.auth = { token };
  if (socket.connected) socket.disconnect();
  socket.connect();
};

export const disconnectSocket = () => socket.disconnect();

// Autenticação e usuários
export const login = (data) => api.post('/auth/login', data);
export const getCurrentUser = () => api.get('/auth/me');
export const changePassword = (data) => api.post('/auth/change-password', data);
export const getUsers = () => api.get('/users');
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.patch(`/users/${id}`, data);

// Tenants (Multi-empresa)
export const getTenants = () => api.get('/tenants');
export const createTenant = (data) => api.post('/tenants', data);

// Chamados & Kanban
export const getTickets = (params) => api.get('/tickets', { params });
export const getTicketById = (id) => api.get(`/tickets/${id}`);
export const createTicket = (data) => api.post('/tickets', data);
export const updateTicketStatus = (id, data) => api.patch(`/tickets/${id}/status`, data);
export const addTreatment = (id, data) => api.post(`/tickets/${id}/treatments`, data);
export const deleteTicket = (id) => api.delete(`/tickets/${id}`);

// Hubs Shopee SP
export const getHubs = (search) => api.get('/hubs', { params: { search } });
export const getRegions = () => api.get('/hubs/regions');

// Dashboard & SLAs
export const getDashboardMetrics = () => api.get('/dashboard/metrics');

// Settings & IA / Telegram
export const getSettingsStatus = () => api.get('/settings/status');
export const startTelegram = (token) => api.post('/settings/telegram/start', { token });
export const stopTelegram = () => api.post('/settings/telegram/stop');
export const saveOpenRouter = (data) => api.post('/settings/openrouter', data);
export const testAiParse = (data) => api.post('/ai/test-parse', data);
