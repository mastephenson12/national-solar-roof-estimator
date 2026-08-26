const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
let step=1;
const pricingReviewed='August 2026';
const money=n=>String.fromCharCode(36)+(Math.round(n/50)*50).toLocaleString();
const rangeText=(lo,hi)=>money(lo)+'–'+money(hi);
const regional=z=>{
  const prefix=Number(z.slice(0,3)),first=Number(z.slice(0,1));
  if(prefix>=850&&prefix<=853)return{m:1.08,n:'Phoenix metro planning factor',note:'ZIP-based Phoenix metro adjustment; not a live contractor price feed.'};
  if(prefix>=855&&prefix<=857)return{m:1.06,n:'Southern Arizona planning factor',note:'Arizona planning adjustment; local bids may vary.'};
  if(prefix>=859&&prefix<=865)return{m:1.10,n:'Northern Arizona planning factor',note:'Arizona planning adjustment with added allowance for regional labor and logistics.'};
  if(first===9)return{m:1.12,n:'Western U.S. planning factor',note:'Broad regional adjustment; local contractor pricing may vary.'};
  if(first===0||first===1)return{m:1.18,n:'Northeast planning factor',note:'Broad regional adjustment; local contractor pricing may vary.'};
  if(first===3)return{m:1.02,n:'Southeast planning factor',note:'Broad regional adjustment; local contractor pricing may vary.'};
  if(first===7)return{m:.96,n:'South Central planning factor',note:'Broad regional adjustment; local contractor pricing may vary.'};
  if(first===5||first===6)return{m:1,n:'Midwest planning factor',note:'Broad regional adjustment; local contractor pricing may vary.'};
  return{m:1.04,n:'National planning factor',note:'Broad national adjustment because a more specific local model is not available for this ZIP.'};
};
const systems={
  shingle:{label:'Asphalt shingles',materials:[190,310],labor:[285,440]},
  tile:{label:'All-new concrete / clay tile',materials:[430,700],labor:[420,650],materialLabel:'New tile, underlayment, flashings, fasteners, and accessories'},
  tileReuse:{label:'Existing tile lift and re-lay',materials:[220,390],labor:[420,680],materialLabel:'Underlayment, flashings, fasteners, and replacement-tile allowance'},
  metal:{label:'Standing-seam metal',materials:[500,850],labor:[450,750]},
  flat:{label:'Flat / foam system',materials:[300,500],labor:[350,550]}
};
function selectedSystem(){
  const material=$('input[name=material]:checked').value;
  return material==='tile'&&$('input[name=tilePlan]:checked').value==='reuse'?'tileReuse':material;
}
function showTilePlan(){
  $('#tilePlan').hidden=$('input[name=material]:checked').value!=='tile';
}
function show(n){step=n;all('.step').forEach(x=>x.classList.toggle('active',Number(x.dataset.step)===n));$('#progressText').textContent=`Step ${n} of 6`;$('#progressBar').style.width=`${n/6*100}%`;window.scrollTo({top:Math.max(0,$('#wizard').offsetTop-100),behavior:'smooth'})}
function valid(){if(step===1&&!/^\d{5}$/.test($('#zip').value)){alert('Please enter a five-digit ZIP code.');return false}if(step===2){const s=Number($('#sqft').value);if(s<500||s>15000){alert('Please enter an approximate home size between 500 and 15,000 square feet.');return false}}return true}
function project(material){
  const sqft=Number($('#sqft').value),stories=Number($('input[name=stories]:checked').value),complexity=$('input[name=complexity]:checked').value,age=$('input[name=age]:checked').value,reg=regional($('#zip').value);
  const area=sqft*(stories===1?1.28:.72)*({simple:1,moderate:1.12,complex:1.25}[complexity]),squares=area/100,system=systems[material];
  const complexityLabor={simple:1,moderate:1.12,complex:1.28}[complexity],storyLabor=stories>1?1.1:1;
  const components=[
    {label:system.materialLabel||system.label+' materials and standard accessories',low:squares*system.materials[0]*reg.m,high:squares*system.materials[1]*reg.m},
    {label:material==='tileReuse'?'Careful tile removal, staging, and reinstallation labor':'Installation labor',low:squares*system.labor[0]*reg.m*complexityLabor*storyLabor,high:squares*system.labor[1]*reg.m*complexityLabor*storyLabor},
    {label:'Permit and project administration allowance',low:250*reg.m,high:800*reg.m}
  ];
  if($('#tearoff').checked)components.push(material==='tileReuse'
    ?{label:'Old underlayment removal and disposal',low:squares*35,high:squares*75}
    :{label:'Tear-off, hauling, and disposal',low:squares*75,high:squares*150});
  if($('#leak').checked)components.push({label:'Leak investigation and localized repair allowance',low:500,high:2500});
  if($('#decking').checked)components.push({label:'Known decking replacement allowance',low:1500,high:6000});
  if($('#solar').checked)components.push({label:'Solar removal and reinstallation allowance',low:3500,high:7500});
  if(age==='old')components.push({label:'Older-roof preparation contingency',low:squares*20,high:squares*80});
  const low=components.reduce((sum,x)=>sum+x.low,0),high=components.reduce((sum,x)=>sum+x.high,0);
  return{low,high,area,squares,components,reg,stories,complexity,age,material};
}
all('.nextBtn').forEach(b=>b.addEventListener('click',()=>valid()&&show(step+1)));
all('.backBtn').forEach(b=>b.addEventListener('click',()=>show(step-1)));
all('input[name=material]').forEach(input=>input.addEventListener('change',showTilePlan));
showTilePlan();
$('#calculate').addEventListener('click',()=>{
  const material=selectedSystem(),p=project(material),roundedLow=Math.round(p.low/500)*500,roundedHigh=Math.round(p.high/500)*500;
  const factors=[`${systems[material].label} over approximately ${Math.round(p.area/50)*50} sq ft of estimated roof area`,p.reg.note];
  if(material==='tileReuse')factors.push('Suitable existing tile lifted and reinstalled, with new underlayment, most flashings, and an allowance for broken or unusable tiles');
  if($('#tearoff').checked)factors.push(material==='tileReuse'?'Removal and disposal of old underlayment while preserving suitable tile':'Removal and disposal of the existing roof');
  if(p.stories>1)factors.push('Multi-story access and staging');
  if(p.complexity!=='simple')factors.push(`${p.complexity==='complex'?'Steep or complex':'Moderately complex'} roof geometry`);
  if($('#leak').checked)factors.push('Allowance for investigation and localized leak repairs');
  if($('#decking').checked)factors.push('Allowance for known decking replacement');
  if($('#solar').checked)factors.push('Solar panel removal and reinstallation allowance');
  if(p.age==='old')factors.push('Older roof with higher preparation risk');
  window.estimate={low:roundedLow,high:roundedHigh,zip:$('#zip').value,sqft:Number($('#sqft').value),material,roofArea:Math.round(p.area),stories:p.stories,complexity:p.complexity,tearOff:$('#tearoff').checked,leak:$('#leak').checked,decking:$('#decking').checked,solar:$('#solar').checked,age:p.age,region:p.reg.n};
  $('#range').textContent=rangeText(roundedLow,roundedHigh);
  $('#roofArea').textContent=`${Math.round(p.area/50)*50} sq ft`;
  $('#perSquare').textContent=rangeText(roundedLow/p.squares,roundedHigh/p.squares);
  $('#region').textContent=p.reg.n;
  $('#factors').innerHTML=factors.map(x=>`<li>${x}</li>`).join('');
  const work=[window.estimate.tearOff?(material==='tileReuse'?'Old underlayment removal':'Existing roof removal'):null,window.estimate.leak?'Active leak':null,window.estimate.decking?'Known soft decking':null,window.estimate.solar?'Solar panels':null].filter(Boolean);
  const ageLabel=p.age==='new'?'Under 10 years':p.age==='old'?'More than 20 years':'10–20 years or unsure';
  $('#snapshot').innerHTML=[[`ZIP code`,window.estimate.zip],[`Home`,`${window.estimate.sqft.toLocaleString()} sq ft · ${p.stories===1?'1 story':'2+ stories'}`],[`Roofing system`,systems[material].label],[`Roof shape`,p.complexity.charAt(0).toUpperCase()+p.complexity.slice(1)],[`Existing roof age`,ageLabel],[`Known project conditions`,work.length?work.join(', '):'None selected']].map(([label,value])=>`<div class="snapshot-item"><small>${label}</small><strong>${value}</strong></div>`).join('');
  $('#breakdown').innerHTML=p.components.map(x=>`<tr><td>${x.label}</td><td>${rangeText(x.low,x.high)}</td></tr>`).join('')+`<tr class="total"><td>Estimated total</td><td>${rangeText(roundedLow,roundedHigh)}</td></tr>`;
  const tileComparison=material==='tileReuse'?'tileReuse':'tile';
  $('#comparison').innerHTML=['shingle',tileComparison,'metal'].map(key=>{const alt=project(key);return `<article class="compare-card ${key===material?'selected':''}"><small>${key===material?'Your selection':'Alternative'}</small><strong>${systems[key].label}</strong><span>${rangeText(Math.round(alt.low/500)*500,Math.round(alt.high/500)*500)}</span></article>`}).join('');
  const tileAssumption=material==='tileReuse'?'Lift-and-relay assumes most existing tiles are suitable for reuse. It includes a planning allowance for breakage, but discontinued profiles, color mismatch, widespread damage, attachment requirements, or tile condition can require all-new tile. Reused tile generally does not receive a new-tile warranty.':null;
  $('#assumptions').innerHTML=[`Roof area is estimated from ${Number($('#sqft').value).toLocaleString()} sq ft of living area, ${p.stories===1?'one story':'two or more stories'}, and the selected roof complexity. It is not an aerial or onsite measurement.`,`Pricing uses a ${p.reg.n.toLowerCase()} applied to planning rates, not live contractor inventory or bidding data.`,tileAssumption,'The range assumes ordinary residential access and excludes structural engineering, asbestos, major framing repairs, gutters, skylights, unusual access, financing costs, and unselected code work.','Only an onsite inspection can determine tile reusability, exact quantities, hidden damage, code requirements, and a binding price.'].filter(Boolean).map(x=>`<li>${x}</li>`).join('');
  $('#pricingDate').textContent=`Planning rates last reviewed: ${pricingReviewed}. Recheck pricing before making a hiring or financing decision.`;
  $('#wizard').style.display='none';$('#result').classList.add('active');window.scrollTo({top:$('#result').offsetTop-100,behavior:'smooth'});
});
function note(msg,ok=true){$('#notice').className=`notice ${ok?'ok':'bad'}`;$('#notice').textContent=msg}
$('#printEstimate').addEventListener('click',()=>window.print());
$('#editEstimate').addEventListener('click',()=>{$('#result').classList.remove('active');$('#wizard').style.display='block';show(1)});
$('#saveReport').addEventListener('click',()=>window.print());
$('#requestHelp').addEventListener('click',async()=>{const name=$('#leadName').value.trim(),email=$('#leadEmail').value.trim(),phone=$('#leadPhone').value.trim(),contactMethod=$('#contactMethod').value,digits=phone.replace(/\D/g,'');if(!name)return note('Enter your first name.',false);if(!email&&!phone)return note('Enter an email address or mobile phone number.',false);if(email&&!/^\S+@\S+\.\S+$/.test(email))return note('Enter a valid email address.',false);if(phone&&digits.length<10)return note('Enter a valid phone number.',false);if(contactMethod==='email'&&!email)return note('Enter an email address for email contact.',false);if((contactMethod==='text'||contactMethod==='phone')&&!phone)return note('Enter a phone number for your selected contact method.',false);if(!$('#consent').checked)return note('Please check the consent box before requesting an inspection.',false);try{const response=await fetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...window.estimate,name,email,phone,contactMethod,website:'',consent:true})});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||'Submission failed');note('Your request was sent. A roofing professional may contact you by your preferred method.')}catch(e){note(e.message==='Too many requests'?'Please wait a few minutes before trying again.':'We could not send the request. Please try again later.',false)}});
$('#restart').addEventListener('click',()=>location.reload());
