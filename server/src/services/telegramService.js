import axios from 'axios';
import { prisma } from '../prisma.js';
import { parseEmployeeMessageWithAI } from './aiService.js';
import { calculateSlaDueDate, evaluateSlaStatus } from './slaService.js';
import { searchHubs, getAllHubs, getHubByCode, getRegions, getHubsByRegion } from './hubService.js';

let isPolling = false;
let lastUpdateId = 0;
let pollingTimeoutId = null;
let ioInstance = null;

// Sessões em memória por chatId
// Estrutura:
// sessions[chatId] = {
//   step: 'IDLE' | 'AWAITING_NAME' | 'AWAITING_EMPLOYEE_ID' | 'AWAITING_POSTO' | 'AWAITING_CATEGORIES' | 'AWAITING_DESCRIPTION',
//   data: {
//     name: '',
//     employeeId: '',
//     workplace: '',
//     workplaceCode: '',
//     workplaceRegion: '',
//     categories: [] // ['VR', 'VT', 'SAUDE', 'UNIFORME', 'OUTRO']
//   }
// }
const sessions = new Map();

export function setSocketIO(io) {
  ioInstance = io;
}

export async function startTelegramPolling(tokenOverride = null) {
  const token = tokenOverride || process.env.TELEGRAM_BOT_TOKEN;

  if (!token || token.trim() === '') {
    console.log('[Telegram] Nenhum TELEGRAM_BOT_TOKEN configurado.');
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
 * Loop principal de polling (mensagens normais + callback_queries dos botões)
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

        if (update.callback_query) {
          await processCallbackQuery(token, update.callback_query);
        } else if (update.message && update.message.text) {
          await processIncomingMessage(token, update.message);
        }
      }
    }
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 404) {
      console.error('[Telegram Error] Token inválido ou não autorizado.');
      stopTelegramPolling();
      return;
    } else {
      console.error('[Telegram Polling]', error.message);
    }
  }

  if (isPolling) {
    pollingTimeoutId = setTimeout(() => pollUpdates(token), 2000);
  }
}

/**
 * Lista de categorias padrão para o menu
 */
const CATEGORY_DEFINITIONS = [
  { key: 'VR', label: '🍔 VR / VA (Alimentação/Refeição)' },
  { key: 'VT', label: '🚌 VT (Vale Transporte)' },
  { key: 'SAUDE', label: '🏥 Saúde / Convênio / Odonto' },
  { key: 'UNIFORME', label: '👕 Uniforme / EPI' },
  { key: 'OUTRO', label: '📋 Outro Assunto' }
];

/**
 * Processamento de Mensagens de Texto
 */
export async function processIncomingMessage(token, message) {
  const chatId = String(message.chat.id);
  const text = message.text.trim();

  // Comandos de reinício
  if (text === '/start' || text === '/novo' || text === '/ajuda' || text.toLowerCase() === 'menu') {
    sessions.set(chatId, {
      step: 'AWAITING_NAME',
      data: {
        name: '',
        employeeId: '',
        workplace: '',
        workplaceCode: '',
        workplaceRegion: '',
        categories: []
      }
    });

    const welcome = `👋 *Olá! Bem-vindo ao Suporte de Benefícios e DP dos HUBs Shopee.*\n\n` +
      `Estou aqui para ajudar com qualquer problema no seu *VR, VT, Plano de Saúde, Uniforme* ou outros benefícios.\n\n` +
      `Para começar, por favor *digite seu NOME COMPLETO*:`;

    await sendTelegramMessage(token, chatId, welcome);
    return;
  }

  const session = sessions.get(chatId);

  // Se não estiver em sessão guiada, verifica se o usuário enviou uma mensagem livre direta longa
  if (!session || session.step === 'IDLE') {
    // Se for texto corrido com mais de 3 palavras, analisa com IA diretamente
    if (text.split(' ').length >= 4) {
      await handleDirectFreeMessage(token, message);
      return;
    }

    // Caso contrário convida a iniciar o menu
    const promptStart = `👋 Olá! Para registrar sua ocorrência de benefícios, digite */start* para iniciar o passo a passo guiado ou envie sua mensagem detalhada com nome, matrícula e o problema.`;
    await sendTelegramMessage(token, chatId, promptStart);
    return;
  }

  // Máquina de estados do menu guiado
  switch (session.step) {
    case 'AWAITING_NAME': {
      session.data.name = text;
      session.step = 'AWAITING_EMPLOYEE_ID';
      sessions.set(chatId, session);

      const msg = `Prazer, *${text}*! 👍\n\nAgora, por favor, digite o número da sua *MATRÍCULA*:`;
      await sendTelegramMessage(token, chatId, msg);
      break;
    }

    case 'AWAITING_EMPLOYEE_ID': {
      session.data.employeeId = text;
      session.step = 'AWAITING_POSTO';
      sessions.set(chatId, session);

      const msg = `Matrícula *${text}* anotada! 📍\n\nAgora selecione o seu *Posto de Trabalho / HUB Shopee SP*:\n\n` +
        `Você pode escolher uma das regiões abaixo ou simplesmente *digitar o nome da sua cidade/unidade* (ex: _Cajamar_, _Artur Alvim_, _Campinas_):`;

      const regions = getRegions();
      // Cria botões com as regiões
      const keyboard = regions.map(reg => [
        { text: `🏢 ${reg}`, callback_data: `region:${reg}` }
      ]);

      await sendTelegramInlineKeyboard(token, chatId, msg, keyboard);
      break;
    }

    case 'AWAITING_POSTO': {
      // O usuário digitou o nome do posto em vez de clicar na região
      const matches = searchHubs(text);
      if (matches.length === 0) {
        await sendTelegramMessage(token, chatId, `⚠️ Não localizamos nenhum HUB com o termo "*${text}*".\n\nTente digitar novamente a cidade/bairro (ex: _Guarulhos_, _Osasco_) ou clique em uma das regiões acima.`);
        return;
      }

      if (matches.length === 1) {
        const hub = matches[0];
        session.data.workplace = hub.name;
        session.data.workplaceCode = hub.code;
        session.data.workplaceRegion = hub.region;
        session.step = 'AWAITING_CATEGORIES';
        sessions.set(chatId, session);

        await sendCategoryChecklist(token, chatId, session);
      } else {
        // Exibe opções encontradas (até 6)
        const buttons = matches.slice(0, 6).map(h => [
          { text: `📍 ${h.name} (${h.code})`, callback_data: `hub:${h.code}` }
        ]);

        await sendTelegramInlineKeyboard(
          token,
          chatId,
          `Encontramos mais de um HUB para "*${text}*". Clique no seu:`,
          buttons
        );
      }
      break;
    }

    case 'AWAITING_DESCRIPTION': {
      // Etapa final: relato detalhado do colaborador
      const userDesc = text;
      const { name, employeeId, workplace, workplaceCode, workplaceRegion, categories } = session.data;

      // Reseta sessão
      sessions.delete(chatId);

      const loadingMsg = `⏳ *Processando seu chamado...*\nEstamos estruturando suas informações com nossa Inteligência Artificial e abrindo o protocolo no sistema.`;
      await sendTelegramMessage(token, chatId, loadingMsg);

      // Define benefício com base nas categorias marcadas
      let benefitType = 'OUTRO';
      if (categories.length === 1) {
        benefitType = categories[0];
      } else if (categories.length > 1) {
        benefitType = 'MULTIPLOS';
      }

      // Envia para IA analisar resumo e urgência
      const aiPromptText = `Colaborador: ${name} (Matrícula: ${employeeId}) no HUB ${workplace}. Problemas selecionados: ${categories.join(', ')}. Detalhes do colaborador: ${userDesc}`;
      const aiData = await parseEmployeeMessageWithAI(aiPromptText);

      // Prioridade
      const priority = aiData.priority || 'MEDIA';
      const { hours, dueDate } = calculateSlaDueDate(priority);

      // Gera protocolo
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const protocol = `BENEF-${new Date().getFullYear()}-${randomSuffix}`;

      // Salva no banco de dados SQLite
      const newTicket = await prisma.ticket.create({
        data: {
          protocol,
          employeeName: name,
          employeeId: employeeId,
          workplace: workplace,
          workplaceCode: workplaceCode,
          workplaceRegion: workplaceRegion,
          benefitType,
          priority,
          status: 'NOVO',
          description: userDesc,
          summary: `[${categories.join('+')}] ${aiData.summary}`,
          missingInfo: null,
          telegramChatId: chatId,
          telegramMsgId: String(message.message_id),
          slaHours: hours,
          slaDueAt: dueDate,
          slaStatus: 'DENTRO_PRAZO',
          treatments: {
            create: {
              author: 'Sistema (Bot Telegram Interativo)',
              action: 'ABERTURA_CHAMADO',
              notes: `Chamado aberto via autoatendimento interativo. Categorias: ${categories.join(', ')}. HUB: ${workplace} (${workplaceCode || ''})`
            }
          }
        },
        include: {
          treatments: true
        }
      });

      console.log(`[Ticket Criado via Menu] ${protocol} - ${name} (${workplace})`);

      // Notifica o frontend via WebSocket
      if (ioInstance) {
        ioInstance.emit('ticket:created', newTicket);
      }

      // Resposta oficial ao colaborador
      const confirmation = `✅ *Chamado Registrado com Sucesso!*\n\n` +
        `🎫 *Protocolo:* \`${protocol}\`\n` +
        `👤 *Colaborador:* ${name} (Matr. ${employeeId})\n` +
        `🏢 *Posto / HUB:* ${workplace}\n` +
        `📦 *Assuntos:* ${categories.join(', ')}\n` +
        `⏱️ *Previsão de Atendimento (SLA):* ${hours} horas úteis\n\n` +
        `📋 *Resumo:* ${aiData.summary}\n\n` +
        `Sua solicitação já está na fila de atendimento da equipe de Benefícios Shopee. Você receberá atualizações sobre a evolução aqui mesmo no Telegram!`;

      await sendTelegramMessage(token, chatId, confirmation);
      break;
    }

    default:
      break;
  }
}

/**
 * Processamento de cliques em botões (Inline Keyboards)
 */
async function processCallbackQuery(token, callbackQuery) {
  const chatId = String(callbackQuery.message.chat.id);
  const data = callbackQuery.data;

  // Confirma o callback para remover o reloginho no Telegram
  try {
    await axios.post(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      callback_query_id: callbackQuery.id
    });
  } catch (e) {}

  let session = sessions.get(chatId);
  if (!session) {
    session = {
      step: 'AWAITING_POSTO',
      data: { name: 'Colaborador', employeeId: 'Não informada', workplace: '', workplaceCode: '', workplaceRegion: '', categories: [] }
    };
    sessions.set(chatId, session);
  }

  // 1. Clique em uma Região -> mostra os HUBs daquela região
  if (data.startsWith('region:')) {
    const region = data.replace('region:', '');
    const hubs = getHubsByRegion(region);

    const buttons = hubs.map(h => [
      { text: `📍 ${h.name}`, callback_data: `hub:${h.code}` }
    ]);

    buttons.push([{ text: '🔙 Escolher outra Região', callback_data: 'back:regions' }]);

    await editTelegramInlineKeyboard(
      token,
      chatId,
      callbackQuery.message.message_id,
      `Selecione seu HUB na região *${region}*:`,
      buttons
    );
    return;
  }

  // 2. Voltar para a lista de Regiões
  if (data === 'back:regions') {
    const regions = getRegions();
    const keyboard = regions.map(reg => [
      { text: `🏢 ${reg}`, callback_data: `region:${reg}` }
    ]);

    await editTelegramInlineKeyboard(
      token,
      chatId,
      callbackQuery.message.message_id,
      `Selecione a Região do seu HUB Shopee:`,
      keyboard
    );
    return;
  }

  // 3. Clique em um HUB específico
  if (data.startsWith('hub:')) {
    const hubCode = data.replace('hub:', '');
    const hub = getHubByCode(hubCode);

    if (hub) {
      session.data.workplace = hub.name;
      session.data.workplaceCode = hub.code;
      session.data.workplaceRegion = hub.region;
    } else {
      session.data.workplace = hubCode;
    }

    session.step = 'AWAITING_CATEGORIES';
    sessions.set(chatId, session);

    await sendCategoryChecklist(token, chatId, session, callbackQuery.message.message_id);
    return;
  }

  // 4. Alternar Checkbox de Categoria [X] vs [ ]
  if (data.startsWith('toggle:')) {
    const categoryKey = data.replace('toggle:', '');
    let cats = session.data.categories || [];

    if (cats.includes(categoryKey)) {
      cats = cats.filter(c => c !== categoryKey);
    } else {
      cats.push(categoryKey);
    }
    session.data.categories = cats;
    sessions.set(chatId, session);

    // Atualiza o menu com as novas marcações
    await updateCategoryChecklist(token, chatId, callbackQuery.message.message_id, session);
    return;
  }

  // 5. Concluir seleção de categorias e avançar
  if (data === 'done:categories') {
    if (!session.data.categories || session.data.categories.length === 0) {
      await sendTelegramMessage(token, chatId, '⚠️ Por favor, marque pelo menos um item com [X] antes de avançar.');
      return;
    }

    session.step = 'AWAITING_DESCRIPTION';
    sessions.set(chatId, session);

    const promptDesc = `📝 *Itens selecionados:* ${session.data.categories.join(', ')}\n` +
      `🏢 *HUB:* ${session.data.workplace}\n\n` +
      `Por favor, *digite agora uma mensagem descrevendo o que aconteceu*:\n` +
      `_(Ex: "Meu VR da Flash veio sem crédito no dia 01", "Perdi meu cartão de transporte", "Preciso incluir meu filho no plano de saúde", etc.)_`;

    await sendTelegramMessage(token, chatId, promptDesc);
    return;
  }
}

/**
 * Envia ou edita a lista de checkboxes de categorias
 */
async function sendCategoryChecklist(token, chatId, session, editMessageId = null) {
  const selected = session.data.categories || [];
  const buttons = CATEGORY_DEFINITIONS.map(item => {
    const isChecked = selected.includes(item.key);
    return [{
      text: `${isChecked ? '✅ [X]' : '⬜ [  ]'} ${item.label}`,
      callback_data: `toggle:${item.key}`
    }];
  });

  buttons.push([{
    text: '➡️ CONCLUIR E RELATAR PROBLEMA ➡️',
    callback_data: 'done:categories'
  }]);

  const text = `🏢 *HUB Confirmado:* ${session.data.workplace}\n\n` +
    `👇 *Selecione abaixo quais itens estão com problema (você pode marcar mais de um com [X]):*`;

  if (editMessageId) {
    await editTelegramInlineKeyboard(token, chatId, editMessageId, text, buttons);
  } else {
    await sendTelegramInlineKeyboard(token, chatId, text, buttons);
  }
}

async function updateCategoryChecklist(token, chatId, messageId, session) {
  const selected = session.data.categories || [];
  const buttons = CATEGORY_DEFINITIONS.map(item => {
    const isChecked = selected.includes(item.key);
    return [{
      text: `${isChecked ? '✅ [X]' : '⬜ [  ]'} ${item.label}`,
      callback_data: `toggle:${item.key}`
    }];
  });

  buttons.push([{
    text: '➡️ CONCLUIR E RELATAR PROBLEMA ➡️',
    callback_data: 'done:categories'
  }]);

  const text = `🏢 *HUB Confirmado:* ${session.data.workplace}\n\n` +
    `👇 *Selecione abaixo quais itens estão com problema (marque com [X]):*\n` +
    (selected.length > 0 ? `\n*Marcados atualmente:* ${selected.join(', ')}` : '');

  await editTelegramInlineKeyboard(token, chatId, messageId, text, buttons);
}

/**
 * Tratamento de mensagem direta livre com IA (quando o usuário não usa o menu)
 */
async function handleDirectFreeMessage(token, message) {
  const chatId = String(message.chat.id);
  const text = message.text;

  const aiData = await parseEmployeeMessageWithAI(text);
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const protocol = `BENEF-${new Date().getFullYear()}-${randomSuffix}`;
  const { hours, dueDate } = calculateSlaDueDate(aiData.priority);

  const newTicket = await prisma.ticket.create({
    data: {
      protocol,
      employeeName: aiData.employeeName,
      employeeId: aiData.employeeId,
      workplace: aiData.workplace,
      workplaceCode: aiData.workplaceCode,
      workplaceRegion: aiData.workplaceRegion,
      benefitType: aiData.benefitType,
      priority: aiData.priority,
      status: 'NOVO',
      description: text,
      summary: aiData.summary,
      missingInfo: aiData.missingInfo,
      telegramChatId: chatId,
      telegramMsgId: String(message.message_id),
      slaHours: hours,
      slaDueAt: dueDate,
      slaStatus: 'DENTRO_PRAZO',
      treatments: {
        create: {
          author: 'Sistema (IA Mensagem Livre)',
          action: 'ABERTURA_CHAMADO',
          notes: `Chamado aberto via mensagem direta no Telegram. Triagem automática: ${aiData.summary}`
        }
      }
    },
    include: {
      treatments: true
    }
  });

  if (ioInstance) {
    ioInstance.emit('ticket:created', newTicket);
  }

  const botReply = `🎫 *Protocolo Gerado:* \`${protocol}\`\n\n` +
    `Olá, *${aiData.employeeName}*!\n` +
    `Registramos seu chamado referente a *${aiData.benefitType}* no posto *${aiData.workplace}*.\n\n` +
    `📋 *Resumo:* ${aiData.summary}\n` +
    `⏱️ *Previsão de SLA:* ${hours} horas úteis\n\n` +
    (aiData.missingInfo ? `⚠️ *Atenção:* ${aiData.missingInfo}.\n\n` : '') +
    `Dica: Para abrir chamados futuros com menu passo a passo e lista de postos, digite */start* a qualquer momento.`;

  await sendTelegramMessage(token, chatId, botReply);
}

/**
 * Utilitários de envio da API Telegram
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
    console.error(`[Telegram Send Error]:`, error?.response?.data || error.message);
    return false;
  }
}

export async function sendTelegramInlineKeyboard(tokenOverride, chatId, text, inlineKeyboard) {
  const token = tokenOverride || process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return false;

  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: inlineKeyboard
      }
    });
    return true;
  } catch (error) {
    console.error(`[Telegram InlineKeyboard Error]:`, error?.response?.data || error.message);
    return false;
  }
}

export async function editTelegramInlineKeyboard(tokenOverride, chatId, messageId, text, inlineKeyboard) {
  const token = tokenOverride || process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId || !messageId) return false;

  try {
    await axios.post(`https://api.telegram.org/bot${token}/editMessageText`, {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: inlineKeyboard
      }
    });
    return true;
  } catch (error) {
    console.error(`[Telegram EditKeyboard Error]:`, error?.response?.data || error.message);
    return false;
  }
}
