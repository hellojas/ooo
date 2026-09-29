import plan from '../data/block-tasks.json'
import { parse, weekNo } from './dates'
import { pdfLinks } from './drive'
import { currentTune, project, type QItem } from './queue'
import { currentByEar, EAR_STEPS } from './components/ByEar'
import type { UserData } from './types'

export interface Task { id: string; label: string; url?: string; qid?: string; pdf?: string }
const inRange = (wk: number, r: number[]) => wk >= r[0] && wk <= r[1]

/** The tune in play: the queue decides; a Review override for that week wins. */
export const standardOfWeek = (user: UserData, wk: number) => user.weekly[wk]?.standard || currentTune(user) || plan.standards[Math.min(9, Math.max(0, wk - 1))]

const toTask = (q: QItem): Task => ({ id: 'q:' + q.id, qid: q.id, label: q.label, url: q.url, pdf: q.pdf })

/** Checkable tasks per block for a date. Piano content comes from the queue (whatever's next), sax and ear work are daily. */
export function tasksFor(date: string, user: UserData, type: 'full' | 'class' | 'light' | 'travel' | 'rest' = 'full', projected = project(user)): Record<string, Task[]> {
  const wk = weekNo(date), dow = parse(date).getDay()
  const out: Record<string, Task[]> = {}
  if (wk < 1 || type === 'rest' || type === 'travel') return out
  if (dow === 0) { out['Weekly review (30 min)'] = plan.sundayReview.map((label, i) => ({ id: `rev${i}`, label })); return out }
  if (dow === 6) return out
  const std = standardOfWeek(user, wk)
  const items = projected.alloc[date] ?? []
  const sax = plan.sax.find(x => inRange(wk, x.wk))
  const saxQ = items.filter(i => i.lane === 'sax').map(toTask)
  if (sax && type !== 'light') out['Sax'] = saxQ.length ? saxQ.map(t => ({ ...t, label: t.label.replace("this week's standard", `this week's standard (${std ?? '…'})`) })) : sax.tasks.map((label, i) => ({ id: `sax${i}`, label }))

  const b1 = items.filter(i => i.lane === 'piano' && i.kind !== 'standard').map(toTask).concat(items.filter(i => i.kind === 'standard').map(toTask))
  const gym = items.filter(i => i.lane === 'workout').map(toTask)
  if (gym.length) out['Gym slot'] = gym
  const ear = currentByEar(user.transcriptions)
  const nextStep = ear ? EAR_STEPS.find(st => !(ear.steps ?? []).includes(st)) : undefined
  const b2: Task[] = [
    ear ? { id: 'ear-song', label: `By ear · ${ear.song}: ${nextStep ?? 'done'}`, url: ear.url } : { id: 'ear-song', label: 'Pick a song to learn by ear (Roadmap → By ear) — bass line first, label chords by function' },
    { id: 'arr0', label: `Arrangement: LH pattern — ${plan.lhPatterns[(wk - 1) % plan.lhPatterns.length]}` },
    { id: 'arr1', label: 'Arrangement: RH melody with chord tones below' },
  ]
  if (type === 'light') { out['Piano (light)'] = [...b1, { id: 'fun', label: 'One run-through of anything you enjoy' }]; return out }
  out['Piano block 1'] = b1
  if (type !== 'class') out['Piano block 2'] = b2
  return out
}
export { pdfLinks }
