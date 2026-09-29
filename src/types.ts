export type Kind = 'inperson' | 'abs' | 'read'
export interface Program {
  id: string; kind: Kind; name: string; short: string; time: string
  dates: string[]; url?: string; loc?: string; go?: string
  plan?: boolean; planOpt?: boolean; drop?: boolean; uncertain?: string[]
}
export interface Course { id: string; url: string; name: string; short: string; wk: [number, number]; hrs: string; feeds: string }
export interface DayVideo { date: string; course: string; what: string; pdf?: string }
export interface Phase { id: string; prog: string; short: string; wk: [number, number]; text: string }
export interface PhaseProgram { id: string; name: string; goal: string; rows: string[][] }
export interface Trip { name: string; from: string; to: string; tentative: boolean }
export interface Shop { n: string; a: string; w: string; why: string; tags: string[]; u: string; nb?: string }
export interface Lunch { n: string; a: string; nb: string; note: string; u: string }

export type Attendance = 'went' | 'missed' | 'skipped'
export interface UserData {
  settings: { taipeiStart?: string; hiddenItems: string[]; tripsOff: string[]; targets?: Partial<Record<'sax'|'piano'|'transcribe'|'arrange'|'climbs'|'runs'|'pullups'|'reading', number>>; startTime?: string; startTimes?: Record<number, string>; confirmed?: string[]; programState?: Record<string, 'considering' | 'planned' | 'registered'> }
  attendance: Record<string, Attendance>            // `${programId}|${date}`
  practice: Record<string, Partial<Record<'sax'|'piano1'|'piano2'|'transcribe'|'arrange', number>> & {
    notes?: string; tasks?: string[]; dayType?: 'full' | 'floor' | 'travel' | 'rest'; skipped?: string[]; startTime?: string; feel?: 'fresh' | 'ok' | 'tired' | 'sore'; standardOfWeek?: string; songTranscribed?: string }>
  climbing: Record<string, { done?: boolean; gym?: 'BK'|'LES'; sessionType?: 'volume'|'limit'; sends?: { grade: string; style: string }[]; fingerFeel?: number; notes?: string }>
  running: Record<string, { done?: boolean; minutes?: number; c25kWeek?: number; felt?: string }>
  pullups: Record<string, { reps?: number; sets?: { reps: number; weightLb: number }[]; maxTest?: number }>
  coffee: Record<string, { visited?: boolean; date?: string; rating?: number; note?: string }>
  customShops: Shop[]
  tunes: Record<string, Tune>
  transcriptions: Transcription[]
  weekly: Record<string, { recordedStandard?: boolean; recordedArrangement?: boolean; review?: string; improved?: string; standard?: string; recordingUrl?: string; pullupMax?: number; milestones?: string[] }>
}
export interface Tune { checks: string[]; recordingUrl?: string; last?: string }
export interface Transcription { id: string; date: string; song: string; note: string }
export const emptyUser = (): UserData => ({
  settings: { hiddenItems: [], tripsOff: [] },
  attendance: {}, practice: {}, climbing: {}, running: {}, pullups: {}, coffee: {}, customShops: [], tunes: {}, transcriptions: [], weekly: {},
})
