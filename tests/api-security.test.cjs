const test=require('node:test');const assert=require('node:assert/strict');
const {readJson,createLimiter}=require('../api/_lib/security');
const handlers=['leads','streetview','visualize'].map(name=>require('../api/'+name));
function res(){return {setHeader(){},status(code){this.code=code;return this},json(data){this.data=data;return this}}}
function req(body,headers={}){return {method:'POST',body,headers:{origin:'https://estimator.midsizeai.com','content-type':'application/json',host:'estimator.midsizeai.com',...headers}}}
test('exact origin, JSON, shape and actual byte limits protect all handlers before provider calls',async()=>{
 const before=global.fetch;let calls=0;global.fetch=async()=>{calls++;throw Error('no provider call expected');};
 try {
  for(const handler of handlers){
   for(const [body,headers,status]of [[{}, {origin:'https://attacker.vercel.app'},403],[{}, {'content-type':'text/plain'},415],['{',{},400],[[],{},400],[{text:'x'.repeat(4400001)}, {'content-length':'2'},413]]){
    const response=res();await handler(req(body,headers),response);assert.equal(response.code,status);
   }
  }
  assert.equal(calls,0);
 }finally{global.fetch=before;}
});
test('body guard bounds parsed objects and UTF-8 bytes; request Host cannot authorize an attacker',()=>{
 let response=res();assert.deepEqual(readJson(req({ok:true}),response,100),{ok:true});
 response=res();assert.equal(readJson(req({text:'🌵'.repeat(25)}),response,100),null);assert.equal(response.code,413);
 response=res();assert.equal(readJson(req({}, {origin:'https://attacker.example',host:'attacker.example'}),response,100),null);assert.equal(response.code,403);
});
test('limiter bounds memory and preserves active limits until expiration',()=>{
 const limited=createLimiter(1,1000,2);
 assert.equal(limited(req({}, {'x-forwarded-for':'a'}),0),false);
 assert.equal(limited(req({}, {'x-forwarded-for':'a'}),1),true);
 assert.equal(limited(req({}, {'x-forwarded-for':'b'}),1),false);
 assert.equal(limited(req({}, {'x-forwarded-for':'c'}),1),true);
 assert.equal(limited(req({}, {'x-forwarded-for':'c'}),1001),false);
});
test('visualizer requires actual boolean consent before consuming paid API',async()=>{
 const old=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='test';const response=res();
 try{await handlers[2](req({consent:'false',imageData:'YQ==',mimeType:'image/jpeg',material:'standing-seam metal roofing',color:'charcoal gray'},{'x-forwarded-for':'consent-test'}),response);assert.equal(response.code,400);}
 finally{if(old===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=old;}
});
test('valid estimator paths still complete with mocked providers and timeouts', async()=>{
 const previous={...process.env};const original=global.fetch;
 process.env.MAKE_WEBHOOK_URL='https://example.com/test';process.env.MAKE_WEBHOOK_API_KEY='test';process.env.GOOGLE_MAPS_API_KEY='test';process.env.GEMINI_API_KEY='test';
 try {
  let payload;
  global.fetch=async(url,options)=>{assert(options.signal);payload=options.body;return {ok:true,json:async()=>({recorded:true})};};
  let response=res();await handlers[0](req({name:'Test',email:'test@example.com',contactMethod:'email',zip:'85001',sqft:2000,low:10000,high:20000,roofArea:2400,stories:1,material:'shingle',complexity:'simple',age:'mid',consent:true},{'x-forwarded-for':'valid-lead'}),response);
  assert.equal(response.code,200);assert.equal(payload.get('consent'),'Yes');assert.equal(payload.get('timeline'),'researching');
  const timedLead={name:'Test',email:'test@example.com',contactMethod:'email',timeline:'within-7-days',zip:'85001',sqft:2000,low:10000,high:20000,roofArea:2400,stories:1,material:'shingle',complexity:'simple',age:'mid',consent:true};
  response=res();await handlers[0](req(timedLead,{'x-forwarded-for':'timed-lead'}),response);
  assert.equal(response.code,200);assert.equal(payload.get('timeline'),'within-7-days');assert.equal(payload.get('routingStatus'),'pending-midsize-review');assert.equal(payload.get('rooferAssigned'),'false');assert.equal(payload.get('consentVersion'),'2026-10-26');
  let calls=0;global.fetch=async()=>{calls++;throw Error('invalid timeline must not reach CRM');};
  response=res();await handlers[0](req({...timedLead,timeline:'invalid'},{'x-forwarded-for':'bad-timeline'}),response);
  assert.equal(response.code,400);assert.equal(calls,0);
  global.fetch=async(url,options)=>{assert(options.signal);return String(url).includes('/metadata?')?{ok:true,json:async()=>({status:'OK',location:{lat:33,lng:-112},pano_id:'test'})}:{ok:true,headers:new Headers({'content-type':'image/jpeg'}),arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer};};
  response=res();await handlers[1](req({address:'123 Test Avenue Phoenix AZ'},{'x-forwarded-for':'valid-map'}),response);assert.equal(response.code,200);assert.equal(response.data.available,true);
  global.fetch=async(url,options)=>{assert(options.signal);return {ok:true,json:async()=>({output_image:{data:'YQ==',mime_type:'image/jpeg'}})};};
  response=res();await handlers[2](req({consent:true,imageData:'YQ==',mimeType:'image/jpeg',material:'standing-seam metal roofing',color:'charcoal gray'},{'x-forwarded-for':'valid-image'}),response);assert.equal(response.code,200);assert.equal(response.data.imageData,'YQ==');
 } finally {
  global.fetch=original;for(const key of ['MAKE_WEBHOOK_URL','MAKE_WEBHOOK_API_KEY','GOOGLE_MAPS_API_KEY','GEMINI_API_KEY']){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}
 }
});

test('lead handoff rejects queued, malformed, missing and failed CRM receipts',async()=>{
 const original=global.fetch;const oldUrl=process.env.MAKE_WEBHOOK_URL,oldKey=process.env.MAKE_WEBHOOK_API_KEY;
 process.env.MAKE_WEBHOOK_URL='https://example.com/test';process.env.MAKE_WEBHOOK_API_KEY='test';
 const body={name:'Test',phone:'+12025550123',contactMethod:'phone',zip:'85001',sqft:2000,low:10000,high:20000,roofArea:2400,stories:1,material:'shingle',complexity:'simple',age:'mid',consent:true};
 try{
  const receipts=[{ok:true,json:async()=>{throw Error('Accepted');}},{ok:true,json:async()=>({})},{ok:true,json:async()=>({recorded:false})},{ok:false,status:500}];
  for(let i=0;i<receipts.length;i++){
   global.fetch=async()=>receipts[i];const response=res();await handlers[0](req(body,{'x-forwarded-for':'receipt-'+i}),response);assert.equal(response.code,502);assert(!response.data.ok);
  }
  global.fetch=async()=>({ok:true,json:async()=>({recorded:true})});const response=res();await handlers[0](req(body,{'x-forwarded-for':'phone-only-receipt'}),response);assert.equal(response.code,200);
 }finally{global.fetch=original;if(oldUrl===undefined)delete process.env.MAKE_WEBHOOK_URL;else process.env.MAKE_WEBHOOK_URL=oldUrl;if(oldKey===undefined)delete process.env.MAKE_WEBHOOK_API_KEY;else process.env.MAKE_WEBHOOK_API_KEY=oldKey;}
});
