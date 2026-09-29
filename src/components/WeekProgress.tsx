import { WEEKLY_METRICS, freeDays, weekTotals } from '../model'
import { useUser } from '../storage'
import { weekNo, today } from '../dates'

/** Weekly guidelines: progress toward each target, scaled down for travel days, with a soft pace hint. */
export function WeekProgress({ wk, from }: { wk: number; from?: string }) {
  const user = useUser()
  const done = weekTotals(user, wk)
  const free = freeDays(user, wk)
  const scale = Math.min(1, free / 5)
  const now = from ?? (weekNo(today()) === wk ? today() : undefined)
  const left = freeDays(user, wk, now)
  return (
    <div className="wprog">
      <p className="sub">Guidelines for the week, not rules.{free < 5 ? ` Scaled to ${Math.round(scale * 100)}% — ${7 - free} of 7 days are travel or outside the sabbatical.` : ''}</p>
      {WEEKLY_METRICS.map(m => {
        const raw = user.settings.targets?.[m.id] ?? m.def
        const target = m.unit === 'min' || m.unit === 'reps' ? Math.round(raw * scale / 5) * 5 : Math.max(free > 0 ? 1 : 0, Math.round(raw * scale))
        const d = done[m.id], rem = target - d
        const pct = target ? Math.min(100, (d / target) * 100) : 0
        const hint = target === 0 ? 'nothing planned this week'
          : rem <= 0 ? 'guideline met ✓'
          : left === 0 ? `${m.unit === 'min' ? rem + ' min' : m.unit === 'reps' ? rem + ' reps' : rem} short — fine, carry on`
          : m.unit !== 'sessions' ? `≈${Math.round(rem / left / 5) * 5 || 5} ${m.unit === 'min' ? 'min' : 'reps'} a day over the next ${left} day${left > 1 ? 's' : ''}`
          : `${rem} more — ${left} day${left > 1 ? 's' : ''} left`
        return (
          <div className={'wp-row' + (rem <= 0 && target ? ' met' : '')} key={m.id} title={m.note}>
            <div className="wp-top"><b>{m.label}</b><span>{d} / {target}{m.unit === 'min' ? ' min' : m.unit === 'reps' ? ' reps' : ''}</span></div>
            <div className="bar"><i style={{ width: pct + '%' }} /></div>
            <small>{hint}</small>
          </div>
        )
      })}
    </div>
  )
}
