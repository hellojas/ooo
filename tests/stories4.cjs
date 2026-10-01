const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:1300,height:1000},timezoneId:'America/New_York'});const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
const log=[];const check=(name,ok,detail='')=>log.push((ok?'ok   ':'GAP  ')+name+(detail?' — '+String(detail).slice(0,160):''));
const story=async(name,fn)=>{try{await fn()}catch(e){check('STORY '+name+' crashed',false,e.message.split('\n')[0])}};
const st=async()=>JSON.parse(await p.evaluate(()=>localStorage.getItem('project-ooo:v1')));
const open=async(iso,seedObj)=>{await p.clock.install({time:new Date(iso)});await p.goto('http://localhost:4173/#/today');await p.waitForTimeout(300);await p.evaluate(s=>{localStorage.clear();if(s)localStorage.setItem('project-ooo:v1',s)},seedObj?JSON.stringify(seedObj):null);await p.reload();await p.waitForTimeout(600)};
const go=async(h)=>{await p.goto('http://localhost:4173/'+h);await p.waitForTimeout(400)};

await story('M1. Make lane shows the seeded list; marking done moves to the next',async()=>{
  await open('2026-10-13T09:00:00-04:00');await p.click('.lanebtn:has-text("Make")');await p.waitForTimeout(200);
  const t=await p.textContent('.makecard');check('M1: seeded project first',/ML \/ robotics/.test(t),t.slice(0,80));
  check('M1: next step shown',/Next: List the 10/.test(t));
  await p.click('.makecard button:has-text("mark done")');await p.waitForTimeout(200);const t2=await p.textContent('.makecard');check('M1: next item after done',/Dev environment/.test(t2),t2.slice(0,80));
  const s=await st();check('M1: done persisted with a date',(s.make||[]).some(x=>x.done==='2026-10-13'));
});
await story('M2. Make session logs minutes everywhere',async()=>{
  await open('2026-10-14T13:00:00-04:00');await p.click('.lanebtn:has-text("Make")');await p.click('button:has-text("Start session")');await p.waitForTimeout(200);await p.click('button:has-text("Finish")');await p.fill('.sheet input[type=number]','70');await p.click('.sheet button:has-text("Save")');await p.waitForTimeout(300);
  const s=await st();check('M2: practice.make = 70',s.practice['2026-10-14']?.make===70,JSON.stringify(s.practice['2026-10-14']));
  check('M2: quick log shows make',/70 min make/.test(await p.textContent('.adjust.training summary')));
  check('M2: footer shows make hours',/1\.2h make/.test(await p.textContent('.weekbar')),await p.textContent('.weekbar'));
  await go('#/review');const r=await p.textContent('body');check('M2: Review week progress has a Make row',/Make/.test(r));
  const dots=await p.locator('.weekbar .dots i.on').count().catch(()=>0);
  await go('#/today');check('M2: a make-only day lights a rhythm dot',(await p.locator('.weekbar .dots i.on').count())>=1,String(dots));
});
await story('M3. Make before Oct 12 and on a weekend',async()=>{
  await open('2026-10-09T09:00:00-04:00');const chunks=await p.textContent('.plan');check('M3: no Make chunk on Oct 9',!/Make ·/.test(chunks));
  await p.click('.lanebtn:has-text("Make")');check('M3: card explains the start',/starts the week of Oct 12/.test(await p.textContent('.makecard')));
  await open('2026-10-17T10:00:00-04:00');check('M3: Saturday has no capacity bar',(await p.locator('.capbar').count())===0);
});
await story('M4. Capacity bar reacts: Off, not today, logging',async()=>{
  await open('2026-10-14T11:00:00-04:00');const n0=await p.locator('.capbar .cseg').count();
  await p.click('button[role=radio]:has-text("Off")');await p.waitForTimeout(200);const n1=await p.locator('.capbar .cseg').count();check('M4: Off removes the piano segment',n1===n0-1,`${n0}→${n1}`);
  await p.click('button[role=radio]:has-text("2h")');await p.waitForTimeout(200);
  await p.locator('.plan-row',{hasText:'Sax'}).locator('button:has-text("not today")').click();await p.waitForTimeout(200);const n2=await p.locator('.capbar .cseg').count();check('M4: not today removes the sax segment',n2===n0-1,`${n0}→${n2}`);
  const cap0=await p.textContent('.plan .caption');
  const s=await st();s.practice['2026-10-14']={...(s.practice['2026-10-14']||{}),piano1:120};await open('2026-10-14T11:00:00-04:00',s);
  const cap1=await p.textContent('.plan .caption');check('M4: logging 2h piano shrinks what is open',cap0!==cap1&&/still open/.test(cap1),cap0+' | '+cap1);
  const fill=await p.locator('.capbar .cseg.piano i').evaluate(e=>e.style.width);check('M4: piano segment is full',fill==='100%',fill);
  check('M4: piano chunk ticks',/Piano · 120 min ✓/.test(await p.textContent('.plan')));
  const s2=await st();s2.climbing={'2026-10-14':{done:true}};await open('2026-10-14T11:00:00-04:00',s2);check('M4: a climb fills the move segment',(await p.locator('.capbar .cseg.workout i').evaluate(e=>e.style.width))==='100%');
});
await story('M5. Before-you-leave skips flex drop-ins',async()=>{
  await open('2026-10-13T10:30:00-04:00');const n=await p.textContent('.nudge').catch(()=>'');check('M5: Tue line names Kaufman, not the BH jam',/Kaufman/.test(n)&&!/BH/.test(n),n);
});
await story('M6. 3h day: block 2 holds ear micro + arrangement, by-ear lives in block 1',async()=>{
  const s={transcriptions:[{id:'1',date:'2026-10-10',song:'Sunny',note:'',steps:[]}]};
  await open('2026-10-14T09:00:00-04:00',s);await p.click('button[role=radio]:has-text("3h")');await p.waitForTimeout(300);
  const steps=await p.locator('.steps li').allInnerTexts();const txt=steps.join(' || ');
  check('M6: by-ear Sunny in the session with 15 min',/15 min\s*By ear · Sunny/.test(txt),txt.slice(0,200));
  check('M6: ear micro present',/Ear · /.test(txt));check('M6: arrangement present',/Arrangement/.test(txt));
  check('M6: Sunny appears once',(txt.match(/Sunny/g)||[]).length===1,String((txt.match(/Sunny/g)||[]).length));
  await p.click('button[role=radio]:has-text("Tiny")');await p.waitForTimeout(200);const tiny=(await p.locator('.steps li').allInnerTexts()).join(' || ');check('M6: tiny has no by-ear',!/Sunny/.test(tiny));
});
await story('M7. Week board shows the Make block',async()=>{
  await open('2026-10-13T09:00:00-04:00');await go('#/calendar/week');await p.waitForTimeout(400);check('M7: make block on the board',(await p.locator('.wb-ev.flex.make').count())>=1);
});
await story('M8. Empty Make list',async()=>{
  const s=(await st())||{};s.make=[];await open('2026-10-14T09:00:00-04:00',s);await p.click('.lanebtn:has-text("Make")');check('M8: empty state',/Nothing on the Make list/.test(await p.textContent('.makecard')));
  await go('#/practice');await p.click('button:has-text("Make")');await p.fill('.make input[placeholder^="New project"]','Paint the kitchen');await p.selectOption('.make select','art');await p.click('.make button:has-text("Add")');await p.waitForTimeout(200);
  check('M8: added item appears',/Paint the kitchen/.test(await p.textContent('.makelist')));
});
console.log(log.join('\n'));console.log('ERRORS:',errs.join(' | ')||'none');await b.close();
})();
