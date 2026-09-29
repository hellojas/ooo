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
export interface Shop { n: string; a: string; w: string; why: string; tags: string[]; u: string }

export type Attendance = 'went' | 'missed' | 'skipped'
export interface UserData {
  settings: { taipeiStart?: string; hiddenItems: string[]; tripsOff: string[] }
  attendance: Record<string, Attendance>            // `${programId}|${date}`
  practice: Record<string, Partial<Record<'sax'|'piano1'|'piano2'|'transcribe'|'arrange', number>> & {
    notes?: string; standardOfWeek?: string; songTranscribed?: string }>
  climbing: Record<string, { gym?: 'BK'|'LES'; sessionType?: 'volume'|'limit'; sends?: { grade: string; style: string }[]; fingerFeel?: number; notes?: string }>
  running: Record<string, { minutes?: number; c25kWeek?: number; felt?: string }>
  pullups: Record<string, { sets?: { reps: number; weightLb: number }[]; maxTest?: number }>
  coffee: Record<string, { visited?: boolean; date?: string; rating?: number; note?: string }>
  customShops: Shop[]
  weekly: Record<string, { recordedStandard?: boolean; recordedArrangement?: boolean; review?: string; standard?: string; recordingUrl?: string; milestones?: string[] }>
}
export const emptyUser = (): UserData => ({
  settings: { hiddenItems: [], tripsOff: [] },
  attendance: {}, practice: {}, climbing: {}, running: {}, pullups: {}, coffee: {}, customShops: [], weekly: {},
})
