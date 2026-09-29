import { useMemo, useState } from 'react'
import { DOW, MONTHS, parse, today } from '../dates'
import { MASTER, laneEta, laneProgress, priorityOf, project, type Kind, type Lane, type Priority } from '../queue'
import { update, useUser } from '../storage'
import { Ic } from './Icons'

const LANES: [Lane, string][] = [['piano', 'Piano'], ['sax', 'Sax'], ['workout', 'Workout']]
const fmt = (d?: string) => d ? `${DOW[parse(d).getDay()]} ${MONTHS[parse(d).getMonth()].slice(0, 3)} ${parse(d).getDate()}` : '—'

/** The whole queue, per lane, with where each item currently lands. Done items are struck; anything can be skipped or un-skipped. */
export function QueueView({ onOpenDay }: { onOpenDay: (d: string) => void }) {
  const user = useUser()
  const real = today()
  const [lane, setLane] = useState<Lane>('piano')
  const [showDone, setShowDone] = useState(false)
  const projected = useMemo(() => project(user, real), [user, real])
  const items = MASTER.filter(x => x.lane === lane)
  const eta = laneEta(user, lane, projected)
  const skip = new Set(user.queueSkip ?? [])
  const setPri = (k: string, p: Priority) => update(u => ({ ...u, queuePriority: { ...u.queuePriority, [k]: p } }))
  const kinds: Kind[] = lane === 'piano' ? ['lesson', 'technique', 'standard'] : lane === 'sax' ? ['sax'] : ['climb', 'run', 'pull']
  const toggleSkip = (id: string) => update(u => ({ ...u, queueSkip: (u.queueSkip ?? []).includes(id) ? u.queueSkip.filter(x => x !== id) : [...(u.queueSkip ?? []), id] }))
  const markDone = (id: string, on: boolean) => update(u => { const qd = { ...u.queueDone }; if (on) qd[id] = real; else delete qd[id]; return { ...u, queueDone: qd } })
  let nextSeen = false
  return (
    <section className="plain queue">
      <div className="row between">
        <div><h2>Library</h2><p className="meta">The whole curriculum as a queue, in order. Dates are where each item lands right now; they move as you tick things off. Classes aren’t here — they’re fixed.</p></div>
      </div>
      <div className="subtabs">{LANES.map(([id, l]) => { const Icon = { piano: Ic.piano, sax: Ic.sax, workout: Ic.workout }[id]; return <button key={id} aria-pressed={lane === id} onClick={() => setLane(id)}><Icon /> {l} <small>{laneProgress(user, id).done}/{laneProgress(user, id).total}</small></button> })}</div>
      <div className="prirow">{kinds.map(k => <label key={k} className="inl">{k} <select value={user.queuePriority?.[k] ?? priorityOf(user, MASTER.find(x => x.kind === k)!)} onChange={e => setPri(k, e.target.value as Priority)}><option value="core">core</option><option value="optional">optional</option><option value="parked">parked</option></select></label>)}
        <span className="meta">Core is what the forecast counts. Optional fills spare days. Parked never schedules.</span></div>
      <p className="meta">Core: {eta.pct}% ({eta.done}/{eta.total}) · {items.filter(x => skip.has(x.id)).length} skipped{eta.pace != null && eta.practiceDays > 0 ? ` · ${eta.pace}/day so far` : ''}{eta.eta ? ` · on track to finish ${fmt(eta.eta)}` : eta.short ? ` · ~${eta.short} past Dec 23 at this pace — fine, pull extra on good days` : ''}
        <label className="inl" style={{ marginLeft: 12 }}><input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} /> show done</label></p>
      <ol className="qlist">
        {items.map((x, i) => {
          const done = user.queueDone?.[x.id], skipped = skip.has(x.id), when = projected.dateOf[x.id]
          if (done && !showDone) return null
          const isNext = !done && !skipped && !nextSeen && (nextSeen = true)
          return (
            <li key={x.id} className={['qrow', done ? 'done' : '', skipped ? 'skipped' : '', isNext ? 'next' : '', when && when < real && !done ? 'late' : ''].join(' ')}>
              <span className="qn num">{i + 1}</span>
              <span className="qbody">
                <b>{x.label}</b>
                <small>{x.kind} · {priorityOf(user, x)}{done ? ` · done ${fmt(done)}` : skipped ? ' · parked' : when ? ` · ${when === real ? 'today' : fmt(when)}` : priorityOf(user, x) === 'parked' ? '' : ' · not scheduled yet'}{isNext ? ' · up next' : ''}{(user.queueRepeat ?? []).includes(x.id) ? ' · repeating' : ''}</small>
              </span>
              <span className="qacts">
                {when && !done && <button className="linkbtn quiet" onClick={() => onOpenDay(when)}>open day</button>}
                {!skipped && <button className="linkbtn quiet" onClick={() => markDone(x.id, !done)}>{done ? 'undo' : 'done'}</button>}
                {!done && <button className="linkbtn quiet" onClick={() => toggleSkip(x.id)}>{skipped ? 'restore' : 'park'}</button>}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
