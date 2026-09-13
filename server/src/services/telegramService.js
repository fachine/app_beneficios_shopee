import axios from 'axios';
import { prisma } from '../prisma.js';
import { parseEmployeeMessageWithAI } from './aiService.js';
import { calculateSlaDueDate, evaluateSlaStatus } from './slaService.js';

let isPolling = false;
let lastUpdateId = 0;
let pollingTimeoutId = null;
let ioInstance = null;

export function setSocketIO(io) {
  ioInstance = io;
}

/**
 * Inicia o ciclo de polling para o Telegram
 */
export async function startTelegramPolling(tokenOverride = null) {
  const token = tokenOverride || process.env.TELEGRAM_BOT_TOKEN;

  if (!token || token.trim() === '') {
    console.log('[Telegram] Nenhum TELEGRAM_BOT_TOKEN configurado. O bot aguarda configuração.');
    return { success: false, message: 'Token não configurado' };
  }

  if (isPolling) {
    stopTelegramPolling();
  }

  isPolling = true;
  console.log('[Telegram] Iniciando polling com o bot...');
  pollUpdates(token);
  return { success: true, message: 'Polling iniciado com sucesso' };
}

export function stopTelegramPolling() {
  isPolling = false;
  if (pollingTimeoutId) {
    clearTimeout(pollingTimeoutId);
    pollingTimeoutId = null;
  }
  console.log('[Telegram] Polling encerrado.');
}

export function getBotStatus() {
  return {
    isPolling,
    hasToken: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN.trim() !== '')
  };
}

/**
 * Loop assíncrono de busca de mensagens do Telegram
 */
async function pollUpdates(token) {
  if (!isPolling) return;

  try {
    const url = `https://api.telegram.org/bot${token}/getUpdates`;
    const response = await axios.get(url, {
      params: {
        offset: lastUpdateId + 1,
        timeout: 10
      },
      timeout: 15000
    });

    if (response.data && response.data.ok) {
      const updates = response.data.result || [];
      for (const update of updates) {
        lastUpdateId = update.update_id;
        if (update.message && update.message.text) {
          await processIncomingMessage(token, update.message);
        }
      }
    }
  } catch (error) {
    // Log curto sem poluir
    if (error.response?.status === 401 || error.response?.status === 404) {
      console.error('[Telegram Error] Token inválido ou não autorizado.');
      stopTelegramPolling();
      return;
    } else {
      console.error('[Telegram Polling]', error.message);
    }
  }

  if (isPolling) {
    pollingTimeoutId = setTimeout(() => pollUpdates(token), 2500);
  }
}

/**
 * Processa a mensagem recebida pelo Telegram
 */
export async function processIncomingMessage(token, message) {
  const chatId = String(message.chat.id);
  const msgId = String(message.message_id);
  const text = message.text;

  // Ignora comando /start simples se não contiver relato
  if (text.trim() === '/start') {
    const welcome = `👋 Olá! Sou o assistente de suporte a benefícios (VR / VT).\n\nPara relatar qualquer problema ou dúvida, por favor envie uma mensagem informando:\n- *Seu Nome Completo*\n- *Sua Matrícula*\n- *Seu Posto de Trabalho / Filial*\n- *O relato do problema (VR, VT ou ambos)*\n\nNossa IA registrará o chamado imediatamente para o RH!`;
    await sendTelegramMessage(token, chatId, welcome);
    return;
  }

  console.log(`[Telegram] Nova mensagem recebida de [${chatId}]: "${text}"`);

  // 1. Executa a IA (OpenRouter) para estruturar a mensagem
  const aiData = await parseEmployeeMessageWithAI(text);

  // 2. Gera um protocolo único sequencial ou amigável
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const protocol = `BENEF-${new Date().getFullYear()}-${randomSuffix}`;

  // 3. Calcula SLA inicial
  const { hours, dueDate } = calculateSlaDueDate(aiData.priority);

  // 4. Salva no banco de dados
  const newTicket = await prisma.ticket.create({
    data: {
      protocol,
      employeeName: aiData.employeeName,
      employeeId: aiData.employeeId,
      workplace: aiData.workplace,
      benefitType: aiData.benefitType,
      priority: aiData.priority,
      status: 'NOVO',
      description: text,
      summary: aiData.summary,
      missingInfo: aiData.missingInfo,
      telegramChatId: chatId,
      telegramMsgId: msgId,
      slaHours: hours,
      slaDueAt: dueDate,
      slaStatus: 'DENTRO_PRAZO',
      treatments: {
        create: {
          author: 'Sistema (IA Telegram)',
          action: 'ABERTURA_CHAMADO',
          notes: `Chamado aberto via Telegram pelo colaborador. Triagem automática: ${aiData.summary}`
        }
      }
    },
    include: {
      treatments: true
    }
  });

  console.log(`[Chamado Criado] ${protocol} - ${aiData.employeeName} (${aiData.benefitType})`);

  // 5. Emite evento WebSocket para atualizar o Kanban na tela
  if (ioInstance) {
    ioInstance.emit('ticket:created', newTicket);
  }

  // 6. Responde ao colaborador no Telegram
  const botReply = `🎫 *Protocolo Gerado:* \`${protocol}\`\n\n` +
    `Olá, *${aiData.employeeName}*!\n` +
    `Registramos seu chamado referente a *${aiData.benefitType}* no posto *${aiData.workplace}*.\n\n` +
    `📋 *Resumo:* ${aiData.summary}\n` +
    `⏱️ *Previsão de SLA:* ${hours} horas úteis\n\n` +
    (aiData.missingInfo ? `⚠️ *Atenção:* ${aiData.missingInfo}. Se quiser complementar, envie aqui.\n\n` : '') +
    `Nossa equipe de RH já recebeu sua solicitação no painel e você receberá atualizações por aqui assim que houver tratativa!`;

  await sendTelegramMessage(token, chatId, botReply);
}

/**
 * Envia mensagem para um chat do Telegram
 */
export async function sendTelegramMessage(tokenOverride, chatId, text) {
  const token = tokenOverride || process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return false;

  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    });
    return true;
  } catch (error) {
    console.error(`[Telegram Send Error to ${chatId}]:`, error?.response?.data || error.message);
    return false;
  }
}
