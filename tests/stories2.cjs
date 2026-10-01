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
const doneAll=(s,tune)=>{for(let k=0;k<5;k++)s.queueDone[`s0.${k}`]='2026-10-1'+(2+k%4)};

await story('P. Session survives navigation; second lane can’t start; discard works',async()=>{
  await open('2026-10-12T10:40:00');await p.click('button:has-text("Start session")');await p.waitForTimeout(150);
  await go('#/calendar/month');await go('#/today/2026-10-12');const btn=await p.textContent('.btn.primary.big.wide');check('P: still in session after leaving the tab',btn.includes('Finish'),btn);
  await p.locator('.lanebtn:has-text("Sax")').click();const dis=await p.locator('.btn.primary.big.wide').isDisabled();check('P: sax Start disabled while piano is active',dis);
  await p.locator('.lanebtn:has-text("Piano")').click();await p.click('button:has-text("Finish")');await p.click('.sheet button:has-text("discard")');await p.waitForTimeout(150);const s=await st();check('P: discard clears active, logs nothing',!s.practice['2026-10-12']?.active&&s.sessions.length===0);
});
await story('Q. Started a session yesterday and never finished',async()=>{
  const s=seed();s.practice['2026-10-12']={active:{block:'Piano block 1',since:new Date('2026-10-12T10:30:00').getTime()}};
  await open('2026-10-13T09:00:00',s);const btn=await p.textContent('.btn.primary.big.wide');check('Q: today is not blocked by yesterday’s stale session',btn.includes('Start'),btn);
  await go('#/today/2026-10-12');const y=await p.textContent('.main');check('Q: yesterday shows a sane state (not a 1300-min timer)',!/1[0-9]{3} min/.test(y),y.slice(0,120));
});
await story('R. Week board: move a block onto a class → Today flags the clash with move/shorten',async()=>{
  const s=seed();s.practice['2026-10-13']={blocks:{'Piano block 1':{start:15*60,end:17*60}}};
  await open('2026-10-13T09:00:00',s);const plan=await p.textContent('.plan');check('R: a moved block still shows as a chunk, no clock, no clash',plan.includes('Piano')&&!plan.includes('Overlaps'),plan.slice(0,200));
  const s2=await st();const b=s2.practice['2026-10-13'].blocks['Piano block 1'];check('R: the week-board placement is kept for the board',b.start===15*60,JSON.stringify(b));
});
await story('T. Finish a by-ear song → counted, Today asks for the next one',async()=>{
  const s=seed();s.transcriptions=[{id:'1',date:'2026-10-10',song:'Sunny',note:'',steps:[]}];
  await open('2026-10-14T09:00:00',s);
  await p.locator('.steps li',{hasText:'Sunny'}).first().locator('.lbl').click();await p.waitForTimeout(150);
  let s2=await st();check('T: ticking the ear step advances the song one step',(s2.transcriptions[0].steps||[]).length===1,JSON.stringify(s2.transcriptions[0].steps));
  s2.transcriptions[0].steps=['Rough out the chords (bass line first, label by function)','Get the melody','Play it in the original key','Record a pass','Transpose to two more keys'];s2.transcriptions[0].done='2026-10-14';
  await open('2026-10-15T09:00:00',s2);const steps=await p.textContent('.steps');check('T: after finishing, Today prompts for a new song',steps.includes('Pick a song'),steps.slice(0,160));
  await go('#/practice');await p.click('button:has-text("By ear")');const be=await p.textContent('.plain');check('T: By ear counts 1 learned',/Songs by ear\s*1/.test(be),be.slice(0,120));
});
await story('U. Finish all five tune steps → next tune takes over everywhere',async()=>{
  const s=seed();doneAll(s);await open('2026-10-16T09:00:00',s);
  const tune=await p.textContent('.main .tune');check('U: Today moves to Blue Bossa',tune.includes('Blue Bossa'),tune);
  await go('#/practice');const rep=await p.textContent('.plain');const wo=rep.indexOf('Working on'),bb=rep.indexOf('Blue Bossa'),rv=rep.indexOf('Revisit'),al=rep.indexOf('Autumn Leaves');check('U: Repertoire “Working on” is Blue Bossa, Autumn Leaves in Revisit',wo<bb&&bb<rv&&rv<al,`wo${wo} bb${bb} rv${rv} al${al}`);
  await go('#/review');const strip=await p.textContent('.strip');check('U: Review counts 1 standard memorized from the curriculum',/Standards memorized\s*1 \/ 10/.test(strip),strip);
});
await story('V. Review “Keep” override vs the queue',async()=>{
  const s=seed();doneAll(s);s.weekly[3]={standard:'Autumn Leaves'};await open('2026-10-19T09:00:00',s);
  const tune=await p.textContent('.main .tune');const steps=await p.textContent('.steps');
  check('V: title and steps agree',tune.includes('Blue Bossa')===steps.includes('Blue Bossa'),tune+' | '+steps.slice(0,120));
});
await story('W. Trips: Taipei start moved earlier; CoRL unticked',async()=>{
  const s=seed();s.settings.taipeiStart='2026-12-10';s.settings.tripsOff=['CoRL (optional)'];
  await open('2026-12-11T09:00:00',s);const m=await p.textContent('.datenav .meta');check('W: Dec 11 is Travel after moving Taipei start',m.includes('Travel'),m);
  await go('#/today/2026-11-09');const m2=await p.textContent('.datenav .meta');check('W: CoRL Monday is a normal day when unticked',!m2.includes('Travel'),m2);
});
await story('X. Configure: weekday start, light minutes, hidden coffee',async()=>{
  const s=seed();s.settings.startTimes={3:'09:00'};s.settings.lightMinutes=45;s.settings.hiddenItems=['coffee'];s.practice['2026-10-13']={dayType:'light'};
  await open('2026-10-14T08:00:00',s);const startV=await p.inputValue('.plan input[type=time]');check('X: Wed starts 9a',startV==='09:00',startV);
  await go('#/today/2026-10-13');const l=await p.textContent('.plan-list');check('X: light day uses 45 min',l.includes('45 min'),l);
  await go('#/today/2026-10-16');const f=await p.textContent('.plan-list');check('X: hidden coffee gone from Friday',!f.includes('Coffee'),f.slice(0,80));
});
await story('Y. ICS export respects class status',async()=>{
  const s=seed();s.settings.programState={kaufTue:'considering',bhTue:'registered'};await open('2026-10-12T09:00:00',s);await go('#/configure');
  const [dl]=await Promise.all([p.waitForEvent('download',{timeout:3000}),p.click('button:has-text("Download")')]);const ics=require('fs').readFileSync(await dl.path(),'utf8');
  check('Y: considering class not exported',!ics.includes('Kaufman Harmony'),'has kaufTue: '+ics.includes('Kaufman Harmony'));
  check('Y: registered flex class exported',ics.includes('BH free jam'));
  check('Y: TZ present',ics.includes('TZID=America/New_York'));
});
await story('Z. Old saved data without new fields still loads',async()=>{
  await open('2026-10-12T09:00:00',{settings:{hiddenItems:[],tripsOff:[]},attendance:{},practice:{'2026-10-09':{piano1:30}},climbing:{},running:{},pullups:{},coffee:{},weekly:{}});
  const t=await p.textContent('.main .tune');check('Z: renders with legacy data',t.length>0,t);
  await go('#/practice');await p.click('button:has-text("By ear")');await p.click('button:has-text("Curriculum")');check('Z: roadmap tabs render',true);
});
await story('AA. Attendance: mark class went → month + programs counts',async()=>{
  await open('2026-10-13T20:00:00');await p.locator('.plan-row.class',{hasText:'Kaufman Harmony'}).click();await p.click('.seg button:has-text("went")');await p.click('.sheet button:has-text("Done")');
  await go('#/calendar/month');await p.waitForTimeout(400);const done=await p.locator('.mev.Classes.done').count();check('AA: month strikes the attended class',done>=1,'done '+done);
});
await story('AB. Day navigation clamps at the ends',async()=>{
  await open('2026-12-23T09:00:00');await p.click('button[aria-label="Next day"]');const d=await p.textContent('h2.serif.big');check('AB: cannot go past Dec 23',d.includes('December 23'),d);
});
await story('AC. Change day → Rest then undo via Change day',async()=>{
  await open('2026-10-14T09:00:00');await p.selectOption('.selbtn select','rest');await p.waitForTimeout(150);let m=await p.textContent('.datenav .meta');check('AC: rest applied',m.includes('Rest'),m);
  await p.selectOption('.selbtn select','');await p.waitForTimeout(150);m=await p.textContent('.datenav .meta');check('AC: back to app-decided',m.includes('Full'),m);
});
await story('AD. Jawn ideas persist',async()=>{
  await open('2026-10-12T09:00:00');await go('#/play');await p.click('.subtabs button:has-text("Jawn")');await p.fill('input[type=password]','loo');await p.press('input[type=password]','Enter');await p.waitForTimeout(200);
  await p.fill('input[placeholder="Idea"]','Ferry to Rockaway');await p.click('button:has-text("Add")');await p.reload();await p.waitForTimeout(400);await p.click('.subtabs button:has-text("Jawn")');await p.fill('input[type=password]','loo');await p.press('input[type=password]','Enter');await p.waitForTimeout(200);
  const t=await p.textContent('.plain:has-text("Ours")');check('AD: idea persisted',t.includes('Rockaway'));
});
console.log(log.join('\n'));console.log('ERRORS:',errs.length?errs:'none');await b.close()})().catch(e=>{console.log('HARNESS',e.message);process.exit(1)});
