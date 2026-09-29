import type { CSSProperties } from 'react'
import { parse, weekNo } from '../dates'
import { courses } from '../data'
import { attKey, blocksOn, startFor, fmtMin, hintFor, itemsOn, setTaipeiStart, videosOn } from '../model'
import { span } from '../ics'
import { useUser } from '../storage'
import { Chip } from './Chip'
import type { Program } from '../types'

type Row = { start: number; node: React.ReactNode; key: string }

/** Full-day timeline: template blocks, dated sessions (with the week's prescription), and the day's course lesson. */
export function DaySchedule({ date, onOpen }: { date: string; onOpen: (p: Program, d: string) => void }) {
  const user = useUser()
  setTaipeiStart(user.settings.taipeiStart)
  const wk = weekNo(date), dow = parse(date).getDay()
  const rows: Row[] = []
  for (const b of blocksOn(date, startFor(user, date))) rows.push({ start: b.start, key: 'b' + b.title, node:
    <div className="blk"><b>{b.title}</b> <span>{fmtMin(b.start)}–{fmtMin(b.end)}</span>{b.note && <small>{b.note}</small>}</div> })
  for (const { p, missed, maybe } of itemsOn(date, user).filter(x => !['climb', 'climbLES', 'run', 'run2'].includes(x.p.id))) {
    const hint = missed ? undefined : hintFor(p.id, wk, dow)
    rows.push({ start: span(p.time)?.[0] ?? 0, key: p.id, node: <>
      <Chip p={p} missed={missed} maybe={maybe} att={user.attendance[attKey(p.id, date)]} onOpen={() => onOpen(p, date)} />
      {hint && <small className="hint">{hint}</small>}</> })
  }
  for (const [i, v] of videosOn(date).entries()) {
    const c = courses.find(x => x.id === v.course)
    rows.push({ start: 9 * 60 + 15, key: 'v' + i, node:
      <a className="chip online" style={{ '--c': `var(--${v.course})` } as CSSProperties} href={c?.url} target="_blank" rel="noreferrer">
        <b>{c?.short} · lesson</b><span>{v.what}{v.pdf ? ` · ${v.pdf}` : ''}</span></a> })
  }
  rows.sort((a, b) => a.start - b.start)
  return <div className="timeline">{rows.length === 0 ? <p>Nothing scheduled.</p> : rows.map(r => <div className="tl-row" key={r.key}><i>{fmtMin(r.start)}</i><div>{r.node}</div></div>)}</div>
}

