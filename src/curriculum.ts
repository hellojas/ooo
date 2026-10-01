import graph from '../data/curriculum-graph.json'
import type { UserData } from './types'

/** The reference graph (data/curriculum-graph.json): goals, pass criteria and smaller-scope recipes per skill. The queue stays the spine; items borrow from matching nodes. */
export interface Node { id: string; track: string; title: string; goal: string; practice_recipe: string[]; mastery_tests: string[]; remediation: string[]; suggested_minutes: number; maintenance_interval_days: number }
export const NODES: Record<string, Node> = Object.fromEntries((graph as { nodes: Node[] }).nodes.map(n => [n.id, n]))

/** Which graph nodes a queue item draws on. Technique phases by index, tune steps by step number. */
const TECH: string[][] = [['harmony.shells', 'voicing.rootless_a'], ['improv.approach_notes', 'improv.enclosures', 'improv.bebop_resolution'], ['voicing.quartal', 'voicing.tensions', 'language.solo_section']]
const STEP: string[][] = [['repertoire.melody', 'repertoire.roots'], ['repertoire.shells', 'repertoire.full_voicings'], ['repertoire.guide_tone_solo'], ['repertoire.language'], ['repertoire.perform']]
export function nodesFor(qid: string): Node[] {
  const t = qid.match(/^t(\d+)\./); if (t) return (TECH[Number(t[1])] ?? []).map(i => NODES[i]).filter(Boolean)
  const s = qid.match(/^s\d+\.(\d+)$/); if (s) return (STEP[Number(s[1])] ?? []).map(i => NODES[i]).filter(Boolean)
  return []
}
/** One pass line and one smaller-scope line for an item, if the graph has them. */
export function guidance(qid: string): { pass?: string; stuck?: string; goal?: string } {
  const ns = nodesFor(qid); if (!ns.length) return {}
  return { goal: ns[0].goal, pass: ns.flatMap(n => n.mastery_tests).slice(0, 2).join(' · '), stuck: ns.flatMap(n => n.remediation).slice(0, 2).join(', ') }
}

/** Short daily ear items, one per weekday, tied to the tune in play. From the graph's Ear track. */
const EAR_MICRO = [
  { id: 'ear.sing_scale_degrees', label: (t: string) => `Sing scale degrees in the key of ${t}, then the melody's first phrase` },
  { id: 'ear.guide_tones', label: (t: string) => `Sing 3rds and 7ths through ${t} before playing them` },
  { id: 'ear.bass_motion', label: (t: string) => `Hear the bass movement of ${t} from a recording, no chart` },
  { id: 'ear.melody_short', label: (t: string) => `Copy four 2–4 note phrases from a ${t} solo by ear` },
  { id: 'ear.cadences', label: (t: string) => `Spot every ii–V in ${t} by ear, major or minor` },
]
export const earMicro = (dow: number, tune: string) => { const e = EAR_MICRO[(dow + 4) % 5]; return { id: 'ear-micro', label: `Ear · ${e.label(tune)}`, min: NODES[e.id]?.suggested_minutes ?? 8 } }

/** A finished tune that has gone quiet: the Play closer brings it back every two weeks. */
export function maintenanceTune(user: UserData, date: string, tunes: string[]): { tune: string; days: number } | null {
  const done = user.queueDone ?? {}
  const owned = tunes.map((tune, i) => ({ tune, i })).filter(({ i }) => [0, 1, 2, 3, 4].every(k => done[`s${i}.${k}`]))
  const gap = NODES['repertoire.perform']?.maintenance_interval_days ?? 14
  const due = owned.map(({ tune }) => { const last = user.tunes[tune]?.last ?? done[`s${tunes.indexOf(tune)}.4`]; const days = Math.floor((Date.parse(date) - Date.parse(last)) / 86400e3); return { tune, days } }).filter(x => x.days >= gap).sort((a, b) => b.days - a.days)
  return due[0] ?? null
}
