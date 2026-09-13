import axios from 'axios';

/**
 * Analisa a mensagem do funcionário usando OpenRouter
 * e extrai informações estruturadas (nome, matrícula, posto, tipo, relato, etc.)
 */
export async function parseEmployeeMessageWithAI(messageText, apiKeyOverride = null) {
  const apiKey = apiKeyOverride || process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001';

  if (!apiKey || apiKey.trim() === '') {
    console.warn('[AI] OPENROUTER_API_KEY não configurada. Usando fallback de extração por regras/regex.');
    return fallbackParser(messageText);
  }

  const systemPrompt = `Você é um assistente especialista de RH e Benefícios Corporativos responsável por triar solicitações e problemas de funcionários sobre VR (Vale Refeição / Alimentação) e VT (Vale Transporte).
Sua tarefa é analisar o relato enviado pelo funcionário e extrair estritamente um JSON no seguinte formato:
{
  "employeeName": "Nome completo do funcionário (se não informado ou incerto, colocar 'Não informado')",
  "employeeId": "Matrícula do funcionário (se não informada, colocar 'Não informada')",
  "workplace": "Posto de trabalho / Unidade / Filial onde ele atua (se não informado, colocar 'Não informado')",
  "benefitType": "VR" | "VT" | "AMBOS" | "OUTRO",
  "priority": "BAIXA" | "MEDIA" | "ALTA" | "CRITICA",
  "summary": "Um resumo claro, objetivo e profissional de 1 a 2 frases do problema",
  "missingInfo": "Texto curto descrevendo o que faltou informar (ex: 'Matrícula não informada', 'Posto não informado') ou null se estiver completo",
  "friendlyResponse": "Mensagem educada e humanizada para o funcionário confirmando o recebimento dos dados fornecidos e orientando caso tenha faltado algum dado importante."
}

Regras:
1. Responda APENAS o JSON válido sem blocos de markdown em volta (ou seja, apenas o texto JSON puro).
2. Se o funcionário estiver sem comer ou sem passagem para trabalhar no mesmo dia, prioridade = "CRITICA" ou "ALTA".
3. benefitType deve ser rigorosamente: "VR", "VT", "AMBOS" ou "OUTRO".`;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Mensagem enviada pelo funcionário:\n"${messageText}"` }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5000',
          'X-Title': 'Gestao Beneficios RH'
        },
        timeout: 25000
      }
    );

    const rawContent = response.data?.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new Error('Resposta vazia da IA OpenRouter');
    }

    // Limpa eventuais crases de markdown
    const cleaned = rawContent.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      employeeName: parsed.employeeName || 'Não informado',
      employeeId: parsed.employeeId || 'Não informada',
      workplace: parsed.workplace || 'Não informado',
      benefitType: (['VR', 'VT', 'AMBOS', 'OUTRO'].includes(parsed.benefitType)) ? parsed.benefitType : 'OUTRO',
      priority: (['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'].includes(parsed.priority)) ? parsed.priority : 'MEDIA',
      summary: parsed.summary || messageText.slice(0, 100),
      missingInfo: parsed.missingInfo || null,
      friendlyResponse: parsed.friendlyResponse || 'Recebemos sua mensagem sobre benefícios e ela já foi encaminhada para a equipe responsável.'
    };
  } catch (error) {
    console.error('[AI Error]', error?.response?.data || error.message);
    // Em caso de falha de conexão ou quota com OpenRouter, faz fallback seguro para não travar o bot
    return fallbackParser(messageText);
  }
}

/**
 * Fallback heurístico caso a API da IA não esteja configurada ou fora do ar
 */
function fallbackParser(text) {
  const upper = text.toUpperCase();
  let benefitType = 'OUTRO';
  if ((upper.includes('VR') || upper.includes('ALIMENTA') || upper.includes('REFEI')) &&
      (upper.includes('VT') || upper.includes('TRANSPORTE') || upper.includes('PASSAGEM'))) {
    benefitType = 'AMBOS';
  } else if (upper.includes('VR') || upper.includes('ALIMENTA') || upper.includes('REFEI') || upper.includes('SODEXO') || upper.includes('ALELO') || upper.includes('FLASH') || upper.includes('TICKET')) {
    benefitType = 'VR';
  } else if (upper.includes('VT') || upper.includes('TRANSPORTE') || upper.includes('PASSAGEM') || upper.includes('BILHETE') || upper.includes('TOP')) {
    benefitType = 'VT';
  }

  // Tenta extrair matrícula (números de 4 a 8 dígitos)
  const matMatch = text.match(/(?:matr[ií]cula|re|reg)\s*[:#\-]?\s*([0-9]{4,9})/i);
  const employeeId = matMatch ? matMatch[1] : 'Não informada';

  // Tenta extrair posto
  const postoMatch = text.match(/(?:posto|unidade|loja|filial|local)\s*[:#\-]?\s*([^\n,.]+)/i);
  const workplace = postoMatch ? postoMatch[1].trim() : 'Não informado';

  // Tenta extrair nome
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
    benefitType,
    priority,
    summary: text.length > 120 ? text.slice(0, 117) + '...' : text,
    missingInfo: employeeId === 'Não informada' || workplace === 'Não informado' ? 'Dados como posto ou matrícula podem ter faltado' : null,
    friendlyResponse: 'Olá! Recebemos sua solicitação referente aos seus benefícios. Seu chamado já foi registrado em nossa fila de atendimento.'
  };
}
