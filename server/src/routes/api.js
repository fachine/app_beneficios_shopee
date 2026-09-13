import express from 'express';
import {
  getTickets,
  getTicketById,
  createTicket,
  updateTicketStatus,
  addTreatment
} from '../controllers/ticketController.js';
import { getDashboardMetrics } from '../controllers/dashboardController.js';
import { startTelegramPolling, stopTelegramPolling, getBotStatus } from '../services/telegramService.js';
import { parseEmployeeMessageWithAI } from '../services/aiService.js';
import { getAllHubs, searchHubs, getRegions } from '../services/hubService.js';

const router = express.Router();

// Chamados & Kanban
router.get('/tickets', getTickets);
router.get('/tickets/:id', getTicketById);
router.post('/tickets', createTicket);
router.patch('/tickets/:id/status', updateTicketStatus);
router.post('/tickets/:id/treatments', addTreatment);

// Hubs / Postos de Trabalho Shopee SP
router.get('/hubs', (req, res) => {
  const { search } = req.query;
  if (search) {
    return res.json(searchHubs(search));
  }
  res.json(getAllHubs());
});

router.get('/hubs/regions', (req, res) => {
  res.json(getRegions());
});

// Dashboard & SLAs
router.get('/dashboard/metrics', getDashboardMetrics);

// Teste do Extrator de IA
router.post('/ai/test-parse', async (req, res) => {
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
router.get('/settings/status', (req, res) => {
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

router.post('/settings/telegram/start', async (req, res) => {
  const { token } = req.body;
  if (token) {
    process.env.TELEGRAM_BOT_TOKEN = token;
  }
  const result = await startTelegramPolling(token);
  res.json(result);
});

router.post('/settings/telegram/stop', (req, res) => {
  stopTelegramPolling();
  res.json({ success: true, message: 'Bot parado' });
});

router.post('/settings/openrouter', (req, res) => {
  const { apiKey, model } = req.body;
  if (apiKey) process.env.OPENROUTER_API_KEY = apiKey;
  if (model) process.env.OPENROUTER_MODEL = model;
  res.json({ success: true, message: 'Configurações de IA salvas com sucesso' });
});

export default router;
