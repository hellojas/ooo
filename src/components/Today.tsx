import { useEffect, useState } from 'react'
import { DOW, END, MONTHS, key, parse, START, today as todayKey, weekNo, weekStart } from '../dates'
import { courses } from '../data'
import { DAY_TYPES, blocksForType, classWindows, coursesForWeek, dayTypeFor, defaultStartFor, fmtMin, freeSlot, itemsOn, phasesForWeek, setTaipeiStart, startFor, tripOn, weekTotals, type Block, type DayType } from '../model'
import { span } from '../time'
import { update, useUser } from '../storage'
import { useSync } from '../sync'
import { standardOfWeek, tasksFor } from '../tasks'
import { courseLinks, pdfLinks } from '../drive'
import { videosOn } from '../model'
import { DayLog } from './DayLog'
import { WeekProgress } from './WeekProgress'
import { Chip } from './Chip'
import { attKey } from '../model'
import type { Program } from '../types'

export const clampDay = (k: string) => (k < START ? START : k > END ? END : k)
export const shiftDay = (k: string, n: number) => { const d = parse(k); d.setDate(d.getDate() + n); return clampDay(key(d)) }
export const fmtDate = (k: string) => { const d = parse(k); return `${DOW[d.getDay()]}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}` }
const fmtLong = (k: string) => { const d = parse(k); return `${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}` }
const isPiano = (t: string) => t.startsWith('Piano')
const minutesKey = (t: string): 'piano1' | 'sax' | null => isPiano(t) ? 'piano1' : t.startsWith('Sax') ? 'sax' : null

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

type PlanRow = { key: string; start: number; end?: number; title: string; sub?: string; kind: 'block' | 'class' | 'travel' | 'life'; block?: Block; p?: Program; clash?: { p: Program; from: number; to: number }; skipped?: boolean }

export function Today({ date, setDate, onOpen, onNav }: { date: string; setDate: (d: string) => void; onOpen: (p: Program, d: string) => void; onNav: (v: 'fitness') => void }) {
  const user = useUser()
  const sync = useSync()
  setTaipeiStart(user.settings.taipeiStart)
  const now = useNow()
  const real = todayKey(), wk = weekNo(date), isToday = date === real
  const trip = tripOn(date, user.settings.tripsOff)
  const type = dayTypeFor(user, date, real)
  const pr = user.practice[date] ?? {}
  const setPr = (v: object) => update(u => ({ ...u, practice: { ...u.practice, [date]: { ...u.practice[date], ...v } } }))
  const setType = (t: DayType) => setPr({ dayType: t })
  const nowMin = isToday ? now.getHours() * 60 + now.getMinutes() : undefined
  const std = standardOfWeek(user, wk)
  const [sel, setSel] = useState<string | null>(null)
  const [finishing, setFinishing] = useState<Block | null>(null)
  const [showWeek, setShowWeek] = useState(false)

  // ---- plan rows
  const tasks = tasksFor(date, user, type)
  const done = pr.tasks ?? [], skipped = pr.skipped ?? []
  const wins = classWindows(user, date)
  const blocks = blocksForType(date, type, startFor(user, date), user)
  const rows: PlanRow[] = blocks.map(b => ({
    key: 'b' + b.title, start: b.start, end: b.end, title: b.title, kind: 'block' as const, block: b, skipped: skipped.includes(b.title),
    sub: (tasks[b.title]?.length ? `${tasks[b.title].filter(t => done.includes(b.title + ':' + t.id)).length}/${tasks[b.title].length} steps` : b.note),
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

  // ---- selection: active block, else explicit, else first unfinished piano/sax block
  const active = pr.active
  const unfinished = (b: Block) => !skipped.includes(b.title) && !!minutesKey(b.title) && (tasks[b.title] ?? []).some(t => !done.includes(b.title + ':' + t.id))
  const firstOpen = blocks.find(b => unfinished(b) && isPiano(b.title)) ?? blocks.find(unfinished)
  const selTitle = active?.block ?? (sel && blocks.some(b => b.title === sel) ? sel : firstOpen?.title ?? blocks.find(b => minutesKey(b.title))?.title)
  const selBlock = blocks.find(b => b.title === selTitle)
  const selTasks = selBlock ? tasks[selBlock.title] ?? [] : []
  const isActive = !!active && active.block === selTitle
  const elapsed = isActive ? Math.max(1, Math.round((Date.now() - active!.since) / 60000)) : 0
  const lastSession = [...user.sessions].reverse().find(s => s.block === selTitle && s.date < date && (selBlock && isPiano(selBlock.title) ? s.tune === std : true))
  const lesson = videosOn(date)[0]
  const course = courses.find(c => c.id === (lesson?.course ?? coursesForWeek(wk)[0]?.id))
  const chart = (lesson ? pdfLinks(lesson.pdf) : courseLinks(course?.id ?? ''))[0]
  const focusLine = selBlock ? (isPiano(selBlock.title) ? selTasks.filter(t => t.id.startsWith('std')).map(t => t.label.split(': ')[1]).join('. ') || selTasks[0]?.label : selTasks.map(t => t.label).slice(0, 2).join('. ')) : ''
  const toggle = (id: string) => setPr({ tasks: done.includes(id) ? done.filter(x => x !== id) : [...done, id] })
  const skip = (t: string) => setPr({ skipped: skipped.includes(t) ? skipped.filter(x => x !== t) : [...skipped, t] })
  const setBlock = (t: string, v: { start?: number; end?: number } | null) => setPr({ blocks: v ? { ...pr.blocks, [t]: v } : Object.fromEntries(Object.entries(pr.blocks ?? {}).filter(([k]) => k !== t)) })
  const [nextNote, setNextNote] = useState('')
  const saveNext = () => { if (nextNote.trim() && selBlock) { update(u => ({ ...u, sessions: [...u.sessions, { date, block: selBlock.title, minutes: 0, tune: isPiano(selBlock.title) ? std : undefined, next: nextNote.trim() }] })); setNextNote('') } }
  const todayNext = [...user.sessions].reverse().find(s => s.date === date && s.next)?.next

  // ---- footer metrics
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
            <p className="meta">{wk >= 1 ? `Week ${wk}` : date < START ? 'Before the sabbatical' : 'After'} · New York{trip ? ` · ✈ ${trip.name}` : ''}{!isToday ? (date < real ? ' · past' : ' · preview') : ''}
              {!pr.dayType && type === 'light' && ' · yesterday was a miss, so today is Light'}</p>
          </div>
          <button className="btn icon" onClick={() => setDate(shiftDay(date, 1))} aria-label="Next day">›</button>
          {!isToday && <button className="btn small" onClick={() => setDate(clampDay(real))}>Today</button>}
        </div>
        <div className="seg types compact" role="group" aria-label="Day type">
          {DAY_TYPES.map(t => <button key={t.id} aria-pressed={type === t.id} title={t.hint} onClick={() => setType(t.id)}>{t.label}</button>)}
        </div>
      </div>

      <div className="grid3">
        <section className="card plan">
          <h3 className="serif">Today’s plan</h3>
          <div className="row between quiet"><label className="inl quiet">Starts <input type="time" value={startFor(user, date)} onChange={e => setPr({ startTime: e.target.value || undefined })} />
            {pr.startTime && <button className="linkbtn quiet" onClick={() => setPr({ startTime: undefined })}>reset ({defaultStartFor(user, date)})</button>}</label></div>
          {rows.length === 0 && <p className="empty">Nothing booked. Excellent.</p>}
          {type === 'travel' && <p className="meta">If a piano turns up: the head of {std ?? 'this week’s tune'}, ten minutes, done.</p>}
          <ol className="plan-list">
            {rows.map(r => {
              const isSel = r.kind === 'block' && r.title === selTitle
              const isNow = nowMin != null && r.end != null && nowMin >= r.start && nowMin < r.end
              const cls = ['plan-row', r.kind, isSel ? 'sel' : '', isNow ? 'now' : '', r.skipped ? 'skipped' : ''].join(' ')
              const onClick = r.kind === 'block' ? () => setSel(r.title) : r.p ? () => onOpen(r.p!, date) : undefined
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
                  {r.kind === 'block' && <span className="chev">›</span>}
                </li>
              )
            })}
          </ol>
          {away.length > 0 && <details className="away"><summary>While you’re away ({away.length})</summary>{away.map(({ p, maybe }) => <Chip key={p.id} p={p} missed maybe={maybe} att={user.attendance[attKey(p.id, date)]} onOpen={() => onOpen(p, date)} />)}</details>}
        </section>

        <section className="card main">
          {selBlock ? <>
            <p className="eyebrow">{isPiano(selBlock.title) ? 'On the piano today' : 'Warm-up'}</p>
            <h1 className="tune">{isPiano(selBlock.title) ? (std ?? 'Pick a standard') : selBlock.title}</h1>
            {focusLine && <p className="lede serif">{focusLine}.</p>}
            {lastSession?.next ? <p className="meta">Start with: {lastSession.next}</p> : lastSession?.note ? <p className="meta">Last time: {lastSession.note}</p> : null}
            {isActive
              ? <button className="btn primary big wide" onClick={() => setFinishing(selBlock)}>■ Finish session · {elapsed} min</button>
              : <button className="btn primary big wide" disabled={!!active} onClick={() => setPr({ active: { block: selBlock.title, since: Date.now() } })}>▶ Start {selBlock.end - selBlock.start}-min session</button>}
            <div className="grid2 links">
              {course && <a className="btn" href={course.url} target="_blank" rel="noreferrer">Open lesson{lesson ? ` · ${lesson.what.slice(0, 28)}${lesson.what.length > 28 ? '…' : ''}` : ''}</a>}
              {chart ? <a className="btn" href={chart.url} target="_blank" rel="noreferrer">Open chart · {chart.label.split(' — ')[0].split(' (')[0]}</a> : <a className="btn" href={`https://www.google.com/search?q=${encodeURIComponent((std ?? '') + ' lead sheet')}`} target="_blank" rel="noreferrer">Find chart</a>}
            </div>
            <p className="eyebrow steps-h">Session steps</p>
            <ol className="steps">
              {selTasks.length === 0 && <li className="meta">{selBlock.note ?? 'No steps for this block.'}</li>}
              {selTasks.map((t, i) => { const id = selBlock.title + ':' + t.id; const on = done.includes(id); return (
                <li key={id} className={on ? 'on' : ''} onClick={() => toggle(id)}>
                  <span className="n">{on ? '✓' : i + 1}</span>
                  <span>{t.url ? <a href={t.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>{t.label} ↗</a> : t.label}</span>
                </li>) })}
            </ol>
          </> : <>
            <p className="eyebrow">{type === 'rest' ? 'Rest day' : type === 'travel' ? 'Travel day' : 'Nothing to practice'}</p>
            <h1 className="tune">{std ?? '—'}</h1>
            <p className="lede serif">{type === 'rest' ? 'Nothing planned. That’s part of the plan.' : 'Open to interpretation.'}</p>
          </>}
        </section>

        <section className="card log">
          <h3 className="serif">Quick log</h3>
          <DayLog date={date} />
          <label className="block">Next time, start with…
            <textarea rows={3} placeholder={todayNext ?? 'e.g. slower tempo, left hand voicings, or the bridge…'} value={nextNote} onChange={e => setNextNote(e.target.value)} onBlur={saveNext} /></label>
          <p className="meta savestate">{sync.user ? (sync.state === 'synced' ? '☁ Synced' : sync.state === 'error' ? '⚠ Sync error' : '☁ Syncing…') : 'Saved on this device'}</p>
        </section>
      </div>

      <footer className="weekbar">
        <span>This week</span>
        <b className="num">{h}h {m ? m + 'm' : ''} piano</b>
        <span className="num">{tot.climbs} climb{tot.climbs === 1 ? '' : 's'}</span>
        <span className="num">{saxSessions} sax session{saxSessions === 1 ? '' : 's'}</span>
        <span className="num">{tot.runs} run{tot.runs === 1 ? '' : 's'}</span>
        <button className="linkbtn quiet" onClick={() => setShowWeek(!showWeek)}>{showWeek ? 'hide' : 'details'}</button>
        <span className="wknav"><button className="btn icon" onClick={() => setDate(shiftDay(date, -7))}>‹</button> Week {Math.max(wk, 0)} · {weekStart(Math.max(wk, 1))} <button className="btn icon" onClick={() => setDate(shiftDay(date, 7))}>›</button></span>
      </footer>
      {showWeek && wk >= 1 && <div className="card"><WeekProgress wk={wk} from={date} /><WeekFocus wk={wk} onNav={onNav} /></div>}
      {finishing && <FinishSheet date={date} block={finishing} tune={isPiano(finishing.title) ? std : undefined} onClose={() => setFinishing(null)} />}
    </div>
  )
}

function FinishSheet({ date, block, tune, onClose }: { date: string; block: Block; tune?: string; onClose: () => void }) {
  const user = useUser()
  const since = user.practice[date]?.active?.since ?? Date.now()
  const [mins, setMins] = useState(Math.max(1, Math.round((Date.now() - since) / 60000)))
  const [note, setNote] = useState(''), [next, setNext] = useState('')
  const k = minutesKey(block.title) ?? 'piano1'
  const save = () => {
    update(u => ({
      ...u,
      practice: { ...u.practice, [date]: { ...u.practice[date], active: undefined, [k]: (u.practice[date]?.[k] ?? 0) + mins } },
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
