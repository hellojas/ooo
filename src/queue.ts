import plan from '../data/block-tasks.json'
import { courses, dayByDay, phases } from './data'
import { addDays, END, key, parse, START, today } from './dates'
import { blocksForType, dayTypeFor, startFor, type DayType } from './model'
import type { UserData } from './types'

/** One unit of curriculum. The queue is ordered; nothing is dated until it's projected onto the calendar. */
export type Lane = 'piano' | 'sax' | 'workout'
export type Kind = 'lesson' | 'technique' | 'standard' | 'sax' | 'climb' | 'run' | 'pull'
export interface QItem { id: string; lane: Lane; kind: Kind; label: string; url?: string; pdf?: string; course?: string; tune?: string }

const STEPS = ['Melody + shell voicings, memorize the form', 'Rootless A/B voicings through the form', 'Walk chord tones 1‑3‑5‑7 at tempo', 'Chord-tone solo, then add enclosures', 'Head + one chorus + comp, 5 min — record it']
const TECH_SESSIONS = 4
const wkLen = (r: number[]) => r[1] - r[0] + 1

/** The master queue in curriculum order, three lanes. */
export function masterQueue(): QItem[] {
  const q: QItem[] = []
  dayByDay.forEach((v, i) => q.push({ id: `v${i}`, lane: 'piano', kind: 'lesson', label: `${courses.find(c => c.id === v.course)?.short ?? v.course}: ${v.what}`, url: courses.find(c => c.id === v.course)?.url, pdf: v.pdf, course: v.course }))
  plan.technique.forEach((t, i) => { for (let s = 1; s <= TECH_SESSIONS; s++) q.push({ id: `t${i}.${s}`, lane: 'piano', kind: 'technique', label: `Technique: ${t.text} (${s}/${TECH_SESSIONS})` }) })
  plan.standards.forEach((tune, i) => STEPS.forEach((st, k) => q.push({ id: `s${i}.${k}`, lane: 'piano', kind: 'standard', label: `${tune}: ${st}`, tune })))
  plan.sax.forEach((ph, i) => { const n = wkLen(ph.wk) * 5; for (let s = 1; s <= n; s++) q.push({ id: `x${i}.${s}`, lane: 'sax', kind: 'sax', label: `${ph.tasks.join(' · ')} (${s}/${n})` }) })
  for (const ph of phases) {
    const perWeek = ph.prog === 'v8' ? 3 : ph.prog === 'c25k' ? 2 : 3
    const n = wkLen(ph.wk) * perWeek
    const kind: Kind = ph.prog === 'v8' ? 'climb' : ph.prog === 'c25k' ? 'run' : 'pull'
    for (let s = 1; s <= n; s++) q.push({ id: `w${ph.prog}${ph.wk[0]}.${s}`, lane: 'workout', kind, label: `${ph.short}: ${ph.text} (${s}/${n})` })
  }
  return q
}
export const MASTER = masterQueue()
const INDEX = new Map(MASTER.map(x => [x.id, x]))
export const byId = (id: string) => INDEX.get(id)

/** Per-day capacity per kind. Piano: one lesson, one technique item, one tune step. Sax daily. Workout: climb/run/pull as the week pattern suggests. */
function capacity(type: DayType, dow: number, blocks: string[]): Record<Kind, number> {
  const zero: Record<Kind, number> = { lesson: 0, technique: 0, standard: 0, sax: 0, climb: 0, run: 0, pull: 0 }
  if (type === 'rest' || type === 'travel' || dow === 0 || dow === 6) return zero
  const b1 = blocks.some(t => t === 'Piano block 1' || t === 'Piano (light)')
  const gym = type === 'full'
  const mwf = dow === 1 || dow === 3 || dow === 5, tue = dow === 2
  return {
    lesson: b1 ? 1 : 0, technique: b1 && type !== 'light' ? 1 : 0, standard: b1 ? 1 : 0,
    sax: blocks.some(t => t.startsWith('Sax')) ? 1 : 0,
    climb: gym && mwf ? 1 : 0, run: gym && tue ? 1 : 0, pull: gym && (tue || dow === 5) ? 1 : 0,
  }
}

export type Allocation = Record<string, QItem[]>
/** Walk the calendar from `from`, handing out undone items per lane. Past days show what was actually done. */
export function project(user: UserData, from = today()): { alloc: Allocation; dateOf: Record<string, string>; remaining: Record<Lane, number> } {
  const done = user.queueDone ?? {}, skip = new Set(user.queueSkip ?? [])
  const alloc: Allocation = {}, dateOf: Record<string, string> = {}
  for (const [id, d] of Object.entries(done)) { const it = byId(id); if (it) { (alloc[d] ??= []).push(it); dateOf[id] = d } }
  const lanes: Record<Kind, QItem[]> = { lesson: [], technique: [], standard: [], sax: [], climb: [], run: [], pull: [] }
  for (const x of MASTER) if (!done[x.id] && !skip.has(x.id)) lanes[x.kind].push(x)
  const start = from < START ? START : from
  for (let d = start; d <= END; d = key(addDays(parse(d), 1))) {
    if (!Object.values(lanes).some(l => l.length)) break
    const type = dayTypeFor(user, d, from)
    const skipped = new Set(user.practice[d]?.skipped ?? [])
    const blocks = blocksForType(d, type, startFor(user, d), user).map(b => b.title).filter(t => !skipped.has(t))
    const cap = capacity(type, parse(d).getDay(), blocks)
    const pulled = user.practice[d]?.pulled ?? []
    for (const kind of Object.keys(lanes) as Kind[]) {
      let n = cap[kind] + (d === from ? pulled.filter(id => byId(id)?.kind === kind).length : 0)
      while (n-- > 0 && lanes[kind].length) { const it = lanes[kind].shift()!; (alloc[d] ??= []).push(it); dateOf[it.id] = d }
    }
  }
  return { alloc, dateOf, remaining: { piano: lanes.lesson.length + lanes.technique.length + lanes.standard.length, sax: lanes.sax.length, workout: lanes.climb.length + lanes.run.length + lanes.pull.length } }
}

/** The tune you're on: the first standard step not yet done. */
export const currentTune = (user: UserData) => MASTER.find(x => x.kind === 'standard' && !user.queueDone?.[x.id] && !(user.queueSkip ?? []).includes(x.id))?.tune
/** Next undone item in a lane that isn't already on the day. */
export const nextIn = (user: UserData, lane: Lane, exclude: Set<string>) => MASTER.find(x => x.lane === lane && !user.queueDone?.[x.id] && !(user.queueSkip ?? []).includes(x.id) && !exclude.has(x.id))
/** Progress per lane. */
export const laneProgress = (user: UserData, lane: Lane) => { const all = MASTER.filter(x => x.lane === lane); return { done: all.filter(x => user.queueDone?.[x.id]).length, total: all.length } }

/** Progress + ETA for a lane: % done, items/day so far, and the date the projection finishes (or how far past Dec 23 it runs). */
export function laneEta(user: UserData, lane: Lane, projected = project(user)) {
  const all = MASTER.filter(x => x.lane === lane && !(user.queueSkip ?? []).includes(x.id))
  const done = all.filter(x => user.queueDone?.[x.id]).length
  const total = all.length
  const pct = total ? Math.round((done / total) * 100) : 0
  const last = all.filter(x => !user.queueDone?.[x.id]).map(x => projected.dateOf[x.id]).filter(Boolean).sort().pop()
  const short = projected.remaining[lane]
  // pace: items done per practice day since the sabbatical started (days with capacity in this lane)
  const real = today()
  let practiceDays = 0
  for (let d = START; d < real && d <= END; d = key(addDays(parse(d), 1))) {
    const type = dayTypeFor(user, d, real)
    const blocks = blocksForType(d, type, startFor(user, d), user).map(b => b.title)
    const cap = capacity(type, parse(d).getDay(), blocks)
    const laneCap = lane === 'piano' ? cap.lesson + cap.technique + cap.standard : lane === 'sax' ? cap.sax : cap.climb + cap.run + cap.pull
    if (laneCap > 0) practiceDays++
  }
  const pace = practiceDays ? Math.round((done / practiceDays) * 10) / 10 : null
  return { done, total, pct, pace, practiceDays, eta: short ? null : last, short }
}
