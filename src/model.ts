import { programs, trips, phases, courses, dayByDay } from './data'
import { key, parse, weekNo, START, END } from './dates'
import type { Program, UserData } from './types'

let taipeiStart: string | undefined
export const setTaipeiStart = (d?: string) => { taipeiStart = d || undefined }
export const effTrips = () => trips.map(t => t.name.startsWith('Taipei') && taipeiStart ? { ...t, from: taipeiStart } : t)
export const tripOn = (k: string, off: string[] = []) =>
  effTrips().find(t => k >= t.from && k <= t.to && !off.includes(t.name))

export interface Filters { on: Set<string>; travel: boolean }

export const GROUPS: { label: string; ids: string[]; group: string }[] = []
export const inPlan = (p: Program) => p.plan

/** Items scheduled on a date, split by whether they're missed because of travel. */
export function itemsOn(k: string, user: UserData, pool: Program[] = programs) {
  const trip = tripOn(k, user.settings.tripsOff)
  const out: { p: Program; missed: boolean; maybe: boolean }[] = []
  for (const p of pool) {
    if (!p.dates.includes(k)) continue
    if (user.settings.hiddenItems.includes(p.id)) continue
    if (trip && p.kind !== 'inperson') continue // life items are hidden on trips
    out.push({ p, missed: !!trip, maybe: !!p.uncertain?.includes(k) })
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

export const climbDays = (user: UserData, wk: number) => {
  const days = new Set<string>()
  for (const [d, c] of Object.entries(user.climbing)) if (weekNo(d) === wk && (c.sessionType || c.sends?.length || c.fingerFeel)) days.add(d)
  for (const [a, v] of Object.entries(user.attendance)) {
    const [id, d] = a.split('|'); if (v === 'went' && (id === 'climb' || id === 'climbLES') && weekNo(d) === wk) days.add(d)
  }
  return days.size
}

export function progress(user: UserData, wk: number) {
  const standards = Object.values(user.weekly).filter(w => w.recordedStandard).length
  const songs = Object.values(user.practice).filter(p => p.songTranscribed?.trim()).length
  const maxes = Object.entries(user.pullups).filter(([, v]) => v.maxTest != null).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v.maxTest as number)
  const c25k = Math.max(0, ...Object.values(user.running).map(r => r.c25kWeek ?? 0))
  const sax = Object.values(user.practice).filter(p => (p.sax ?? 0) > 0).length
  return { standards, songs, climbs: climbDays(user, wk), maxes, c25k, sax }
}

export interface Block { start: number; end: number; title: string; note?: string }
const H = (h: number, m = 0) => h * 60 + m
/** The daily template from docs/plan.md (Mon–Fri practice blocks, weekend rows). */
export function blocksOn(k: string): Block[] {
  const dow = parse(k).getDay()
  if (dow >= 1 && dow <= 5) return [
    { start: H(9, 30), end: H(10), title: 'Sax', note: 'long tones + breathing; wk 4+ the week’s standard head' },
    { start: H(10), end: H(12), title: 'Piano block 1', note: 'technique/voicings (45) + standard of the week (75)' },
    { start: H(12), end: H(13, 30), title: 'Lunch + walk' },
    { start: H(13, 30), end: H(15), title: 'Piano block 2', note: 'ear/transcription (60) + arrangement (30)' },
    { start: H(15, 30), end: H(17, 30), title: 'Gym slot' },
  ]
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
  { day: 'Mon', items: [{ t: '9:30 sax · 10–12 piano · 1:30–3 piano' }, { t: 'Climb BK 3:30p', c: 'climb' }, { t: 'BKCM Piano Lab 8–9p', c: 'bkcm', opt: true }] },
  { day: 'Tue', items: [{ t: 'Coffee shop + read 8a', c: 'coffee' }, { t: 'sax · piano · piano' }, { t: 'Run + pull-ups', c: 'run' }, { t: 'BH free jam 2–6p (some weeks)', c: 'bhTue', opt: true }, { t: 'Kaufman Harmony 5:30–7p', c: 'kaufTue' }] },
  { day: 'Wed', items: [{ t: 'sax · piano · piano' }, { t: 'Climb BK 3:30p', c: 'climb' }, { t: 'NYJW Songbook 8–10p (optional)', c: 'nyjwSong', opt: true }] },
  { day: 'Thu', items: [{ t: 'sax · piano · piano' }, { t: 'Climb LES 4:30–6:30p (optional 4th)', c: 'climbLES', opt: true }, { t: 'Kaufman Blues Jam 7–9p', c: 'kaufThu' }] },
  { day: 'Fri', items: [{ t: 'Coffee shop + read 8a', c: 'coffee' }, { t: 'sax · piano · piano' }, { t: 'Climb BK 3:30p + pull-ups', c: 'climb' }, { t: 'Free evening' }] },
  { day: 'Sat', items: [{ t: 'Badminton 10a, every other week', c: 'badm', opt: true }, { t: 'NYJW Standards 2–4p', c: 'nyjwStd' }, { t: 'Intro Improv 4–6p (optional)', c: 'nyjwImp', opt: true }] },
  { day: 'Sun', items: [{ t: 'Quick run 10a (optional 2nd)', c: 'run2', opt: true }, { t: 'Weekly review · record' }, { t: 'Barry Harris 6–10p', c: 'bhSun' }] },
]

export const DEFAULT_TARGETS = { sax: 30, piano: 210 }
