const attempts=new Map();
const MATERIALS=new Set(['architectural asphalt shingles','standing-seam metal roofing','concrete roof tile']);
const COLORS=new Set(['Charcoal gray','Weathered wood brown','Warm desert tan','Deep black','Terracotta','Light gray']);
const clean=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
const reject=(response,status,error)=>response.status(status).json({error});
function rateLimited(request){
  const ip=clean(request.headers['x-forwarded-for']?.split(',')[0],64)||'unknown',now=Date.now(),windowMs=10*60*1000;
  const recent=(attempts.get(ip)||[]).filter(time=>now-time<windowMs);recent.push(now);attempts.set(ip,recent);return recent.length>3;
}
function allowedOrigin(request){
  const origin=clean(request.headers.origin,300),host=clean(request.headers['x-forwarded-host']||request.headers.host,250);
  return origin==='https://estimator.midsizeai.com'||(host&&origin==='https://'+host);
}
module.exports=async function handler(request,response){
  response.setHeader('Cache-Control','no-store');
  response.setHeader('X-Content-Type-Options','nosniff');
  if(request.method!=='POST'){response.setHeader('Allow','POST');return reject(response,405,'Method not allowed');}
  if(!allowedOrigin(request))return reject(response,403,'Origin not allowed');
  if(rateLimited(request))return reject(response,429,'You have reached the prototype limit. Please wait ten minutes and try again.');
  if(!process.env.GEMINI_API_KEY)return reject(response,503,'The roof visualizer is not connected yet.');
  const body=request.body&&typeof request.body==='object'?request.body:{};
  const material=clean(body.material,60),color=clean(body.color,40),image=clean(body.image,6000000);
  if(body.consent!==true||!MATERIALS.has(material)||!COLORS.has(color))return reject(response,400,'Invalid visualization request');
  const match=image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if(!match||match[2].length>5500000)return reject(response,400,'Use a supported photo smaller than the upload limit.');
  const prompt='Edit this homeowner-supplied exterior photograph into a realistic roofing planning concept. Change ONLY the visible roof covering to '+color+' '+material+'. Preserve the exact house structure, roof geometry, pitch, ridges, valleys, eaves, fascia, gutters, vents, chimneys, skylights, solar panels, windows, siding, doors, landscaping, sky, lighting, shadows, camera position, and image dimensions. Do not add or remove architectural features. Keep obstructions such as trees naturally in front of the roof. Apply believable material scale, seams or shingle courses, perspective, and weathering. Do not add text, logos, labels, people, vehicles, or watermarks. This is a concept visualization, not a construction drawing.';
  try{
    const upstream=await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},
      body:JSON.stringify({contents:[{parts:[{text:prompt},{inlineData:{mimeType:match[1],data:match[2]}}]}],generationConfig:{responseModalities:['IMAGE']}}),
      signal:AbortSignal.timeout(90000)
    });
    const payload=await upstream.json().catch(()=>({}));
    if(!upstream.ok){console.error('Gemini visualizer error',upstream.status,payload?.error?.message||'Unknown error');throw new Error('generation_failed');}
    const parts=payload?.candidates?.[0]?.content?.parts||[];
    const generated=parts.find(part=>part.inlineData?.data);
    if(!generated)throw new Error('no_image');
    return response.status(200).json({image:generated.inlineData.data,mimeType:generated.inlineData.mimeType||'image/png'});
  }catch(error){
    console.error('Roof visualization failed:',error.message);
    return reject(response,502,'Gemini could not create this concept. Try a clearer, straight-on photo.');
  }
};
