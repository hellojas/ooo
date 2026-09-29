import type { CSSProperties } from 'react'
import { parse, weekNo, today } from '../dates'
import { courses } from '../data'
import { attKey, blocksForType, dayTypeFor, fmtMin, hintFor, itemsOn, setTaipeiStart, startFor, videosOn } from '../model'
import { span } from '../ics'
import { update, useUser } from '../storage'
import { tasksFor } from '../tasks'
import { Chip } from './Chip'
import { pdfLinks } from '../drive'
import type { Program } from '../types'

type Row = { start: number; end: number; node: React.ReactNode; key: string; fixed?: string }
const travelMin = (go?: string) => Number(go?.match(/~?(\d+)\s*min/)?.[1] ?? 0)

/** Full-day timeline: template blocks (per day type), dated sessions with the week's prescription, and the day's lesson. */
export function DaySchedule({ date, onOpen, showTasks, nowMin }: { date: string; onOpen: (p: Program, d: string) => void; showTasks?: boolean; nowMin?: number }) {
  const user = useUser()
  setTaipeiStart(user.settings.taipeiStart)
  const wk = weekNo(date), dow = parse(date).getDay()
  const type = dayTypeFor(user, date, today())
  const tasks = showTasks ? tasksFor(date, user, type) : {}
  const done = user.practice[date]?.tasks ?? []
  const skipped = user.practice[date]?.skipped ?? []
  const toggle = (id: string) => update(u => { const cur = u.practice[date]?.tasks ?? []; return { ...u, practice: { ...u.practice, [date]: { ...u.practice[date], tasks: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] } } } })
  const skip = (t: string) => update(u => { const cur = u.practice[date]?.skipped ?? []; return { ...u, practice: { ...u.practice, [date]: { ...u.practice[date], skipped: cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t] } } } })

  const items = itemsOn(date, user).filter(x => !['climb', 'climbLES', 'run', 'run2'].includes(x.p.id))
  const fixed = items.filter(x => !x.missed && x.p.kind === 'inperson' && !x.p.drop).map(x => { const t = span(x.p.time); const b = travelMin(x.p.go); return t ? { name: x.p.short, start: t[0] - b, end: t[1] + b } : null }).filter(Boolean) as { name: string; start: number; end: number }[]

  const rows: Row[] = []
  for (const b of blocksForType(date, type, startFor(user, date))) {
    const clash = fixed.find(f => b.start < f.end && b.end > f.start)
    const isSkipped = skipped.includes(b.title)
    const list = tasks[b.title] ?? []
    rows.push({ start: b.start, end: b.end, key: 'b' + b.title, node:
      <div className={'blk' + (isSkipped ? ' skipped' : '') + (nowMin != null && nowMin >= b.start && nowMin < b.end ? ' now' : '')}>
        <div className="blk-head"><b>{b.title}</b> <span>{fmtMin(b.start)}–{fmtMin(b.end)}</span>
          {list.length > 0 && !isSkipped && <span className="tcount">{list.filter(t => done.includes(b.title + ':' + t.id)).length}/{list.length}</span>}
          {showTasks && !b.title.startsWith('Travel') && <button className="linkbtn quiet" onClick={() => skip(b.title)}>{isSkipped ? 'restore' : 'skip'}</button>}</div>
        {clash && !isSkipped && <small className="clash">Overlaps {clash.name} (with travel) — skip or shorten this one.</small>}
        {!isSkipped && !list.length && b.note && <small>{b.note}</small>}
        {!isSkipped && list.map(t => { const id = b.title + ':' + t.id; return (
          <label className="task" key={id}><input type="checkbox" checked={done.includes(id)} onChange={() => toggle(id)} />
            {t.url ? <a href={t.url} target="_blank" rel="noreferrer">{t.label} ↗</a> : <span>{t.label}</span>}</label>) })}
      </div> })
  }
  for (const { p, missed, maybe } of items) {
    const hint = missed ? undefined : hintFor(p.id, wk, dow)
    const t = span(p.time)
    rows.push({ start: t?.[0] ?? 0, end: t?.[1] ?? 0, key: p.id, node: <>
      <Chip p={p} missed={missed} maybe={maybe} att={user.attendance[attKey(p.id, date)]} onOpen={() => onOpen(p, date)} />
      {hint && <small className="hint">{hint}</small>}</> })
  }
  if (!showTasks) for (const [i, v] of videosOn(date).entries()) {   // Today shows the lesson as a task instead
    const c = courses.find(x => x.id === v.course)
    rows.push({ start: 9 * 60 + 15, end: 9 * 60 + 45, key: 'v' + i, node:
      <div className="chip online lesson" style={{ '--c': `var(--${v.course})` } as CSSProperties}>
        <a href={c?.url} target="_blank" rel="noreferrer"><b>{c?.short} · lesson ↗</b></a><span>{v.what}</span>
        {pdfLinks(v.pdf).map(l => <a key={l.url} className="pdf" href={l.url} target="_blank" rel="noreferrer">📄 {l.label} ↗</a>)}
      </div> })
  }
  rows.sort((a, b) => a.start - b.start)
  return <div className="timeline">{rows.length === 0 ? <p className="empty">Nothing booked. Excellent.</p> : rows.map(r => <div className="tl-row" key={r.key}><i>{fmtMin(r.start)}</i><div>{r.node}</div></div>)}</div>
}
