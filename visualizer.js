const $=selector=>document.querySelector(selector);
let preparedImage=null;
let generatedDataUrl='';
const status=(message,type='')=>{const el=$('#visualizerStatus');el.textContent=message;el.className='fine status '+type};
function track(name,parameters={}){if(typeof window.gtag==='function')window.gtag('event',name,parameters)}
async function preparePhoto(file){
  if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a JPG, PNG, or WebP image.');
  if(file.size>7*1024*1024)throw new Error('Choose an image smaller than 7 MB.');
  const source=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('We could not read that image.'));image.src=URL.createObjectURL(file)});
  const max=1600,scale=Math.min(1,max/Math.max(source.naturalWidth,source.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.round(source.naturalWidth*scale);canvas.height=Math.round(source.naturalHeight*scale);
  canvas.getContext('2d').drawImage(source,0,0,canvas.width,canvas.height);
  URL.revokeObjectURL(source.src);
  return canvas.toDataURL('image/jpeg',.88);
}
$('#homePhoto').addEventListener('change',async event=>{
  preparedImage=null;generatedDataUrl='';$('#generatedResult').hidden=true;$('#emptyResult').hidden=false;
  try{
    status('Preparing photo…','working');
    preparedImage=await preparePhoto(event.target.files[0]);
    $('#sourceImage').src=preparedImage;$('#uploadPreview').hidden=false;
    status('Photo ready. Choose a roof and generate your concept.');
    track('roof_visualizer_photo_ready');
  }catch(error){$('#uploadPreview').hidden=true;status(error.message,'error')}
});
$('#visualizerForm').addEventListener('submit',async event=>{
  event.preventDefault();
  if(!preparedImage)return status('Choose a clear exterior photo first.','error');
  if(!$('#photoConsent').checked)return status('Please confirm the photo permission and concept disclaimer.','error');
  const material=$('input[name=roofMaterial]:checked').value,color=$('#roofColor').value,button=$('#generateRoof');
  button.disabled=true;button.textContent='Creating concept…';status('Gemini is changing only the roof. This can take up to a minute.','working');
  track('roof_visualizer_generate_start',{roof_material:material,roof_color:color});
  try{
    const response=await fetch('/api/visualize-roof',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:preparedImage,material,color,consent:true})});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.error||'The concept could not be generated.');
    generatedDataUrl='data:'+payload.mimeType+';base64,'+payload.image;
    $('#resultImage').src=generatedDataUrl;$('#conceptTitle').textContent=color+' '+material;
    $('#emptyResult').hidden=true;$('#generatedResult').hidden=false;
    status('Your concept is ready. Review it for obvious AI mistakes.');
    track('roof_visualizer_generate_success',{roof_material:material,roof_color:color});
    $('#generatedResult').scrollIntoView({behavior:'smooth',block:'start'});
  }catch(error){
    status(error.message,'error');track('roof_visualizer_generate_error',{message:error.message.slice(0,80)});
  }finally{button.disabled=false;button.textContent='Generate roof concept'}
});
$('#downloadConcept').addEventListener('click',()=>{
  if(!generatedDataUrl)return;
  const link=document.createElement('a');link.href=generatedDataUrl;link.download='midsizeai-roof-concept.png';link.click();
  track('roof_visualizer_download');
});
