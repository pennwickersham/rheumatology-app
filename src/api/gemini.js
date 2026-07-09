// Proxy URL — points to the Cloudflare Worker that holds the API key server-side.
// The API key NEVER appears in client code.
// Set VITE_PROXY_URL and VITE_APP_TOKEN in .env (local) or Appflow Environment (cloud builds).
const PROXY_URL = import.meta.env.VITE_PROXY_URL || '';
const APP_TOKEN = import.meta.env.VITE_APP_TOKEN || '';

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

/** Parse Gemini SSE stream, invoking onDelta(text) per chunk. Returns full text. */
const consumeSSE = async (res, onDelta) => {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete tail
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const obj = JSON.parse(payload);
        const parts = obj?.candidates?.[0]?.content?.parts || [];
        const delta = parts.filter(p => p.text && !p.thought).map(p => p.text).join('');
        if (delta) {
          full += delta;
          onDelta(full);
        }
      } catch { /* partial JSON across chunks is handled by buffering */ }
    }
  }
  return full;
};

/**
 * Common function to call the proxy with fallback models and retries
 * @param {Object} body - The request body for Gemini
 * @param {Function} onDelta - Optional callback for streaming responses
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<string>} The full response text
 */
export async function callProxy(body, onDelta, signal) {
  if (!PROXY_URL) {
    throw new Error('AI service not configured. Please set VITE_PROXY_URL environment variable.');
  }

  // Model fallback queue — updated May 2026.
  const modelQueue = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'];
  let currentModelIndex = 0;
  let retries = 0;
  const maxRetries = 5;
  let replyText = '';

  while (retries < maxRetries) {
    const model = modelQueue[currentModelIndex];
    try {
      const headers = { 'Content-Type': 'application/json', 'X-App-Token': APP_TOKEN };

      // Prefer streaming; fall back to non-streaming on failure.
      if (onDelta) {
        const streamRes = await fetch(
          `${PROXY_URL}/v1beta/models/${model}:streamGenerateContent?alt=sse`,
          { method: 'POST', headers, body: JSON.stringify(body), signal }
        );

        if (streamRes.ok && streamRes.headers.get('content-type')?.includes('text/event-stream')) {
          replyText = await consumeSSE(streamRes, onDelta);
          if (replyText) break;
          throw Object.assign(new Error('Empty stream'), { status: 500 });
        }

        // Non-SSE response (error or unsupported): try plain generateContent.
        if (!streamRes.ok) {
          const errorBody = await streamRes.text();
          const err = new Error(`HTTP ${streamRes.status}: ${errorBody}`);
          err.status = streamRes.status;
          throw err;
        }
      }

      const res = await fetch(
        `${PROXY_URL}/v1beta/models/${model}:generateContent`,
        { method: 'POST', headers, body: JSON.stringify(body), signal }
      );
      if (!res.ok) {
        const errorBody = await res.text();
        const err = new Error(`HTTP ${res.status}: ${errorBody}`);
        err.status = res.status;
        throw err;
      }
      const data = await res.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      replyText = parts.filter(p => p.text && !p.thought).map(p => p.text).join('\n');
      if (replyText) {
        if (onDelta) onDelta(replyText);
        break;
      }
      throw Object.assign(new Error('Empty response'), { status: 500 });
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      retries++;
      const errorText = err.message || '';
      const status = err.status || 0;
      const is503 = status === 503 || status === 500 || errorText.includes('503') || errorText.includes('demand');
      const is404 = status === 404 || errorText.includes('404') || errorText.includes('not found') || errorText.includes('not supported');
      const is429 = status === 429 || errorText.includes('429');

      if ((is503 || is404 || is429) && retries < maxRetries) {
        if (currentModelIndex < modelQueue.length - 1) currentModelIndex++;
        await new Promise(r => setTimeout(r, 2000 * retries));
        continue;
      }
      
      // Sanitize error messages
      let errorMsg;
      const rawMsg = (errorText || '').toLowerCase();
      
      if (rawMsg.includes('401') || rawMsg.includes('unauthorized')) {
        errorMsg = 'The AI service could not verify this app version. Please update the app or try again later.';
      } else if (rawMsg.includes('api key') || rawMsg.includes('api_key') || rawMsg.includes('403')) {
        errorMsg = 'The AI service is temporarily unavailable. Please try again later.';
      } else if (rawMsg.includes('quota') || rawMsg.includes('rate limit') || rawMsg.includes('429') || rawMsg.includes('too many')) {
        errorMsg = 'The AI service is experiencing high demand. Please wait a moment and try again.';
      } else if (rawMsg.includes('network') || rawMsg.includes('fetch') || rawMsg.includes('failed to fetch') || rawMsg.includes('timeout')) {
        errorMsg = 'Unable to connect to the AI service. Please check your internet connection and try again.';
      } else if (rawMsg.includes('safety') || rawMsg.includes('blocked') || rawMsg.includes('harm')) {
        errorMsg = "I wasn't able to respond to that particular question. Could you try rephrasing it?";
      } else if (rawMsg.includes('503') || rawMsg.includes('overloaded') || rawMsg.includes('unavailable')) {
        errorMsg = 'The AI service is temporarily unavailable. Please try again in a few moments.';
      } else if (rawMsg.includes('404') || rawMsg.includes('not found') || rawMsg.includes('not supported')) {
        errorMsg = 'The AI service is being updated. Please try again shortly.';
      } else {
        errorMsg = 'Something went wrong. Please try again.';
      }
      throw new Error(errorMsg);
    }
  }

  if (!replyText) {
    replyText = "I'm sorry, I couldn't generate a response.";
  }

  return replyText;
}

/**
 * Send a single prompt to the Gemini API via proxy (for explainFindings)
 * @param {string} prompt - The prompt to send
 * @param {string} [systemPrompt] - Optional system prompt
 * @param {number} [temperature=0.3] - Optional temperature
 * @returns {Promise<string>} Assistant response text
 */
export async function askGemini(prompt, systemPrompt, temperature = 0.3) {
  const body = {
    ...(systemPrompt && { systemInstruction: { parts: [{ text: systemPrompt }] } }),
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature },
  };
  
  const responseText = await callProxy(body);
  return responseText;
}

/**
 * Send a message to the Gemini API via proxy with streaming support
 * @param {Array<Object>} chatHistory - Previous messages [{role, content}]
 * @param {string} userMessage - New user message
 * @param {Function} onDelta - Callback for streaming updates
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<string>} Assistant response text
 */
export async function sendChatMessage(chatHistory, userMessage, onDelta, signal) {
  // Build contents array with system instruction and chat history
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
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: { temperature: 0.3 },
  };
  
  const responseText = await callProxy(body, onDelta, signal);
  return responseText;
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
 * Check drug interactions using Gemini via proxy
 */
export async function checkDrugInteractions(drugsList, onDelta, signal) {
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
    systemInstruction: { parts: [{ text: interactionPrompt }] },
    contents: [ { role: 'user', parts: [{ text: userMessage }] } ],
    generationConfig: { temperature: 0.1 },
  };
  
  const responseText = await callProxy(body, onDelta, signal);
  return responseText;
}
