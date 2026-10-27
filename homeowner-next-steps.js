(function(){
  'use strict';
  const brief=document.querySelector('#projectBrief');
  const status=document.querySelector('#briefStatus');
  const event=name=>{if(typeof window.gtag==='function')window.gtag('event',name,{tool:'roof_estimator'});};
  document.querySelector('#copyProjectBrief').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(brief.value);status.textContent='Project brief copied. Share it only with the people you choose.';event('project_brief_copied');}
    catch{brief.focus();brief.select();status.textContent='Select and copy the brief below, or download a text copy.';}
  });
  document.querySelector('#downloadProjectBrief').addEventListener('click',()=>{
    const url=URL.createObjectURL(new Blob([brief.value],{type:'text/plain;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='midsizeai-roofing-project-brief.txt';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='Text download prepared. This did not send your details to anyone.';event('project_brief_downloaded');
  });
})();
