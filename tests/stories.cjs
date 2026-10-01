const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const log=[];const errs=[];
const seed=()=>JSON.stringify({settings:{hiddenItems:[],tripsOff:[],programState:{kaufTue:'registered',bhTue:'registered'},visitUntil:{bhTue:17*60}},attendance:{},practice:{},climbing:{},running:{},pullups:{},coffee:{},weekly:{},customShops:[],tunes:{},transcriptions:[],sessions:[],queueDone:{},queueSkip:[],queueRepeat:[],queuePriority:{}});
const check=(name,ok,detail='')=>log.push((ok?'ok   ':'GAP  ')+name+(detail?' — '+String(detail).replace(/\s+/g,' ').slice(0,180):''));
let ctx,p;
const open=async(time,state)=>{ if(ctx)await ctx.close(); ctx=await b.newContext({viewport:{width:1366,height:900}}); p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message)); await p.clock.install({time:new Date(time)}); await p.goto('http://localhost:4173/#/today'); await p.waitForTimeout(300); await p.evaluate(s=>localStorage.setItem('project-ooo:v1',s),state??seed()); await p.reload(); await p.waitForTimeout(600) };
const go=async h=>{await p.goto('http://localhost:4173/'+h);await p.waitForTimeout(450)};
const st=async()=>JSON.parse(await p.evaluate(()=>localStorage.getItem('project-ooo:v1')));
const story=async(name,fn)=>{try{await fn()}catch(e){check('STORY '+name+' crashed',false,e.message.split('\n')[0])}};

await story('A. Missed Monday (no log) → Tuesday carries Monday items, stays Full',async()=>{
  await open('2026-10-13T10:45:00');
  const meta=await p.textContent('.datenav .meta');check('A: empty log is not a miss (Tue is Class, not Light)',!meta.includes('Light'),meta);
  const steps=await p.textContent('.steps');check('A: Monday’s first lesson carried to Tuesday',steps.includes('Welcome') || steps.includes('Rooted 5-Note GPS #1'),steps);
  const bar=await p.locator('.capbar').count();check('A: the day shows as a capacity bar',bar===1);
});
await story('B. Skipped Monday → Tuesday is Light with fewer steps',async()=>{
  const s=JSON.parse(seed());s.practice['2026-10-12']={skippedDay:true};await open('2026-10-13T09:00:00',JSON.stringify(s));
  const meta=await p.textContent('.datenav .meta');check('B: Tue is Light with the reason',meta.includes('Light')&&meta.includes('skipped'),meta);
  const n=await p.locator('.steps li').count();check('B: light day has a short list (≤3)',n<=3,'steps '+n);
  const plan=await p.textContent('.plan-list');check('B: light day block on plan',plan.includes('(light)')||plan.includes('Piano'),plan);
});
await story('C. Repeat on Monday → Tuesday shows it first with “Again:”',async()=>{
  await open('2026-10-12T11:00:00');
  const li=p.locator('.steps li').nth(1);await li.hover();await li.locator('button:has-text("working")').click();await p.waitForTimeout(200);
  const s=await st();check('C: repeat stored',s.queueRepeat.length===1,JSON.stringify(s.queueRepeat));
  await open('2026-10-13T09:00:00',JSON.stringify(s));const lede=await p.textContent('.main .lede');check('C: focus line starts with Again:',lede.startsWith('Again:'),lede);
});
await story('D. Park a lesson → gone from Today and forecast, visible in Curriculum',async()=>{
  await open('2026-10-12T11:00:00');const first=await p.locator('.steps li').first().textContent();
  const li=p.locator('.steps li').first();await li.hover();await li.locator('button:has-text("park")').click();await p.waitForTimeout(200);
  const after=await p.textContent('.steps');check('D: parked item left Today',!after.includes('(1/4)'),after);
  await go('#/practice');await p.click('button:has-text("Curriculum")');const cur=await p.textContent('.qlist');check('D: curriculum marks it parked',cur.includes('parked'),cur.slice(0,120));
});
await story('E. Finish everything → Up next + pull one in',async()=>{
  await open('2026-10-12T11:00:00');
  const n=await p.locator('.steps li').count();for(let i=0;i<n;i++){await p.locator('.steps li').nth(i).locator('.lbl').click();await p.waitForTimeout(80)}
  const lane=await p.locator('.lanebtn.on').textContent();check('E: lane shows ✓ when all done',lane.includes('✓'),lane);
  const has=await p.locator('.nextq button:has-text("Pull it into today")').count();check('E: pull button appears',has===1);
  await p.click('.nextq button');await p.waitForTimeout(200);const n2=await p.locator('.steps li').count();check('E: pulled item added',n2===n+1,`${n}→${n2}`);
});
await story('F. Class day chain: BH until 5p (default) → Kaufman leaves from BH',async()=>{
  await open('2026-10-13T09:00:00');const plan=await p.textContent('.plan');
  check('F: class day drops piano block 2',!plan.includes('Piano block 2'),plan);
  check('F: leave for Kaufman ~5:10p (20 min from BH)',/5:10p.*Leave for Kaufman/.test(plan),plan);
  await go('#/calendar/week');await p.waitForTimeout(400);await p.locator('.wb-row').nth(2).locator('.wb-day').click();await p.waitForTimeout(200);const side=await p.textContent('.wb-side');check('F: week board side panel says travel from BH',/from BH/.test(side),side.slice(0,200));
});
await story('G. Travel week: nothing until Fri Oct 9; queue starts there',async()=>{
  await open('2026-10-06T10:00:00');const main=await p.textContent('.main');check('G: Tue Oct 6 is Away, no Start button',main.includes('Away')&&!main.includes('Start session'),main.slice(0,80));
  await go('#/calendar/month');await p.waitForTimeout(500);const fri=await p.locator('.mday').filter({hasText:/^9/}).locator('.mev.Piano').count();const tue=await p.locator('.mday').filter({hasText:/^6/}).locator('.mev.Piano').count();check('G: first piano pills land Fri 9, none Tue 6',fri>0&&tue===0,`fri ${fri} tue ${tue}`);
});
await story('H. Skip a block on the plan → its steps leave the lane',async()=>{
  await open('2026-10-14T09:00:00');
  await p.locator('.lanebtn:has-text("Sax")').click();const before=await p.locator('.steps li').count();
  // no direct skip UI without a clash; use the week board's day panel? Use plan "skip" only appears on clash — so skip via store
  const s=await st();s.practice['2026-10-14']={skipped:['Sax']};await open('2026-10-14T09:00:00',JSON.stringify(s));await p.locator('.lanebtn:has-text("Sax")').click();
  const after=await p.locator('.steps li').count();check('H: skipped sax block removes its step',before>0&&after===0,`${before}→${after}`);
  await open('2026-10-14T09:00:00');await p.locator('.plan-row',{hasText:'Sax'}).locator('button:has-text("not today")').click();await p.waitForTimeout(200);await p.locator('.lanebtn:has-text("Sax")').click();const n3=await p.locator('.steps li').count();check('H: skip today from the plan row works',n3===0,'n '+n3);
});
await story('I. Sunday: review button, hours accumulate, preview → apply → configure',async()=>{
  const s=JSON.parse(seed());s.sessions=[{date:'2026-10-12',block:'Piano block 1',minutes:90},{date:'2026-10-13',block:'Piano block 1',minutes:60}];s.practice={'2026-10-12':{piano1:90},'2026-10-13':{piano1:60},'2026-10-15':{skippedDay:true},'2026-10-16':{skippedDay:true}};
  await open('2026-10-18T17:00:00',JSON.stringify(s));const hasBtn=await p.locator('button:has-text("Open this week")').count();check('I: Sunday shows review button',hasBtn===1);
  await p.click('button:has-text("Open this week")');await p.waitForTimeout(400);const h=await p.textContent('.plain');check('I: review opens on week 2 with 2.5h',h.includes('Week 2')&&/2\.5/.test(h),h.slice(0,160));
  await p.click('button:has-text("Preview next week")');await p.waitForTimeout(300);const ch=await p.textContent('.changes');check('I: proposes Wed Light after 2 skips + eases piano',ch.includes('Wednesday')&&ch.includes('Piano guideline'),ch);
  await p.click('button:has-text("Apply these changes")');await p.waitForTimeout(300);const s2=await st();check('I: apply set Wed Oct 21 light + lowered target',s2.practice['2026-10-21']?.dayType==='light'&&s2.settings.targets.piano<1050,JSON.stringify({wed:s2.practice['2026-10-21'],t:s2.settings.targets}));
  await go('#/configure');const cfg=await p.inputValue('input[type=number] >> nth=0');check('I: configure shows the new piano target',Number(cfg)===s2.settings.targets.piano,cfg);
  await go('#/today/2026-10-21');const m=await p.textContent('.datenav .meta');check('I: Wed Oct 21 reads Light · set by you',m.includes('Light'),m);
});
await story('J. Month: mark a future item complete → curriculum + that day',async()=>{
  await open('2026-10-12T09:00:00');await go('#/calendar/month');await p.waitForTimeout(500);
  const cell=p.locator('.mday').filter({hasText:/^16/});const pill=cell.locator('.mev.Piano').first();const label=await pill.textContent();await pill.click();await p.click('.modal button:has-text("Mark complete")');await p.waitForTimeout(200);
  const s=await st();const d=Object.values(s.queueDone)[0];check('J: done on Oct 16',d==='2026-10-16',d);
  await go('#/today/2026-10-16');const on=await p.locator('.steps li.on').count();check('J: Oct 16 shows it ticked',on>=1,label);
});
await story('K. Five practice days in a row → Light (weekends shouldn’t break the streak)',async()=>{
  const s=JSON.parse(seed());for(const d of ['12','13','14','15','16'])s.practice['2026-10-'+d]={piano1:60};
  await open('2026-10-19T09:00:00',JSON.stringify(s));const m=await p.textContent('.datenav .meta');check('K: Mon after 5 straight practice days is Light',m.includes('Light'),m);
});
await story('L. Backup export/import round trip',async()=>{
  await open('2026-10-12T09:00:00');await go('#/review');const [dl]=await Promise.all([p.waitForEvent('download',{timeout:3000}),p.click('button:has-text("Export a backup")')]);const path=await dl.path();const txt=require('fs').readFileSync(path,'utf8');check('L: backup is valid JSON with sessions',!!JSON.parse(txt).sessions);
  const s=await st();check('L: lastBackup recorded',!!s.settings.lastBackup);
});
await story('M. Programs: considering stays off Today; registered loses flex tag',async()=>{
  await open('2026-10-12T09:00:00');const plan=await p.textContent('.plan');check('M: BKCM (planned) on Mon plan',plan.includes('BKCM'));
  await go('#/programs');const row=p.locator('table.t tr',{hasText:'Blues Jam'});await row.locator('select').last().selectOption('considering');await p.waitForTimeout(150);await go('#/today/2026-10-15');const plan2=await p.textContent('.plan-list');check('M: considering class leaves Today (Thu Blues Jam)',!plan2.includes('Blues Jam'),plan2.slice(0,120));
});
await story('N. Deep link + back button through tabs',async()=>{
  await open('2026-10-12T09:00:00');await go('#/today/2026-10-14');await go('#/calendar/week');await go('#/practice');await p.goBack();await p.waitForTimeout(200);await p.goBack();await p.waitForTimeout(200);
  const h=await p.evaluate(()=>location.hash);const d=await p.textContent('h2.serif.big');check('N: back returns to the same day',h.includes('2026-10-14')&&d.includes('14'),h+' '+d);
});
await story('O. Sax lane on a class day',async()=>{
  await open('2026-10-13T09:00:00');await p.locator('.lanebtn:has-text("Sax")').click();const n=await p.locator('.steps li').count();check('O: sax has its daily item on a class day',n===1,'n '+n);
  await p.locator('.lanebtn:has-text("Workout")').click();const w=await p.textContent('.main');check('O: workout lane on class day explains no gym slot + climb tick',w.includes('No gym slot')&&w.includes('Climbed today'),w.slice(0,120));
});
console.log(log.join('\n'));console.log('ERRORS:',errs.length?errs:'none');await b.close()})().catch(e=>{console.log('HARNESS',e.message);process.exit(1)});
