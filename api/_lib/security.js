const canonicalOrigin = 'https://estimator.midsizeai.com';

function allowedOrigins() {
  const origins = new Set([canonicalOrigin]);
  for (const host of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]) {
    if (host && /^[a-z0-9.-]+\.vercel\.app$/i.test(host)) origins.add(`https://${host}`);
  }
  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3000'); origins.add('http://localhost:5173');
  }
  return origins;
}

function readJson(request, response, maxBytes) {
  const reject = (status, error) => { response.status(status).json({error}); return null; };
  if (!allowedOrigins().has(request.headers?.origin)) return reject(403, 'Origin not allowed');
  const mediaType = String(request.headers?.['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (mediaType !== 'application/json') return reject(415, 'Expected a JSON request');
  const length = request.headers?.['content-length'];
  if (length !== undefined && (!/^\d+$/.test(String(length)) || Number(length) > maxBytes)) return reject(413, 'Request is too large');
  try {
    const text = typeof request.body === 'string' ? request.body : JSON.stringify(request.body ?? null);
    if (Buffer.byteLength(text, 'utf8') > maxBytes) return reject(413, 'Request is too large');
    const body = typeof request.body === 'string' ? JSON.parse(text) : request.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) return reject(400, 'Invalid request');
    return body;
  } catch { return reject(400, 'Invalid JSON request'); }
}

// A bounded instance-local fallback; edge/provider quotas are still required.
function createLimiter(limit, windowMs, maxBuckets = 5000) {
  const buckets = new Map();
  return (request, now = Date.now()) => {
    const forwarded = request.headers?.['x-forwarded-for'];
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim().slice(0,64) : 'unknown';
    for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
    const bucket = buckets.get(ip);
    if (bucket) { if (bucket.count >= limit) return true; bucket.count++; return false; }
    if (buckets.size >= maxBuckets) return true;
    buckets.set(ip, {count: 1, resetAt: now + windowMs}); return false;
  };
}
module.exports = {readJson, createLimiter};
