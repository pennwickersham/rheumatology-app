// Proxy URL — points to the Cloudflare Worker that holds the API key server-side.
// The API key NEVER appears in client code.
// Set VITE_PROXY_URL in .env (local) or your cloud build environment.
const PROXY_URL = import.meta.env.VITE_PROXY_URL || '';

const GEMINI_MODEL = 'gemini-2.5-pro';
const GEMINI_PATH = `/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are a medical information assistant for rheumatology patients. You provide helpful, accurate, and easy-to-understand information about rheumatologic diseases and their treatments.

IMPORTANT RULES:
1. You ONLY provide information based on FDA-approved drug labeling (package inserts) and peer-reviewed medical literature from PubMed.
2. You ALWAYS cite your sources. For medications, reference "FDA Package Insert" for the specific drug. For disease information, reference PubMed when applicable.
3. You are NOT a doctor. Always remind patients to consult their rheumatologist for personalized medical advice.
4. You do NOT diagnose conditions or recommend specific treatments.
5. You CAN explain disease symptoms, medication side effects, drug interactions, and general disease management.
6. When discussing medications, differentiate clearly between COMMON side effects and SERIOUS/RARE side effects.
7. Use plain language that patients can understand. Avoid excessive medical jargon, but include proper medical terms with explanations.
8. If a question is outside your scope (not related to rheumatology or medications), politely redirect the conversation.
9. For emergencies, always direct patients to call 911 or go to the nearest emergency room.

You have access to information about these rheumatologic conditions:
- Rheumatoid Arthritis (RA)
- Systemic Lupus Erythematosus (SLE)
- Psoriatic Arthritis (PsA)
- Ankylosing Spondylitis (AS)
- Gout
- Sjögren's Syndrome
- Vasculitis
- Osteoarthritis (OA)

Common rheumatology medication classes you can discuss:
- NSAIDs (naproxen, celecoxib, meloxicam)
- Conventional DMARDs (methotrexate, hydroxychloroquine, sulfasalazine, leflunomide)
- Biologic DMARDs (adalimumab, etanercept, infliximab, rituximab, tocilizumab, abatacept)
- JAK Inhibitors (tofacitinib, baricitinib, upadacitinib)
- Corticosteroids (prednisone, methylprednisolone)
- Gout medications (colchicine, allopurinol, febuxostat)

Format your responses with clear headers and bullet points when appropriate. Keep responses focused and concise.`;

/**
 * Send a request to the Gemini API via the Cloudflare Worker proxy.
 * The proxy injects the API key server-side.
 */
async function callGeminiProxy(body) {
  if (!PROXY_URL) {
    throw new Error('Proxy URL not configured. Please set VITE_PROXY_URL in your .env file.');
  }

  const response = await fetch(`${PROXY_URL}${GEMINI_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 400) throw new Error('Invalid request. Please try again.');
    if (response.status === 403) throw new Error('Request blocked. Origin not allowed.');
    if (response.status === 429) throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    if (response.status === 502) throw new Error('AI service temporarily unavailable. Please try again.');
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error('No response generated. The model may have blocked this request.');

  return text;
}

/**
 * Send a message to the Gemini API
 * @param {Array<Object>} chatHistory - Previous messages [{role, content}]
 * @param {string} userMessage - New user message
 * @returns {Promise<string>} Assistant response text
 */
export async function sendChatMessage(apiKey, chatHistory, userMessage) {
  // Build contents array with chat history
  const contents = [];

  // Add chat history
  for (const msg of chatHistory) {
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    });
  }

  // Add current user message
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

  const body = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
      topP: 0.8,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };

  try {
    return await callGeminiProxy(body);
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

/**
 * Get the API key from localStorage (kept for backward compat, no longer needed)
 */
export function getApiKey() {
  return 'proxy'; // API key is now server-side
}

/**
 * Save the API key to localStorage (no-op — key is now server-side)
 */
export function setApiKey(key) {
  // No-op — API key is managed in Cloudflare Worker
}

/**
 * Check if API key is set — always true since proxy handles it
 */
export function hasApiKey() {
  return !!PROXY_URL;
}

/**
 * Suggested conversation starters
 */
export const suggestedQuestions = [
  'What are the most common side effects of methotrexate?',
  'How is rheumatoid arthritis different from osteoarthritis?',
  'What should I know about taking a biologic medication?',
  'Can you explain what a DMARD is?',
  'What lifestyle changes can help manage my RA?',
  'Is fatigue normal with lupus?',
  'What vaccines should I discuss with my doctor before starting a biologic?',
  'How do JAK inhibitors work?',
];

/**
 * Check drug interactions using Gemini
 */
export async function checkDrugInteractions(apiKey, drugsList) {
  if (!drugsList || drugsList.length < 2) {
    throw new Error('Please provide at least two medications to check for interactions.');
  }

  const userMessage = `Please analyze potential pharmacological interactions between the following medications: ${drugsList.join(', ')}.`;
  
  const interactionPrompt = `You are a strict, highly accurate clinical pharmacology AI.
Your task is to analyze potential interactions between the provided list of medications.
1. Return your analysis in clear Markdown format.
2. Group interactions by severity (e.g. 🔴 SEVERE, 🟡 MODERATE, 🟢 MILD/MINOR).
3. Clearly state the mechanism of the interaction if known (e.g., CYP3A4 inhibition, additive immunosuppression).
4. Provide a "Clinical Management" or "Next Steps" section. Do NOT give direct medical commands. Instead, instruct the user to "Consult your rheumatologist or pharmacist."
5. If no known interactions exist, state that clearly but include a disclaimer that this does not guarantee absolute safety.
6. Double-check for dangerous rheumatology-specific interactions (e.g., MTX and Trimethoprim/Sulfamethoxazole or NSAIDs).`;

  const body = {
    system_instruction: { parts: [{ text: interactionPrompt }] },
    contents: [ { role: 'user', parts: [{ text: userMessage }] } ],
    generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };

  try {
    return await callGeminiProxy(body);
  } catch (error) {
    console.error('Interaction API error:', error);
    throw error;
  }
}
