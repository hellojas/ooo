import plan from '../data/block-tasks.json'
import { WEEKLY_METRICS, freeDays, weekTotals } from './model'
import { standardOfWeek } from './tasks'
import type { UserData } from './types'

/** Look at week `wk` and adjust week wk+1: keep or move the tune, nudge targets, ease the load if the body complained.
 *  Returns the list of changes (also stored under weekly[wk].replan). Guidelines, not verdicts. */
export function replan(user: UserData, wk: number): { user: UserData; changes: string[] } {
  const changes: string[] = []
  const cur = standardOfWeek(user, wk)
  const tune = cur ? user.tunes[cur] : undefined
  const w = user.weekly[wk] ?? {}
  const next = { ...(user.weekly[wk + 1] ?? {}) }
  const settings = { ...user.settings, targets: { ...user.settings.targets } }

  // Tune: move on only when memorized (3+ stages) or recorded; otherwise keep it another week.
  const memorized = (tune?.checks.length ?? 0) >= 3 || !!w.recordedStandard
  if (cur && !memorized) { next.standard = cur; changes.push(`Keep “${cur}” another week — not memorized yet.`) }
  else if (cur && next.standard === cur) { delete next.standard; changes.push(`Move on from “${cur}” → ${plan.standards[wk] ?? 'next tune'}.`) }
  else if (cur) changes.push(`“${cur}” is memorized — moving on to ${plan.standards[wk] ?? 'the next tune'}.`)

  // Piano load: compare to the travel-scaled target; nudge next week's target by up to ±15%.
  const done = weekTotals(user, wk)
  const scale = Math.min(1, freeDays(user, wk) / 5)
  const pianoT = (settings.targets.piano ?? WEEKLY_METRICS.find(m => m.id === 'piano')!.def) * scale
  if (pianoT > 0) {
    const r = done.piano / pianoT
    const base = settings.targets.piano ?? WEEKLY_METRICS.find(m => m.id === 'piano')!.def
    if (r < 0.6) { settings.targets.piano = Math.round(base * 0.85 / 30) * 30; changes.push(`Piano was ${Math.round(r * 100)}% of the guideline — next week’s target eases to ${Math.round(settings.targets.piano / 60 * 10) / 10} h.`) }
    else if (r > 1.15) { settings.targets.piano = Math.round(base * 1.1 / 30) * 30; changes.push(`Piano ran ${Math.round(r * 100)}% — next week’s target rises to ${Math.round(settings.targets.piano / 60 * 10) / 10} h.`) }
    else changes.push(`Piano at ${Math.round(r * 100)}% of the guideline — target unchanged.`)
  }

  // Body: two or more tired/sore days → shorter light days and a mid-week light day.
  const complaints = Object.entries(user.practice).filter(([d, p]) => d >= '2026-10-04' && (p.feel === 'tired' || p.feel === 'sore') && weekNoOf(d) === wk).length
  const practice = { ...user.practice }
  if (complaints >= 2) {
    settings.lightMinutes = Math.min(settings.lightMinutes ?? 60, 45)
    const wed = wedOf(wk + 1)
    practice[wed] = { ...practice[wed], dayType: 'light' }
    changes.push(`You logged tired/sore ${complaints}× — Wednesday next week is Light, and light days are ${settings.lightMinutes} min.`)
  }
  // Climbing: fewer than the floor → say so, don't punish.
  if (done.climbs < 3 * scale) changes.push(`Climbed ${done.climbs}× (floor is 3). No change — the floor stands.`)

  const out: UserData = { ...user, settings, practice, weekly: { ...user.weekly, [wk]: { ...w, replan: changes }, [wk + 1]: next } }
  return { user: out, changes }
}
import { weekNo as weekNoOf, weekStart, addDays, parse, key } from './dates'
const wedOf = (wk: number) => key(addDays(parse(weekStart(wk)), 3))
