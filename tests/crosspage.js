const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await b.newPage({viewport:{width:1366,height:900}});
const errs=[],log=[];p.on('pageerror',e=>errs.push(e.message));
const seed=JSON.stringify({settings:{hiddenItems:[],tripsOff:[],programState:{kaufTue:'registered'}},attendance:{},practice:{},climbing:{},running:{},pullups:{},coffee:{},weekly:{},customShops:[],tunes:{},transcriptions:[],sessions:[],queueDone:{},queueSkip:[],queueRepeat:[],queuePriority:{}});
const go=async h=>{await p.goto('http://localhost:4173/'+h);await p.waitForTimeout(500)};
const st=async()=>JSON.parse(await p.evaluate(()=>localStorage.getItem('project-ooo:v1')));
const check=(name,ok,detail='')=>log.push((ok?'ok   ':'GAP  ')+name+(detail?' — '+detail:''));
await go('#/today');await p.evaluate(s=>localStorage.setItem('project-ooo:v1',s),seed);await p.reload();await p.waitForTimeout(600);

// Day 1: Mon Oct 12 — practice, tick, finish with a next-time note
try{
await go('#/today/2026-10-12');
await p.click('button:has-text("Start session")');await p.waitForTimeout(200);
await p.locator('.steps li').nth(1).click();await p.locator('.steps li').nth(2).click();await p.waitForTimeout(200);
await p.click('button:has-text("Finish")');await p.fill('.sheet input[type=number]','75');await p.fill('.sheet textarea','form held');await p.fill('.sheet input:not([type=number])','the bridge slowly');await p.click('.sheet button:has-text("Save")');await p.waitForTimeout(300);
let s=await st();
check('finish logs minutes to the day', (s.practice['2026-10-12']?.piano1||0)===75, JSON.stringify(s.practice['2026-10-12']));
check('ticked queue steps are dated', Object.values(s.queueDone).includes('2026-10-12'));
check('tune last-practiced updated', s.tunes['Autumn Leaves']?.last==='2026-10-12', JSON.stringify(s.tunes));
}catch(e){check('SECTION Day 1: Mon Oct 12 — practice, tick, finish with a next-time note',false,e.message.split('\n')[0].slice(0,120))}

// next day shows the note
try{
await go('#/today/2026-10-13');const hero=await p.textContent('.main');check('next-time note appears next day', hero.includes('the bridge slowly'));
check('undone step from Mon carried to Tue', hero.includes('Rooted 5-Note GPS #1'), hero.slice(0,300));
}catch(e){check('SECTION next day shows the note',false,e.message.split('\n')[0].slice(0,120))}

// Curriculum reflects
try{
await go('#/practice');await p.click('button:has-text("Curriculum")');await p.waitForTimeout(300);const cur=await p.textContent('.qlist');check('curriculum shows Mon items done', cur.includes('done Mon Oct 12'), cur.slice(0,200));
}catch(e){check('SECTION Curriculum reflects',false,e.message.split('\n')[0].slice(0,120))}

// Calendar month reflects
try{
await go('#/calendar/month');await p.waitForTimeout(600);const doneCells=await p.locator('.mev.Piano.done').count();check('month strikes through done items', doneCells>=2, 'done pills '+doneCells);
}catch(e){check('SECTION Calendar month reflects',false,e.message.split('\n')[0].slice(0,120))}

// Review reflects
try{
await go('#/review');await p.waitForTimeout(400);await p.click('.daynav button:has-text("›")');await p.waitForTimeout(300);const rv=await p.textContent('.plain');check('review week 2 shows piano time', /1\.2|1\.3|75/.test(rv)||rv.includes('1.2'), rv.slice(0,120).replace(/\s+/g,' '));
}catch(e){check('SECTION Review reflects',false,e.message.split('\n')[0].slice(0,120))}

// Repertoire vs queue
try{
await go('#/practice');const rep=await p.textContent('.tunes');check('repertoire knows Autumn Leaves was practiced today', rep.includes('today')||rep.includes('1d ago'), rep.slice(0,160));
check('repertoire stage reflects queue progress (Autumn Leaves step 2 done)', /2\/5|learning/.test(rep), 'stages are a separate manual checklist');

}catch(e){check('SECTION Repertoire vs queue',false,e.message.split('\n')[0].slice(0,120))}

// By ear: add song, tick first step from Today
try{
await p.click('button:has-text("By ear")');await p.fill('input[placeholder^="Song"]','Sunny');await p.click('button:has-text("Add song")');await p.waitForTimeout(200);
await go('#/today/2026-10-14');const t13=await p.textContent('.steps');check('by-ear song named in piano block 2 (Wed, full day)', t13.includes('Sunny'), t13.slice(0,200));
try{const earLi=p.locator('.steps li',{hasText:'Sunny'}).first();await earLi.locator('.lbl').click({timeout:3000});await p.waitForTimeout(200)}catch(e){check('could click ear step',false,e.message.slice(0,60))}
await go('#/practice');await p.click('button:has-text("By ear")');const be=await p.textContent('.ear');check('ticking the ear step in Today ticks the song step in By ear', be.includes('1/5'), be.slice(0,120).replace(/\s+/g,' '));

}catch(e){check('SECTION By ear: add song, tick first step from Today',false,e.message.split('\n')[0].slice(0,120))}

// Programs: set BH free jam to registered → Today shows without flex? and Week board shows Planned
try{
await go('#/programs');await p.selectOption('table.t select >> nth=3','registered');await p.waitForTimeout(200);
await go('#/today/2026-10-13');const plan=await p.textContent('.plan');check('registered class on Tue plan', plan.includes('BH free jam'));
}catch(e){check('SECTION Programs: set BH free jam to registered → Today shows without flex? and Week board shows Planned',false,e.message.split('\n')[0].slice(0,120))}

// Week board drag → Today reflects
try{
await go('#/calendar/week');await p.waitForTimeout(600);await p.click('button:has-text("→")');await p.waitForTimeout(300);
const blk=p.locator('.wb-row').nth(3).locator('.wb-ev.flex.piano').first();const bb=await blk.boundingBox({timeout:3000});await p.mouse.move(bb.x+15,bb.y+20);await p.mouse.down();await p.mouse.move(bb.x+80,bb.y+20,{steps:5});await p.mouse.up();await p.waitForTimeout(300);
s=await st();const ov=s.practice['2026-10-14']?.blocks;await go('#/today/2026-10-14');const plan14=await p.textContent('.plan-list');check('week-board move shows on Today', !!ov && !plan14.includes('10:30a'), JSON.stringify(ov)+' / '+plan14.slice(0,80));

}catch(e){check('SECTION Week board drag → Today reflects',false,e.message.split('\n')[0].slice(0,120))}

// Change day → Rest → calendar/week reflect
try{
await p.selectOption('.selbtn select','rest');await p.waitForTimeout(200);await go('#/calendar/week');await p.waitForTimeout(500);await p.click('button:has-text("→")');await p.waitForTimeout(300);const wedRow=await p.locator('.wb-row').nth(3).textContent();check('rest day shows on week board', /Rest/.test(wedRow)&&!/Piano/.test(wedRow), wedRow.slice(0,60));
await go('#/calendar/month');await p.waitForTimeout(600);const wedPiano=await p.locator('.mday').filter({hasText:/^14/}).locator('.mev.Piano').count();check('rest day has no piano pills in month', wedPiano===0, 'pills '+wedPiano);
}catch(e){check('SECTION Change day → Rest → calendar/week reflect',false,e.message.split('\n')[0].slice(0,120))}

// Skipped today → next day Light
try{
await go('#/today/2026-10-15');await p.click('button:has-text("Skipped today")');await p.waitForTimeout(200);await go('#/today/2026-10-16');const m16=await p.textContent('.datenav .meta');check('day after a skip is Light with reason', m16.includes('Light')&&m16.includes('skipped'), m16);
}catch(e){check('SECTION Skipped today → next day Light',false,e.message.split('\n')[0].slice(0,120))}

// Replan → Configure target
try{
await go('#/review');await p.click('.daynav button:has-text("›")');await p.waitForTimeout(200);await p.click('button:has-text("Replan week")');await p.waitForTimeout(300);s=await st();check('replan wrote target/changes', !!s.weekly[2]?.replan, JSON.stringify(s.weekly[2]?.replan));
}catch(e){check('SECTION Replan → Configure target',false,e.message.split('\n')[0].slice(0,120))}

// Coffee visited → Today picks exclude it
try{
await go('#/play');const first=await p.locator('.shop h4').first().textContent();await p.click('.shop input[type=checkbox] >> nth=0');await p.waitForTimeout(200);await go('#/today/2026-10-13');const picks=await p.textContent('.coffeepick');check('visited shop not suggested', !picks.includes(first.trim()), first.trim()+' / '+picks.slice(0,80));
}catch(e){check('SECTION Coffee visited → Today picks exclude it',false,e.message.split('\n')[0].slice(0,120))}

// Trip off → Travel day becomes Full
try{
await go('#/configure');await p.uncheck('.checks input >> nth=0');await p.waitForTimeout(200);await go('#/today/2026-10-06');const m6=await p.textContent('.datenav .meta');check('unticking a trip un-travels the day', !m6.includes('Travel'), m6);
}catch(e){check('SECTION Trip off → Travel day becomes Full',false,e.message.split('\n')[0].slice(0,120))}

// Month "mark complete" on a class → attendance → Review classes?
try{
await go('#/calendar/month');await p.waitForTimeout(600);const cls=p.locator('.mev.Classes').filter({hasText:'Kaufman'}).first();await cls.click();await p.click('.modal button:has-text("Mark complete")');await p.waitForTimeout(200);s=await st();check('class marked complete = attendance went', Object.values(s.attendance).includes('went'));

}catch(e){check('SECTION Month "mark complete" on a class → attendance → Review classes?',false,e.message.split('\n')[0].slice(0,120))}
console.log(log.join('\n'));console.log('ERRORS:',errs.length?errs:'none');await b.close()})().catch(e=>{console.log('HARNESS',e.message);process.exit(1)});
