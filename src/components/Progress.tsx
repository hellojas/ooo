import { progress } from '../model'
import { useUser } from '../storage'
import { weekNo, today, START, END } from '../dates'

export function ProgressStrip({ kind }: { kind: 'jazz' | 'abs' }) {
  const user = useUser()
  const raw = weekNo(today())
  const wk = Math.min(11, Math.max(1, raw))
  const p = progress(user, wk)
  const cells = kind === 'jazz'
    ? [['Week', `${raw < 1 ? 0 : Math.min(raw, 11)} of 10`], ['Standards memorized', `${p.standards} / 10`], ['Piano this week', `${Math.round(p.piano / 6) / 10} h`]]
    : [['Climbs this week', `${p.climbs} (floor 3 · ceiling 4)`], ['Pull-up max', p.maxes.length ? p.maxes.join(' → ') : '—'], ['C25K reached', p.c25k || '—']]
  return <div className="counts strip">{cells.map(([a, b]) => <div key={a}><b>{a}</b><span>{b}</span></div>)}<div className="dim"><span>Auto-filled from your Today log · {START} → {END}</span></div></div>
}
