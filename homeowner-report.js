(function(root){
  'use strict';
  function buildHomeownerReport(e, materialLabel, pricingReviewed){
    const money=n=>'$'+Number(n).toLocaleString('en-US');
    const range=money(e.low)+'–'+money(e.high);
    const conditions=[e.tearOff?'Removal selected':null,e.leak?'Active leak reported':null,e.decking?'Soft decking reported':null,e.solar?'Solar panels reported':null].filter(Boolean);
    const changes=[
      'Actual roof measurements, access and the written scope can differ from these approximate answers.',
      'Hidden damage and local code requirements need an onsite assessment. Ask how additional work is authorized and priced.'
    ];
    if(e.material==='tileReuse')changes.push('Tile lift-and-re-lay assumes suitable existing tiles can be reused. Ask for a separate all-new-tile option if condition, breakage or matching makes reuse impractical.');
    if(e.solar)changes.push('Ask who is responsible for solar removal, storage and reinstallation, and whether that work is included in the written proposal.');
    if(e.decking)changes.push('Ask for the decking allowance, the unit price for additional replacement and the approval process before extra work begins.');
    const actions=[
      {title:e.leak?'Address the reported leak first':'Describe the project before choosing a solution',body:e.leak?'Contact a roofing professional directly about assessment and temporary protection. Do not wait for a MidSizeAI introduction to address an active leak.':'Write down what prompted the project and what you want checked. This replacement estimate does not establish whether a repair or full replacement is needed.'},
      {title:'Gather a few useful photos',body:'Use photos taken from the ground or another safely accessible location. Include an overall view and any visible concerns; do not climb onto the roof to complete a photo set.'},
      {title:'Compare the same written scope',body:'Give contractors the same project brief. Compare materials, removal, underlayment, flashing, decking allowances, permits, cleanup, warranties and payment terms—not just the total.'},
      {title:'Check the business before committing',body:'Check applicable licensing with your state or local authority and ask for proof of insurance. Get the scope and agreed changes in writing.'}
    ];
    const brief=[
      'HOMEOWNER ROOFING PROJECT BRIEF',
      'Prepared with the MidSizeAI planning estimator. Homeowner-supplied details; not a measured scope or contractor quote.',
      '',
      'ZIP: '+e.zip,
      'Home living area: '+Number(e.sqft).toLocaleString('en-US')+' sq ft',
      'Estimated roof area: '+Number(e.roofArea).toLocaleString('en-US')+' sq ft (model estimate, not measured)',
      'Stories: '+(e.stories===1?'1':'2 or more'),
      'Roof shape: '+e.complexity,
      'Roofing option to discuss: '+materialLabel,
      'Roof age: '+(e.age==='new'?'Under 10 years':e.age==='old'?'More than 20 years':'10–20 years or unsure'),
      'Reported conditions: '+(conditions.join('; ')||'None selected; not a roof-condition assessment'),
      'Educational replacement range: '+range,
      'Pricing basis: '+e.region+'; planning rates reviewed '+pricingReviewed,
      '',
      'PLEASE CONFIRM IN YOUR WRITTEN PROPOSAL',
      ...changes.map(x=>'- '+x),
      '- Whether repair or replacement is appropriate after assessment.',
      '- Materials and quantities; included/excluded work; schedule; change approvals; warranties; payment terms.',
      '',
      'ADD BEFORE SENDING: your main concern, desired timeframe, access arrangements and the contact details you choose to share.',
      'This report does not confirm an inspection or assign a contractor.',
      'Creating, copying or downloading this brief does not send it to MidSizeAI or a roofer.'
    ].join('\n');
    return {meaning:'For '+materialLabel.toLowerCase()+' using your selected details, '+range+' is a starting budget range. The lower end uses the lower planning allowances and the upper end uses the higher ones. It is not a promise that a contractor will price within this range.',changes,actions,brief};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={buildHomeownerReport};
  else root.MidSizeHomeownerReport={buildHomeownerReport};
})(typeof globalThis!=='undefined'?globalThis:this);
