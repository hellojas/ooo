const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const log=[];const errs=[];
const seed=()=>({settings:{hiddenItems:[],tripsOff:[],programState:{kaufTue:'registered',bhTue:'registered'},visitUntil:{bhTue:17*60}},attendance:{},practice:{},climbing:{},running:{},pullups:{},coffee:{},weekly:{},customShops:[],tunes:{},transcriptions:[],sessions:[],queueDone:{},queueSkip:[],queueRepeat:[],queuePriority:{}});
const check=(name,ok,detail='')=>log.push((ok?'ok   ':'GAP  ')+name+(detail?' — '+String(detail).replace(/\s+/g,' ').slice(0,170):''));
let ctx,p;
const open=async(time,state)=>{ if(ctx)await ctx.close(); ctx=await b.newContext({viewport:{width:1366,height:900}}); p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message)); await p.clock.install({time:new Date(time)}); await p.goto('http://localhost:4173/#/today'); await p.waitForTimeout(300); await p.evaluate(s=>localStorage.setItem('project-ooo:v1',s),JSON.stringify(state??seed())); await p.reload(); await p.waitForTimeout(600) };
const go=async h=>{await p.goto('http://localhost:4173/'+h);await p.waitForTimeout(450)};
const st=async()=>JSON.parse(await p.evaluate(()=>localStorage.getItem('project-ooo:v1')));
const story=async(name,fn)=>{try{await fn()}catch(e){check('STORY '+name+' crashed',false,e.message.split('\n')[0])}};

await story('AE. Week board: change visit window in the side panel → Today chain updates',async()=>{
  await open('2026-10-13T09:00:00');await go('#/calendar/week');await p.waitForTimeout(300);await p.locator('.wb-row').nth(2).locator('.wb-day').click();await p.waitForTimeout(200);
  await p.locator('.wb-visit select').first().selectOption('960');await p.waitForTimeout(150);
  await go('#/today/2026-10-13');const plan=await p.textContent('.plan-list');check('AE: leaving BH at 4p → chain still from BH (5:10p leave)',/5:10p.*Leave for Kaufman/.test(plan)&&/2p–4pBH free jam/.test(plan),plan.slice(0,220));
});
await story('AF. Week board: added block appears on Today and belongs to a lane',async()=>{
  await open('2026-10-14T09:00:00');await go('#/calendar/week');await p.waitForTimeout(300);const row=p.locator('.wb-row').nth(3);await row.hover();await row.locator('.wb-add').click({force:true});await p.waitForTimeout(150);
  await go('#/today/2026-10-14');const plan=await p.textContent('.plan-list');check('AF: added block on Today',plan.includes('extra 1'),plan.slice(-120));
  check('AF: added block is a piano block',plan.includes('Piano (extra 1)'),plan.slice(-80));
});
await story('AG. Park then restore from Curriculum → back on Today',async()=>{
  await open('2026-10-12T09:00:00');const li=p.locator('.steps li').first();const label=await li.locator('.lbl').textContent();await li.hover();await li.locator('button:has-text("park")').click();await p.waitForTimeout(150);
  await go('#/practice');await p.click('button:has-text("Curriculum")');await p.locator('.qrow.skipped button:has-text("restore")').first().click();await p.waitForTimeout(150);
  await go('#/today/2026-10-12');const steps=await p.textContent('.steps');check('AG: restored item is back',steps.includes(label.replace(' ↗','').slice(0,25)),steps.slice(0,120));
});
await story('AH. Priority: park the whole lesson kind → no lessons on Today, count in Up next',async()=>{
  await open('2026-10-12T09:00:00');await go('#/practice');await p.click('button:has-text("Curriculum")');await p.selectOption('.prirow select >> nth=0','parked');await p.waitForTimeout(150);
  await go('#/today/2026-10-12');const steps=await p.textContent('.steps');check('AH: no lesson steps when lessons are parked',!steps.includes('Chords for Beginners'),steps.slice(0,120));
});
await story('AI. Repeat, then done the next day → leaves the repeat list',async()=>{
  const s=seed();s.queueRepeat=['t0.1'];s.queueDone={'t0.1':'2026-10-12'};await open('2026-10-13T09:00:00',s);
  const li=p.locator('.steps li',{hasText:'(1/4)'}).first();check('AI: repeated item is first on Tue',(await li.count())===1);
  await li.locator('.lbl').click();await p.waitForTimeout(150);const s2=await st();check('AI: done clears repeat and dates it today',s2.queueRepeat.length===0&&s2.queueDone['t0.1']==='2026-10-13',JSON.stringify([s2.queueRepeat,s2.queueDone['t0.1']]));
});
await story('AJ. Three weeks of logging → pace + finish estimate in Curriculum',async()=>{
  const s=seed();let i=0;for(const d of ['12','13','14','15','16','19','20','21','22','23','26','27','28','29','30']){s.practice['2026-10-'+d]={piano1:90};s.queueDone[`s${Math.floor(i/5)}.${i%5}`]='2026-10-'+d;s.queueDone[`t${Math.floor(i/4)}.${i%4+1}`]='2026-10-'+d;i++}
  await open('2026-11-02T09:00:00',s);await go('#/practice');await p.click('button:has-text("Curriculum")');const t=await p.textContent('.plain');check('AJ: shows pace/day and an estimate',/\/day so far/.test(t)&&/(on track to finish|past Dec 23)/.test(t),t.slice(0,260));
  await go('#/review');const strip=await p.textContent('.strip');check('AJ: 3 standards memorized after 15 steps',/Standards memorized\s*3 \/ 10/.test(strip),strip);
});
await story('AK. Evening: everything past → Up next still useful; Sunday review tasks tick',async()=>{
  await open('2026-10-14T21:30:00');const now=await p.locator('.plan-row.now').count();check('AK: nothing highlighted as now at 9:30pm',now===0);
  await open('2026-10-18T17:00:00');const rb=await p.locator('button:has-text("Open this week")').count();check('AK: Sunday offers the review button instead of a template block',rb===1);
});
await story('AL. Month view: legend hides a category; optional toggle; agenda',async()=>{
  await open('2026-10-12T09:00:00');await go('#/calendar/month');await p.waitForTimeout(500);const before=await p.locator('.mev.Sax').count();await p.click('.legend2 .pill:has-text("Sax")');await p.waitForTimeout(200);const after=await p.locator('.mev.Sax').count();check('AL: legend hides sax pills',before>0&&after===0,`${before}→${after}`);
  await p.click('.legend2 .pill:has-text("Sax")');await p.uncheck('.toolbar input[type=checkbox]');await p.waitForTimeout(200);const opt=await p.locator('.mev.optional').count();check('AL: optional toggle hides optional pills',opt===0,'optional '+opt);
  await p.click('.pill:has-text("Agenda")');await p.waitForTimeout(300);const ag=await p.locator('.magenda-day').count();check('AL: agenda lists days',ag>10,'days '+ag);
});
await story('AM. Play: add a custom shop → suggested for a nearby morning',async()=>{
  await open('2026-10-12T09:00:00');await go('#/play');await p.click('summary:has-text("Add a shop")');await p.fill('input[placeholder="Name"]','Test Roasters');await p.fill('input[placeholder="Address"]','1 Bedford Ave, Williamsburg');await p.click('button:has-text("Add")');await p.waitForTimeout(150);
  const s=await st();check('AM: custom shop saved',s.customShops.length===1,JSON.stringify(s.customShops[0]));
  check('AM: custom shop gets a neighborhood from its address',s.customShops[0].nb==='Williamsburg','nb='+s.customShops[0].nb);
});
await story('AN. Configure: untick Badminton → gone from Saturday',async()=>{
  await open('2026-10-10T09:00:00');await go('#/configure');const lab=p.locator('.checks label',{hasText:'Badminton'});await lab.locator('input').uncheck();await p.waitForTimeout(150);await go('#/today/2026-10-10');const plan=await p.textContent('.plan');check('AN: badminton hidden',!plan.includes('Badminton'),plan.slice(0,120));
});
await story('AO. Class sheet text points to the right place',async()=>{
  await open('2026-10-13T09:00:00');await p.locator('.plan-row.class',{hasText:'Kaufman Harmony'}).click();const t=await p.textContent('.sheet');check('AO: status line points to Programs, not Configure',t.includes('Programs')&&!t.includes('Configure'),t.slice(0,200));
});
await story('AP. Configure duplicates Programs',async()=>{
  await open('2026-10-12T09:00:00');await go('#/configure');const t=await p.textContent('.settings');check('AP: Configure no longer duplicates class status',!t.includes('Considering'));
});
console.log(log.join('\n'));console.log('ERRORS:',errs.length?errs:'none');await b.close()})().catch(e=>{console.log('HARNESS',e.message);process.exit(1)});
