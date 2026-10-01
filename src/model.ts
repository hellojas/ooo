import { programs, trips, phases, courses, dayByDay } from './data'
import { addDays, key, parse, weekNo, weekStart, START, END } from './dates'
import { span } from './time'
import type { Program, UserData } from './types'

let taipeiStart: string | undefined
export const setTaipeiStart = (d?: string) => { taipeiStart = d || undefined }
export const effTrips = () => trips.map(t => t.name.startsWith('Taipei') && taipeiStart ? { ...t, from: taipeiStart } : t)
export const tripOn = (k: string, off: string[] = []) =>
  effTrips().find(t => k >= t.from && k <= t.to && !off.includes(t.name))

export interface Filters { on: Set<string>; travel: boolean }

export const GROUPS: { label: string; ids: string[]; group: string }[] = []
export const inPlan = (p: Program) => p.plan

export type PState = 'considering' | 'planned' | 'registered'
/** Where a program stands: considering (comparison only), planned (on the calendar, outlined), registered (solid). */
export const stateOf = (p: Program, user: UserData): PState =>
  user.settings.programState?.[p.id] ?? (user.settings.confirmed?.includes(p.id) ? 'registered' : p.kind !== 'inperson' || p.plan ? 'planned' : 'considering')

/** Items scheduled on a date, split by whether they're missed because of travel. */
export function itemsOn(k: string, user: UserData, pool: Program[] = programs, showConsidering = false) {
  const trip = tripOn(k, user.settings.tripsOff)
  const out: { p: Program; missed: boolean; maybe: boolean; state: PState }[] = []
  for (const p of pool) {
    if (!p.dates.includes(k)) continue
    if (user.settings.hiddenItems.includes(p.id)) continue
    if (trip && p.kind !== 'inperson') continue // life items are hidden on trips
    const state = stateOf(p, user)
    if (state === 'considering' && !showConsidering) continue
    out.push({ p, missed: !!trip, maybe: !!p.uncertain?.includes(k), state })
  }
  return out
}

export const attKey = (id: string, k: string) => `${id}|${k}`

export const sessionsAttendable = (p: Program, user: UserData) => {
  const inWin = p.dates.filter(d => d >= START && d <= END)
  return { ok: inWin.filter(d => !tripOn(d, user.settings.tripsOff)).length, total: inWin.length }
}

export const phasesForWeek = (n: number) => phases.filter(x => n >= x.wk[0] && n <= x.wk[1])
export const coursesForWeek = (n: number) => courses.filter(c => n >= c.wk[0] && n <= c.wk[1])
export const videosOn = (k: string) => dayByDay.filter(v => v.date === k)

/** All calendar days in a month, padded to Sunday-start weeks. */
export function monthWeeks(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1)
  const days = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = Array(first.getDay()).fill(null)
  for (let d = 1; d <= days; d++) cells.push(key(new Date(year, month, d)))
  while (cells.length % 7) cells.push(null)
  const weeks: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export const isoWeekday = (k: string) => parse(k).getDay()
export { weekNo }

export function progress(user: UserData, wk: number) {
  const fromQueue = new Set<string>()
  for (const [id, d] of Object.entries(user.queueDone ?? {})) if (/^s\d+\.4$/.test(id) && d) fromQueue.add(id.split('.')[0])
  const standards = Math.max(fromQueue.size, Object.values(user.weekly).filter(w => w.recordedStandard).length)
  const maxes = Object.entries(user.weekly).filter(([, w]) => w.pullupMax != null).sort(([a], [b]) => Number(a) - Number(b)).map(([, w]) => w.pullupMax as number)
  let c25k = ''
  for (const [d, r] of Object.entries(user.running).sort(([a], [b]) => a.localeCompare(b))) if (r.done) c25k = phasesForWeek(weekNo(d)).find(x => x.prog === 'c25k')?.short ?? c25k
  const t = weekTotals(user, wk)
  return { standards, climbs: t.climbs, maxes, c25k, piano: t.piano }
}

export interface Block { start: number; end: number; title: string; note?: string }
const H = (h: number, m = 0) => h * 60 + m
/** The daily template from docs/plan.md (Mon–Fri practice blocks, weekend rows). */
const BASE_START = '09:30' // the template below is written for a 9:30 start
export const DEFAULT_START = '10:00'
export const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0) }
/** Start time for a day: that date's override, else the weekday default from Configure, else the global default. */
export const defaultStartFor = (user: UserData, k: string) => user.settings.startTimes?.[parse(k).getDay()] || user.settings.startTime || DEFAULT_START
export const startFor = (user: UserData, k: string) => user.practice[k]?.startTime || defaultStartFor(user, k)
export const READ_MIN = 90
/** Make blocks start the week after the SF/Toronto trip: settle in with piano and classes first. */
export const MAKE_FROM = '2026-10-12'
/** Session lengths you can pick for a day. 0 = no piano today. */
export const PLAN_CHOICES: { min: number; label: string; hint: string }[] = [
  { min: 0, label: 'Off', hint: 'No piano today. The queue waits.' },
  { min: 20, label: 'Tiny', hint: '20 min. Enough.' },
  { min: 45, label: '45', hint: 'The tune and one thing.' },
  { min: 90, label: '90', hint: 'A real session.' },
  { min: 120, label: '2h', hint: 'The full morning block.' },
  { min: 180, label: '3h', hint: 'Two blocks: curriculum, then ear + arrangement.' },
]
/** Planned piano minutes for a date: what you picked, else what the day type suggests. */
export function planMinutes(user: UserData | undefined, k: string, type: DayType): number {
  const set = user?.practice[k]?.plan
  if (set != null) return set
  if (type === 'rest' || type === 'travel') return 0
  if (type === 'light') return user?.settings.lightMinutes ?? 60
  return 120
}
/** When a session happens on a date. Classes keep their listed time; the reading morning opens the day at your start time (90 min). */
export function itemSpan(p: Program, user: UserData, k: string): [number, number] | null {
  if (p.kind === 'read') { const st = toMin(startFor(user, k)); return [st, st + READ_MIN] }
  return span(p.time)
}
/** Minutes the practice blocks move back on a date: the reading morning goes first. */
export const morningShift = (user: UserData | undefined, k: string) => user && itemsOn(k, user).some(x => x.p.kind === 'read' && !x.missed) ? READ_MIN : 0
export function blocksOn(k: string, startTime = DEFAULT_START): Block[] {
  const dow = parse(k).getDay()
  const shift = toMin(startTime) - toMin(BASE_START)
  const moved = (bs: Block[]) => bs.map(b => ({ ...b, start: b.start + shift, end: b.end + shift }))
  if (dow >= 1 && dow <= 5) return moved([
    { start: H(9, 30), end: H(10), title: 'Sax', note: 'long tones + breathing; wk 4+ the week’s standard head' },
    { start: H(10), end: H(12), title: 'Piano block 1', note: 'technique/voicings (45) + standard of the week (75)' },
    { start: H(13, 30), end: H(15), title: 'Piano block 2', note: 'Ear training lives here: transcription (60) + arrangement (30)' },
    { start: H(15, 30), end: H(17, 30), title: 'Gym slot' },
  ])
  if (dow === 0) return [{ start: H(17), end: H(17, 30), title: 'Weekly review (30 min)', note: 'record the standard + arrangement, one fix, next song' }]
  return []
}
export const fmtMin = (m: number) => { const h = Math.floor(m / 60), mm = m % 60; return `${((h + 11) % 12) + 1}${mm ? ':' + String(mm).padStart(2, '0') : ''}${h < 12 ? 'a' : 'p'}` }

/** One-line prescriptions to show under a session for the given week. */
export function hintFor(id: string, wk: number, dow: number): string | undefined {
  const ph = (prog: string) => phasesForWeek(wk).find(x => x.prog === prog)
  if (id === 'run' || id === 'run2') return [ph('c25k') && `${ph('c25k')!.short}: ${ph('c25k')!.text}`, ph('pull') && `Pull-ups: ${ph('pull')!.text}`].filter(Boolean).join(' · ')
  if (id === 'climb' || id === 'climbLES') return [ph('v8') && `${ph('v8')!.short}: ${ph('v8')!.text}`, dow === 5 && ph('pull') ? `+ pull-ups after` : ''].filter(Boolean).join(' · ')
}

export const MILESTONES: { wk: number; items: string[] }[] = [
  { wk: 3, items: ['3 standards memorized w/ rootless voicings', '8+ pop songs transcribed and functionally labeled', '15 consecutive sax days', 'Finger assessed'] },
  { wk: 6, items: ['6 standards', 'Chord-tone solo at tempo on any', '3 finished arrangements', 'Back on purples', '30-min run'] },
  { wk: 10, items: ['10 standards', 'New top-40 song → chords + playable arrangement in 30 min', 'First V8 attempts', '10+ pull-ups or +20 lb × 5', '40-min run (or C25K wk 7–8 at two runs a week)'] },
]

export const WEEK_TEMPLATE: { day: string; items: { t: string; c?: string; opt?: boolean }[] }[] = [
  { day: 'Mon', items: [{ t: 'sax · piano · lunch · piano (from your start time)' }, { t: 'Climb BK 3:30p', c: 'climb' }, { t: 'BKCM Piano Lab 8–9p', c: 'bkcm', opt: true }] },
  { day: 'Tue', items: [{ t: 'Coffee shop + read (first thing)', c: 'coffee' }, { t: 'sax · piano · piano' }, { t: 'Run + pull-ups', c: 'run' }, { t: 'BH free jam 2–6p (some weeks)', c: 'bhTue', opt: true }, { t: 'Kaufman Harmony 5:30–7p', c: 'kaufTue' }] },
  { day: 'Wed', items: [{ t: 'sax · piano · piano' }, { t: 'Climb BK 3:30p', c: 'climb' }, { t: 'NYJW Songbook 8–10p (optional)', c: 'nyjwSong', opt: true }] },
  { day: 'Thu', items: [{ t: 'sax · piano · piano' }, { t: 'Climb LES 4:30–6:30p (optional 4th)', c: 'climbLES', opt: true }, { t: 'Kaufman Blues Jam 7–9p', c: 'kaufThu' }] },
  { day: 'Fri', items: [{ t: 'Coffee shop + read (first thing)', c: 'coffee' }, { t: 'sax · piano · piano' }, { t: 'Climb BK 3:30p + pull-ups', c: 'climb' }, { t: 'Free evening' }] },
  { day: 'Sat', items: [{ t: 'Badminton 10a, every other week', c: 'badm', opt: true }, { t: 'NYJW Standards 2–4p', c: 'nyjwStd' }, { t: 'Intro Improv 4–6p (optional)', c: 'nyjwImp', opt: true }] },
  { day: 'Sun', items: [{ t: 'Quick run 10a (optional 2nd)', c: 'run2', opt: true }, { t: 'Weekly review · record' }, { t: 'Barry Harris 6–10p', c: 'bhSun' }] },
]

export type TargetId = 'sax' | 'piano' | 'make' | 'climbs' | 'runs' | 'pullups' | 'reading'
/** Weekly guidelines (from docs/plan.md): rough minutes for music, sessions/reps for the rest. Editable in Configure. */
export const WEEKLY_METRICS: { id: TargetId; label: string; unit: 'min' | 'sessions' | 'reps'; def: number; note: string }[] = [
  { id: 'piano', label: 'Piano', unit: 'min', def: 600, note: '≈2 h × 5 days; 3 h on the days you want' },
  { id: 'make', label: 'Make', unit: 'min', def: 360, note: 'projects, dev, papers · ≈4 × 90 min' },
  { id: 'sax', label: 'Sax', unit: 'min', def: 150, note: '15–30 min a day' },
  { id: 'climbs', label: 'Climbing', unit: 'sessions', def: 3, note: '3 floor, 4 ceiling' },
  { id: 'runs', label: 'Runs', unit: 'sessions', def: 2, note: 'Tue fixed, Sun optional' },
  { id: 'pullups', label: 'Pull-ups', unit: 'reps', def: 75, note: '≈3 sessions of 5×5' },
  { id: 'reading', label: 'Coffee + reading', unit: 'sessions', def: 2, note: 'Tue + Fri mornings' },
]

const attendedDays = (user: UserData, ids: string[], wk: number) => {
  const days = new Set<string>()
  for (const [a, v] of Object.entries(user.attendance)) { const [id, d] = a.split('|'); if (v === 'went' && ids.includes(id) && weekNo(d) === wk) days.add(d) }
  return days
}
export const climbDays = (user: UserData, wk: number) => {
  const days = attendedDays(user, ['climb', 'climbLES'], wk)
  for (const [d, c] of Object.entries(user.climbing)) if (weekNo(d) === wk && c.done) days.add(d)
  return days.size
}
export const runDays = (user: UserData, wk: number) => {
  const days = attendedDays(user, ['run', 'run2'], wk)
  for (const [d, r] of Object.entries(user.running)) if (weekNo(d) === wk && r.done) days.add(d)
  return days.size
}
export const pullReps = (u: { reps?: number; sets?: { reps: number }[] } | undefined) => u ? (u.reps ?? 0) + (u.sets ?? []).reduce((n, x) => n + x.reps, 0) : 0

export function weekTotals(user: UserData, wk: number): Record<TargetId, number> {
  const t: Record<TargetId, number> = { sax: 0, piano: 0, make: 0, climbs: climbDays(user, wk), runs: runDays(user, wk), pullups: 0, reading: attendedDays(user, ['coffee'], wk).size }
  for (const [d, p] of Object.entries(user.practice)) if (weekNo(d) === wk) { t.sax += p.sax ?? 0; t.piano += (p.piano1 ?? 0) + (p.piano2 ?? 0); t.make += p.make ?? 0 }
  for (const [d, u] of Object.entries(user.pullups)) if (weekNo(d) === wk) t.pullups += pullReps(u)
  return t
}

/** Days in week `wk` (Sun–Sat) inside the sabbatical, not lost to a trip; `from` limits to days on/after that date. */
export function freeDays(user: UserData, wk: number, from?: string): number {
  let n = 0
  for (let i = 0; i < 7; i++) {
    const k = key(addDays(parse(weekStart(wk)), i))
    if (k < START || k > END || (from && k < from) || tripOn(k, user.settings.tripsOff)) continue
    n++
  }
  return n
}

const hasMusic = (user: UserData, k: string) => ((user.practice[k]?.piano1 ?? 0) + (user.practice[k]?.piano2 ?? 0) + (user.practice[k]?.sax ?? 0)) > 0
/** Minutes logged on a date per lane, plus whether the gym happened. */
export const loggedOn = (user: UserData, k: string) => { const p = user.practice[k] ?? {}; return { sax: p.sax ?? 0, piano: (p.piano1 ?? 0) + (p.piano2 ?? 0), make: p.make ?? 0, gym: !!(user.climbing[k]?.done || user.running[k]?.done) } }
/** Consecutive music days ending at `upTo` (today not yet logged doesn't break it); travel days neither count nor break. */
export function streak(user: UserData, upTo: string): { days: number; thisWeek: number } {
  let days = 0, k = upTo > END ? END : upTo
  if (!hasMusic(user, k)) k = key(addDays(parse(k), -1))
  for (; k >= START; k = key(addDays(parse(k), -1))) {
    if (tripOn(k, user.settings.tripsOff)) continue
    if (!hasMusic(user, k)) break
    days++
  }
  const wk = weekNo(upTo)
  let thisWeek = 0
  for (let i = 0; i < 7; i++) { const d = key(addDays(parse(weekStart(wk)), i)); if (hasMusic(user, d)) thisWeek++ }
  return { days, thisWeek }
}

export type DayType = 'full' | 'class' | 'light' | 'travel' | 'rest'
export const DAY_TYPES: { id: DayType; label: string; hint: string }[] = [
  { id: 'full', label: 'Full', hint: 'The whole practice day.' },
  { id: 'class', label: 'Class', hint: 'Morning practice, then class. Afternoon block drops.' },
  { id: 'light', label: 'Light', hint: 'The current tune and one enjoyable run-through. Length is yours.' },
  { id: 'travel', label: 'Travel', hint: 'Nothing reserved. A suggestion, if you feel like it.' },
  { id: 'rest', label: 'Rest', hint: 'Nothing planned. That’s part of the plan.' },
]
const travelMin = (go?: string) => Number(go?.match(/~?(\d+)\s*min/)?.[1] ?? 0)
/** Rough minutes between venues (both directions). Falls back to 30 min for an unknown pair, home→venue uses the program's own estimate. */
const BETWEEN: Record<string, number> = {
  'bhTue|kaufTue': 20, 'bhTue|kaufThu': 20, 'nyjwStd|nyjwImp': 0, 'nyjwStd|nyjwSong': 0, 'bhSun|kaufTue': 5, 'nyjwStd|bhSun': 25, 'climbLES|kaufThu': 30, 'badm|nyjwStd': 35,
}
const between = (a: string, b: string) => BETWEEN[`${a}|${b}`] ?? BETWEEN[`${b}|${a}`] ?? 30
/** Classes you're attending on a date (planned/registered, not lost to travel), with your attendance window and travel time.
 *  Travel is chained: from home for the first, from the previous venue for the rest. */
export function classWindows(user: UserData, k: string) {
  const list = itemsOn(k, user).filter(x => x.p.kind === 'inperson' && !x.missed).map(x => {
    const t = span(x.p.time); if (!t) return null
    const until = user.practice[k]?.until?.[x.p.id] ?? user.settings.visitUntil?.[x.p.id] ?? t[1]
    return { p: x.p, start: t[0], end: until }
  }).filter(Boolean) as { p: Program; start: number; end: number }[]
  list.sort((a, b) => a.start - b.start)
  return list.map((c, i) => {
    const prev = list[i - 1]
    const lead = prev && prev.end <= c.start ? between(prev.p.id, c.p.id) : travelMin(c.p.go)
    return { ...c, from: c.start - lead, to: c.end + travelMin(c.p.go), fromWhere: prev && prev.end <= c.start ? prev.p.short : 'home', lead }
  })
}
/** The app decides the day. Rules, in order: trip → Travel; weekend → Rest (Sunday keeps the review);
 *  a class before 5:30 → Class; yesterday missed, or body said tired/sore → Light; 5 practice days in a row → Light; else Full.
 *  A per-date override (set in Review's week setup) wins over all of it. */
export function dayTypeWhy(user: UserData, k: string, real: string): { type: DayType; why: string } {
  const set = user.practice[k]?.dayType
  if (set) return { type: set, why: 'set by you' }
  const trip = tripOn(k, user.settings.tripsOff)
  if (trip) return { type: 'travel', why: trip.name }
  const dow = parse(k).getDay()
  if (dow === 0) return { type: 'rest', why: 'Sunday · review + record' }
  if (dow === 6) return { type: 'rest', why: 'Saturday' }
  const prev = key(addDays(parse(k), -1))
  const pp = user.practice[prev]
  // Only an explicit “skipped today” counts as a miss. An empty log is unknown, not a miss.
  if (k <= real && prev >= START && pp?.skippedDay && !tripOn(prev, user.settings.tripsOff)) return { type: 'light', why: 'you skipped yesterday — never miss twice' }
  let run = 0
  for (let d = prev; d >= START && run < 6; d = key(addDays(parse(d), -1))) {
    const dd = parse(d).getDay()
    if (dd === 0 || dd === 6 || tripOn(d, user.settings.tripsOff) || user.practice[d]?.dayType === 'rest') continue   // skip non-practice days
    if (!hasMusic(user, d)) break
    run++
  }
  if (run >= 5) return { type: 'light', why: `${run} practice days in a row — take it easy` }
  if (classWindows(user, k).some(c => c.from < H(17, 30))) return { type: 'class', why: 'class this afternoon' }
  return { type: 'full', why: 'a normal practice day' }
}
export const dayTypeFor = (user: UserData, k: string, real: string): DayType => dayTypeWhy(user, k, real).type

/** Blocks for a day given its type, with per-block overrides (moved / shortened) applied. */
export function blocksForType(k: string, type: DayType, startTime: string, user?: UserData): Block[] {
  const dow = parse(k).getDay()
  const st = toMin(startTime) + morningShift(user, k)
  let bs: Block[] = []
  if (type === 'rest' || type === 'travel') bs = []
  else if (dow === 0) bs = blocksOn(k, startTime)
  else if (dow === 6) bs = []
  else {
    const m = planMinutes(user, k, type)
    const gym = type === 'full'
    const make = k >= MAKE_FROM ? (type === 'class' ? 60 : 90) : 0   // the Make block: projects, dev, papers
    bs.push({ start: st, end: st + 30, title: 'Sax', note: 'long tones + breathing; wk 4+ the week’s standard head' })
    let t = st + 30
    if (m > 0) {
      const b1 = Math.min(m, 120)
      bs.push({ start: t, end: t + b1, title: 'Piano block 1', note: m <= 20 ? 'tiny piano — enough for today' : 'curriculum: technique, lesson, the tune' }); t += b1 + 60
      if (m > 120) { bs.push({ start: t, end: t + (m - 120), title: 'Piano block 2', note: 'Ear training lives here: transcription (60) + arrangement (30)' }); t += m - 120 + 30 }
    }
    if (make) { bs.push({ start: t, end: t + make, title: 'Make', note: 'projects · dev · a paper' }); t += make + 30 }
    if (gym) bs.push({ start: t, end: t + 120, title: 'Gym slot' })
  }
  const ov = user?.practice[k]?.blocks
  if (ov) bs = bs.map(b => ov[b.title] ? { ...b, start: ov[b.title].start ?? b.start, end: ov[b.title].end ?? b.end } : b)
  for (const a of user?.practice[k]?.added ?? []) bs.push({ title: a.title, start: a.start, end: a.end, note: 'added' })
  return bs.sort((a, b) => a.start - b.start)
}
/** Earliest slot of the block's length that doesn't hit a class window, after `after`. */
export function freeSlot(user: UserData, k: string, len: number, after: number): number {
  const wins = classWindows(user, k).sort((a, b) => a.from - b.from)
  let t = after
  for (const w of wins) { if (t + len <= w.from) break; if (t < w.to) t = w.to }
  return t
}

/** The last seven days as practice dots, plus how many days since the piano was last touched. */
export function rhythm(user: UserData, real: string) {
  const days = Array.from({ length: 7 }, (_, i) => key(addDays(parse(real), i - 6)))
  const dots = days.map(d => ({ d, on: hasMusic(user, d) || Object.values(user.queueDone ?? {}).includes(d) }))
  let quiet = 0
  for (let d = key(addDays(parse(real), -1)); d >= START && quiet < 30; d = key(addDays(parse(d), -1))) { if (hasMusic(user, d) || Object.values(user.queueDone ?? {}).includes(d)) break; quiet++ }
  return { dots, quiet, sessions: dots.filter(x => x.on).length }
}
/** The understated nudge. Nothing for the first two quiet days; then one calm sentence. */
export function nudge(user: UserData, real: string, type: DayType, next?: string): string | null {
  if (type === 'travel' || real < START || real > END) return null
  const { quiet } = rhythm(user, real)
  if (!Object.keys(user.practice).some(d => d < real && hasMusic(user, d)) && !Object.values(user.queueDone ?? {}).some(d => d < real)) return null   // nothing to come back to yet
  if (quiet >= 5) return `It’s been ${quiet} days. A little rust is starting; a tiny session is enough.`
  if (quiet >= 3) return `It’s been ${quiet} days. ${next ? next + ' is' : 'Your current work is'} still warm — today would be a good day to come back.`
  return null
}
