import { programs, trips, phases, courses, dayByDay } from './data'
import { key, parse, weekNo, START, END } from './dates'
import type { Program, UserData } from './types'

export const tripOn = (k: string, off: string[] = []) =>
  trips.find(t => k >= t.from && k <= t.to && !off.includes(t.name))

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

export function progress(user: UserData, wk: number) {
  const weeks = Object.entries(user.weekly)
  const standards = weeks.filter(([, w]) => w.recordedStandard).length
  const songs = Object.values(user.practice).filter(p => p.songTranscribed).length
  const inWeek = (k: string) => weekNo(k) === wk
  const climbs = Object.entries(user.attendance).filter(([a, v]) => {
    const [id, d] = a.split('|'); return v === 'went' && (id === 'climb' || id === 'climbLES') && inWeek(d)
  }).length + Object.keys(user.climbing).filter(d => inWeek(d) && !Object.keys(user.attendance).some(a => a === `climb|${d}` || a === `climbLES|${d}`)).length
  const maxes = Object.entries(user.pullups).filter(([, v]) => v.maxTest != null).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v.maxTest as number)
  const c25k = Math.max(0, ...Object.values(user.running).map(r => r.c25kWeek ?? 0))
  return { standards, songs, climbs, maxes, c25k }
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

export const PRACTICE_BLOCKS = [
  { id: 'sax', label: 'Sax', target: 30 },
  { id: 'piano1', label: 'Piano 1', target: 120 },
  { id: 'piano2', label: 'Piano 2', target: 90 },
] as const
