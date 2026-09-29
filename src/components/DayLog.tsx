import { hintFor, pullReps } from '../model'
import { parse, weekNo } from '../dates'
import { update, useUser } from '../storage'
import type { UserData } from '../types'

type Feel = NonNullable<UserData['practice'][string]['feel']>
const FEELS: { id: Feel; label: string; tip: (w: { climb: string; run: string }) => string }[] = [
  { id: 'fresh', label: 'Fresh', tip: w => `Climb hard${w.climb ? ' — ' + w.climb : ''}, then pull-ups.` },
  { id: 'ok', label: 'OK', tip: w => `Volume climbing, or a run${w.run ? ' — ' + w.run : ''}.` },
  { id: 'tired', label: 'Tired', tip: () => 'Easy run or a walk. Or rest — it counts.' },
  { id: 'sore', label: 'Sore finger', tip: w => `No crimping. A run${w.run ? ' — ' + w.run : ''} and pull-ups, or rest.` },
]

/** Quick log. Minutes fill in from finished blocks; the stepper is the backup. */
export function DayLog({ date }: { date: string }) {
  const user = useUser()
  const wk = weekNo(date), dow = parse(date).getDay()
  const pr = user.practice[date] ?? {}, climb = user.climbing[date] ?? {}, run = user.running[date] ?? {}
  const setPr = (v: object) => update(u => ({ ...u, practice: { ...u.practice, [date]: { ...u.practice[date], ...v } } }))
  const add = (id: 'sax' | 'piano1', m: number) => setPr({ [id]: Math.max(0, (pr[id] ?? 0) + m) })
  const piano = (pr.piano1 ?? 0) + (pr.piano2 ?? 0)
  const feel = FEELS.find(f => f.id === pr.feel)
  const tip = feel?.tip({ climb: hintFor('climb', wk, dow) ?? '', run: hintFor('run', wk, dow)?.split(' · ')[0] ?? '' })

  const reps = pullReps(user.pullups[date])
  const setReps = (n: number) => update(u => ({ ...u, pullups: { ...u.pullups, [date]: { ...u.pullups[date], sets: undefined, reps: Math.max(0, n) || undefined } } }))
  const fromTasks = (prefix: string) => user.sessions.filter(s => s.date === date && s.block.startsWith(prefix)).length > 0
  return (
    <div className="quicklog">
      <p className="eyebrow">Practice</p>
      {([['Piano', 'piano1', piano, fromTasks('Piano')], ['Sax', 'sax', pr.sax ?? 0, fromTasks('Sax')]] as const).map(([label, id, mins, auto]) => (
        <div className="logline" key={id}>
          <span className="lbl2"><b>{label}</b><small>{auto ? 'from finished blocks' : 'or finish a block'}</small></span>
          <span className="stepper"><button className="btn icon" onClick={() => add(id, -15)} aria-label="minus 15">−</button><span className="num">{mins} min</span><button className="btn icon" onClick={() => add(id, 15)} aria-label="plus 15">+</button></span>
        </div>
      ))}
      <p className="eyebrow">How do you feel?</p>
      <div className="grid2">{FEELS.map(f => <button key={f.id} className="btn toggle" aria-pressed={pr.feel === f.id} onClick={() => setPr({ feel: pr.feel === f.id ? undefined : f.id })}>{f.label}</button>)}</div>
      {tip && <p className="meta">{tip}</p>}
      <p className="eyebrow">Training</p>
      <div className="grid2">
        <button className="btn toggle" aria-pressed={!!climb.done} onClick={() => update(u => ({ ...u, climbing: { ...u.climbing, [date]: { ...u.climbing[date], done: !climb.done } } }))}>Climbed</button>
        <button className="btn toggle" aria-pressed={!!run.done} onClick={() => update(u => ({ ...u, running: { ...u.running, [date]: { ...u.running[date], done: !run.done } } }))}>Ran</button>
      </div>
      <div className="logline"><b>Pull-ups</b><span className="stepper"><button className="btn icon" onClick={() => setReps(reps - 5)} aria-label="minus 5">−</button><span className="num">{reps}</span><button className="btn icon" onClick={() => setReps(reps + 5)} aria-label="plus 5">+</button></span></div>
    </div>
  )
}
