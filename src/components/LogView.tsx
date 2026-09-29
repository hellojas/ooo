import { DOW, parse } from '../dates'
import { useUser } from '../storage'

/** Journal of everything logged, newest first. */
export function LogView({ onOpenDay }: { onOpenDay: (d: string) => void }) {
  const user = useUser()
  const days = [...new Set([...Object.keys(user.practice), ...Object.keys(user.climbing), ...Object.keys(user.running), ...Object.keys(user.pullups)])].sort().reverse()
  const rows = days.map(d => {
    const p = user.practice[d] ?? {}, c = user.climbing[d] ?? {}, r = user.running[d] ?? {}, u = user.pullups[d] ?? {}
    const parts = [
      (p.sax || p.piano1 || p.piano2 || p.transcribe || p.arrange) && `Practice: ${[['sax', p.sax], ['piano', (p.piano1 ?? 0) + (p.piano2 ?? 0) || undefined], ['transcribe', p.transcribe], ['arrange', p.arrange]].filter(x => x[1]).map(x => `${x[0]} ${x[1]}m`).join(', ')}`,
      p.songTranscribed && `Transcribed: ${p.songTranscribed}`,
      (c.sessionType || c.sends?.length || c.fingerFeel) && `Climb${c.gym ? ' ' + c.gym : ''}: ${[c.sessionType, c.sends?.map(s => s.grade).join('/'), c.fingerFeel && `finger ${c.fingerFeel}/5`].filter(Boolean).join(', ')}`,
      (r.minutes || r.c25kWeek) && `Run: ${r.minutes ?? '?'} min${r.c25kWeek ? ` (C25K wk ${r.c25kWeek})` : ''}`,
      (u.sets?.length || u.maxTest) && `Pull-ups: ${u.sets?.map(s => s.reps + (s.weightLb ? '+' + s.weightLb : '')).join(' ') ?? ''}${u.maxTest ? ` · max ${u.maxTest}` : ''}`,
      p.notes && `Notes: ${p.notes}`,
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
