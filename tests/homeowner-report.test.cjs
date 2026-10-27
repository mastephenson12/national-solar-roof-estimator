const test=require('node:test');const assert=require('node:assert/strict');
const {buildHomeownerReport}=require('../homeowner-report');
const estimate={low:19000,high:32500,zip:'85392',sqft:2000,roofArea:2560,stories:1,complexity:'simple',material:'tileReuse',age:'mid',tearOff:true,leak:false,decking:false,solar:false,region:'Phoenix metro planning factor'};
test('a copyable brief preserves the selected project without contact data or assignment promises',()=>{
 const input={...estimate,name:'Private Name',email:'private@example.com',phone:'5555555555',consent:true};
 const report=buildHomeownerReport(input,'Existing tile lift and re-lay','August 2026');
 assert.match(report.meaning,/\$19,000–\$32,500/);assert.match(report.brief,/ZIP: 85392/);assert.match(report.brief,/2,560 sq ft/);
 assert.match(report.brief,/Homeowner-supplied/);assert.match(report.brief,/suitable existing tiles/);
 for(const privateField of ['Private Name','private@example.com','5555555555'])assert.ok(!report.brief.includes(privateField));
 assert.match(report.brief,/does not send/);assert.match(report.brief,/does not confirm an inspection/);
 assert.equal(input.leak,false);
});
test('reported conditions change guidance without diagnosing a replacement or changing the estimate',()=>{
 const e={...estimate,material:'shingle',leak:true,decking:true,solar:true};
 const r=buildHomeownerReport(e,'Asphalt shingles','August 2026');
 assert.equal(r.actions[0].title,'Address the reported leak first');assert.match(r.actions[0].body,/Do not wait for a MidSizeAI introduction/);
 assert.ok(r.changes.some(x=>x.includes('solar removal')));assert.ok(r.changes.some(x=>x.includes('unit price')));
 assert.ok(!r.changes.some(x=>x.includes('Tile lift')));assert.equal(e.low,19000);assert.equal(e.high,32500);
});
