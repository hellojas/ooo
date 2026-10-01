import { useMemo, useState } from 'react'
import { DOW, MONTHS, parse, today } from '../dates'
import { MASTER, laneEta, priorityOf, project, type Kind, type Lane, type Priority } from '../queue'
import { update, useUser } from '../storage'
import { Ic } from './Icons'

type Tab = 'piano' | 'sax' | 'run' | 'pull'
const TABS: [Tab, string, Lane, Kind[]][] = [['piano', 'Piano', 'piano', ['lesson', 'technique', 'standard']], ['sax', 'Sax', 'sax', ['sax']], ['run', 'Run', 'workout', ['run']], ['pull', 'Pull-ups', 'workout', ['pull']]]
const fmt = (d?: string) => d ? `${DOW[parse(d).getDay()]} ${MONTHS[parse(d).getMonth()].slice(0, 3)} ${parse(d).getDate()}` : '—'

/** The whole queue, per lane, with where each item currently lands. Done items are struck; anything can be skipped or un-skipped. */
export function QueueView({ onOpenDay }: { onOpenDay: (d: string) => void }) {
  const user = useUser()
  const real = today()
  const [tab, setTab] = useState<Tab>('piano')
  const [, , lane, kinds] = TABS.find(t => t[0] === tab)!
  const [showDone, setShowDone] = useState(false)
  const projected = useMemo(() => project(user, real), [user, real])
  const items = MASTER.filter(x => kinds.includes(x.kind))
  const skip = new Set(user.queueSkip ?? [])
  const etaAll = laneEta(user, lane, projected)
  const core = items.filter(x => priorityOf(user, x) === 'core' && !skip.has(x.id))
  const eta = { ...etaAll, done: core.filter(x => user.queueDone?.[x.id]).length, total: core.length, pct: core.length ? Math.round(core.filter(x => user.queueDone?.[x.id]).length / core.length * 100) : 0, short: core.filter(x => !user.queueDone?.[x.id] && !projected.dateOf[x.id]).length }
  const setPri = (k: string, p: Priority) => update(u => ({ ...u, queuePriority: { ...u.queuePriority, [k]: p } }))
  const toggleSkip = (id: string) => update(u => ({ ...u, queueSkip: (u.queueSkip ?? []).includes(id) ? u.queueSkip.filter(x => x !== id) : [...(u.queueSkip ?? []), id] }))
  const markDone = (id: string, on: boolean) => update(u => { const qd = { ...u.queueDone }; if (on) qd[id] = real; else delete qd[id]; return { ...u, queueDone: qd } })
  let nextSeen = false
  return (
    <section className="plain queue">
      <div className="row between">
        <div><h2>Curriculum</h2><p className="lede serif">Curriculum determines what comes next. You determine how fast time moves.</p><p className="meta">The whole curriculum as a queue, in order. Dates are where each item lands right now; they move as you tick things off. Classes aren’t here — they’re fixed.</p></div>
      </div>
      <div className="subtabs">{TABS.map(([id, l, ln, ks]) => { const Icon = { piano: Ic.piano, sax: Ic.sax, workout: Ic.workout }[ln]; const all = MASTER.filter(x => ks.includes(x.kind)); return <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}><Icon /> {l} <small>{all.filter(x => user.queueDone?.[x.id]).length}/{all.length}</small></button> })}</div>
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
            <li key={x.id} className={['qrow', done ? 'done' : '', skipped ? 'skipped' : '', isNext ? 'next' : ''].join(' ')}>
              <span className="qn num">{i + 1}</span>
              <span className="qbody">
                <b>{x.label}</b>
                <small>{x.branch.toLowerCase()} · {priorityOf(user, x)}{done ? ` · done ${fmt(done)}` : skipped ? ' · parked' : when ? ` · ${when === real ? 'today' : fmt(when)}` : priorityOf(user, x) === 'parked' ? '' : ' · not scheduled yet'}{isNext ? ' · up next' : ''}{(user.queueRepeat ?? []).includes(x.id) ? ' · repeating' : ''}</small>
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
