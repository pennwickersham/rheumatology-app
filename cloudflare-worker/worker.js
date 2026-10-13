/**
 * RheumCompanion — Gemini API Proxy (Cloudflare Worker)
 *
 * This Worker sits between the RheumCompanion app and the Google Gemini API.
 * It injects the API key server-side so the key NEVER appears in
 * the client JS bundle, APK, or IPA.
 *
 * DEPLOYMENT:
 *   1. Log in at https://dash.cloudflare.com → Workers & Pages → Create
 *   2. Name it "rheumcompanion-proxy"
 *   3. Paste this entire file into the Worker editor and click "Deploy"
 *   4. Add a Secret:  Settings → Variables & Secrets → Add Secret
 *      Name:  GEMINI_API_KEY
 *      Value: <your Gemini API key>
 *   5. (Recommended) Add a second Secret:  APP_TOKEN  — the same value as VITE_APP_TOKEN
 *      in the app build. When set, requests without a matching X-App-Token are rejected.
 *
 * The Worker URL will be: https://rheumcompanion-proxy.<your-subdomain>.workers.dev
 */

// Allowed origins — add your production domains here
const ALLOWED_ORIGINS = [
  'http://localhost:5173',        // local dev
  'http://localhost:5174',        // local dev alt port
  'capacitor://localhost',        // iOS Capacitor
  'http://localhost',             // Android Capacitor
  'https://localhost',            // Android Capacitor (secure)
];

/**
 * Check if the origin is allowed. For Capacitor apps on Android the
 * Origin header may be missing entirely, so we allow null origins too.
 */
function isAllowedOrigin(origin) {
  if (!origin) return true; // Capacitor native webview (no origin header)
  return ALLOWED_ORIGINS.includes(origin);
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Token',
    'Access-Control-Max-Age': '86400',
  };
}

// Best-effort per-client rate limit (resets when the Worker instance recycles).
// For a hard limit use Cloudflare's Rate Limiting rules in the dashboard.
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;
const MAX_BODY_BYTES = 200 * 1024;
const hits = new Map();

function rateLimited(key) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter(t => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_REQUESTS_PER_WINDOW;
}

const jsonError = (status, message, origin) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');

    // --- CORS preflight ---
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    // --- Only allow POST ---
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }

    // --- Origin check ---
    if (!isAllowedOrigin(origin)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // --- App token (enabled when the APP_TOKEN secret is set) ---
    if (env.APP_TOKEN && request.headers.get('X-App-Token') !== env.APP_TOKEN) {
      return jsonError(401, 'Unauthorized', origin);
    }

    // --- Rate limit and body size ---
    const client = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (rateLimited(client)) return jsonError(429, 'Too many requests. Please wait a minute.', origin);
    const declaredLength = Number(request.headers.get('Content-Length') || 0);
    if (declaredLength > MAX_BODY_BYTES) return jsonError(413, 'Request too large', origin);

    // --- Extract the path: e.g. /v1beta/models/gemini-2.5-pro:generateContent ---
    const url = new URL(request.url);
    const path = url.pathname; // e.g. "/v1beta/models/gemini-2.5-pro:generateContent"

    if (!/^\/v1beta\/models\/[\w.-]+:(generateContent|streamGenerateContent)$/.test(path)) {
      return new Response(JSON.stringify({ error: 'Invalid path. Use /v1beta/models/{model}:generateContent' }), {
        status: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }

    // --- Forward to Google Gemini API ---
    const targetUrl = `https://generativelanguage.googleapis.com${path}`;

    try {
      const geminiResponse = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.GEMINI_API_KEY,
        },
        body: request.body,
      });

      // Stream the response back with CORS headers
      const responseHeaders = new Headers(geminiResponse.headers);
      Object.entries(corsHeaders(origin)).forEach(([k, v]) => responseHeaders.set(k, v));

      return new Response(geminiResponse.body, {
        status: geminiResponse.status,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Proxy error', details: err.message }), {
        status: 502,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }
  },
};
