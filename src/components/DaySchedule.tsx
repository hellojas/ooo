import { useState } from 'react'
import { parse, weekNo, today } from '../dates'
import { shops } from '../data'
import { attKey, blocksForType, classWindows, dayTypeFor, fmtMin, freeSlot, hintFor, itemsOn, setTaipeiStart, startFor, type Block } from '../model'
import { span } from '../time'
import { update, useUser } from '../storage'
import { standardOfWeek, tasksFor } from '../tasks'
import { Chip } from './Chip'
import type { Program } from '../types'

type Row = { start: number; node: React.ReactNode; key: string }
const isPiano = (t: string) => t.startsWith('Piano')
const minutesKey = (t: string): 'piano1' | 'sax' | null => isPiano(t) ? 'piano1' : t.startsWith('Sax') ? 'sax' : null

/** Full-day timeline. One block is active at a time; Start/Finish writes minutes, a note and a "next time". */
export function DaySchedule({ date, onOpen, showTasks, nowMin }: { date: string; onOpen: (p: Program, d: string) => void; showTasks?: boolean; nowMin?: number }) {
  const user = useUser()
  setTaipeiStart(user.settings.taipeiStart)
  const wk = weekNo(date), dow = parse(date).getDay()
  const type = dayTypeFor(user, date, today())
  const pr = user.practice[date] ?? {}
  const tasks = showTasks ? tasksFor(date, user, type) : {}
  const done = pr.tasks ?? [], skipped = pr.skipped ?? []
  const [expanded, setExpanded] = useState<string | null>(null)
  const [finishing, setFinishing] = useState<Block | null>(null)
  const setPr = (v: object) => update(u => ({ ...u, practice: { ...u.practice, [date]: { ...u.practice[date], ...v } } }))
  const toggle = (id: string) => setPr({ tasks: done.includes(id) ? done.filter(x => x !== id) : [...done, id] })
  const skip = (t: string) => setPr({ skipped: skipped.includes(t) ? skipped.filter(x => x !== t) : [...skipped, t] })
  const setBlock = (t: string, v: { start?: number; end?: number } | null) => setPr({ blocks: v ? { ...pr.blocks, [t]: v } : Object.fromEntries(Object.entries(pr.blocks ?? {}).filter(([k]) => k !== t)) })

  const wins = classWindows(user, date)
  const blocks = blocksForType(date, type, startFor(user, date), user)
  const firstOpen = blocks.find(b => !skipped.includes(b.title) && (tasks[b.title] ?? []).some(t => !done.includes(b.title + ':' + t.id)))
  const active = pr.active
  const std = standardOfWeek(user, wk)
  const lastFor = (t: string) => [...user.sessions].reverse().find(s => s.block === t && s.date < date && (isPiano(t) ? s.tune === std : true))

  const rows: Row[] = []
  for (const b of blocks) {
    const clash = wins.find(w => b.start < w.to && b.end > w.from)
    const isSkipped = skipped.includes(b.title)
    const list = tasks[b.title] ?? []
    const nDone = list.filter(t => done.includes(b.title + ':' + t.id)).length
    const isActive = active?.block === b.title
    const open = showTasks && !isSkipped && (isActive || expanded === b.title || (!active && expanded === null && firstOpen?.title === b.title))
    const isNow = nowMin != null && nowMin >= b.start && nowMin < b.end
    const last = showTasks && list.length ? lastFor(b.title) : undefined
    const elapsed = isActive ? Math.max(1, Math.round((Date.now() - active!.since) / 60000)) : 0
    rows.push({ start: b.start, key: 'b' + b.title, node:
      <div className={'blk' + (isSkipped ? ' skipped' : '') + (isNow ? ' now' : '') + (isActive ? ' active' : '') + (open ? ' open' : '')}>
        <div className="blk-head" onClick={() => showTasks && !isActive && setExpanded(open ? '' : b.title)}>
          <b>{b.title}</b>
          <span className="dur">{b.end - b.start >= 60 ? `${+(((b.end - b.start) / 60).toFixed(1))} hr` : `${b.end - b.start} min`}</span>
          {isNow && <span className="pill-now">NOW</span>}
          {isActive && <span className="live num">● {elapsed} min</span>}
          <span className="head-right">
            {list.length > 0 && !isSkipped && <><span className="mini"><i style={{ width: `${(nDone / list.length) * 100}%` }} /></span><span className="num cnt">{nDone}/{list.length}</span></>}
            {showTasks && !isSkipped && !clash && <button className="linkbtn quiet" onClick={e => { e.stopPropagation(); skip(b.title) }}>Skip</button>}
          </span>
        </div>
        {clash && !isSkipped && (
          <div className="clash">
            <span>Overlaps {clash.p.short} ({fmtMin(clash.from)}–{fmtMin(clash.to)} with travel).</span>
            <button className="linkbtn" onClick={() => { const len = b.end - b.start; const s = freeSlot(user, date, len, clash.to); setBlock(b.title, { start: s, end: s + len }) }}>Move after</button>
            {b.start < clash.from && <button className="linkbtn" onClick={() => setBlock(b.title, { end: clash.from })}>Shorten to {fmtMin(clash.from)}</button>}
            <button className="linkbtn" onClick={() => skip(b.title)}>Skip</button>
          </div>
        )}
        {open && (
          <div className="blk-body">
            {last && (last.note || last.next) && <p className="last">{last.next ? <><b>Start with:</b> {last.next}</> : <><b>Last time:</b> {last.note}</>}</p>}
            {!list.length && b.note && <small>{b.note}</small>}
            {list.map(t => { const id = b.title + ':' + t.id; return (
              <label className="task" key={id}><input type="checkbox" checked={done.includes(id)} onChange={() => toggle(id)} />
                {t.url ? <a href={t.url} target="_blank" rel="noreferrer">{t.label} ↗</a> : <span>{t.label}</span>}</label>) })}
            <div className="blk-actions">
              {minutesKey(b.title) && (isActive
                ? <button className="btn primary" onClick={() => setFinishing(b)}>Finish</button>
                : <button className="btn primary" disabled={!!active} onClick={() => setPr({ active: { block: b.title, since: Date.now() } })}>Start</button>)}
              {pr.blocks?.[b.title] && <button className="linkbtn quiet" onClick={() => setBlock(b.title, null)}>reset time</button>}
            </div>
          </div>
        )}
        {!open && !isSkipped && !showTasks && b.note && <small>{b.note}</small>}
        {isSkipped && <button className="linkbtn quiet" onClick={() => skip(b.title)}>restore</button>}
      </div> })
  }

  const items = itemsOn(date, user).filter(x => !['climb', 'climbLES', 'run', 'run2'].includes(x.p.id))
  const away: typeof items = []
  for (const it of items) {
    if (it.missed) { away.push(it); continue }
    const { p, maybe } = it
    const hint = hintFor(p.id, wk, dow)
    const t = span(p.time)
    const until = pr.until?.[p.id]
    rows.push({ start: t?.[0] ?? 0, key: p.id, node: <>
      <Chip p={p} missed={false} maybe={maybe} att={user.attendance[attKey(p.id, date)]} onOpen={() => onOpen(p, date)} />
      {until && t && until < t[1] && <small className="hint">Leaving at {fmtMin(until)}</small>}
      {hint && <small className="hint">{hint}</small>}
      {p.id === 'coffee' && showTasks && <CoffeePick date={date} />}</> })
  }
  rows.sort((a, b) => a.start - b.start)
  return (
    <div className="timeline">
      {type === 'travel' && showTasks && <p className="meta">Travel day. If a piano turns up: the head of {std ?? 'this week’s tune'}, ten minutes, done.</p>}
      {rows.length === 0 ? <p className="empty">Nothing booked. Excellent.</p> : rows.map(r => <div className="tl-row" key={r.key}><i className="num">{fmtMin(r.start)}</i><div>{r.node}</div></div>)}
      {away.length > 0 && <details className="away"><summary>While you’re away ({away.length})</summary>{away.map(({ p, maybe }) => <Chip key={p.id} p={p} missed maybe={maybe} att={user.attendance[attKey(p.id, date)]} onOpen={() => onOpen(p, date)} />)}</details>}
      {finishing && <FinishSheet date={date} block={finishing} tune={isPiano(finishing.title) ? std : undefined} onClose={() => setFinishing(null)} />}
    </div>
  )
}

function FinishSheet({ date, block, tune, onClose }: { date: string; block: Block; tune?: string; onClose: () => void }) {
  const user = useUser()
  const since = user.practice[date]?.active?.since ?? Date.now()
  const [mins, setMins] = useState(Math.max(1, Math.round((Date.now() - since) / 60000)))
  const [note, setNote] = useState(''), [next, setNext] = useState('')
  const key = minutesKey(block.title) ?? 'piano1'
  const save = () => {
    update(u => ({
      ...u,
      practice: { ...u.practice, [date]: { ...u.practice[date], active: undefined, [key]: (u.practice[date]?.[key] ?? 0) + mins } },
      sessions: [...u.sessions, { date, block: block.title, minutes: mins, tune, note: note.trim() || undefined, next: next.trim() || undefined }],
      tunes: tune ? { ...u.tunes, [tune]: { ...{ checks: [] }, ...u.tunes[tune], last: date } } : u.tunes,
    }))
    onClose()
  }
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()} role="dialog" aria-label="Finish session">
        <h3>{block.title}{tune ? ` · ${tune}` : ''}</h3>
        <label className="inl">Minutes <input type="number" min={1} value={mins} onChange={e => setMins(Number(e.target.value))} /></label>
        <label className="block">What got easier / where did you get stuck?<textarea rows={2} value={note} onChange={e => setNote(e.target.value)} /></label>
        <label className="block">Next time, start with…<input value={next} onChange={e => setNext(e.target.value)} /></label>
        <div className="row end"><button className="linkbtn quiet" onClick={() => { update(u => ({ ...u, practice: { ...u.practice, [date]: { ...u.practice[date], active: undefined } } })); onClose() }}>discard</button><button className="btn primary" onClick={save}>Save</button></div>
      </div>
    </div>
  )
}

const NEAR = ['Williamsburg', 'Greenpoint', 'East Williamsburg']
const nbOf = (loc?: string) => !loc ? undefined : /UWS|W 6\dth|W 65th|Lincoln/.test(loc) ? 'Upper West Side' : /W 46th|W 4\dth/.test(loc) ? 'Midtown West' : /W 13th|W 1\dth/.test(loc) ? 'West Village' : /W 37th|W 3\dth/.test(loc) ? 'Midtown' : /Park Slope/.test(loc) ? 'Prospect Heights' : /Long Island City/.test(loc) ? 'Long Island City' : undefined
/** Three coffee candidates for a reading morning: nearby, near today's class, somewhere new. */
function CoffeePick({ date }: { date: string }) {
  const user = useUser()
  const visited = (n: string) => !!user.coffee[n]?.visited
  const cls = classWindows(user, date)[0]
  const classNb = nbOf(cls?.p.loc)
  const pick = (f: (s: (typeof shops)[number]) => boolean) => shops.filter(s => f(s) && !visited(s.n))[0] ?? shops.find(f)
  const cands = [
    { label: 'Stay nearby', s: pick(s => NEAR.includes(s.nb ?? '')) },
    classNb ? { label: `Near ${cls!.p.short}`, s: pick(s => s.nb === classNb) } : null,
    { label: 'Somewhere new', s: pick(s => !NEAR.includes(s.nb ?? '') && s.nb !== classNb) },
  ].filter(c => c && c.s) as { label: string; s: (typeof shops)[number] }[]
  return <div className="coffeepick">{cands.map(c => <a key={c.label} href={c.s.u} target="_blank" rel="noreferrer"><span className="eyebrow">{c.label}</span><b>{c.s.n}</b><small>{c.s.nb}{c.s.w ? ` · ${c.s.w}` : ''}</small></a>)}</div>
}
