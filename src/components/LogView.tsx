import { DOW, parse } from '../dates'
import { pullReps } from '../model'
import { useUser } from '../storage'

/** Journal of everything logged, newest first. */
export function LogView({ onOpenDay }: { onOpenDay: (d: string) => void }) {
  const user = useUser()
  const days = [...new Set([...Object.keys(user.practice), ...Object.keys(user.climbing), ...Object.keys(user.running), ...Object.keys(user.pullups)])].sort().reverse()
  const rows = days.map(d => {
    const p = user.practice[d] ?? {}, c = user.climbing[d] ?? {}, r = user.running[d] ?? {}
    const piano = (p.piano1 ?? 0) + (p.piano2 ?? 0), reps = pullReps(user.pullups[d])
    const parts = [
      (piano || p.sax) && `Music: ${[piano && `piano ${piano}m`, p.sax && `sax ${p.sax}m`].filter(Boolean).join(', ')}`,
      (c.done || r.done || reps) && `Gym: ${[c.done && 'climbed', r.done && 'ran', reps && `${reps} pull-ups`].filter(Boolean).join(', ')}`,
      p.notes && `Note: ${p.notes}`,
    ].filter(Boolean) as string[]
    return { d, parts }
  }).filter(r => r.parts.length)
  return (
    <section className="panel">
      <h2>Log</h2><p>Everything you’ve logged on the daily page. Tap a date to edit it.</p>
      {rows.length === 0 && <p>Nothing logged yet — open Today and log practice, climbs, runs or pull-ups.</p>}
      {rows.map(({ d, parts }) => <div className="logrow" key={d}><button className="linkbtn" onClick={() => onOpenDay(d)}>{DOW[parse(d).getDay()]} {d}</button><ul>{parts.map((x, i) => <li key={i}>{x}</li>)}</ul></div>)}
    </section>
  )
}
