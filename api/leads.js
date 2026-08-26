const attempts = new Map();
const ALLOWED_ORIGINS = new Set(['https://estimator.midsizeai.com']);
const CONTACT_METHODS = new Set(['email', 'phone', 'text']);
const MATERIALS = new Set(['shingle', 'tile', 'tileReuse', 'metal', 'flat']);
const COMPLEXITIES = new Set(['simple', 'moderate', 'complex']);
const AGES = new Set(['new', 'mid', 'old']);

const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const inRange = (value, min, max) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
};
const reject = (response, status, error) => response.status(status).json({ error });

function rateLimited(request) {
  const ip = clean(request.headers['x-forwarded-for']?.split(',')[0], 64) || 'unknown';
  const now = Date.now(), windowMs = 10 * 60 * 1000;
  const recent = (attempts.get(ip) || []).filter(time => now - time < windowMs);
  recent.push(now);
  attempts.set(ip, recent);
  return recent.length > 5;
}

module.exports = async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return reject(response, 405, 'Method not allowed');
  }
  if (!ALLOWED_ORIGINS.has(clean(request.headers.origin, 200))) return reject(response, 403, 'Origin not allowed');
  if (rateLimited(request)) return reject(response, 429, 'Too many requests');
  if (!process.env.MAKE_WEBHOOK_URL || !process.env.MAKE_WEBHOOK_API_KEY) return reject(response, 503, 'Lead service unavailable');

  const body = request.body && typeof request.body === 'object' ? request.body : {};
  if (body.website) return response.status(202).json({ ok: true });
  const lead = {
    name: clean(body.name, 80), email: clean(body.email, 254).toLowerCase(), phone: clean(body.phone, 30),
    contactMethod: clean(body.contactMethod, 10), zip: clean(body.zip, 5), sqft: inRange(body.sqft, 500, 15000),
    low: inRange(body.low, 0, 1000000), high: inRange(body.high, 0, 1000000),
    roofArea: inRange(body.roofArea, 100, 50000), stories: inRange(body.stories, 1, 10),
    material: clean(body.material, 20), complexity: clean(body.complexity, 20), age: clean(body.age, 10),
    region: clean(body.region, 80), tearOff: body.tearOff === true, leak: body.leak === true,
    decking: body.decking === true, solar: body.solar === true, consent: body.consent === true,
    source: 'MidSize AI Roof Cost Estimator'
  };
  const digits = lead.phone.replace(/\D/g, '');
  const validEmail = !lead.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email);
  const validPhone = !lead.phone || (digits.length >= 10 && digits.length <= 15);
  const validEstimate = lead.sqft !== null && lead.low !== null && lead.high !== null && lead.roofArea !== null &&
    lead.stories !== null && /^\d{5}$/.test(lead.zip) && MATERIALS.has(lead.material) &&
    COMPLEXITIES.has(lead.complexity) && AGES.has(lead.age);
  if (!lead.name || (!lead.email && !lead.phone) || !validEmail || !validPhone || !CONTACT_METHODS.has(lead.contactMethod) ||
      !lead.consent || !validEstimate || (lead.contactMethod === 'email' && !lead.email) ||
      (lead.contactMethod !== 'email' && !lead.phone)) return reject(response, 400, 'Invalid submission');

  const makeBody = new URLSearchParams({ ...lead,
    tearOff: lead.tearOff ? 'Yes' : 'No', leak: lead.leak ? 'Yes' : 'No',
    decking: lead.decking ? 'Yes' : 'No', solar: lead.solar ? 'Yes' : 'No', consent: 'Yes'
  });
  try {
    const upstream = await fetch(process.env.MAKE_WEBHOOK_URL, {
      method: 'POST', headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'x-make-apikey': process.env.MAKE_WEBHOOK_API_KEY
      },
      body: makeBody, signal: AbortSignal.timeout(8000)
    });
    if (!upstream.ok) throw new Error(`Make returned ${upstream.status}`);
    return response.status(200).json({ ok: true });
  } catch (error) {
    console.error('Lead handoff failed:', error.message);
    return reject(response, 502, 'Lead service unavailable');
  }
};
