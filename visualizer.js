const $ = selector => document.querySelector(selector);
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
let originalUrl = '';
let generatedUrl = '';

function showNotice(message, ok = false) {
  const notice = $('#visualizerNotice');
  notice.className = `notice ${ok ? 'ok' : 'bad'}`;
  notice.textContent = message;
}

function track(name, params = {}) {
  if (typeof window.gtag === 'function') window.gtag('event', name, params);
}

function setStage(stage, image, url) {
  if (!url) return;
  image.src = url;
  image.hidden = false;
  stage.classList.remove('empty');
  stage.querySelector('span').hidden = true;
}

async function resizeImage(file) {
  const source = await createImageBitmap(file);
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  context.drawImage(source, 0, 0, width, height);
  source.close();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.86));
  if (!blob) throw new Error('We could not prepare that photo.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('We could not read that photo.'));
    reader.readAsDataURL(blob);
  });
}

$('#housePhoto').addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    event.target.value = '';
    return showNotice('Choose a JPEG, PNG or WebP photo.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    event.target.value = '';
    return showNotice('Choose a photo smaller than 8 MB.');
  }
  if (originalUrl) URL.revokeObjectURL(originalUrl);
  originalUrl = URL.createObjectURL(file);
  generatedUrl = '';
  const afterStage = $('#afterStage');
  const afterImage = $('#afterImage');
  afterImage.removeAttribute('src');
  afterImage.hidden = true;
  afterStage.classList.add('empty');
  afterStage.querySelector('span').hidden = false;
  $('#downloadPreview').hidden = true;
  setStage($('#beforeStage'), $('#beforeImage'), originalUrl);
  showNotice('Photo ready. Choose a material and color, then create your preview.', true);
  track('roof_visualizer_photo_selected', { file_type: file.type });
});

$('#generateRoof').addEventListener('click', async () => {
  const file = $('#housePhoto').files?.[0];
  const material = $('#roofMaterial').value;
  const color = $('input[name="roofColor"]:checked')?.value;
  if (!file) return showNotice('Choose a clear exterior photo first.');
  if (!$('#aiConsent').checked) return showNotice('Please confirm the AI photo consent before continuing.');

  const button = $('#generateRoof');
  button.disabled = true;
  button.textContent = 'Creating Preview…';
  showNotice('Gemini is creating the roof concept. This can take up to a minute.', true);
  track('roof_visualizer_started', { material, color });

  try {
    const imageData = await resizeImage(file);
    const response = await fetch('/api/visualize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData, mimeType: 'image/jpeg', material, color, consent: true, website: '' })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'The visualizer could not create a preview.');
    generatedUrl = `data:${payload.mimeType || 'image/png'};base64,${payload.imageData}`;
    setStage($('#afterStage'), $('#afterImage'), generatedUrl);
    $('#downloadPreview').hidden = false;
    showNotice('Your concept preview is ready. Compare it with physical samples before choosing a roof.', true);
    track('roof_visualizer_completed', { material, color });
  } catch (error) {
    showNotice(error.message || 'The visualizer could not create a preview. Please try again.');
    track('roof_visualizer_error', { material, color });
  } finally {
    button.disabled = false;
    button.textContent = 'Create My Roof Preview';
  }
});

$('#downloadPreview').addEventListener('click', () => {
  if (!generatedUrl) return;
  const link = document.createElement('a');
  link.href = generatedUrl;
  link.download = 'midsize-ai-roof-concept.jpg';
  link.click();
  track('roof_visualizer_downloaded');
});
