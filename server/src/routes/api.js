import express from 'express';
import {
  getTickets,
  getTicketById,
  createTicket,
  updateTicketStatus,
  addTreatment,
  deleteTicket
} from '../controllers/ticketController.js';
import { getDashboardMetrics } from '../controllers/dashboardController.js';
import { startTelegramPolling, stopTelegramPolling, getBotStatus } from '../services/telegramService.js';
import { parseEmployeeMessageWithAI } from '../services/aiService.js';
import { getAllHubs, searchHubs, getRegions } from '../services/hubService.js';
import { prisma } from '../prisma.js';
import {
  changePassword,
  createUser,
  listUsers,
  login,
  me,
  updateUser
} from '../controllers/authController.js';
import { authenticate, requirePasswordChanged, requirePermission } from '../middleware/auth.js';

const router = express.Router();

// Autenticação
router.post('/auth/login', login);
router.use(authenticate);
router.get('/auth/me', me);
router.post('/auth/change-password', changePassword);
router.use(requirePasswordChanged);

// Tenants (Empresas / Operações)
router.get('/tenants', requirePermission('tenants:read'), async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      where: req.user.role === 'ADMIN'
        ? { active: true }
        : { active: true, id: req.user.tenantId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, createdAt: true }
    });
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar empresas' });
  }
});

router.post('/tenants', requirePermission('tenants:create'), async (req, res) => {
  try {
    const { name, slug, adminPassword } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ error: 'Nome e slug são obrigatórios' });
    }

    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9_-]/g, ''),
        adminPassword: adminPassword || 'admin123'
      }
    });
    res.status(201).json(tenant);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar empresa ou slug já existente' });
  }
});

// Chamados & Kanban
router.get('/tickets', requirePermission('tickets:read'), getTickets);
router.get('/tickets/:id', requirePermission('tickets:read'), getTicketById);
router.post('/tickets', requirePermission('tickets:create'), createTicket);
router.patch('/tickets/:id/status', requirePermission('tickets:update'), updateTicketStatus);
router.post('/tickets/:id/treatments', requirePermission('tickets:treat'), addTreatment);
router.delete('/tickets/:id', requirePermission('tickets:delete'), deleteTicket); // Exclusão com senha de admin

// Hubs / Postos de Trabalho Shopee SP
router.get('/hubs', requirePermission('hubs:read'), (req, res) => {
  const { search } = req.query;
  if (search) {
    return res.json(searchHubs(search));
  }
  res.json(getAllHubs());
});

router.get('/hubs/regions', requirePermission('hubs:read'), (req, res) => {
  res.json(getRegions());
});

// Dashboard & SLAs
router.get('/dashboard/metrics', requirePermission('dashboard:read'), getDashboardMetrics);

// Teste do Extrator de IA
router.post('/ai/test-parse', requirePermission('ai:test'), async (req, res) => {
  try {
    const { text, apiKey } = req.body;
    if (!text) return res.status(400).json({ error: 'Texto obrigatório' });
    const result = await parseEmployeeMessageWithAI(text, apiKey);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Configurações e Status do Telegram / OpenRouter
router.get('/settings/status', requirePermission('settings:manage'), (req, res) => {
  const botStatus = getBotStatus();
  res.json({
    telegram: {
      configured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN.trim() !== ''),
      isPolling: botStatus.isPolling
    },
    openrouter: {
      configured: Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim() !== ''),
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'
    }
  });
});

router.post('/settings/telegram/start', requirePermission('settings:manage'), async (req, res) => {
  const { token } = req.body;
  if (token) {
    process.env.TELEGRAM_BOT_TOKEN = token;
  }
  const result = await startTelegramPolling(token);
  res.json(result);
});

router.post('/settings/telegram/stop', requirePermission('settings:manage'), (req, res) => {
  stopTelegramPolling();
  res.json({ success: true, message: 'Bot parado' });
});

router.post('/settings/openrouter', requirePermission('settings:manage'), (req, res) => {
  const { apiKey, model } = req.body;
  if (apiKey) process.env.OPENROUTER_API_KEY = apiKey;
  if (model) process.env.OPENROUTER_MODEL = model;
  res.json({ success: true, message: 'Configurações de IA salvas com sucesso' });
});

// Administração de usuários e perfis
router.get('/users', requirePermission('users:manage'), listUsers);
router.post('/users', requirePermission('users:manage'), createUser);
router.patch('/users/:id', requirePermission('users:manage'), updateUser);

export default router;
