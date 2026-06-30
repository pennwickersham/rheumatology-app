// Proxy URL — points to the Cloudflare Worker that holds the API key server-side.
// The API key NEVER appears in client code.
// Set VITE_PROXY_URL in .env (local) or Appflow Environment (cloud builds).
const PROXY_URL = import.meta.env.VITE_PROXY_URL || '';

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
 * Send a message to the Gemini API via proxy
 * @param {Array<Object>} chatHistory - Previous messages [{role, content}]
 * @param {string} userMessage - New user message
 * @returns {Promise<string>} Assistant response text
 */
export async function sendChatMessage(chatHistory, userMessage) {
  if (!PROXY_URL) {
    throw new Error('AI service not configured. Please set VITE_PROXY_URL environment variable.');
  }

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

  // Multi-Model Fallback & Retry logic
  let responseData;
  let retries = 0;
  const maxRetries = 5;
  const modelQueue = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'];
  let currentModelIndex = 0;
  
  while (retries < maxRetries) {
    const currentModelName = modelQueue[currentModelIndex];
    try {
      const body = {
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents,
        generationConfig: {
          temperature: 0.3,
        },
      };

      const response = await fetch(
        `${PROXY_URL}/v1beta/models/${currentModelName}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        const err = new Error(`HTTP ${response.status}: ${errorBody}`);
        err.status = response.status;
        throw err;
      }

      responseData = await response.json();
      break; // Success!
    } catch (err) {
      retries++;
      const errorText = err.message || "";
      const status = err.status || 0;
      const is503 = status === 503 || errorText.includes('503') || errorText.includes('demand');
      const is404 = status === 404 || errorText.includes('404') || errorText.includes('not found') || errorText.includes('not supported');
      
      if ((is503 || is404) && retries < maxRetries) {
        if (currentModelIndex < modelQueue.length - 1) {
          console.log(`Model ${modelQueue[currentModelIndex]} failed (${is404 ? '404' : '503'}). Trying ${modelQueue[currentModelIndex + 1]}...`);
          currentModelIndex++;
        }
        
        console.log(`Retry ${retries}/${maxRetries} using ${modelQueue[currentModelIndex]}...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * retries)); 
        continue;
      }
      
      // Sanitize error messages
      let errorMsg;
      const rawMsg = errorText.toLowerCase();
      
      if (rawMsg.includes('api key') || rawMsg.includes('api_key') || rawMsg.includes('unauthorized') || rawMsg.includes('403')) {
        errorMsg = "The AI service is temporarily unavailable. Please try again later.";
      } else if (rawMsg.includes('quota') || rawMsg.includes('rate limit') || rawMsg.includes('429')) {
        errorMsg = "The AI service is experiencing high demand. Please wait a moment and try again.";
      } else if (rawMsg.includes('network') || rawMsg.includes('fetch') || rawMsg.includes('failed to fetch') || rawMsg.includes('timeout')) {
        errorMsg = "Unable to connect to the AI service. Please check your internet connection and try again.";
      } else if (rawMsg.includes('safety') || rawMsg.includes('blocked') || rawMsg.includes('harm')) {
        errorMsg = "I wasn't able to respond to that particular question. Could you try rephrasing it?";
      } else if (rawMsg.includes('503') || rawMsg.includes('overloaded') || rawMsg.includes('unavailable')) {
        errorMsg = "The AI service is temporarily unavailable. Please try again in a few moments.";
      } else if (rawMsg.includes('404') || rawMsg.includes('not found') || rawMsg.includes('not supported')) {
        errorMsg = "The AI service is being updated. Please try again shortly.";
      } else {
        errorMsg = "Something went wrong. Please try again.";
      }
      throw new Error(errorMsg);
    }
  }

  // Extract text from response JSON
  let replyText = '';
  const parts = responseData?.candidates?.[0]?.content?.parts || [];
  replyText = parts
    .filter(p => p.text && !p.thought)
    .map(p => p.text)
    .join('\n') || "I'm sorry, I couldn't generate a response.";

  return replyText;
}

/**
 * Get the API key from localStorage
 */
export function getApiKey() {
  return localStorage.getItem('rheum_gemini_api_key') || '';
}

/**
 * Save the API key to localStorage
 */
export function setApiKey(key) {
  localStorage.setItem('rheum_gemini_api_key', key);
}

/**
 * Check if API key is set
 */
export function hasApiKey() {
  return !!getApiKey();
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
export async function checkDrugInteractions(drugsList) {
  if (!PROXY_URL) {
    throw new Error('AI service not configured. Please set VITE_PROXY_URL environment variable.');
  }
  
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

  // Multi-Model Fallback & Retry logic
  let responseData;
  let retries = 0;
  const maxRetries = 5;
  const modelQueue = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'];
  let currentModelIndex = 0;
  
  while (retries < maxRetries) {
    const currentModelName = modelQueue[currentModelIndex];
    try {
      const body = {
        systemInstruction: { parts: [{ text: interactionPrompt }] },
        contents: [ { role: 'user', parts: [{ text: userMessage }] } ],
        generationConfig: { temperature: 0.1 },
      };

      const response = await fetch(
        `${PROXY_URL}/v1beta/models/${currentModelName}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        const err = new Error(`HTTP ${response.status}: ${errorBody}`);
        err.status = response.status;
        throw err;
      }

      responseData = await response.json();
      break; // Success!
    } catch (err) {
      retries++;
      const errorText = err.message || "";
      const status = err.status || 0;
      const is503 = status === 503 || errorText.includes('503') || errorText.includes('demand');
      const is404 = status === 404 || errorText.includes('404') || errorText.includes('not found') || errorText.includes('not supported');
      
      if ((is503 || is404) && retries < maxRetries) {
        if (currentModelIndex < modelQueue.length - 1) {
          console.log(`Model ${modelQueue[currentModelIndex]} failed (${is404 ? '404' : '503'}). Trying ${modelQueue[currentModelIndex + 1]}...`);
          currentModelIndex++;
        }
        
        console.log(`Retry ${retries}/${maxRetries} using ${modelQueue[currentModelIndex]}...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * retries)); 
        continue;
      }
      
      // Sanitize error messages
      let errorMsg;
      const rawMsg = errorText.toLowerCase();
      
      if (rawMsg.includes('api key') || rawMsg.includes('api_key') || rawMsg.includes('unauthorized') || rawMsg.includes('403')) {
        errorMsg = "The AI service is temporarily unavailable. Please try again later.";
      } else if (rawMsg.includes('quota') || rawMsg.includes('rate limit') || rawMsg.includes('429')) {
        errorMsg = "The AI service is experiencing high demand. Please wait a moment and try again.";
      } else if (rawMsg.includes('network') || rawMsg.includes('fetch') || rawMsg.includes('failed to fetch') || rawMsg.includes('timeout')) {
        errorMsg = "Unable to connect to the AI service. Please check your internet connection and try again.";
      } else {
        errorMsg = "Something went wrong. Please try again.";
      }
      throw new Error(errorMsg);
    }
  }

  const text = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No interaction data returned.');
  
  return text;
}

