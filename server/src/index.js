import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';
import { startTelegramPolling, setSocketIO } from './services/telegramService.js';
import { ensureDefaultUsers, getUserFromToken } from './services/authService.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

setSocketIO(io);
app.set('io', io);

app.use(cors());
app.use(express.json());

// Rotas da API
app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    const user = await getUserFromToken(token);
    if (!user || user.mustChangePassword) return next(new Error('Não autorizado'));
    socket.user = user;
    next();
  } catch {
    next(new Error('Não autorizado'));
  }
});

io.on('connection', (socket) => {
  socket.join(`tenant:${socket.user.tenantId}`);
  if (socket.user.role === 'ADMIN') socket.join('role:admin');
  console.log(`[Socket.io] ${socket.user.username} conectado: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket.io] Cliente desconectado: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
await ensureDefaultUsers();
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 WebSocket pronto para conexões em tempo real`);

  // Se já tiver token no .env, inicia o polling
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN.trim() !== '') {
    startTelegramPolling();
  } else {
    console.log(`⚠️ TELEGRAM_BOT_TOKEN vazio no .env. Configure no arquivo server/.env ou pela aba Configurações no painel.`);
  }
});
