import { WEEKLY_METRICS, freeDays, weekTotals } from './model'
import { addDays, key, parse, weekNo, weekStart } from './dates'
import type { UserData } from './types'

export interface Change { key: string; label: string; from: string; to: string; apply: boolean; reason: string }
const wedOf = (wk: number) => key(addDays(parse(weekStart(wk)), 3))

/** Look at week `wk` and PROPOSE changes for wk+1. Nothing is applied here — see applyChanges. */
export function propose(user: UserData, wk: number): Change[] {
  const out: Change[] = []
  const done = weekTotals(user, wk)
  const scale = Math.min(1, freeDays(user, wk) / 5)
  const base = user.settings.targets?.piano ?? WEEKLY_METRICS.find(m => m.id === 'piano')!.def
  const pianoT = base * scale
  if (pianoT > 0) {
    const r = done.piano / pianoT
    if (r < 0.6) out.push({ key: 'piano', label: 'Piano guideline', from: `${Math.round(base / 60 * 10) / 10} h`, to: `${Math.round(base * 0.85 / 30) * 30 / 60} h`, apply: true, reason: `${Math.round(r * 100)}% of the guideline this week` })
    else if (r > 1.15) out.push({ key: 'piano', label: 'Piano guideline', from: `${Math.round(base / 60 * 10) / 10} h`, to: `${Math.round(base * 1.1 / 30) * 30 / 60} h`, apply: true, reason: `${Math.round(r * 100)}% of the guideline this week` })
  }
  const skips = Object.entries(user.practice).filter(([d, p]) => weekNo(d) === wk && p.skippedDay).length
  if (skips >= 2) out.push({ key: 'wedLight', label: 'Wednesday', from: 'Full', to: 'Light', apply: true, reason: `${skips} skipped days this week` })
  if (done.climbs < 3 * scale) out.push({ key: 'climb', label: 'Climbing', from: `${done.climbs}× this week`, to: 'no change', apply: false, reason: 'the floor of 3 stands — it’s the habit, not a task' })
  return out
}

/** Apply the ticked changes to next week. */
export function applyChanges(user: UserData, wk: number, changes: Change[]): UserData {
  const settings = { ...user.settings, targets: { ...user.settings.targets } }
  const practice = { ...user.practice }
  for (const c of changes.filter(c => c.apply)) {
    if (c.key === 'piano') settings.targets.piano = Math.round(parseFloat(c.to) * 60)
    if (c.key === 'wedLight') { const d = wedOf(wk + 1); practice[d] = { ...practice[d], dayType: 'light' } }
  }
  return { ...user, settings, practice, weekly: { ...user.weekly, [wk]: { ...user.weekly[wk], replan: changes.filter(c => c.apply).map(c => `${c.label}: ${c.from} → ${c.to}`) } } }
}
