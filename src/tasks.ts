import plan from '../data/block-tasks.json'
import { parse, weekNo } from './dates'
import { pdfLinks } from './drive'
import { currentTune, pianoMinutes, project, type QItem } from './queue'
import { currentByEar, EAR_STEPS } from './components/ByEar'
import type { UserData } from './types'
import { blocksForType, startFor } from './model'
import { earMicro, guidance, maintenanceTune } from './curriculum'

export interface Task { id: string; label: string; url?: string; qid?: string; pdf?: string; /** minute budget inside the session */ min?: number; /** where you stopped last time, or the tune's key/tempo/target */ ctx?: string; /** how you know you can move on (from the curriculum graph) */ pass?: string }
export const STAGES = ['Map', 'Harmonize', 'Navigate', 'Language', 'Perform']
const inRange = (wk: number, r: number[]) => wk >= r[0] && wk <= r[1]

/** The tune in play: the queue decides; a Review override for that week wins. */
export const standardOfWeek = (user: UserData, wk: number) => currentTune(user) || plan.standards[Math.min(9, Math.max(0, wk - 1))]

const toTask = (q: QItem): Task => ({ id: 'q:' + q.id, qid: q.id, label: q.label, url: q.url, pdf: q.pdf })
const FEEL_TEXT = { lost: 'felt lost — smaller scope today', working: 'still working on it', solid: 'felt solid last time', easy: 'too easy — move on' }
/** The context line for an item: what you wrote when you stopped, else the tune's key / tempo / target. */
export function ctxFor(user: UserData, q: QItem): string | undefined {
  const m = user.queueMemo?.[q.id]
  const parts: string[] = []
  const g = guidance(q.id)
  if (m) parts.push([m.feel ? FEEL_TEXT[m.feel] : '', m.note].filter(Boolean).join(': '))
  if (m?.feel === 'lost' && g.stuck) parts.push(`smaller: ${g.stuck}`)
  if (q.tune) { const t = user.tunes[q.tune]; if (t) parts.push([t.key && `in ${t.key}`, t.tempo && `${t.tempo} bpm${t.targetTempo ? ` → ${t.targetTempo}` : ''}`].filter(Boolean).join(' · ')) }
  return parts.filter(Boolean).join(' · ') || undefined
}
/** Hand out minutes: technique 20, lesson 30, a short play at the end, the tune gets the rest (never under 15). */
function budget(tasks: Task[], total: number, playLabel?: string): Task[] {
  const has = (k: string) => tasks.some(t => t.qid?.startsWith(k))
  const play = total >= 60 ? 15 : total >= 20 ? 7 : 0
  const fixed = (has('t') ? 20 : 0) + (has('v') ? 30 : 0) + play
  const stdMin = Math.max(Math.min(15, total - play), total - fixed)
  const out: Task[] = tasks.map(t => ({ ...t, min: t.qid?.startsWith('t') ? 20 : t.qid?.startsWith('v') ? 30 : t.qid?.startsWith('s') ? stdMin : undefined, pass: t.qid ? guidance(t.qid).pass : undefined }))
  if (play) out.push({ id: 'play', label: total <= 20 ? 'Play a tune you know. No exercises. Enough for today.' : playLabel ?? 'Play. No exercises — run the tune, record a chorus if you feel like it.', min: play })
  return out
}

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

  const minutes = pianoMinutes(blocksForType(date, type, startFor(user, date), user))
  const b1raw = items.filter(i => i.kind === 'technique').concat(items.filter(i => i.kind === 'lesson'), items.filter(i => i.kind === 'standard')).map(q => ({ ...toTask(q), ctx: ctxFor(user, q) }))
  const keep = maintenanceTune(user, date, plan.standards)
  const b1 = budget(b1raw, Math.min(minutes, 120), keep ? `Play ${keep.tune} — it’s been ${keep.days} days. Keep it warm, no exercises.` : undefined)
  const gym = items.filter(i => i.lane === 'workout').map(toTask)
  if (gym.length) out['Gym slot'] = gym
  const ear = currentByEar(user.transcriptions)
  const nextStep = ear ? EAR_STEPS.find(st => !(ear.steps ?? []).includes(st)) : undefined
  const b2: Task[] = [
    { ...earMicro(dow, std ?? 'this week’s tune') },
    ear ? { id: 'ear-song', label: `By ear · ${ear.song}: ${nextStep ?? 'done'}`, url: ear.url } : { id: 'ear-song', label: 'Pick a song to learn by ear (Roadmap → By ear) — bass line first, label chords by function' },
    { id: 'arr0', label: `Arrangement: LH pattern — ${plan.lhPatterns[(wk - 1) % plan.lhPatterns.length]}` },
    { id: 'arr1', label: 'Arrangement: RH melody with chord tones below' },
  ]
  if (minutes > 0) out['Piano block 1'] = b1
  if (minutes > 120) out['Piano block 2'] = b2
  return out
}
export { pdfLinks }
