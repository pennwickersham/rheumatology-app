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
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

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

    // --- Extract the path: e.g. /v1beta/models/gemini-2.5-pro:generateContent ---
    const url = new URL(request.url);
    const path = url.pathname; // e.g. "/v1beta/models/gemini-2.5-pro:generateContent"

    if (!path.startsWith('/v1beta/')) {
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
