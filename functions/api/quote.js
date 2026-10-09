/**
 * quote.js — GrandBelle quote request handler
 *
 * CPU note: Cloudflare Pages (free tier) limits each invocation to 10ms CPU time.
 * Keep this handler lean; avoid heavy imports and large bundle dependencies.
 */

// ---------------------------------------------------------------------------
// In-memory IP rate limiter (same strategy as track.js)
// ---------------------------------------------------------------------------
const ipCounts = new Map(); // ip -> { count: number, windowStart: number }

const RATE_LIMIT = 5;        // max POST requests per IP per window
const WINDOW_MS  = 60_000;   // 1 minute

function isRateLimited(ip) {
  const now = Date.now();
  const record = ipCounts.get(ip);

  if (!record || now - record.windowStart > WINDOW_MS) {
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
// Input validation
// ---------------------------------------------------------------------------
function validate(body) {
  const errors = [];

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 1) {
    errors.push('name is required.');
  }

  if (!body.email || typeof body.email !== 'string') {
    errors.push('email is required.');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    errors.push('email format is invalid.');
  }

  if (!body.service || typeof body.service !== 'string' || body.service.trim().length < 1) {
    errors.push('service is required.');
  }

  // phone is optional but must be a non-empty string if provided
  if (body.phone !== undefined && body.phone !== null && typeof body.phone !== 'string') {
    errors.push('phone must be a string.');
  }

  // message is optional
  if (body.message !== undefined && body.message !== null && typeof body.message !== 'string') {
    errors.push('message must be a string.');
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export async function onRequest(context) {
  // Only allow POST
  if (context.request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed. Use POST.' }, 405);
  }

  const ip = context.request.headers.get('CF-Connecting-IP')
           || context.request.headers.get('x-forwarded-for')?.split(',')[0].trim()
           || 'unknown';

  if (isRateLimited(ip)) {
    return jsonResponse({ error: 'Too many requests. Please wait a moment.' }, 429, ip);
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400, ip);
  }

  const errors = validate(body);
  if (errors.length > 0) {
    return jsonResponse({ error: errors.join(' ') }, 422, ip);
  }

  const { name, email, phone, service, message } = body;
  const trimmedName    = name.trim();
  const trimmedEmail  = email.trim().toLowerCase();
  const trimmedPhone  = phone?.trim() || '';
  const trimmedService = service.trim();
  const trimmedMessage = message?.trim() || '';

  const env = context.env || {};
  const apiKey = env.RESEND_API_KEY;

  if (!apiKey) {
    console.error('[quote] RESEND_API_KEY is not set in environment.');
    return jsonResponse({ error: 'Email service is not configured.' }, 500, ip);
  }

  const emailPayload = {
    from:    'GrandBelle <noreply@grandbelleinternational.com>',
    to:      ['hello@grandbelleinternational.com'],
    replyTo: trimmedEmail,
    subject: `Quote request from ${trimmedName}`,
    html: buildEmailHtml({ name: trimmedName, email: trimmedEmail, phone: trimmedPhone, service: trimmedService, message: trimmedMessage }),
    text: buildEmailText({ name: trimmedName, email: trimmedEmail, phone: trimmedPhone, service: trimmedService, message: trimmedMessage }),
  };

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text().catch(() => '');
      console.error('[quote] Resend API error:', resendResponse.status, errText);
      return jsonResponse({ error: 'Failed to send email. Please try again.' }, 502, ip);
    }

    const resendData = await resendResponse.json();
    console.log('[quote] Email sent:', resendData);

    return jsonResponse({ ok: true, message: 'Quote request received. We will be in touch shortly.' }, 200, ip);
  } catch (err) {
    console.error('[quote] Unexpected error:', err);
    return jsonResponse({ error: 'An unexpected error occurred.' }, 500, ip);
  }
}

// ---------------------------------------------------------------------------
// Email body builders
// ---------------------------------------------------------------------------
function buildEmailHtml({ name, email, phone, service, message }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
  <h2 style="color:#1a1a2e;">New Quote Request</h2>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:8px 0;font-weight:bold;width:120px;">Name</td><td style="padding:8px 0;">${escapeHtml(name)}</td></tr>
    <tr><td style="padding:8px 0;font-weight:bold;">Email</td><td style="padding:8px 0;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
    <tr><td style="padding:8px 0;font-weight:bold;">Phone</td><td style="padding:8px 0;">${escapeHtml(phone) || '<em>not provided</em>'}</td></tr>
    <tr><td style="padding:8px 0;font-weight:bold;">Service</td><td style="padding:8px 0;">${escapeHtml(service)}</td></tr>
  </table>
  ${message ? `<h3 style="margin-top:20px 0 8px;">Message</h3><p style="white-space:pre-wrap;">${escapeHtml(message)}</p>` : ''}
</body>
</html>`;
}

function buildEmailText({ name, email, phone, service, message }) {
  let text = `New Quote Request\n${'='.repeat(40)}\nName:    ${name}\nEmail:   ${email}\nPhone:   ${phone || 'not provided'}\nService: ${service}\n`;
  if (message) text += `\nMessage:\n${message}\n`;
  return text;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function jsonResponse(body, status, ip) {
  const headers = {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
  };
  if (ip) headers['X-Client-IP'] = ip;
  return new Response(JSON.stringify(body), { status, headers });
}
