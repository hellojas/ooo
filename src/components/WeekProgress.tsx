import { WEEKLY_METRICS, freeDays, weekTotals } from '../model'
import { useUser } from '../storage'
import { weekNo, today } from '../dates'

/** Weekly summary: piano is the hero, everything else quiet. No catch-up arithmetic. */
export function WeekProgress({ wk, from }: { wk: number; from?: string }) {
  const user = useUser()
  const done = weekTotals(user, wk)
  const free = freeDays(user, wk)
  const scale = Math.min(1, free / 5)
  const now = from ?? (weekNo(today()) === wk ? today() : undefined)
  const left = freeDays(user, wk, now)
  const target = (id: (typeof WEEKLY_METRICS)[number]['id'], unit: string) => {
    const raw = user.settings.targets?.[id] ?? WEEKLY_METRICS.find(m => m.id === id)!.def
    return unit === 'sessions' ? Math.max(free > 0 ? 1 : 0, Math.round(raw * scale)) : Math.round(raw * scale / 5) * 5
  }
  const piano = target('piano', 'min')
  return (
    <div className="wsum">
      <div className="hero-stat">
        <span className="num">{Math.round(done.piano / 6) / 10}<small> h</small></span>
        <span className="eyebrow">piano this week · range {Math.round(piano * 0.6 / 60)}–{Math.round(piano / 60)} h{left > 0 ? ` · ${left} day${left > 1 ? 's' : ''} left` : ''}</span>
        <div className="bar"><i style={{ width: Math.min(100, (done.piano / piano) * 100) + '%' }} /></div>
      </div>
      <ul className="quiet-stats">
        {WEEKLY_METRICS.filter(m => m.id !== 'piano').map(m => {
          const t = target(m.id, m.unit), d = done[m.id]
          const txt = m.id === 'reading' ? `${d} morning${d === 1 ? '' : 's'} out` : m.unit === 'min' ? `${d} / ~${t} min` : m.unit === 'reps' ? `${d} reps` : `${d} of ~${t}`
          return <li key={m.id} className={d >= t && t > 0 ? 'met' : ''}><span>{m.label}</span><span className="num">{txt}</span></li>
        })}
      </ul>
      {free < 5 && <p className="meta">Scaled for travel: {7 - free} of 7 days away.</p>}
    </div>
  )
}
