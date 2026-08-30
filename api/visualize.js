const attempts = new Map();
const ALLOWED_ORIGINS = new Set([
  'https://estimator.midsizeai.com',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''
].filter(Boolean));
const MATERIALS = new Set([
  'architectural asphalt shingles',
  'standing-seam metal roofing',
  'flat-profile concrete tile',
  'traditional clay barrel tile'
]);
const COLORS = new Set([
  'charcoal gray',
  'weathered brown',
  'desert tan',
  'terracotta red',
  'matte black',
  'forest green'
]);
const MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const reject = (response, status, error) => response.status(status).json({ error });

function rateLimited(request) {
  const ip = clean(request.headers['x-forwarded-for']?.split(',')[0], 64) || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const recent = (attempts.get(ip) || []).filter(time => now - time < windowMs);
  recent.push(now);
  attempts.set(ip, recent);
  return recent.length > 3;
}

function findOutputImage(payload) {
  if (payload?.output_image?.data) return payload.output_image;
  for (const step of payload?.steps || []) {
    for (const block of step?.content || []) {
      if (block?.type === 'image' && block?.data) return block;
    }
  }
  return null;
}

module.exports = async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return reject(response, 405, 'Method not allowed');
  }
  if (!ALLOWED_ORIGINS.has(clean(request.headers.origin, 200))) return reject(response, 403, 'Origin not allowed');
  if (rateLimited(request)) return reject(response, 429, 'You have reached the preview limit. Please try again later.');
  if (!process.env.GEMINI_API_KEY) return reject(response, 503, 'The roof visualizer is not configured yet.');

  const body = request.body && typeof request.body === 'object' ? request.body : {};
  if (body.website) return response.status(202).json({ ok: true });
  const imageData = clean(body.imageData, 6_500_000);
  const mimeType = clean(body.mimeType, 30);
  const material = clean(body.material, 80);
  const color = clean(body.color, 40);
  if (!body.consent || !imageData || !MIME_TYPES.has(mimeType) || !MATERIALS.has(material) || !COLORS.has(color)) {
    return reject(response, 400, 'Invalid visualization request');
  }
  if (!/^[A-Za-z0-9+/=]+$/.test(imageData) || Buffer.byteLength(imageData, 'base64') > 4_500_000) {
    return reject(response, 413, 'The prepared photo is too large');
  }

  const prompt = [
    'Edit this homeowner-provided exterior house photo.',
    `Change only the visible roof surfaces to realistic ${color} ${material}.`,
    'Preserve the exact house structure, roof shape and pitch, walls, windows, doors, driveway, landscaping, sky, camera angle, perspective, shadows and lighting.',
    'Do not add or remove architecture, solar panels, people, vehicles, signs or text.',
    'Keep roof edges, valleys, ridges, flashing and penetrations physically plausible.',
    'Return a photorealistic concept visualization, not a diagram, collage, split screen or labeled image.'
  ].join(' ');

  try {
    const upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        model: 'gemini-3.1-flash-image',
        input: [
          { type: 'text', text: prompt },
          { type: 'image', mime_type: mimeType, data: imageData }
        ],
        response_format: { type: 'image', mime_type: 'image/png' }
      }),
      signal: AbortSignal.timeout(90000)
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error('Gemini visualizer error:', upstream.status, payload?.error?.message || 'Unknown error');
      return reject(response, upstream.status === 429 ? 429 : 502, upstream.status === 429 ? 'The visualizer is busy. Please try again shortly.' : 'The visualizer could not create this preview.');
    }
    const image = findOutputImage(payload);
    if (!image) return reject(response, 502, 'Gemini did not return a preview image.');
    return response.status(200).json({
      imageData: image.data,
      mimeType: image.mime_type || image.mimeType || 'image/png'
    });
  } catch (error) {
    console.error('Roof visualization failed:', error.message);
    return reject(response, 502, 'The visualizer could not create this preview.');
  }
};
