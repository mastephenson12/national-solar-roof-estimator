const {readJson, createLimiter} = require('./_lib/security');
const rateLimited = createLimiter(10, 900000);
const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const reject = (response, status, error, extra = {}) => response.status(status).json({ error, ...extra });

module.exports = async function handler(request, response) {
  response.setHeader('Cache-Control', 'private, no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return reject(response, 405, 'Method not allowed');
  }
  const body = readJson(request, response, 2048);
  if (!body) return;
  if (rateLimited(request)) return reject(response, 429, 'Too many address checks. Please try again later.');
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return reject(response, 503, 'Address lookup is not configured yet. You can still upload your own photo.');
  }

  const address = clean(body.address, 200);
  if (address.length < 6) return reject(response, 400, 'Enter a complete street address.');

  const params = new URLSearchParams({
    location: address,
    source: 'outdoor',
    key: process.env.GOOGLE_MAPS_API_KEY
  });

  try {
    const metadataResponse = await fetch(`https://maps.googleapis.com/maps/api/streetview/metadata?${params}`, {
      signal: AbortSignal.timeout(10000)
    });
    const metadata = await metadataResponse.json().catch(() => ({}));
    if (!metadataResponse.ok || metadata.status !== 'OK') {
      if (metadata.status === 'ZERO_RESULTS' || metadata.status === 'NOT_FOUND') {
        return response.status(404).json({ available: false });
      }
      console.error('Street View metadata error:', metadata.status || metadataResponse.status, metadata.error_message || '');
      return reject(response, 502, 'Street View is temporarily unavailable.');
    }

    const imageParams = new URLSearchParams({
      size: '640x400',
      location: `${metadata.location.lat},${metadata.location.lng}`,
      pano: metadata.pano_id || '',
      fov: '90',
      pitch: '0',
      source: 'outdoor',
      return_error_code: 'true',
      key: process.env.GOOGLE_MAPS_API_KEY
    });
    if (!metadata.pano_id) imageParams.delete('pano');
    const imageResponse = await fetch(`https://maps.googleapis.com/maps/api/streetview?${imageParams}`, {
      signal: AbortSignal.timeout(15000)
    });
    if (!imageResponse.ok) return response.status(404).json({ available: false });
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) return reject(response, 502, 'Street View returned an invalid response.');
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    if (imageBuffer.length > 2_000_000) return reject(response, 502, 'Street View image was unexpectedly large.');
    return response.status(200).json({
      available: true,
      imageData: imageBuffer.toString('base64'),
      mimeType: contentType.split(';')[0]
    });
  } catch (error) {
    console.error('Street View lookup failed:', error.message);
    return reject(response, 502, 'Street View is temporarily unavailable.');
  }
};
