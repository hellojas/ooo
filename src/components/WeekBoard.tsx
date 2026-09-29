import { useMemo, useRef, useState } from 'react'
import { DOW, MONTHS, START, addDays, key, parse, today, weekNo, weekStart } from '../dates'
import { DAY_TYPES, attKey, blocksForType, classWindows, dayTypeWhy, fmtMin, itemsOn, setTaipeiStart, startFor, stateOf, tripOn } from '../model'
import { span } from '../time'
import { update, useUser } from '../storage'
import { project } from '../queue'
import type { Program } from '../types'

const T0 = 8 * 60, T1 = 22 * 60, SNAP = 30
const pct = (m: number) => ((m - T0) / (T1 - T0)) * 100
const snap = (m: number) => Math.round(m / SNAP) * SNAP
const clamp = (m: number) => Math.max(T0, Math.min(T1, m))

/** Week as rows with a time axis. Practice blocks drag and resize in 30-min steps; classes are fixed. */
export function WeekBoard({ onOpenDay, onOpen }: { onOpenDay: (d: string) => void; onOpen: (p: Program, d: string) => void }) {
  const user = useUser()
  setTaipeiStart(user.settings.taipeiStart)
  const real = today()
  const [wk, setWk] = useState(() => Math.min(11, Math.max(1, weekNo(real < START ? START : real))))
  const [sel, setSelRaw] = useState<string>(real)
  const setSel = setSelRaw
  const [show, setShow] = useState({ commitments: true, practice: true, options: false })
  const [drag, setDrag] = useState<{ date: string; title: string; mode: 'move' | 'resize'; start: number; end: number } | null>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const projected = useMemo(() => project(user, real), [user, real])
  const days = Array.from({ length: 7 }, (_, i) => key(addDays(parse(weekStart(wk)), i)))
  if (!days.includes(sel)) setTimeout(() => setSelRaw(days.includes(real) ? real : days[1]), 0)

  const setBlock = (date: string, title: string, v: { start: number; end: number }) =>
    update(u => ({ ...u, practice: { ...u.practice, [date]: { ...u.practice[date], blocks: { ...u.practice[date]?.blocks, [title]: v } } } }))
  const addBlock = (date: string) => update(u => {
    const type = dayTypeWhy(u, date, real).type
    const bs = blocksForType(date, type, startFor(u, date), u)
    const last = bs.length ? Math.max(...bs.map(b => b.end)) : T0 + 120
    const start = clamp(snap(last + 30)), title = `Practice ${(u.practice[date]?.added?.length ?? 0) + 1}`
    return { ...u, practice: { ...u.practice, [date]: { ...u.practice[date], added: [...(u.practice[date]?.added ?? []), { title, start, end: Math.min(T1, start + 30) }] } } }
  })
  const removeAdded = (date: string, title: string) => update(u => ({ ...u, practice: { ...u.practice, [date]: { ...u.practice[date], added: (u.practice[date]?.added ?? []).filter(a => a.title !== title) } } }))

  const onPointerDown = (e: React.PointerEvent, date: string, title: string, mode: 'move' | 'resize', start: number, end: number) => {
    e.preventDefault(); (e.target as Element).setPointerCapture(e.pointerId)
    const rect = (e.currentTarget.closest('.wb-track') as HTMLElement).getBoundingClientRect()
    const pxPerMin = rect.width / (T1 - T0)
    const x0 = e.clientX
    const move = (ev: PointerEvent) => {
      const dm = snap((ev.clientX - x0) / pxPerMin)
      if (mode === 'move') { const len = end - start; const s = clamp(start + dm); setDrag({ date, title, mode, start: Math.min(s, T1 - len), end: Math.min(s, T1 - len) + len }) }
      else setDrag({ date, title, mode, start, end: Math.max(start + SNAP, clamp(end + dm)) })
    }
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); setDrag(d => { if (d) setBlock(d.date, d.title, { start: d.start, end: d.end }); return null }) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }

  const selInfo = (() => {
    const { type, why } = dayTypeWhy(user, sel, real)
    const wins = classWindows(user, sel)
    return { type, why, wins, trip: tripOn(sel, user.settings.tripsOff) }
  })()
  const setUntil = (pid: string, v?: number) => update(u => ({ ...u, practice: { ...u.practice, [sel]: { ...u.practice[sel], until: { ...u.practice[sel]?.until, [pid]: v as number } } } }))
  const d0 = parse(days[0]), d6 = parse(days[6])

  return (
    <div className="wb">
      <div className="wb-head">
        <div><h2 className="serif big">Your week</h2><p className="meta">{MONTHS[d0.getMonth()]} {d0.getDate()}–{d6.getMonth() === d0.getMonth() ? '' : MONTHS[d6.getMonth()] + ' '}{d6.getDate()} · New York time · week {wk}</p></div>
        <div className="toolbar"><button className="pill" onClick={() => setWk(Math.max(1, wk - 1))} disabled={wk <= 1}>←</button><button className="pill active">Week {wk}</button><button className="pill" onClick={() => setWk(Math.min(11, wk + 1))} disabled={wk >= 11}>→</button></div>
      </div>
      <div className="wb-grid">
        <section className="card wb-board">
          <div className="wb-toggles">
            {([['commitments', 'Commitments'], ['practice', 'Practice projections'], ['options', 'Include options']] as const).map(([k, l]) => (
              <label key={k} className="switch"><input type="checkbox" checked={show[k]} onChange={e => setShow({ ...show, [k]: e.target.checked })} /><i /><span>{l}</span></label>))}
          </div>
          <div className="wb-axis"><span className="wb-day" />{Array.from({ length: Math.floor((T1 - T0) / 60) + 1 }, (_, i) => <span key={i} className={i % 2 ? 'minor' : ''} style={{ left: pct(T0 + i * 60) + '%' }}>{fmtMin(T0 + i * 60)}</span>)}</div>
          {days.map(date => {
            const { type } = dayTypeWhy(user, date, real)
            const skipped = new Set(user.practice[date]?.skipped ?? [])
            const blocks = show.practice ? blocksForType(date, type, startFor(user, date), user).filter(b => !skipped.has(b.title)) : []
            const wins = show.commitments ? classWindows(user, date) : []
            const items = show.commitments ? itemsOn(date, user).filter(x => !x.missed && x.p.kind !== 'inperson' && !['climb', 'climbLES', 'run', 'run2'].includes(x.p.id)) : []
            const optional = show.options ? itemsOn(date, user, undefined, true).filter(x => x.p.kind === 'inperson' && (x.state === 'considering')) : []
            const empty = !blocks.length && !wins.length && !items.length
            const trip = tripOn(date, user.settings.tripsOff)
            const q = projected.alloc[date] ?? []
            return (
              <div key={date} className={'wb-row' + (date === sel ? ' sel' : '') + (date === real ? ' today' : '')} onClick={() => setSel(date)}>
                <div className="wb-day"><b>{DOW[parse(date).getDay()]} {parse(date).getDate()}</b><small>{trip ? `✈ ${trip.name}` : DAY_TYPES.find(t => t.id === type)?.label}</small></div>
                <div className="wb-track" ref={date === sel ? rowRef : undefined}>
                  {empty && <span className="wb-empty">{type === 'rest' ? (parse(date).getDay() === 0 ? 'Review + optional workshop' : 'Leave open') : trip ? 'Away' : 'Nothing yet'}</span>}
                  {wins.map(w => { const t = span(w.p.time)!; return (
                    <div key={w.p.id} className="wb-ev-wrap">
                      <div className="wb-ev ghost" style={{ left: pct(t[0]) + '%', width: (pct(t[1]) - pct(t[0])) + '%' }} title="Organizer's full event" />
                      {w.lead > 0 && <div className="wb-ev travel" style={{ left: pct(w.from) + '%', width: (pct(w.start) - pct(w.from)) + '%' }} title={`Travel from ${w.fromWhere} · ${w.lead} min`}>travel</div>}
                      <div className={'wb-ev fixed' + (stateOf(w.p, user) === 'registered' ? '' : ' trial') + (w.end - w.start < 90 ? ' narrow' : '')} style={{ left: pct(w.start) + '%', width: (pct(w.end) - pct(w.start)) + '%' }} onClick={e => { e.stopPropagation(); setSel(date); onOpen(w.p, date) }} title={`${w.p.name} · ${fmtMin(w.start)}–${fmtMin(w.end)}`}>
                        <b>{w.p.short}</b><span>{fmtMin(w.start)}–{fmtMin(w.end)}</span>{w.end - w.start >= 120 && <i className={'tag ' + (stateOf(w.p, user) === 'registered' ? 'planned' : 'trial')}>{stateOf(w.p, user) === 'registered' ? 'Planned' : 'Trial'}</i>}
                      </div>
                    </div>) })}
                  {items.map(it => { const t = span(it.p.time); if (!t) return null; return (
                    <div key={it.p.id} className={'wb-ev life' + (t[1] - t[0] < 90 ? ' narrow' : '')} style={{ left: pct(t[0]) + '%', width: (pct(t[1]) - pct(t[0])) + '%' }} onClick={e => { e.stopPropagation(); onOpen(it.p, date) }} title={it.p.name}><b>{it.p.short}</b></div>) })}
                  {optional.map(it => { const t = span(it.p.time); if (!t) return null; return (
                    <div key={it.p.id} className="wb-ev opt" style={{ left: pct(t[0]) + '%', width: (pct(t[1]) - pct(t[0])) + '%' }} onClick={e => { e.stopPropagation(); onOpen(it.p, date) }} title={`${it.p.name} · considering`}><b>{it.p.short}</b></div>) })}
                  {blocks.map(b => {
                    const d = drag && drag.date === date && drag.title === b.title ? drag : null
                    const s = d?.start ?? b.start, e2 = d?.end ?? b.end
                    const lane = /piano/i.test(b.title) ? 'piano' : /sax/i.test(b.title) ? 'sax' : /gym/i.test(b.title) ? 'gym' : 'other'
                    const done = user.practice[date]?.active === undefined && (user.sessions ?? []).some(x => x.date === date && x.block === b.title && x.minutes > 0)
                    const n = lane === 'piano' ? q.filter(x => x.lane === 'piano').length : lane === 'sax' ? q.filter(x => x.lane === 'sax').length : lane === 'gym' ? q.filter(x => x.lane === 'workout').length : 0
                    return (
                      <div key={b.title} className={`wb-ev flex ${lane}${d ? ' dragging' : ''}${done ? ' done' : ''}${e2 - s < 60 ? ' narrow' : ''}`} style={{ left: pct(s) + '%', width: (pct(e2) - pct(s)) + '%' }}
                        onPointerDown={e => onPointerDown(e, date, b.title, 'move', b.start, b.end)} title={`${b.title} · drag to move, pull the edge to resize`}>
                        <b>{e2 - s < 60 ? b.title.split(' ')[0] : `${b.title.replace(/ block \d/, '').replace('Gym slot', 'Gym').replace('Lunch + walk', 'Lunch').replace(/ \(light\)/, '')} ${e2 - s}`}</b>{n > 0 && e2 - s >= 90 && <span>{n} queued</span>}
                        {b.note === 'added' && <button className="wb-x" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); removeAdded(date, b.title) }}>×</button>}
                        <div className="wb-handle" onPointerDown={e => { e.stopPropagation(); onPointerDown(e, date, b.title, 'resize', b.start, b.end) }} />
                      </div>)
                  })}
                  {type !== 'travel' && show.practice && <button className="wb-add" onClick={e => { e.stopPropagation(); addBlock(date) }} title="Add a 30-min practice block">+</button>}
                </div>
              </div>)
          })}
          <div className="wb-legend"><i className="sw fixed" />Fixed appointment <i className="sw flex" />Flexible practice (drag · resize · 30-min steps) <i className="tag planned">Planned</i> registered <i className="tag trial">Trial</i> optional</div>
        </section>

        <aside className="card wb-side">
          <h3 className="serif">{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][parse(sel).getDay()]}, {MONTHS[parse(sel).getMonth()].slice(0, 3)} {parse(sel).getDate()}</h3>
          <p className="meta">{DAY_TYPES.find(t => t.id === selInfo.type)?.label} day · {selInfo.why}</p>
          {selInfo.wins.length === 0 && <p className="meta">No classes this day.</p>}
          {selInfo.wins.map(w => { const t = span(w.p.time)!; const opts = Array.from({ length: Math.floor((t[1] - t[0]) / 30) }, (_, i) => t[0] + 30 * (i + 1)); return (
            <div key={w.p.id} className="wb-visit">
              <div className="row between"><b>{w.p.short}</b><i className={'tag ' + (stateOf(w.p, user) === 'registered' ? 'planned' : 'trial')}>{stateOf(w.p, user) === 'registered' ? 'Planned' : 'Trial'}</i></div>
              <label className="inl">Your visit {fmtMin(w.start)}– <select value={w.end} onChange={e => setUntil(w.p.id, Number(e.target.value) === t[1] ? undefined : Number(e.target.value))}>{opts.map(m => <option key={m} value={m}>{fmtMin(m)}</option>)}</select></label>
              <small className="meta">Organizer’s full event: {fmtMin(t[0])}–{fmtMin(t[1])} · travel {w.lead} min from {w.fromWhere}</small>
              {user.attendance[attKey(w.p.id, sel)] && <small className="meta">Logged: {user.attendance[attKey(w.p.id, sel)]}</small>}
            </div>) })}
          <button className="btn primary wide" onClick={() => onOpenDay(sel)}>Adjust this day</button>
          <p className="meta">Moving practice does not move classes. Blocks snap to 30 minutes; add one with +.</p>
        </aside>
      </div>
    </div>
  )
}
