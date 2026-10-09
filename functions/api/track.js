/**
 * track.js — GrandBelle tracking proxy
 *
 * CPU note: Cloudflare Pages (free tier) limits each invocation to 10ms CPU time.
 * Keep this handler lean; no heavy computation or large bundle imports.
 */

// ---------------------------------------------------------------------------
// In-memory IP rate limiter
// ---------------------------------------------------------------------------
// Caveat: per-invocation Map — resets on each isolate cold-start.
// For production across many edge nodes, replace with Cloudflare KV or a
// dedicated rate-limit service (e.g. Upstash Redis).
// ---------------------------------------------------------------------------
const ipCounts = new Map(); // ip -> { count: number, windowStart: number }

const RATE_LIMIT = 100;       // max requests per IP per window
const WINDOW_MS  = 60_000;    // 1 minute

function isRateLimited(ip) {
  const now = Date.now();
  const record = ipCounts.get(ip);

  if (!record || now - record.windowStart > WINDOW_MS) {
    // new window
    ipCounts.set(ip, { count: 1, windowStart: now });
    return false;
  }

  if (record.count >= RATE_LIMIT) {
    return true;
  }

  record.count++;
  return false;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export async function onRequest(context) {
  // CORS preflight
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age':        '86400',
      },
    });
  }

  const ip = context.request.headers.get('CF-Connecting-IP')
           || context.request.headers.get('x-forwarded-for')?.split(',')[0].trim()
           || 'unknown';

  if (isRateLimited(ip)) {
    return jsonResponse({ error: 'Too many requests. Please wait a moment.' }, 429, ip);
  }

  // Extract tracking ID from URL path: /api/track/{trackingId}
  const trackingId = context.params?.trackingId;
  if (!trackingId) {
    return jsonResponse({ error: 'Missing tracking ID.' }, 400, ip);
  }

  try {
    const wpUrl = `https://grandbelleinternational.com/gbcm/v1/track/${encodeURIComponent(trackingId)}`;
    const wpResponse = await fetch(wpUrl, {
      method:  'GET',
      headers: { 'Accept': 'application/json' },
    });

    let data;
    try {
      data = await wpResponse.json();
    } catch {
      data = { raw: await wpResponse.text() };
    }

    return jsonResponse(
      { ok: true, trackingId, data },
      wpResponse.ok ? 200 : 502,
      ip,
    );
  } catch (err) {
    console.error('[track] proxy error:', err);
    return jsonResponse({ error: 'Tracking service unavailable.' }, 503, ip);
  }
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function jsonResponse(body, status, ip) {
  const headers = {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
    'X-Client-IP':                 ip,
  };
  return new Response(JSON.stringify(body), { status, headers });
}
