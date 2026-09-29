import plan from '../data/block-tasks.json'
import { dayByDay, courses } from './data'
import { parse, weekNo } from './dates'
import type { UserData } from './types'

export interface Task { id: string; label: string; url?: string }
const inRange = (wk: number, r: number[]) => wk >= r[0] && wk <= r[1]

export const standardOfWeek = (user: UserData, wk: number) => user.weekly[wk]?.standard || plan.standards[wk - 1]

/** Ordered, checkable tasks per block for a date, derived from docs/plan.md (data/block-tasks.json). Keyed by block title. */
export function tasksFor(date: string, user: UserData, type: 'full' | 'class' | 'light' | 'travel' | 'rest' = 'full'): Record<string, Task[]> {
  const wk = weekNo(date), dow = parse(date).getDay()
  const out: Record<string, Task[]> = {}
  if (wk < 1 || type === 'rest' || type === 'travel') return out
  const std = standardOfWeek(user, wk)
  if (dow === 0) {
    out['Weekly review (30 min)'] = plan.sundayReview.map((label, i) => ({ id: `rev${i}`, label }))
    return out
  }
  if (dow === 6) return out
  const sax = plan.sax.find(x => inRange(wk, x.wk))
  if (sax) out['Sax'] = sax.tasks.map((label, i) => ({ id: `sax${i}`, label: label.replace("this week's standard", `this week's standard (${std ?? '…'})`) }))

  const tech = plan.technique.find(x => inRange(wk, x.wk))
  const steps = ((plan.standardSteps as Record<string, string[]>)[String(dow)] ?? []).map((label, i) => ({ id: `std${i}`, label: `${std ?? 'Standard'}: ${label}` }))
  const lesson = dayByDay.find(v => v.date === date)
  const b1: Task[] = []
  if (lesson) b1.push({ id: 'lesson', label: `Open Studio: ${lesson.what}`, url: courses.find(c => c.id === lesson.course)?.url })
  if (tech) b1.push({ id: 'tech', label: `Technique: ${tech.text} — apply it to ${std ?? 'this week’s standard'}` })
  out['Piano block 1'] = [...b1, ...steps]

  const byEar = user.weekly[wk]?.byEar
  out['Piano block 2'] = [
    { id: 'ear-song', label: byEar ? `Transcribe the first 8 bars of “${byEar}” — bass line first` : 'Pick a song to play by ear (set it in Review) — first 8 bars, bass line first' },
    ...plan.ear.slice(1).map((label, i) => ({ id: `ear${i + 1}`, label })),
    { id: 'arr0', label: `Arrangement: LH pattern — ${plan.lhPatterns[(wk - 1) % plan.lhPatterns.length]}` },
    { id: 'arr1', label: 'Arrangement: RH melody with chord tones below' },
  ]
  if (type === 'light') {
    const all = [...out['Piano block 1'], ...out['Piano block 2']]
    out['Piano (light)'] = [...all.filter(t => t.id.startsWith('std')).slice(0, 2), { id: 'fun', label: 'One run-through of anything you enjoy' }]
    delete out['Sax']; delete out['Piano block 1']; delete out['Piano block 2']
  }
  if (type === 'class') delete out['Piano block 2']
  return out
}
