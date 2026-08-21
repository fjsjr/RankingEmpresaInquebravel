import OpenAI from 'openai';
import DOMMatrixPolyfill from 'dommatrix';
import { Path2D as Path2DPolyfill } from 'path2d';
import { PDFParse } from 'pdf-parse';

// pdf-parse (via pdfjs-dist) tenta carregar @napi-rs/canvas em runtime para
// polyfillar DOMMatrix/Path2D/ImageData. Esse require dinâmico não é
// detectado pelo tracer de build da Vercel, então o binário nativo não vai
// para o bundle da function — em produção o require falha silenciosamente
// e o pdf-parse quebra com "DOMMatrix is not defined". Polyfillamos aqui
// com implementações puras em JS antes de qualquer parsing de PDF.
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = DOMMatrixPolyfill;
}
if (typeof globalThis.Path2D === 'undefined') {
  globalThis.Path2D = Path2DPolyfill;
}
if (typeof globalThis.ImageData === 'undefined') {
  globalThis.ImageData = class ImageData {
    constructor(dataOrWidth, widthOrHeight, height) {
      if (dataOrWidth instanceof Uint8ClampedArray) {
        this.data = dataOrWidth;
        this.width = widthOrHeight;
        this.height = height;
      } else {
        this.width = dataOrWidth;
        this.height = widthOrHeight;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      }
    }
  };
}

let openai = null;

function getOpenAiClient() {
  if (openai) return openai;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Configuração ausente: defina OPENAI_API_KEY nas variáveis de ambiente da Vercel');
  }

  openai = new OpenAI({ apiKey });
  return openai;
}

// ─── EXTRAÇÃO DE TEXTO DO PDF ─────────────────────────────────────────────────
async function extractPdfText(base64Data) {
  const raw = base64Data.replace(/^data:.*;base64,/, '');
  const buffer = Buffer.from(raw, 'base64');
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  const text = result?.text?.replace(/\s+/g, ' ').trim() || '';
  if (!text) throw new Error('PDF sem texto extraível (pode ser imagem escaneada)');
  return text.slice(0, 5000);
}

// ─── METODOLOGIA EMPRESA INQUEBRÁVEL ─────────────────────────────────────────
const EI_METHODOLOGY = `
METODOLOGIA EMPRESA INQUEBRÁVEL — Método ALMA 8P
Autor: Edilson Junior

VISÃO GERAL:
O Método ALMA 8P é um sistema estruturado para tornar empresas resilientes e de alta performance, sustentado por 8 passos e 5 pilares fundamentais.

OS 8 PASSOS DO MÉTODO ALMA 8P:
1. ALMA DO NEGÓCIO — Propósito central da empresa (além do lucro). Por que ela existe? Qual impacto causa? Exemplo de referência: Neemias — propósito inabalável que sustenta a resiliência.
2. META ÚNICA GLOBAL — Um único número mensurável para o ano (faturamento, lucratividade, expansão). Foco absoluto. Exemplo: Paulo — alvo claro e determinado.
3. ORGANOGRAMA — Estrutura organizacional clara com papéis e responsabilidades definidos. Delegação estruturada. Exemplo: Moisés/Jetro — estrutura em camadas de liderança.
4. ESTRATÉGIAS COM O TIME — Cada setor define suas estratégias alinhadas à Meta Única Global. Sinergia organizacional.
5. RITUAIS — Reuniões estruturadas (Regra dos 3R: Regularidade, Roteiro, Resultado). Disciplina que gera resultado.
6. PREMIAÇÕES E RECONHECIMENTO — Sistema sustentável de recompensas para quem multiplica resultados.
7. PAINEL DE GESTÃO À VISTA — Indicadores visíveis para toda a equipe. O que não se mede, não se melhora.
8. CHECKLIST DO DONO — Plano de implementação em 90 dias com responsáveis e prazos.

OS 5 PILARES DE UMA EMPRESA INQUEBRÁVEL:

PILAR 1 — PESSOAS (Framework PTR):
- Processos: Modelo 4C (Clareza: o que fazer | Cargo: quem responde | Controle: qual indicador | Consequência: o que acontece se não entregar)
- Treinamento: Matriz 3N (Nível Técnico: saber fazer | Nível Comportamental: saber se posicionar | Nível Estratégico: saber pensar)
- Rituais: Reuniões com Regularidade, Roteiro e Resultado definidos

PILAR 2 — PRODUTOS (Framework MV = Margem × Volume):
- Margem: Compra, Estoque, Precificação, Tributação
- Volume: Briefing, Campanha, Funil, Playbook Comercial
- Alta performance = Margem e Volume operando juntos

PILAR 3 — FINANCEIRO:
- Gestão de fluxo de caixa, lucratividade, crescimento sustentável

PILAR 4 — TECNOLOGIA:
- Multiplicação de produtividade, integração, controle e escala

PILAR 5 — OPERAÇÕES:
- Eficiência, redução de retrabalho, qualidade e satisfação do cliente

PRINCÍPIO CENTRAL:
"Alma → Meta → Estrutura → Execução → Multiplicação → Reconhecimento"
Uma Empresa Inquebrável recompensa quem multiplica com responsabilidade.
Crescimento saudável é fruto de gestão, não de sorte.
`;

// ─── AGENTE AVALIADOR TRINO ───────────────────────────────────────────────────
const AGENTE_TRINO = `
IDENTIDADE DO AVALIADOR — AGENTE AVALIADOR TRINO:
Você é um conselheiro de avaliação que combina três perspectivas complementares:

1. VISÃO GATES (Rigor Analítico e Impacto Sistêmico):
   - Identifica falhas estruturais, gargalos e riscos sistêmicos
   - Avalia escalabilidade, mensuração de impacto e sustentabilidade
   - Penaliza propostas sem dados, sem métricas ou sem lógica de causa e efeito
   - Premia quem demonstra pensamento sistêmico e clareza operacional

2. VISÃO BEZOS (Obsessão pelo Cliente, Qualidade e Longo Prazo):
   - Avalia valor gerado para o cliente final, clareza estratégica e vantagem composta
   - Busca quem pensa em 10 anos, não apenas no trimestre
   - Penaliza respostas superficiais, sem foco no cliente ou sem visão de longo prazo
   - Premia quem demonstra qualidade de execução e consistência de propósito

3. VISÃO MUSK (Primeiros Princípios, Ambição Radical e Velocidade):
   - Questiona premissas, busca caminhos 10x melhores, não 10% melhores
   - Penaliza formalismo vazio, burocracia e respostas copiadas de manual
   - Premia originalidade arriscada com execução veloz e coragem de simplificar
   - Valoriza quem desafia o status quo com clareza e ousadia
`;

// ─── HELPERS COMPARTILHADOS ───────────────────────────────────────────────────
function resolveGroupId(aiName, nameToId) {
  if (nameToId[aiName]) return nameToId[aiName];
  const norm = s => s?.trim().toLowerCase().replace(/\s+/g, ' ') || '';
  const normalized = norm(aiName);
  for (const [name, id] of Object.entries(nameToId)) {
    if (norm(name) === normalized) return id;
  }
  // fallback: match substring para caso IA retorne "Grupo N: Nome" em vez de só "Nome"
  for (const [name, id] of Object.entries(nameToId)) {
    if (normalized.includes(norm(name)) || norm(name).includes(normalized)) return id;
  }
  return null;
}

function buildRankingResult(result, responses, nameToId) {
  const resolvedNames = new Set(
    result.ranking.map(r => resolveGroupId(r.groupName, nameToId)).filter(Boolean)
  );
  responses
    .filter(r => !resolvedNames.has(nameToId[r.groupName]))
    .forEach(r => {
      result.ranking.push({ groupName: r.groupName, points: 0, justification: 'Sem entrega registrada.' });
    });

  const withPts = result.ranking.map(item => ({
    ...item,
    groupId: resolveGroupId(item.groupName, nameToId),
    points: Math.min(10, Math.max(0, parseInt(item.points) || 0)),
  }));

  withPts.sort((a, b) => {
    const aEmpty = a.justification === 'Sem entrega registrada.';
    const bEmpty = b.justification === 'Sem entrega registrada.';
    if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
    return b.points - a.points;
  });

  return withPts.map((item, idx) => ({ ...item, rank: idx + 1 }));
}

// ─── EXERCÍCIO 1: RANKING POR RESPOSTA TEXTUAL ────────────────────────────────
export async function rankAllGroups({ challenge, responses }) {
  const valid = responses.filter(r => r.response?.trim());

  const groupsText = valid
    .map((r, i) => `Grupo ${i + 1}: ${r.groupName}\nResposta: ${r.response.trim()}`)
    .join('\n\n---\n\n');

  const prompt = `Você é o AGENTE AVALIADOR TRINO do evento corporativo "Empresa Inquebrável".

${AGENTE_TRINO}

---

${EI_METHODOLOGY}

---

DESAFIO / PERGUNTA RESPONDIDA PELOS GRUPOS:
${challenge}

RESPOSTAS DOS GRUPOS (${valid.length} grupos com resposta):
${groupsText}

---

PROCESSO DE AVALIAÇÃO OBRIGATÓRIO:

PASSO 1 — Leia todas as respostas e identifique os critérios objetivos presentes.

PASSO 2 — Aplique as TRÊS VISÕES a cada grupo:
  • GATES: Há lógica sistêmica? Métricas? Escalabilidade? Falhas estruturais?
  • BEZOS: Há foco no cliente? Clareza estratégica? Visão de longo prazo? Qualidade?
  • MUSK: Há originalidade? Primeiros princípios? Velocidade? Ou é formalismo vazio?

PASSO 3 — Avalie também o alinhamento com os 5 Pilares EI:
  Pessoas (PTR/4C/3N), Produtos (MV), Financeiro, Tecnologia, Operações
  e com os 8 Passos do Método ALMA 8P.

PASSO 4 — ATRIBUA UMA NOTA DE 0 A 10 PARA CADA GRUPO COM BASE NA QUALIDADE DA RESPOSTA:

ESCALA DE NOTAS — USE COM RIGOR:
  • 10 pts → Resposta que segue o espírito da metodologia EI: conecta estratégia à execução, menciona método, estrutura, tecnologia, acompanhamento ou pilares EI de forma clara e intencional. Pode ser concisa SE o conteúdo for preciso e alinhado. Exemplos de respostas 10: "Transformamos estratégia em execução via método, tecnologia e acompanhamento", "Aplicamos 4C, meta única e rituais semanais com painel de gestão".
  • 7–9 pts → Boa resposta: demonstra entendimento real de pelo menos 2 pilares ou passos do EI, com aplicação prática, ainda que incompleta.
  • 4–6 pts → Resposta parcial: menciona algum elemento EI ou estratégia, mas de forma vaga ou sem profundidade. Falta conexão clara com o método.
  • 1–3 pts → Resposta muito superficial: poucas palavras sem substância, genérica ("fazemos reuniões", "vendemos bem"), sem qualquer alinhamento ao EI.
  • 0 pts → Não respondeu, fora do tema completamente, ou irrelevante.

ATENÇÃO — VALORIZE CLAREZA E ALINHAMENTO AO EI:
  • Uma frase curta e precisa que captura o princípio central EI (Alma → Meta → Execução → Multiplicação) vale mais do que um parágrafo vago
  • Palavras-chave que indicam alinhamento: método, execução, estratégia, tecnologia, acompanhamento, estrutura, meta, resultado, equipe, processo, indicadores, pilar
  • NÃO penalize por ser conciso — penalize por ser vago ou genérico
  • NÃO exija métricas numéricas se o alinhamento conceitual for sólido

REGRAS INEGOCIÁVEIS:
- A nota reflete a QUALIDADE e o ALINHAMENTO À METODOLOGIA EI, não a posição no ranking
- Múltiplos grupos podem ter a mesma nota se merecerem
- NÃO infle notas por compaixão — se foi vago sem conteúdo EI, é 1–3; se foi muito ruim, é 0
- Ordene o array "ranking" do maior para o menor "points"

PASSO 5 — Retorne o JSON abaixo. O campo "justification" deve ser direto e rigoroso em 1-2 frases.

Retorne SOMENTE um JSON válido, sem markdown, neste formato exato:
{
  "summary": "<padrão dominante entre as respostas em 2 frases diretas: o que separou os melhores dos piores>",
  "visaoGates": "<síntese sistêmica geral do conjunto — falhas e pontos fortes estruturais>",
  "visaoBezos": "<síntese do foco no cliente e longo prazo — quem pensou no impacto real e quem foi superficial>",
  "visaoMusk": "<síntese dos primeiros princípios — quem ousou e quem copiou manual>",
  "sinteseFinal": "<orientação estratégica para a próxima rodada>",
  "ranking": [
    {
      "groupName": "<nome exato do grupo>",
      "points": <0 a 10 baseado na qualidade>,
      "justification": "<1-2 frases diretas explicando por que recebeu essa nota>"
    }
  ]
}

CRÍTICO: inclua APENAS os ${valid.length} grupos que responderam. NÃO inclua grupos sem resposta. Ordene do maior para o menor "points". Todos os ${valid.length} grupos devem aparecer.`;

  const raw = await callChat(prompt);
  let result;
  try {
    result = extractJSON(raw);
  } catch (e) {
    console.error('[AI rankAllGroups] Raw inválido:\n', raw?.slice(0, 800));
    throw e;
  }

  const nameToId = {};
  responses.forEach(r => { nameToId[r.groupName] = r.groupId; });

  return {
    summary: result.summary || '',
    visaoGates: result.visaoGates || '',
    visaoBezos: result.visaoBezos || '',
    visaoMusk: result.visaoMusk || '',
    sinteseFinal: result.sinteseFinal || '',
    ranking: buildRankingResult(result, responses, nameToId),
  };
}

// ─── EXERCÍCIO 2: RANKING POR RELATÓRIO CIN (PDF) ────────────────────────────
export async function rankCinGroups({ context, responses }) {
  // Extrai texto dos PDFs em paralelo — erros individuais não bloqueiam os demais
  const withText = await Promise.all(
    responses.map(async r => {
      if (!r.pdfData) return { ...r, cinText: null, cinError: null };
      try {
        const cinText = await extractPdfText(r.pdfData);
        return { ...r, cinText, cinError: null };
      } catch (err) {
        console.error(`[PDF extract] ${r.groupName}:`, err.message);
        return { ...r, cinText: null, cinError: err.message };
      }
    })
  );

  const valid = withText.filter(r => r.cinText);
  const failed = withText.filter(r => r.pdfData && r.cinError);

  if (!valid.length) {
    const detail = failed.map(r => `${r.groupName}: ${r.cinError}`).join('; ');
    throw new Error(`Falha ao ler os PDFs enviados. ${detail || 'Verifique se os arquivos são PDFs válidos com texto.'}`);
  }

  const groupsText = valid
    .map((r, i) => `Grupo ${i + 1}: ${r.groupName}\n\n${r.cinText}`)
    .join('\n\n════════════════════════════════════\n\n');

  const contextNote = context?.trim()
    ? `FOCO DA AVALIAÇÃO SOLICITADO PELO FACILITADOR:\n${context.trim()}\n\n---\n\n`
    : '';

  const prompt = `Você é o AGENTE AVALIADOR TRINO do evento corporativo "Empresa Inquebrável".

${AGENTE_TRINO}

---

${EI_METHODOLOGY}

---

EXERCÍCIO: ANÁLISE DO RELATÓRIO CIN (Centro de Inteligência de Negócio)

${contextNote}Cada grupo abaixo enviou seu Relatório CIN contendo análise de concorrentes, SWOT e inteligência de mercado. Avalie a qualidade estratégica de cada documento.

RELATÓRIOS CIN DOS GRUPOS (${valid.length} grupos com entrega):

${groupsText}

---

CRITÉRIOS DE AVALIAÇÃO DO CIN:

PASSO 1 — Leia cada relatório com atenção. Avalie as seguintes dimensões:
  • ANÁLISE DE CONCORRENTES: Profundidade, precisão, identificação de ameaças reais
  • SWOT: Completude (forças, fraquezas, oportunidades, ameaças), coerência interna, honestidade
  • INTELIGÊNCIA DE MERCADO: Dados, tendências, posicionamento competitivo
  • CLAREZA ESTRATÉGICA: O grupo sabe onde está e para onde vai?
  • ALINHAMENTO EI: O relatório conecta a análise com os pilares do Método ALMA 8P?

PASSO 2 — Aplique as TRÊS VISÕES:
  • GATES: O diagnóstico é rigoroso? Há dados? Falhas estruturais identificadas?
  • BEZOS: O foco no cliente e no longo prazo está presente? O grupo pensa além do óbvio?
  • MUSK: O grupo questiona premissas do mercado? Há originalidade na análise?

ESCALA DE NOTAS — USE COM RIGOR:
  • 10 pts → CIN completo, honesto, estrategicamente profundo e alinhado ao EI. Concorrentes mapeados com clareza, SWOT coerente, inteligência de mercado aplicável.
  • 7–9 pts → Bom CIN: cobre a maioria das dimensões com qualidade, pequenas lacunas.
  • 4–6 pts → CIN parcial: superficial em ao menos 2 dimensões, SWOT genérico ou análise de concorrentes rasa.
  • 1–3 pts → CIN muito fraco: diagnóstico vago, sem dados, SWOT incoerente ou irrelevante.
  • 0 pts → Sem entrega ou conteúdo completamente fora do escopo.

REGRAS INEGOCIÁVEIS:
- A nota reflete a QUALIDADE DO DOCUMENTO, não o tamanho
- NÃO infle notas — um CIN ruim é ruim, mesmo que longo
- Múltiplos grupos podem ter a mesma nota se merecerem
- Ordene o array "ranking" do maior para o menor "points"

Retorne SOMENTE um JSON válido, sem markdown, neste formato exato:
{
  "summary": "<o que diferenciou os melhores CINs dos piores — 2 frases diretas>",
  "visaoGates": "<diagnóstico geral: quais grupos têm rigor analítico real vs. análise decorativa>",
  "visaoBezos": "<quem demonstrou foco no cliente e visão de longo prazo no CIN>",
  "visaoMusk": "<quem questionou premissas e quem reproduziu análises genéricas de manual>",
  "sinteseFinal": "<recomendação estratégica: o que os grupos devem melhorar no CIN>",
  "ranking": [
    {
      "groupName": "<nome exato do grupo>",
      "points": <0 a 10>,
      "justification": "<1-2 frases diretas: por que recebeu essa nota no CIN>"
    }
  ]
}

CRÍTICO: inclua APENAS os ${valid.length} grupos que entregaram o CIN. Ordene do maior para o menor "points".`;

  const raw = await callChat(prompt);
  let result;
  try {
    result = extractJSON(raw);
  } catch (e) {
    console.error('[AI rankCinGroups] Raw inválido:\n', raw?.slice(0, 800));
    throw e;
  }

  const nameToId = {};
  responses.forEach(r => { nameToId[r.groupName] = r.groupId; });

  return {
    summary: result.summary || '',
    visaoGates: result.visaoGates || '',
    visaoBezos: result.visaoBezos || '',
    visaoMusk: result.visaoMusk || '',
    sinteseFinal: result.sinteseFinal || '',
    ranking: buildRankingResult(result, responses, nameToId),
  };
}

// ─── EXERCÍCIO 3: RANKING POR PLANO DE AÇÃO ──────────────────────────────────
export async function rankPlanosAcao({ context, responses }) {
  const withText = await Promise.all(
    responses.map(async r => {
      if (!r.pdfData) return { ...r, planoText: null, planoError: null };
      try {
        const planoText = await extractPdfText(r.pdfData);
        return { ...r, planoText, planoError: null };
      } catch (err) {
        console.error(`[PDF extract plano] ${r.groupName}:`, err.message);
        return { ...r, planoText: null, planoError: err.message };
      }
    })
  );

  const valid = withText.filter(r => r.planoText);
  const failed = withText.filter(r => r.pdfData && r.planoError);

  if (!valid.length) {
    const detail = failed.map(r => `${r.groupName}: ${r.planoError}`).join('; ');
    throw new Error(`Falha ao ler os PDFs enviados. ${detail || 'Verifique se os arquivos são PDFs válidos com texto.'}`);
  }

  const groupsText = valid
    .map((r, i) => `Grupo ${i + 1}: ${r.groupName}\n\n${r.planoText}`)
    .join('\n\n════════════════════════════════════\n\n');

  const contextNote = context?.trim()
    ? `FOCO DA AVALIAÇÃO SOLICITADO PELO FACILITADOR:\n${context.trim()}\n\n---\n\n`
    : '';

  const prompt = `Você é o AGENTE AVALIADOR TRINO do evento corporativo "Empresa Inquebrável".

${AGENTE_TRINO}

---

${EI_METHODOLOGY}

---

EXERCÍCIO: ANÁLISE DO PLANO DE AÇÃO

${contextNote}Cada grupo abaixo enviou seu Plano de Ação, que deve demonstrar como a empresa vai implementar a metodologia Empresa Inquebrável. Avalie a qualidade estratégica e executiva de cada plano.

PLANOS DE AÇÃO DOS GRUPOS (${valid.length} grupos com entrega):

${groupsText}

---

CRITÉRIOS DE AVALIAÇÃO DO PLANO DE AÇÃO:

PASSO 1 — Leia cada plano com atenção. Avalie as seguintes dimensões:

  • CLAREZA DE OBJETIVOS: Há metas claras e mensuráveis? A Meta Única Global está presente?
  • RESPONSÁVEIS E PRAZOS: Cada ação tem um dono e uma data? (Checklist do Dono — Passo 8)
  • ALINHAMENTO AO MÉTODO ALMA 8P: O plano cobre os 8 passos? Tem Alma, Meta, Organograma, Rituais?
  • EXECUÇÃO REALISTA: As ações são concretas e executáveis no prazo proposto?
  • INDICADORES DE RESULTADO: Há KPIs, metas numéricas ou painel de gestão à vista?
  • ENVOLVIMENTO DO TIME: O plano inclui engajamento da equipe (Estratégias com o Time — Passo 4)?
  • SEQUÊNCIA LÓGICA: O plano segue a ordem: Alma → Meta → Estrutura → Execução → Multiplicação?

PASSO 2 — Aplique as TRÊS VISÕES:
  • GATES: O plano é sistêmico? Tem responsáveis claros, métricas e prazos? É escalável?
  • BEZOS: O cliente está no centro do plano? As ações geram valor real no longo prazo?
  • MUSK: O plano é ousado o suficiente? Vai além do óbvio? Ou é genérico e burocrático?

ESCALA DE NOTAS — USE COM RIGOR:
  • 10 pts → Plano completo, com metas claras, responsáveis, prazos, indicadores e forte alinhamento ao ALMA 8P. Demonstra compreensão profunda da metodologia EI.
  • 7–9 pts → Bom plano: cobre a maioria dos critérios com qualidade, algumas lacunas menores.
  • 4–6 pts → Plano parcial: falta clareza em metas, responsáveis ou indicadores. Alinhamento EI superficial.
  • 1–3 pts → Plano muito fraco: vago, sem dono, sem prazo, sem métrica. Desconexo da metodologia EI.
  • 0 pts → Sem entrega ou conteúdo completamente fora do escopo.

REGRAS INEGOCIÁVEIS:
- A nota reflete a QUALIDADE E EXECUTABILIDADE do plano, não o tamanho ou intenção
- NÃO infle notas — um plano sem responsáveis e sem métricas é 1-3, independente da boa intenção
- Múltiplos grupos podem ter a mesma nota se merecerem
- Ordene o array "ranking" do maior para o menor "points"

Retorne SOMENTE um JSON válido, sem markdown, neste formato exato:
{
  "summary": "<o que diferenciou os melhores planos dos piores — 2 frases diretas>",
  "visaoGates": "<diagnóstico geral: quais grupos têm planos sistêmicos com donos e métricas vs. planos vagos>",
  "visaoBezos": "<quem demonstrou foco no cliente e geração de valor real no plano>",
  "visaoMusk": "<quem ousou e trouxe ações inovadoras vs. quem reproduziu planos genéricos>",
  "sinteseFinal": "<recomendação estratégica: o que os grupos devem melhorar nos planos de ação>",
  "ranking": [
    {
      "groupName": "<nome exato do grupo>",
      "points": <0 a 10>,
      "justification": "<1-2 frases diretas: por que recebeu essa nota no Plano de Ação>"
    }
  ]
}

CRÍTICO: inclua APENAS os ${valid.length} grupos que entregaram o Plano de Ação. Ordene do maior para o menor "points".`;

  const raw = await callChat(prompt);
  let result;
  try {
    result = extractJSON(raw);
  } catch (e) {
    console.error('[AI rankPlanosAcao] Raw inválido:\n', raw?.slice(0, 800));
    throw e;
  }

  const nameToId = {};
  responses.forEach(r => { nameToId[r.groupName] = r.groupId; });

  return {
    summary: result.summary || '',
    visaoGates: result.visaoGates || '',
    visaoBezos: result.visaoBezos || '',
    visaoMusk: result.visaoMusk || '',
    sinteseFinal: result.sinteseFinal || '',
    ranking: buildRankingResult(result, responses, nameToId),
  };
}

// ─── ANÁLISE INDIVIDUAL ────────────────────────────────────────────────────────
export async function analyzeActivity({ groupName, description, context = '' }) {
  const prompt = `Você é o AGENTE AVALIADOR TRINO do evento "Empresa Inquebrável".

${AGENTE_TRINO}

---

${EI_METHODOLOGY}

---

Grupo avaliado: ${groupName}
Descrição da atividade: ${description}
${context ? `Contexto adicional: ${context}` : ''}

PROCESSO DE AVALIAÇÃO:
Aplique as três visões ao trabalho deste grupo:
- GATES: Lógica sistêmica, métricas, escalabilidade, falhas estruturais
- BEZOS: Foco no cliente, clareza estratégica, qualidade, longo prazo
- MUSK: Originalidade, primeiros princípios, velocidade, ousadia vs. formalismo vazio

Avalie também o alinhamento com os 5 Pilares EI e os 8 Passos do Método ALMA 8P.
Seja direto, rigoroso e justo. Não bajule. Aponte fraquezas reais.

Retorne JSON puro sem markdown:
{
  "points": <0-100>,
  "justification": "<síntese das 3 visões + alinhamento EI, direto e rigoroso, 3-4 frases>",
  "visaoGates": "<análise sistêmica: estrutura, métricas, escalabilidade — forte ou fraco?>",
  "visaoBezos": "<foco no cliente e longo prazo — presente ou ausente?>",
  "visaoMusk": "<originalidade e primeiros princípios — ousou ou seguiu manual?>",
  "criteria": {"creativity": <0-25>, "execution": <0-25>, "teamwork": <0-25>, "result": <0-25>},
  "feedback": "<orientação estratégica direta mencionando um pilar EI ou passo ALMA específico>",
  "highlights": ["<ponto forte real alinhado ao EI ou ao Agente Trino>"],
  "improvements": ["<melhoria concreta baseada no EI e nas 3 visões>"]
}`;

  const raw = await callChat(prompt);
  let analysis;
  try {
    analysis = extractJSON(raw);
  } catch (e) {
    console.error('[AI analyzeActivity] Raw inválido:\n', raw?.slice(0, 800));
    throw e;
  }
  return buildResult(analysis);
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function extractJSON(raw) {
  try { return JSON.parse(raw); } catch {}
  const stripped = raw.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(stripped); } catch {}
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  throw new Error('IA retornou resposta em formato inválido. Tente novamente.');
}

async function callChat(content) {
  const client = getOpenAiClient();
  const res = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'Você é o Agente Avaliador Trino do programa Empresa Inquebrável — combinando rigor analítico (Gates), obsessão pelo cliente (Bezos) e primeiros princípios (Musk). Avalie com frieza, justiça e coragem. Responda SEMPRE com JSON puro e válido, sem markdown, sem texto antes ou depois.',
      },
      { role: 'user', content },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 4096,
  });
  return res.choices[0].message.content;
}

function buildResult(analysis) {
  return {
    points: Math.min(100, Math.max(0, parseInt(analysis.points) || 0)),
    justification: analysis.justification || '',
    visaoGates: analysis.visaoGates || '',
    visaoBezos: analysis.visaoBezos || '',
    visaoMusk: analysis.visaoMusk || '',
    criteria: analysis.criteria || { creativity: 0, execution: 0, teamwork: 0, result: 0 },
    feedback: analysis.feedback || '',
    highlights: Array.isArray(analysis.highlights) ? analysis.highlights : [],
    improvements: Array.isArray(analysis.improvements) ? analysis.improvements : [],
  };
}
