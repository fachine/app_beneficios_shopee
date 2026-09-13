# 🎫 BenefíciosOps - Gestão Inteligente de Problemas de Benefícios (VR & VT)

Sistema completo para recepção, triagem com Inteligência Artificial (OpenRouter), acompanhamento em Quadro Kanban e monitoramento de SLAs para chamados de benefícios (Vale Refeição e Vale Transporte) enviados por funcionários via **Telegram**.

---

## 🚀 Arquitetura e Recursos

1. **Recepção e Triagem via Bot do Telegram**:
   - Os funcionários enviam mensagem de texto livre no Telegram com nome, matrícula, posto de trabalho e o relato do problema.
   - A IA (**OpenRouter**) extrai e estrutura automaticamente:
     - Nome completo do colaborador
     - Matrícula
     - Posto de trabalho / Filial
     - Tipo de benefício (`VR`, `VT`, `AMBOS`, `OUTRO`)
     - Nível de urgência e SLA de atendimento
     - Resumo claro para a equipe de RH
     - Detecção de dados faltantes (se o colaborador esqueceu de informar matrícula ou posto)
   - O bot responde instantaneamente ao colaborador no Telegram com o número de protocolo gerado e previsão de atendimento.

2. **Quadro Kanban Operacional em Tempo Real**:
   - Colunas organizadas do fluxo de atendimento:
     - **Novo / Triagem IA**
     - **Em Análise RH**
     - **Aguardando Operadora** (Alelo, Sodexo, Flash, SPTrans, etc.)
     - **Em Tratativa**
     - **Resolvido**
   - Drag and drop de cards entre colunas.
   - Sincronização em tempo real via **WebSockets (Socket.io)**.
   - Notificação opcional automática de volta ao Telegram do funcionário quando o status muda ou quando uma tratativa é registrada.

3. **Dashboard Executivo de SLAs e Métricas**:
   - Taxa de conformidade de SLA (% de chamados resolvidos dentro do prazo).
   - Tempo Médio de Resolução (TMA).
   - Gráfico de ocorrências por Posto de Trabalho (Top filiais com problemas).
   - Distribuição percentual de ocorrências por Benefício (VR vs VT).
   - Tabela de atenção prioritária para chamados em risco de estourar SLA ou já estourados.

4. **Painel de Configurações**:
   - Inserção/atualização do Token do Telegram (`@BotFather`).
   - Inserção da chave da OpenRouter e seleção de modelos (Gemini 2.0 Flash, Claude 3.5 Haiku, GPT-4o Mini, Llama 3.3, DeepSeek).

---

## 🛠️ Como Executar o Projeto

### Pré-requisitos
- Node.js (v18+) instalado.

### 1. Iniciar o Backend
```bash
cd "d:\Desktop\APP BENEFICIOS\server"
npm install
node src/index.js
```
O servidor rodará em `http://localhost:5000`.

### 2. Iniciar o Frontend
```bash
cd "d:\Desktop\APP BENEFICIOS\client"
npm install
npm run dev
```
O painel abrirá em `http://localhost:3000`.

---

## 🔑 Configurando o Telegram e o OpenRouter

Você pode configurar suas chaves de duas formas:

### Opção A: Pela Interface Web (Mais Fácil)
1. Acesse `http://localhost:3000`.
2. Clique no ícone de engrenagem/sliders no canto superior direito (**Configurações**).
3. Cole o seu **Token do Telegram** e clique em **Conectar Bot**.
4. Cole a sua **Chave OpenRouter** e clique em **Salvar Configurações de IA**.

### Opção B: Pelo arquivo `.env`
Edite o arquivo `server/.env`:
```env
PORT=5000
DATABASE_URL="file:./dev.db"
TELEGRAM_BOT_TOKEN="SEU_TOKEN_DO_TELEGRAM"
OPENROUTER_API_KEY="sk-or-v1-..."
OPENROUTER_MODEL="google/gemini-2.0-flash-001"
```
