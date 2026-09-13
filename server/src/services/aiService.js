import axios from 'axios';
import { searchHubs, getAllHubs } from './hubService.js';

/**
 * Analisa a mensagem do funcionário usando OpenRouter
 * e extrai informações estruturadas (nome, matrícula, posto, tipo, relato, etc.)
 */
export async function parseEmployeeMessageWithAI(messageText, apiKeyOverride = null) {
  const apiKey = apiKeyOverride || process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

  if (!apiKey || apiKey.trim() === '') {
    console.warn('[AI] OPENROUTER_API_KEY não configurada. Usando fallback de extração por regras/regex.');
    return fallbackParser(messageText);
  }

  const systemPrompt = `Você é um assistente especialista de RH e Benefícios Corporativos responsável por triar solicitações e problemas de funcionários nos HUBs da Shopee SP.
Tipos de problemas possíveis:
- "VR": Vale Refeição / Alimentação (Flash, Sodexo, Alelo, saldo zerado, etc.)
- "VT": Vale Transporte (Bilhete Único, TOP, recarga, cartão bloqueado, etc.)
- "SAUDE": Plano de Saúde / Odontológico (inclusão de dependente, carteirinha, reembolso, autorização)
- "UNIFORME": Uniformes e EPIs (tamanho errado, desgaste, falta de peça)
- "MULTIPLOS": Caso envolva mais de um dos itens acima (ex: VR e VT juntos)
- "OUTRO": Qualquer outro assunto de DP/Benefícios

Sua tarefa é analisar o relato enviado pelo funcionário e extrair estritamente um JSON no seguinte formato:
{
  "employeeName": "Nome completo do funcionário (se não informado, colocar 'Não informado')",
  "employeeId": "Matrícula do funcionário (se não informada, colocar 'Não informada')",
  "workplace": "Nome do HUB / Posto de trabalho da Shopee mais provável (se não informado, colocar 'Não informado')",
  "workplaceCode": "Código do HUB no formato HUB-LSP-XX ou FMH-SAO-XX se identificado ou null",
  "benefitType": "VR" | "VT" | "SAUDE" | "UNIFORME" | "MULTIPLOS" | "OUTRO",
  "priority": "BAIXA" | "MEDIA" | "ALTA" | "CRITICA",
  "summary": "Um resumo claro, objetivo e profissional de 1 a 2 frases do problema",
  "missingInfo": "Texto curto descrevendo o que faltou informar (ex: 'Matrícula não informada', 'Posto não informado') ou null se estiver completo",
  "friendlyResponse": "Mensagem educada e humanizada para o funcionário confirmando o recebimento dos dados fornecidos e orientando caso tenha faltado algum dado importante."
}

Regras:
1. Responda APENAS o JSON válido sem blocos de markdown em volta.
2. Se o funcionário estiver sem comer ou sem passagem para trabalhar no mesmo dia, prioridade = "CRITICA" ou "ALTA".
3. benefitType deve ser rigorosamente um destes: "VR", "VT", "SAUDE", "UNIFORME", "MULTIPLOS" ou "OUTRO".`;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Mensagem enviada pelo funcionário:\n"${messageText}"` }
        ],
        temperature: 0.1
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5000',
          'X-Title': 'Gestao Beneficios RH Shopee'
        },
        timeout: 25000
      }
    );

    const rawContent = response.data?.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new Error('Resposta vazia da IA OpenRouter');
    }

    const cleaned = rawContent.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(cleaned);

    const validTypes = ['VR', 'VT', 'SAUDE', 'UNIFORME', 'MULTIPLOS', 'OUTRO'];
    const benefitType = validTypes.includes(parsed.benefitType) ? parsed.benefitType : 'OUTRO';

    // Tenta enriquecer com a lista de hubs oficiais
    let workplace = parsed.workplace || 'Não informado';
    let workplaceCode = parsed.workplaceCode || null;
    let workplaceRegion = null;

    if (workplace !== 'Não informado') {
      const match = searchHubs(workplace);
      if (match.length > 0) {
        workplace = match[0].name;
        workplaceCode = match[0].code;
        workplaceRegion = match[0].region;
      }
    }

    return {
      employeeName: parsed.employeeName || 'Não informado',
      employeeId: parsed.employeeId || 'Não informada',
      workplace,
      workplaceCode,
      workplaceRegion,
      benefitType,
      priority: (['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'].includes(parsed.priority)) ? parsed.priority : 'MEDIA',
      summary: parsed.summary || messageText.slice(0, 100),
      missingInfo: parsed.missingInfo || null,
      friendlyResponse: parsed.friendlyResponse || 'Recebemos sua mensagem sobre benefícios e ela já foi encaminhada para a equipe responsável.'
    };
  } catch (error) {
    console.error('[AI Error]', error?.response?.data || error.message);
    return fallbackParser(messageText);
  }
}

/**
 * Fallback heurístico caso a API da IA não esteja configurada ou fora do ar
 */
function fallbackParser(text) {
  const upper = text.toUpperCase();
  const typesDetected = [];

  if (upper.includes('VR') || upper.includes('ALIMENTA') || upper.includes('REFEI') || upper.includes('FLASH') || upper.includes('SODEXO') || upper.includes('ALELO')) {
    typesDetected.push('VR');
  }
  if (upper.includes('VT') || upper.includes('TRANSPORTE') || upper.includes('PASSAGEM') || upper.includes('BILHETE') || upper.includes('TOP')) {
    typesDetected.push('VT');
  }
  if (upper.includes('SAUDE') || upper.includes('SAÚDE') || upper.includes('CONVENIO') || upper.includes('CONVÊNIO') || upper.includes('MEDIC') || upper.includes('DENTAL') || upper.includes('ODONTO')) {
    typesDetected.push('SAUDE');
  }
  if (upper.includes('UNIFORME') || upper.includes('CAMISA') || upper.includes('CALCA') || upper.includes('CALÇA') || upper.includes('BOTA') || upper.includes('EPI')) {
    typesDetected.push('UNIFORME');
  }

  let benefitType = 'OUTRO';
  if (typesDetected.length > 1) {
    benefitType = 'MULTIPLOS';
  } else if (typesDetected.length === 1) {
    benefitType = typesDetected[0];
  }

  const matMatch = text.match(/(?:matr[ií]cula|re|reg)\s*[:#\-]?\s*([0-9]{4,9})/i);
  const employeeId = matMatch ? matMatch[1] : 'Não informada';

  const postoMatch = text.match(/(?:posto|hub|unidade|loja|filial|local)\s*[:#\-]?\s*([^\n,.]+)/i);
  let workplace = postoMatch ? postoMatch[1].trim() : 'Não informado';
  let workplaceCode = null;
  let workplaceRegion = null;

  if (workplace !== 'Não informado') {
    const match = searchHubs(workplace);
    if (match.length > 0) {
      workplace = match[0].name;
      workplaceCode = match[0].code;
      workplaceRegion = match[0].region;
    }
  }

  const nomeMatch = text.match(/(?:sou o|sou a|me chamo|nome[:\-]?)\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]{4,35})/i);
  const employeeName = nomeMatch ? nomeMatch[1].trim() : 'Colaborador';

  let priority = 'MEDIA';
  if (upper.includes('URGENTE') || upper.includes('SEM SALDO') || upper.includes('SEM DINHEIRO') || upper.includes('BLOQUEADO') || upper.includes('ZERADO')) {
    priority = 'ALTA';
  }

  return {
    employeeName,
    employeeId,
    workplace,
    workplaceCode,
    workplaceRegion,
    benefitType,
    priority,
    summary: text.length > 120 ? text.slice(0, 117) + '...' : text,
    missingInfo: employeeId === 'Não informada' || workplace === 'Não informado' ? 'Dados como posto ou matrícula podem ter faltado' : null,
    friendlyResponse: 'Olá! Recebemos sua solicitação. Seu chamado já foi registrado em nossa fila de atendimento.'
  };
}
