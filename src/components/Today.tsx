import { useEffect, useMemo, useState } from 'react'
import { DOW, END, MONTHS, key, parse, START, today as todayKey, weekNo, weekStart } from '../dates'
import { courses } from '../data'
import { DAY_TYPES, blocksForType, classWindows, coursesForWeek, dayTypeWhy, defaultStartFor, fmtMin, freeSlot, itemsOn, phasesForWeek, setTaipeiStart, startFor, tripOn, weekTotals, attKey, type Block } from '../model'
import { span } from '../time'
import { update, useUser } from '../storage'
import { signIn, useSync } from '../sync'
import { standardOfWeek, tasksFor, type Task } from '../tasks'
import { byId, laneEta, nextIn, project, type Lane } from '../queue'
import { courseLinks, pdfLinks } from '../drive'
import { DayLog } from './DayLog'
import { WeekProgress } from './WeekProgress'
import { Chip } from './Chip'
import { Ic } from './Icons'
import type { Program } from '../types'

export const clampDay = (k: string) => (k < START ? START : k > END ? END : k)
export const shiftDay = (k: string, n: number) => { const d = parse(k); d.setDate(d.getDate() + n); return clampDay(key(d)) }
export const fmtDate = (k: string) => { const d = parse(k); return `${DOW[d.getDay()]}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}` }
const fmtLong = (k: string) => { const d = parse(k); return `${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}` }
const LANES: { id: Lane; label: string; blocks: string[]; minutes: 'piano1' | 'sax' | null }[] = [
  { id: 'piano', label: 'piano', blocks: ['Piano block 1', 'Piano (light)', 'Piano block 2'], minutes: 'piano1' },
  { id: 'sax', label: 'sax', blocks: ['Sax'], minutes: 'sax' },
  { id: 'workout', label: 'workout', blocks: ['Gym slot'], minutes: null },
]

const useNow = () => {
  const [n, setN] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setN(new Date()), 30_000); return () => clearInterval(t) }, [])
  return n
}

/** This week's courses + phases (used by the Week view). */
export function WeekFocus({ wk, onNav }: { wk: number; onNav: (v: 'fitness') => void }) {
  if (wk < 1) return null
  const pdfs = coursesForWeek(wk).flatMap(c => courseLinks(c.id)).filter((l, i, a) => a.findIndex(x => x.url === l.url) === i)
  return (
    <div className="focus">
      {coursesForWeek(wk).map(c => <a key={c.id} className="focus-row" href={c.url} target="_blank" rel="noreferrer"><b>{c.short} ↗</b><span>{c.feeds}</span></a>)}
      {pdfs.length > 0 && <div className="pdfrow">{pdfs.map(l => <a key={l.url} href={l.url} target="_blank" rel="noreferrer">📄 {l.label}</a>)}</div>}
      {phasesForWeek(wk).map((p, i) => <button key={i} className="focus-row" onClick={() => onNav('fitness')}><b>{p.short}</b><span>{p.text}</span></button>)}
    </div>
  )
}

type PlanRow = { key: string; start: number; end?: number; title: string; sub?: string; kind: 'block' | 'class' | 'travel' | 'life'; block?: Block; p?: Program; clash?: { p: Program; from: number; to: number }; skipped?: boolean; lane?: Lane }

export function Today({ date, setDate, onOpen, onNav }: { date: string; setDate: (d: string) => void; onOpen: (p: Program, d: string) => void; onNav: (v: 'fitness') => void }) {
  const user = useUser()
  const sync = useSync()
  setTaipeiStart(user.settings.taipeiStart)
  const now = useNow()
  const real = todayKey(), wk = weekNo(date), isToday = date === real
  const trip = tripOn(date, user.settings.tripsOff)
  const { type, why } = dayTypeWhy(user, date, real)
  const pr = user.practice[date] ?? {}
  const setPr = (v: object) => update(u => ({ ...u, practice: { ...u.practice, [date]: { ...u.practice[date], ...v } } }))
  const nowMin = isToday ? now.getHours() * 60 + now.getMinutes() : undefined
  const std = standardOfWeek(user, wk)
  const [lane, setLane] = useState<Lane>('piano')
  const [finishing, setFinishing] = useState<Lane | null>(null)
  const [showWeek, setShowWeek] = useState(false)

  const projected = useMemo(() => project(user, real), [user, real])
  const tasks = tasksFor(date, user, type, projected)
  const done = pr.tasks ?? [], skipped = pr.skipped ?? []
  const wins = classWindows(user, date)
  const blocks = blocksForType(date, type, startFor(user, date), user)
  const laneOf = (t: string): Lane | undefined => LANES.find(l => l.blocks.includes(t))?.id
  const rows: PlanRow[] = blocks.map(b => ({
    key: 'b' + b.title, start: b.start, end: b.end, title: b.title, kind: 'block' as const, block: b, skipped: skipped.includes(b.title), lane: laneOf(b.title),
    sub: (tasks[b.title]?.length ? `${tasks[b.title].filter(t => isDone(t)).length}/${tasks[b.title].length} done` : b.note),
    clash: wins.find(w => b.start < w.to && b.end > w.from && !skipped.includes(b.title)),
  }))
  const items = itemsOn(date, user).filter(x => !['climb', 'climbLES', 'run', 'run2'].includes(x.p.id))
  const away = items.filter(x => x.missed)
  for (const it of items.filter(x => !x.missed)) {
    const t = span(it.p.time); if (!t) continue
    const w = wins.find(w => w.p.id === it.p.id)
    if (w && w.from < w.start) rows.push({ key: 'go' + it.p.id, start: w.from, title: `Leave for ${it.p.short}`, sub: it.p.go?.split('·').slice(1).join('·').trim() || it.p.go, kind: 'travel' })
    rows.push({ key: it.p.id, start: w?.start ?? t[0], end: w?.end ?? t[1], title: it.p.short, sub: it.p.loc?.split(',')[0], kind: it.p.kind === 'inperson' ? 'class' : 'life', p: it.p })
  }
  rows.sort((a, b) => a.start - b.start)

  // ---- queue-aware done state: queue items are done when queueDone has them on this date; plain tasks live in practice[date].tasks
  function isDone(t: Task) { return t.qid ? user.queueDone?.[t.qid] === date : done.includes(t.id) }
  function toggleTask(t: Task) {
    if (t.qid) update(u => { const qd = { ...u.queueDone }; if (qd[t.qid!] === date) delete qd[t.qid!]; else qd[t.qid!] = date; return { ...u, queueDone: qd } })
    else setPr({ tasks: done.includes(t.id) ? done.filter(x => x !== t.id) : [...done, t.id] })
    if (t.qid?.startsWith('wv8') || t.qid?.startsWith('wc25k') ) { /* workout ticks also log the session */
      const kind = t.qid.startsWith('wv8') ? 'climbing' : 'running'
      update(u => ({ ...u, [kind]: { ...u[kind], [date]: { ...(u[kind] as Record<string, object>)[date], done: !isDone(t) } } }))
    }
  }
  const laneBlocks = (l: Lane) => blocks.filter(b => laneOf(b.title) === l && !skipped.includes(b.title))
  const laneTasks = (l: Lane) => laneBlocks(l).flatMap(b => tasks[b.title] ?? [])
  const curBlock = laneBlocks(lane)[0]
  const curTasks = laneTasks(lane)
  const laneDone = (l: Lane) => { const ts = laneTasks(l); return ts.length > 0 && ts.every(isDone) }
  const onDay = new Set(curTasks.map(t => t.qid).filter(Boolean) as string[])
  const next = nextIn(user, lane, onDay)
  const active = pr.active
  const isActive = !!active && laneOf(active.block) === lane
  const elapsed = isActive ? Math.max(1, Math.round((Date.now() - active!.since) / 60000)) : 0
  const laneDef = LANES.find(l => l.id === lane)!
  const lastSession = [...user.sessions].reverse().find(s => laneOf(s.block) === lane && s.date < date && (lane === 'piano' ? s.tune === std : true))
  const lessonItem = curTasks.find(t => t.qid?.startsWith('v'))
  const lessonQ = lessonItem?.qid ? byId(lessonItem.qid) : undefined
  const course = courses.find(c => c.id === (lessonQ?.course ?? coursesForWeek(wk)[0]?.id))
  const chart = (lessonQ ? pdfLinks(lessonQ.pdf) : courseLinks(course?.id ?? ''))[0]
  const eta = laneEta(user, lane, projected)
  const etaText = `${eta.pct}% (${eta.done}/${eta.total})` + (eta.pace != null && eta.practiceDays > 0 ? ` · ${eta.pace}/day so far` : '') + (eta.eta ? ` · on track to finish ${fmtDate(eta.eta)}` : eta.short ? ` · ~${eta.short} past Dec 23 at this pace` : '')
  const title = lane === 'piano' ? (std ?? 'Pick a standard') : lane === 'sax' ? 'Sax' : 'Workout'
  const focusLine = lane === 'piano' ? curTasks.filter(t => t.qid?.startsWith('s')).map(t => t.label.split(': ')[1]).join('. ') : curTasks[0]?.label.replace(/ \(\d+\/\d+\)$/, '')
  const skip = (t: string) => setPr({ skipped: skipped.includes(t) ? skipped.filter(x => x !== t) : [...skipped, t] })
  const setBlock = (t: string, v: { start?: number; end?: number } | null) => setPr({ blocks: v ? { ...pr.blocks, [t]: v } : Object.fromEntries(Object.entries(pr.blocks ?? {}).filter(([k]) => k !== t)) })
  const [nextNote, setNextNote] = useState('')
  const saveNext = () => { if (nextNote.trim() && curBlock) { update(u => ({ ...u, sessions: [...u.sessions, { date, block: curBlock.title, minutes: 0, tune: lane === 'piano' ? std : undefined, next: nextNote.trim() }] })); setNextNote('') } }
  const todayNext = [...user.sessions].reverse().find(s => s.date === date && s.next)?.next
  const tot = weekTotals(user, wk)
  const saxSessions = Object.entries(user.practice).filter(([d, p]) => weekNo(d) === wk && (p.sax ?? 0) > 0).length
  const h = Math.floor(tot.piano / 60), m = tot.piano % 60

  return (
    <div className="today3">
      <div className="datebar">
        <div className="datenav">
          <button className="btn icon" onClick={() => setDate(shiftDay(date, -1))} aria-label="Previous day">‹</button>
          <div>
            <h2 className="serif big">{fmtLong(date)}</h2>
            <p className="meta">{wk >= 1 ? `Week ${wk}` : date < START ? 'Before the sabbatical' : 'After'} · New York{trip ? ` · ✈ ${trip.name}` : ''}{!isToday ? (date < real ? ' · past' : ' · projected') : ''}</p>
          </div>
          <button className="btn icon" onClick={() => setDate(shiftDay(date, 1))} aria-label="Next day">›</button>
          {!isToday && <button className="btn small" onClick={() => setDate(clampDay(real))}>Today</button>}
        </div>
        <div className="daytag" title={DAY_TYPES.find(t => t.id === type)?.hint}>
          <span className="eyebrow">Today is a</span>
          <b>{DAY_TYPES.find(t => t.id === type)?.label} day</b>
          <span className="meta">{why}{pr.dayType && <> · <button className="linkbtn quiet" onClick={() => setPr({ dayType: undefined })}>let the app decide</button></>}</span>
        </div>
      </div>

      <div className="grid3">
        <section className="card plan">
          <h3 className="serif">Today’s plan</h3>
          <div className="row between quiet"><label className="inl quiet">Starts <input type="time" value={startFor(user, date)} onChange={e => setPr({ startTime: e.target.value || undefined })} />
            {pr.startTime && <button className="linkbtn quiet" onClick={() => setPr({ startTime: undefined })}>reset ({defaultStartFor(user, date)})</button>}</label></div>
          {rows.length === 0 && <p className="empty">Nothing booked. Excellent.</p>}
          {type === 'travel' && <p className="meta">Travel day — nothing planned. The queue waits.</p>}
          <ol className="plan-list">
            {rows.map(r => {
              const isSel = r.kind === 'block' && r.lane === lane
              const isNow = nowMin != null && r.end != null && nowMin >= r.start && nowMin < r.end
              const cls = ['plan-row', r.kind, isSel ? 'sel' : '', isNow ? 'now' : '', r.skipped ? 'skipped' : ''].join(' ')
              const onClick = r.kind === 'block' && r.lane ? () => setLane(r.lane!) : r.p ? () => onOpen(r.p!, date) : undefined
              return (
                <li key={r.key} className={cls} onClick={onClick}>
                  <span className="t num">{fmtMin(r.start)}{r.end && r.kind === 'class' ? `–${fmtMin(r.end)}` : ''}</span>
                  <span className="dot" />
                  <span className="body">
                    <b>{r.title}{r.end && r.kind === 'block' ? ` · ${r.end - r.start} min` : ''}{r.p?.kind === 'inperson' && (r.p.drop || r.p.uncertain?.includes(date)) ? ' · flex' : ''}</b>
                    {r.sub && <small>{r.sub}</small>}
                    {r.clash && <small className="clash">Overlaps {r.clash.p.short} · <button className="linkbtn" onClick={e => { e.stopPropagation(); const len = r.end! - r.start; const s = freeSlot(user, date, len, r.clash!.to); setBlock(r.title, { start: s, end: s + len }) }}>move after</button>
                      {r.start < r.clash.from && <> · <button className="linkbtn" onClick={e => { e.stopPropagation(); setBlock(r.title, { end: r.clash!.from }) }}>shorten</button></>} · <button className="linkbtn" onClick={e => { e.stopPropagation(); skip(r.title) }}>skip</button></small>}
                    {r.skipped && <small><button className="linkbtn quiet" onClick={e => { e.stopPropagation(); skip(r.title) }}>restore</button></small>}
                  </span>
                  {r.kind === 'block' && r.lane && <span className="chev">›</span>}
                </li>
              )
            })}
          </ol>
          {away.length > 0 && <details className="away"><summary>While you’re away ({away.length})</summary>{away.map(({ p, maybe }) => <Chip key={p.id} p={p} missed maybe={maybe} att={user.attendance[attKey(p.id, date)]} onOpen={() => onOpen(p, date)} />)}</details>}
        </section>

        <section className="card main">
          <div className="lanes">
            <span className="eyebrow">On the</span>
            {LANES.map(l => <button key={l.id} className={'lanebtn' + (lane === l.id ? ' on' : '') + (laneDone(l.id) ? ' done' : '')} onClick={() => setLane(l.id)}>{l.label}{laneDone(l.id) ? ' ✓' : ''}</button>)}
            <span className="eyebrow">today</span>
          </div>
          {curTasks.length > 0 || curBlock ? <>
            <h1 className="tune">{title}</h1>
            {focusLine && <p className="lede serif">{focusLine}.</p>}
            {lastSession?.next ? <p className="meta">Start with: {lastSession.next}</p> : lastSession?.note ? <p className="meta">Last time: {lastSession.note}</p> : <p className="meta">{etaText}</p>}
            {laneDef.minutes && curBlock && (isActive
              ? <button className="btn primary big wide" onClick={() => setFinishing(lane)}><Ic.stop /> Finish session · {elapsed} min</button>
              : <button className="btn primary big wide" disabled={!!active} onClick={() => setPr({ active: { block: curBlock.title, since: Date.now() } })}><Ic.start /> Start {curBlock.end - curBlock.start}-min session</button>)}
            {lane === 'piano' && <div className="grid2 links">
              {course && <a className="btn" href={course.url} target="_blank" rel="noreferrer"><Ic.lesson /> Open lesson{lessonQ ? ` · ${lessonQ.label.split(': ')[1]?.slice(0, 26)}` : ''}</a>}
              {chart ? <a className="btn" href={chart.url} target="_blank" rel="noreferrer"><Ic.chart /> Open chart · {chart.label.split(' — ')[0].split(' (')[0]}</a> : <a className="btn" href={`https://www.google.com/search?q=${encodeURIComponent((std ?? '') + ' lead sheet')}`} target="_blank" rel="noreferrer"><Ic.chart /> Find chart</a>}
            </div>}
            <p className="eyebrow steps-h">{lane === 'piano' ? 'Session steps' : lane === 'sax' ? 'Today' : 'Today’s session'}</p>
            <ol className="steps">
              {curTasks.length === 0 && <li className="meta">{curBlock?.note ?? 'Nothing queued for today.'}</li>}
              {curTasks.map((t, i) => { const on = isDone(t); return (
                <li key={t.id} className={on ? 'on' : ''} onClick={() => toggleTask(t)}>
                  <span className="n">{on ? '✓' : i + 1}</span>
                  <span>{t.url ? <a href={t.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>{t.label} ↗</a> : t.label}{t.qid && <small className="qtag">queue</small>}</span>
                </li>) })}
            </ol>
            {laneDone(lane) && next && <div className="nextq">
              <span>Done for today. Next in the queue: <b>{next.label.replace(/ \(\d+\/\d+\)$/, '')}</b></span>
              <button className="btn" onClick={() => setPr({ pulled: [...(pr.pulled ?? []), next.id] })}>Pull it into today</button>
            </div>}
            {!laneDone(lane) && curTasks.some(t => t.qid) && <p className="meta small">Anything unticked stays at the front of the queue and shows up tomorrow. Classes are the only fixed dates.</p>}
          </> : <>
            <h1 className="tune">{type === 'rest' ? 'Rest' : type === 'travel' ? 'Away' : title}</h1>
            <p className="lede serif">{type === 'rest' ? 'Nothing planned. That’s part of the plan.' : 'Open to interpretation.'}</p>
            <p className="meta">{etaText}</p>
          </>}
        </section>

        <section className="card log">
          <h3 className="serif">Quick log</h3>
          <DayLog date={date} />
          <label className="block">Next time, start with…
            <textarea rows={3} placeholder={todayNext ?? 'e.g. slower tempo, left hand voicings, or the bridge…'} value={nextNote} onChange={e => setNextNote(e.target.value)} onBlur={saveNext} /></label>
          <p className="meta savestate">{sync.user ? (sync.state === 'synced' ? '☁ Synced to Firebase' : sync.state === 'error' ? `⚠ ${sync.error}` : '☁ Syncing…') : <>Saved on this device only · <button className="linkbtn" onClick={signIn}>sign in to sync</button></>}</p>
        </section>
      </div>

      <footer className="weekbar">
        <Ic.review /><span>This week</span>
        <b className="num">{h}h {m ? m + 'm' : ''} piano</b>
        <span className="num">{tot.climbs} climb{tot.climbs === 1 ? '' : 's'}</span>
        <span className="num">{saxSessions} sax session{saxSessions === 1 ? '' : 's'}</span>
        <span className="num">{tot.runs} run{tot.runs === 1 ? '' : 's'}</span>
        <button className="linkbtn quiet" onClick={() => setShowWeek(!showWeek)}>{showWeek ? 'hide' : 'details'}</button>
        <span className="wknav"><button className="btn icon" onClick={() => setDate(shiftDay(date, -7))}>‹</button> Week {Math.max(wk, 0)} · {weekStart(Math.max(wk, 1))} <button className="btn icon" onClick={() => setDate(shiftDay(date, 7))}>›</button></span>
      </footer>
      {showWeek && wk >= 1 && <div className="card"><WeekProgress wk={wk} from={date} /><WeekFocus wk={wk} onNav={onNav} /></div>}
      {finishing && curBlock && <FinishSheet date={date} block={curBlock} minutesKey={laneDef.minutes ?? 'piano1'} tune={lane === 'piano' ? std : undefined} onClose={() => setFinishing(null)} />}
    </div>
  )
}

function FinishSheet({ date, block, minutesKey, tune, onClose }: { date: string; block: Block; minutesKey: 'piano1' | 'sax'; tune?: string; onClose: () => void }) {
  const user = useUser()
  const since = user.practice[date]?.active?.since ?? Date.now()
  const [mins, setMins] = useState(Math.max(1, Math.round((Date.now() - since) / 60000)))
  const [note, setNote] = useState(''), [next, setNext] = useState('')
  const save = () => {
    update(u => ({
      ...u,
      practice: { ...u.practice, [date]: { ...u.practice[date], active: undefined, [minutesKey]: (u.practice[date]?.[minutesKey] ?? 0) + mins } },
      sessions: [...u.sessions, { date, block: block.title, minutes: mins, tune, note: note.trim() || undefined, next: next.trim() || undefined }],
      tunes: tune ? { ...u.tunes, [tune]: { ...{ checks: [] }, ...u.tunes[tune], last: date } } : u.tunes,
    }))
    onClose()
  }
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()} role="dialog" aria-label="Finish session">
        <h3 className="serif">{block.title}{tune ? ` · ${tune}` : ''}</h3>
        <label className="inl">Minutes <input type="number" min={1} value={mins} onChange={e => setMins(Number(e.target.value))} /></label>
        <label className="block">What got easier / where did you get stuck?<textarea rows={2} value={note} onChange={e => setNote(e.target.value)} /></label>
        <label className="block">Next time, start with…<input value={next} onChange={e => setNext(e.target.value)} /></label>
        <div className="row end"><button className="linkbtn quiet" onClick={() => { update(u => ({ ...u, practice: { ...u.practice, [date]: { ...u.practice[date], active: undefined } } })); onClose() }}>discard</button><button className="btn primary" onClick={save}>Save</button></div>
      </div>
    </div>
  )
}
