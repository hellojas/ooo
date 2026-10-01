import { useEffect, useMemo, useState } from 'react'
import { DOW, END, MONTHS, key, parse, START, today as todayKey, weekNo, weekStart } from '../dates'
import { courses } from '../data'
import { DAY_TYPES, PLAN_CHOICES, itemSpan, blocksForType, classWindows, coursesForWeek, dayTypeWhy, defaultStartFor, fmtMin, itemsOn, loggedOn, nudge, phasesForWeek, planMinutes, rhythm, setTaipeiStart, startFor, tripOn, weekTotals, attKey, type Block } from '../model'
import { update, useUser } from '../storage'
import { signIn, useSync } from '../sync'
import { STAGES, standardOfWeek, tasksFor, type Task } from '../tasks'
import { MASTER, byId, project, priorityOf, type Lane } from '../queue'
import { courseLinks, pdfLinks } from '../drive'
import { currentByEar, EAR_STEPS } from './ByEar'
import { DayLog } from './DayLog'
import { WeekProgress } from './WeekProgress'
import { Chip } from './Chip'
import { CoffeePick } from './DaySchedule'
import { currentMake, makeList, setMake } from './Make'
import { Ic } from './Icons'
import type { Program } from '../types'

export const clampDay = (k: string) => (k < START ? START : k > END ? END : k)
export const shiftDay = (k: string, n: number) => { const d = parse(k); d.setDate(d.getDate() + n); return clampDay(key(d)) }
export const fmtDate = (k: string) => { const d = parse(k); return `${DOW[d.getDay()]}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}` }
const fmtLong = (k: string) => { const d = parse(k); return `${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}` }
type UILane = Lane | 'make'
const LANE_ICON = { piano: Ic.piano, sax: Ic.sax, make: Ic.make, workout: Ic.workout }
const plan_idx = (tune: string) => MASTER.find(x => x.kind === 'standard' && x.tune === tune)?.id.match(/^s(\d+)/)?.[1] != null ? Number(MASTER.find(x => x.kind === 'standard' && x.tune === tune)!.id.match(/^s(\d+)/)![1]) : -1
const LANES: { id: UILane; label: string; blocks: string[]; minutes: 'piano1' | 'sax' | 'make' | null }[] = [
  { id: 'piano', label: 'piano', blocks: ['Piano block 1', 'Piano (light)', 'Piano block 2'], minutes: 'piano1' },
  { id: 'sax', label: 'sax', blocks: ['Sax'], minutes: 'sax' },
  { id: 'make', label: 'make', blocks: ['Make'], minutes: 'make' },
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

type PlanRow = { key: string; start: number; end?: number; title: string; sub?: string; kind: 'block' | 'class' | 'travel' | 'life'; block?: Block; p?: Program; skipped?: boolean; lane?: UILane }

export function Today({ date, setDate, onOpen, onNav, onReview }: { date: string; setDate: (d: string) => void; onOpen: (p: Program, d: string) => void; onNav: (v: 'fitness') => void; onReview?: () => void }) {
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
  const [lane, setLane] = useState<UILane>('piano')
  const [finishing, setFinishing] = useState<UILane | null>(null)
  const [showWeek, setShowWeek] = useState(false)

  const projected = useMemo(() => project(user, real), [user, real])
  const tasks = tasksFor(date, user, type, projected)
  const minutes = planMinutes(user, date, type)
  const suggested = planMinutes({ ...user, practice: { ...user.practice, [date]: { ...user.practice[date], plan: undefined } } }, date, type)
  const setPlan = (m: number | undefined) => setPr({ plan: m })
  const done = pr.tasks ?? [], skipped = pr.skipped ?? []
  const wins = classWindows(user, date)
  const blocks = blocksForType(date, type, startFor(user, date), user)
  const laneOf = (t: string): UILane | undefined => LANES.find(l => l.blocks.includes(t))?.id ?? (t.startsWith('Piano') ? 'piano' : t.startsWith('Sax') ? 'sax' : t.startsWith('Make') ? 'make' : undefined)
  const mk = currentMake(user.make)
  const rows: PlanRow[] = blocks.map(b => ({
    key: 'b' + b.title, start: b.start, end: b.end, title: b.title, kind: 'block' as const, block: b, skipped: skipped.includes(b.title), lane: laneOf(b.title),
    sub: b.title === 'Make' ? (mk ? `${mk.title}${mk.next ? ' · next: ' + mk.next : ''}` : 'add something in Roadmap → Make') : tasks[b.title]?.length ? tasks[b.title].map(t => t.label.startsWith('Focus: ') ? t.label.slice(7).split(' · ')[0] : t.qid ? t.label.split(/[:·]/)[0].replace(/^Technique$/, 'technique').trim() : t.label.split(/[.:]/)[0]).join(' · ') : b.note,
  }))
  const items = itemsOn(date, user).filter(x => !['climb', 'climbLES', 'run', 'run2'].includes(x.p.id))
  const away = items.filter(x => x.missed)
  for (const it of items.filter(x => !x.missed)) {
    const t = itemSpan(it.p, user, date); if (!t) continue
    const w = wins.find(w => w.p.id === it.p.id)
    if (w && w.from < w.start) rows.push({ key: 'go' + it.p.id, start: w.from, title: `Leave for ${it.p.short}`, sub: it.p.go?.split('·').slice(1).join('·').trim() || it.p.go, kind: 'travel' })
    rows.push({ key: it.p.id, start: w?.start ?? t[0], end: w?.end ?? t[1], title: it.p.short, sub: it.p.loc?.split(',')[0], kind: it.p.kind === 'inperson' ? 'class' : 'life', p: it.p })
  }
  rows.sort((a, b) => a.start - b.start)

  // ---- queue-aware done state: queue items are done when queueDone has them on this date; plain tasks live in practice[date].tasks
  function isDone(t: Task) { return t.qid ? user.queueDone?.[t.qid] === date : done.includes(t.id) }
  const isRepeat = (t: Task) => !!t.qid && (user.queueRepeat ?? []).includes(t.qid)
  /** Tiny feedback after an item. Lost / working → it comes back next session (smaller scope); solid / easy → move on. */
  function feel(t: Task, f: 'lost' | 'working' | 'solid' | 'easy') {
    if (!t.qid) return
    const id = t.qid
    update(u => ({ ...u, queueMemo: { ...u.queueMemo, [id]: { ...u.queueMemo?.[id], feel: f, date } } }))
    outcome(t, f === 'lost' || f === 'working' ? 'repeat' : 'done')
  }
  function outcome(t: Task, o: 'done' | 'repeat' | 'park' | 'clear') {
    if (!t.qid) { setPr({ tasks: done.includes(t.id) ? done.filter(x => x !== t.id) : [...done, t.id] }); return }
    const id = t.qid
    update(u => {
      const qd = { ...u.queueDone }; delete qd[id]
      let rep = (u.queueRepeat ?? []).filter(x => x !== id), park = (u.queueSkip ?? []).filter(x => x !== id)
      if (o === 'done') qd[id] = date
      if (o === 'repeat') { rep = [...rep, id]; qd[id] = date }   // counts today, comes back tomorrow as a fresh copy
      if (o === 'park') park = [...park, id]
      return { ...u, queueDone: qd, queueRepeat: rep, queueSkip: park }
    })
  }
  function toggleTask(t: Task) {
    if (t.qid) outcome(t, isDone(t) ? 'clear' : 'done')
    else {
      const turningOn = !done.includes(t.id)
      setPr({ tasks: turningOn ? [...done, t.id] : done.filter(x => x !== t.id) })
      if (t.id === 'ear-song') {   // mirror onto the song in Roadmap → By ear
        update(u => {
          const song = currentByEar(u.transcriptions); if (!song) return u
          const steps = song.steps ?? []
          const nextStep = EAR_STEPS.find(st => !steps.includes(st))
          const newSteps = turningOn ? (nextStep ? [...steps, nextStep] : steps) : steps.slice(0, -1)
          return { ...u, transcriptions: u.transcriptions.map(x => x.id === song.id ? { ...x, steps: newSteps, done: newSteps.length >= EAR_STEPS.length ? date : undefined } : x) }
        })
      }
    }
    if (t.qid?.startsWith('wv8') || t.qid?.startsWith('wc25k') ) { /* workout ticks also log the session */
      const kind = t.qid.startsWith('wv8') ? 'climbing' : 'running'
      update(u => ({ ...u, [kind]: { ...u[kind], [date]: { ...(u[kind] as Record<string, object>)[date], done: !isDone(t) } } }))
    }
  }
  const laneBlocks = (l: UILane) => blocks.filter(b => laneOf(b.title) === l && !skipped.includes(b.title))
  const laneTasks = (l: UILane) => laneBlocks(l).flatMap(b => tasks[b.title] ?? [])
  const curBlock = laneBlocks(lane)[0]
  const curTasks = laneTasks(lane)
  const laneDone = (l: UILane) => { const ts = laneTasks(l); return ts.length > 0 && ts.every(isDone) }
  const onDay = new Set(curTasks.map(t => t.qid).filter(Boolean) as string[])
  const optionalWaiting = MASTER.filter(x => x.lane === lane && x.kind === 'lesson' && !user.queueDone?.[x.id] && !(user.queueSkip ?? []).includes(x.id) && priorityOf(user, x) === 'optional' && !projected.dateOf[x.id]).length
  const next = (() => { const cand = MASTER.filter(x => x.lane === lane && !user.queueDone?.[x.id] && !(user.queueSkip ?? []).includes(x.id) && !onDay.has(x.id) && priorityOf(user, x) !== 'parked'); return cand.find(x => (projected.dateOf[x.id] ?? '9999') > date) ?? cand[0] })()
  const active = pr.active && Date.now() - pr.active.since < 8 * 3600e3 ? pr.active : undefined
  useEffect(() => { if (pr.active && !active) setPr({ active: undefined }) }, [pr.active, active]) // eslint-disable-line react-hooks/exhaustive-deps
  const isActive = !!active && laneOf(active.block) === lane
  const elapsed = isActive ? Math.max(1, Math.round((Date.now() - active!.since) / 60000)) : 0
  const laneDef = LANES.find(l => l.id === lane)!
  // ---- the day as capacity: planned minutes per lane vs what's logged, in any order
  const logged = loggedOn(user, date)
  const readRow = rows.find(r => r.p?.kind === 'read')
  const segs: { id: string; label: string; plan: number; done: number; lane?: UILane }[] = [
    ...(readRow ? [{ id: 'read', label: 'Coffee + read', plan: (readRow.end ?? readRow.start + 90) - readRow.start, done: user.attendance[attKey('coffee', date)] === 'went' ? 90 : 0 }] : []),
    ...blocks.filter(b => !skipped.includes(b.title)).map(b => { const l = laneOf(b.title); const plan = b.end - b.start; const done = l === 'piano' ? logged.piano : l === 'sax' ? logged.sax : l === 'make' ? logged.make : l === 'workout' ? (logged.gym ? plan : 0) : 0; return { id: b.title, label: b.title.replace(' block 1', '').replace(' block 2', ' · ear'), plan, done: Math.min(plan, done), lane: l } }),
  ]
  // a lane with two blocks shares its logged minutes: fill the first before the second
  for (let i = 1; i < segs.length; i++) if (segs[i].lane && segs[i].lane === segs[i - 1].lane) { const spill = Math.max(0, (segs[i - 1].lane === 'piano' ? logged.piano : 0) - segs[i - 1].plan); segs[i].done = Math.min(segs[i].plan, spill) }
  const planned = segs.reduce((n, x) => n + x.plan, 0), openMin = segs.reduce((n, x) => n + (x.plan - x.done), 0)
  const firstClass = wins.filter(w => nowMin == null || w.from > nowMin).sort((a, b) => a.from - b.from)[0]
  const fmtH = (m: number) => m >= 60 ? `${Math.round(m / 30) / 2} h` : `${m} min`
  const capacityLine = planned === 0 ? null : openMin === 0 ? 'Everything on the bar is done.' : `${fmtH(openMin)} still open${isToday && firstClass && nowMin != null ? ` · about ${fmtH(Math.max(0, firstClass.from - nowMin))} before you leave for ${firstClass.p.short}` : ''}.`
  const stage = (() => { if (!std) return null; const i = plan_idx(std); if (i < 0) return null; const k = [0, 1, 2, 3, 4].filter(s => user.queueDone?.[`s${i}.${s}`]).length; return { k, name: k >= 5 ? 'Owned' : STAGES[k] } })()
  const rh = rhythm(user, real)
  const nudgeLine = isToday ? nudge(user, real, type, next?.label.split(': ')[0]) : null
  const lastSession = [...user.sessions].reverse().find(s => laneOf(s.block) === lane && s.date < date && (lane === 'piano' ? s.tune === std : true))
  const lessonItem = curTasks.find(t => t.qid?.startsWith('v'))
  const lessonQ = lessonItem?.qid ? byId(lessonItem.qid) : undefined
  const course = courses.find(c => c.id === (lessonQ?.course ?? coursesForWeek(wk)[0]?.id))
  const chart = (lessonQ ? pdfLinks(lessonQ.pdf) : courseLinks(course?.id ?? ''))[0]
  const title = lane === 'piano' ? (std ?? 'Pick a standard') : lane === 'sax' ? 'Sax' : 'Run + pull-ups'
  const repeats = curTasks.filter(t => t.qid && (user.queueRepeat ?? []).includes(t.qid) && user.queueDone?.[t.qid] !== date)
  const focusLine = (repeats.length ? 'Again: ' + repeats[0].label.split(': ').slice(-1)[0].replace(/ \(\d+\/\d+\)$/, '') + '. ' : '') + (lane === 'piano' ? curTasks.filter(t => t.qid?.startsWith('s') && !repeats.includes(t)).map(t => t.label.split(': ')[1]).join('. ') : (curTasks.find(t => !repeats.includes(t))?.label.replace(/ \(\d+\/\d+\)$/, '').replace(/^Focus: /, '') ?? ''))
  const skip = (t: string) => setPr({ skipped: skipped.includes(t) ? skipped.filter(x => x !== t) : [...skipped, t] })
  const [nextNote, setNextNote] = useState('')
  const saveNext = () => {
    if (!nextNote.trim() || !curBlock) return
    const note = nextNote.trim()
    const target = curTasks.find(t => t.qid && (!isDone(t) || isRepeat(t)))?.qid ?? curTasks.find(t => t.qid)?.qid   // the item you were on remembers it
    update(u => ({ ...u, sessions: [...u.sessions, { date, block: curBlock.title, minutes: 0, tune: lane === 'piano' ? std : undefined, next: note }], queueMemo: target ? { ...u.queueMemo, [target]: { ...u.queueMemo?.[target], note, date } } : u.queueMemo }))
    setNextNote('')
  }
  const todayNext = [...user.sessions].reverse().find(s => s.date === date && s.next)?.next
  const pianoToday = (pr.piano1 ?? 0) + (pr.piano2 ?? 0)
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
            <p className="meta">{DAY_TYPES.find(t => t.id === type)?.label} day · {why} · {wk >= 1 ? `week ${wk}` : date < START ? 'before the sabbatical' : 'after'}{!isToday ? (date < real ? ' · past' : ' · projected') : ''}</p>
          </div>
          <button className="btn icon" onClick={() => setDate(shiftDay(date, 1))} aria-label="Next day">›</button>
        </div>
        {nudgeLine ? <p className="nudge">{nudgeLine}</p> : capacityLine && isToday && <p className="nudge calm">{capacityLine}</p>}
        <div className="hdr-actions">
          <label className="btn selbtn"><Ic.calendar /><span>{pr.dayType ? 'Day changed' : 'Change day'}</span>
            <select value={pr.dayType ?? ''} onChange={e => setPr({ dayType: (e.target.value || undefined) as never })}><option value="">Let the app decide ({DAY_TYPES.find(t => t.id === type)?.label})</option>{DAY_TYPES.map(t => <option key={t.id} value={t.id}>{t.label} day</option>)}</select></label>
          {!isToday && <button className="btn" onClick={() => setDate(clampDay(real))}>Back to today</button>}
        </div>
      </div>

      <div className="grid3">
        <section className="card plan">
          <h3 className="serif">Today holds</h3>
          <div className="row between quiet"><label className="inl quiet">Starts <input type="time" value={startFor(user, date)} onChange={e => setPr({ startTime: e.target.value || undefined })} />
            {pr.startTime && <button className="linkbtn quiet" onClick={() => setPr({ startTime: undefined })}>reset ({defaultStartFor(user, date)})</button>}</label></div>
          {parse(date).getDay() === 0 && wk >= 1 && <button className="btn primary wide" onClick={onReview}><Ic.review /> Open this week’s review</button>}
          {planned > 0 && <div className="capbar" title={`${fmtH(planned)} planned · ${fmtH(openMin)} open`}>
            {segs.map(x => <span key={x.id} className={'cseg ' + (x.lane ?? x.id)} style={{ flexGrow: x.plan }}><i style={{ width: `${x.plan ? Math.round(100 * x.done / x.plan) : 0}%` }} /></span>)}
          </div>}
          {planned > 0 && <p className="meta caption">{fmtH(planned)} in any order{capacityLine ? ` · ${capacityLine.replace(/\.$/, '')}` : ''}</p>}
          {rows.length === 0 && <p className="empty">Nothing booked. Excellent.</p>}
          {type === 'travel' && <p className="meta">Travel day — nothing planned. The queue waits.</p>}
          <ol className="plan-list chunks">
            {rows.filter(r => r.kind === 'block' || r.kind === 'life').map(r => {
              const isSel = r.kind === 'block' && r.lane === lane
              const seg = segs.find(x => x.id === r.title || (r.p?.kind === 'read' && x.id === 'read'))
              const full = !!seg && seg.plan > 0 && seg.done >= seg.plan
              const onClick = r.kind === 'block' && r.lane ? () => setLane(r.lane!) : r.p ? () => onOpen(r.p!, date) : undefined
              return (
                <li key={r.key} className={['plan-row', r.kind, isSel ? 'sel' : '', r.skipped ? 'skipped' : '', full ? 'done' : ''].join(' ')} onClick={onClick}>
                  <span className={'dot ' + (r.lane ?? (r.p?.kind === 'read' ? 'read' : 'life'))} />
                  <span className="body">
                    <b>{r.title.replace(' block 1', '').replace(' block 2', ' · ear + arrangement').replace('Gym slot', 'Move')}{r.end && r.kind === 'block' ? ` · ${r.end - r.start} min` : ''}{full ? ' ✓' : ''}</b>
                    {r.sub && <small>{r.sub}</small>}
                    {r.kind === 'block' && <small><button className="linkbtn quiet" onClick={e => { e.stopPropagation(); skip(r.title) }}>{r.skipped ? 'restore' : 'not today'}</button></small>}
                    {r.p?.id === 'coffee' && <span onClick={e => e.stopPropagation()}><CoffeePick date={date} /></span>}
                  </span>
                  {r.kind === 'block' && r.lane && <span className="chev">›</span>}
                </li>
              )
            })}
          </ol>
          {rows.some(r => r.kind === 'class' || r.kind === 'travel') && <>
            <p className="eyebrow">Fixed</p>
            <ol className="plan-list anchors">
              {rows.filter(r => r.kind === 'class' || r.kind === 'travel').map(r => (
                <li key={r.key} className={['plan-row', r.kind].join(' ')} onClick={r.p ? () => onOpen(r.p!, date) : undefined}>
                  <span className="t num">{fmtMin(r.start)}{r.end && r.kind === 'class' ? `–${fmtMin(r.end)}` : ''}</span>
                  <span className="dot" />
                  <span className="body"><b>{r.title}{r.p?.kind === 'inperson' && (r.p.drop || r.p.uncertain?.includes(date)) ? ' · flex' : ''}</b>{r.sub && <small>{r.sub}</small>}</span>
                </li>
              ))}
            </ol>
          </>}
          {away.length > 0 && <details className="away"><summary>While you’re away ({away.length})</summary>{away.map(({ p, maybe }) => <Chip key={p.id} p={p} missed maybe={maybe} att={user.attendance[attKey(p.id, date)]} onOpen={() => onOpen(p, date)} />)}</details>}
        </section>

        <section className="card main">
          <p className="eyebrow">{lane === 'make' ? 'Making' : `Next at the ${lane}`}</p>
          <div className="lanes seg-chips" role="tablist">
            {LANES.map(l => { const Icon = LANE_ICON[l.id]; return <button key={l.id} role="tab" aria-selected={lane === l.id} className={'lanebtn' + (lane === l.id ? ' on' : '') + (laneDone(l.id) ? ' done' : '')} onClick={() => setLane(l.id)}><Icon />{l.label[0].toUpperCase() + l.label.slice(1)}{laneDone(l.id) ? ' ✓' : ''}</button> })}
          </div>
          {lane === 'piano' && type !== 'travel' && type !== 'rest' && <div className="planpick" role="radiogroup" aria-label="Piano today">
            <span className="meta">Piano today</span>
            {PLAN_CHOICES.map(c => <button key={c.min} role="radio" aria-checked={minutes === c.min} className={'pill' + (minutes === c.min ? ' active' : '')} title={c.hint} onClick={() => setPlan(c.min === suggested ? undefined : c.min)}>{c.label}{c.min === suggested ? ' ·' : ''}</button>)}
            <small className="meta">· = suggested</small>
          </div>}
          {lane === 'make' ? <div className="makecard">
            {!curBlock && <p className="meta">{date < '2026-10-12' ? 'Make starts the week of Oct 12 — piano and classes first.' : 'No Make block today. Log a session anyway if one happens.'}</p>}
            {mk ? <>
              <p className="eyebrow">{mk.kind}</p>
              <h1 className="tune">{mk.url ? <a href={mk.url} target="_blank" rel="noreferrer">{mk.title}</a> : mk.title}</h1>
              {mk.next ? <p className="lede serif">Next: {mk.next}</p> : <p className="meta">No next step written down yet. One line is enough.</p>}
              {(isActive
                ? <button className="btn primary big wide" onClick={() => setFinishing('make')}><Ic.stop /> Finish · {elapsed} min</button>
                : <button className="btn primary big wide" disabled={!!active} onClick={() => setPr({ active: { block: 'Make', since: Date.now() } })}><Ic.start /> Start session</button>)}
              <label className="block">Next step <input value={mk.next ?? ''} placeholder="the smallest next thing…" onChange={e => setMake(l => l.map(x => x.id === mk.id ? { ...x, next: e.target.value } : x))} /></label>
              <div className="row between"><button className="linkbtn quiet" onClick={() => setMake(l => l.map(x => x.id === mk.id ? { ...x, done: date } : x))}>mark done</button><a className="linkbtn quiet" href="#/practice">the whole list →</a></div>
              {makeList(user.make).length > 1 && <><p className="eyebrow steps-h">After that</p><ol className="steps rows small">{makeList(user.make).slice(1, 4).map((x, i) => <li key={x.id}><span className="n">{i + 2}</span><span className="lbl">{x.title}<small className="ctx">{x.kind}{x.next ? ` · ${x.next}` : ''}</small></span></li>)}</ol></>}
            </> : <><h1 className="tune small">Nothing on the Make list</h1><p className="lede serif">Projects, dev work, papers, books, art. <a href="#/practice">Add one in Roadmap → Make.</a></p></>}
          </div> : (lane === 'piano' ? minutes > 0 : curTasks.length > 0 || curBlock || (lane === 'workout' && type !== 'travel' && type !== 'rest')) ? <>
            <h1 className="tune">{title}</h1>
            {lane === 'piano' && stage && <p className="stage" title={`${stage.k} of 5 stages`}><span className="bar"><i style={{ width: `${stage.k * 20}%` }} /></span><span>{stage.name}</span></p>}
            {focusLine && <p className="lede serif">{focusLine}.</p>}
            {lastSession?.next ? <p className="meta">Start with: {lastSession.next}</p> : lastSession?.note ? <p className="meta">Last time: {lastSession.note}</p> : <p className="meta">{curTasks.filter(isDone).length} of {curTasks.length} done today</p>}
            {laneDef.minutes && curBlock && (isActive
              ? <button className="btn primary big wide" onClick={() => setFinishing(lane)}><Ic.stop /> Finish · {elapsed} min</button>
              : <button className="btn primary big wide" disabled={!!active} onClick={() => setPr({ active: { block: curBlock.title, since: Date.now() } })}><Ic.start /> Start session</button>)}
            {lane === 'workout' && !curBlock && <p className="meta">No gym slot today ({DAY_TYPES.find(t => t.id === type)?.label} day). Log a climb or a run anyway if it happens.</p>}
            {lane === 'piano' && <div className="grid2 links">
              {course && <a className="btn" href={course.url} target="_blank" rel="noreferrer"><Ic.lesson /> Open lesson{lessonQ ? ` · ${lessonQ.label.split(': ')[1]?.slice(0, 26)}` : ''}</a>}
              {chart ? <a className="btn" href={chart.url} target="_blank" rel="noreferrer"><Ic.chart /> Open chart · {chart.label.split(' — ')[0].split(' (')[0]}</a> : <a className="btn" href={`https://www.google.com/search?q=${encodeURIComponent((std ?? '') + ' lead sheet')}`} target="_blank" rel="noreferrer"><Ic.chart /> Find chart</a>}
            </div>}
            <p className="eyebrow steps-h">{lane === 'piano' ? `Session · ${Math.min(minutes, 120)} min` : lane === 'sax' ? 'Today' : 'Today’s session'}{lane === 'piano' && curTasks.some(t => !isDone(t)) && <button className="linkbtn" onClick={() => { const t = curTasks.find(x => !isDone(x))!; t.qid ? feel(t, 'solid') : toggleTask(t) }}>next ›</button>}</p>
            {lane === 'workout' && <div className="climbrow">
              <label className="inl big"><input type="checkbox" checked={!!user.climbing[date]?.done} onChange={e => update(u => ({ ...u, climbing: { ...u.climbing, [date]: { ...u.climbing[date], done: e.target.checked } } }))} /> Climbed today</label>
              <span className="meta">Not queued — just for fun. Mon/Wed/Fri at Vital BK is the habit.</span>
            </div>}
            <ol className="steps rows">
              {curTasks.length === 0 && <li className="meta">{curBlock?.note ?? 'Nothing queued for today.'}</li>}
              {curTasks.map((t, i) => { const on = isDone(t); return (
                <li key={t.id} className={(on ? 'on' : '') + (isRepeat(t) ? ' rep' : '')} onClick={() => toggleTask(t)}>
                  <span className="n">{on ? (isRepeat(t) ? '↻' : '✓') : i + 1}</span>
                  <span className="lbl">{t.min != null && <small className="mins num">{t.min} min</small>}{t.url ? <a href={t.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>{t.label} ↗</a> : t.label}{t.qid && byId(t.qid) && priorityOf(user, byId(t.qid)!) === 'optional' && <small className="qtag">optional</small>}{t.ctx && <small className="ctx">{t.ctx}</small>}{t.pass && !on && curTasks.find(x => !isDone(x))?.id === t.id && <small className="ctx pass">Pass: {t.pass}</small>}</span>
                  {t.qid && <span className="outcomes feel" onClick={e => e.stopPropagation()}>
                    {on ? <button className="linkbtn quiet" onClick={() => outcome(t, 'clear')}>{isRepeat(t) ? 'again tomorrow · undo' : 'done · undo'}</button> : <>
                      <button className="linkbtn quiet" onClick={() => feel(t, 'lost')} title="Keep it, smaller scope next time">lost</button>
                      <button className="linkbtn quiet" onClick={() => feel(t, 'working')} title="Again next session">working</button>
                      <button className="linkbtn quiet sel" onClick={() => feel(t, 'solid')} title="Move on">solid</button>
                      <button className="linkbtn quiet" onClick={() => feel(t, 'easy')} title="Move on">too easy</button>
                      <button className="linkbtn quiet" onClick={() => outcome(t, 'park')} title="Park it — stops blocking the queue">park</button></>}
                  </span>}
                </li>) })}
            </ol>
            {next && <div className="nextq">
              <span><Ic.programs /> Up next: <b>{next.label.replace(/ \(\d+\/\d+\)$/, '')}</b>{optionalWaiting > 0 && <small className="meta"> · {optionalWaiting} optional lesson{optionalWaiting === 1 ? '' : 's'} waiting for a spare day</small>}</span>
              {laneDone(lane) && <button className="btn" onClick={() => setPr({ pulled: [...(pr.pulled ?? []), next.id] })}>Pull it into today</button>}
            </div>}
            <p className="banner"><span>✈</span> Travel or rest day? Your queue stays paused. Anything unticked stays at the front and shows up tomorrow.</p>
          </> : <div className="quietday">
            <h1 className="tune small">{type === 'rest' ? 'Rest' : type === 'travel' ? 'Away' : lane === 'piano' ? 'No piano today' : title}</h1>
            <p className="lede serif">{type === 'rest' ? 'Nothing planned. That’s part of the plan.' : trip ? `${trip.name}. The queue waits.` : 'The queue waits. Nothing moves without you.'}</p>
            {type !== 'rest' && type !== 'travel' && next && <p className="meta">Up next when you sit down: <b>{next.label.replace(/ \(\d+\/\d+\)$/, '')}</b></p>}
            {type !== 'travel' && <ul className="sidequests">
              {laneTasks('sax').length > 0 && <li><button className="linkbtn" onClick={() => setLane('sax')}><Ic.sax /> Sax · {laneTasks('sax')[0]?.label.replace(/^Focus: /, '').split(' · ')[0]}</button></li>}
              <li><label className="inl"><input type="checkbox" checked={!!user.climbing[date]?.done} onChange={e => update(u => ({ ...u, climbing: { ...u.climbing, [date]: { ...u.climbing[date], done: e.target.checked } } }))} /> Climb</label></li>
              <li><label className="inl"><input type="checkbox" checked={!!user.running[date]?.done} onChange={e => update(u => ({ ...u, running: { ...u.running, [date]: { ...u.running[date], done: e.target.checked } } }))} /> Run</label></li>
              <li><span>📖 Disappear into a book</span></li>
              <li><span>🎧 Steal 8 bars from a record{(() => { const e = currentByEar(user.transcriptions); return e ? ` · ${e.song}` : '' })()}</span></li>
              <li><span>☕ Find good coffee</span><CoffeePick date={date} /></li>
            </ul>}
          </div>}
        </section>

        <section className="card log">
          <details className="adjust training" open={false}>
            <summary><Ic.review /> Quick log <span className="meta num">{pianoToday} min piano · {pr.sax ?? 0} min sax{pr.make ? ` · ${pr.make} min make` : ''}{user.climbing[date]?.done ? ' · climbed' : ''}{user.running[date]?.done ? ' · ran' : ''}</span></summary>
            <p className="lbl">Practice time (minutes)</p>
            <div className="bigstep">
              <button className="btn" onClick={() => setPr({ piano1: Math.max(0, (pr.piano1 ?? 0) - 15) })} aria-label="minus 15">−</button>
              <span className="num">{pianoToday}</span>
              <button className="btn" onClick={() => setPr({ piano1: (pr.piano1 ?? 0) + 15 })}>+15</button>
            </div>
            {(() => { const ss = user.sessions.filter(x => x.date === date && x.minutes > 0); return ss.length ? <ul className="sesslist">{ss.map((x, i) => <li key={i}><b className="num">{x.minutes} min</b><span>{x.block.replace(/ block \d/, '')}{x.note ? ` · ${x.note}` : ''}</span></li>)}</ul> : null })()}
            <DayLog date={date} />
          </details>
          <label className="block">Next time, start with…
            <textarea rows={3} placeholder={todayNext ?? 'Add a quick note…'} value={nextNote} onChange={e => setNextNote(e.target.value)} onBlur={saveNext} /></label>
          <p className="meta savestate">{sync.user ? (sync.state === 'synced' ? '☁ Synced to Firebase' : sync.state === 'error' ? `⚠ ${sync.error}` : '☁ Syncing…') : <>Saved on this device · <button className="linkbtn" onClick={signIn}>{sync.state === 'syncing' ? 'signing in…' : 'sign in to sync'}</button>{sync.error && <><br /><span className="warn">⚠ {sync.error}</span></>}</>}</p>
        </section>
      </div>

      <footer className="weekbar">
        <span className="dots" title="last 7 days">{rh.dots.map(x => <i key={x.d} className={x.on ? 'on' : ''} />)}</span>
        <b className="num">{rh.sessions} day{rh.sessions === 1 ? '' : 's'} · {h}h{m ? ` ${m}m` : ''} piano this week</b>
        <span className="num">{tot.climbs} climb{tot.climbs === 1 ? '' : 's'}</span>
        <span className="num">{saxSessions} sax session{saxSessions === 1 ? '' : 's'}</span>
        <span className="num">{tot.runs} run{tot.runs === 1 ? '' : 's'}</span>
        <button className="linkbtn quiet" onClick={() => setShowWeek(!showWeek)}>{showWeek ? 'hide' : 'details'}</button>
        <span className="wknav"><button className="btn icon" onClick={() => setDate(shiftDay(date, -7))}>‹</button> Week {Math.max(wk, 0)} · {weekStart(Math.max(wk, 1))} <button className="btn icon" onClick={() => setDate(shiftDay(date, 7))}>›</button></span>
      </footer>
      {showWeek && wk >= 1 && <div className="card"><WeekProgress wk={wk} from={date} /><WeekFocus wk={wk} onNav={onNav} /></div>}
      {finishing && (curBlock || finishing === 'make') && <FinishSheet date={date} block={curBlock ?? { title: 'Make', start: 0, end: 0 }} minutesKey={LANES.find(l => l.id === finishing)?.minutes ?? 'piano1'} tune={finishing === 'piano' ? std : undefined} onClose={() => setFinishing(null)} />}
    </div>
  )
}

function FinishSheet({ date, block, minutesKey, tune, onClose }: { date: string; block: Block; minutesKey: 'piano1' | 'sax' | 'make'; tune?: string; onClose: () => void }) {
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
