import { hintFor, pullReps } from '../model'
import { parse, weekNo } from '../dates'
import { update, useUser } from '../storage'
import type { UserData } from '../types'

type Feel = NonNullable<UserData['practice'][string]['feel']>
const FEELS: { id: Feel; label: string; tip: (w: { climb: string; run: string }) => string }[] = [
  { id: 'fresh', label: 'Fresh', tip: w => `Climb hard${w.climb ? ' — ' + w.climb : ''}, then pull-ups.` },
  { id: 'ok', label: 'OK', tip: w => `Volume climbing, or a run${w.run ? ' — ' + w.run : ''}.` },
  { id: 'tired', label: 'Tired', tip: () => 'Easy run or a walk. Or rest — it counts.' },
  { id: 'sore', label: 'Finger sore', tip: w => `No crimping. A run${w.run ? ' — ' + w.run : ''} and pull-ups, or rest.` },
]

/** Quick log: rough music minutes, gym by feel, one pull-up number. Deliberately light. */
export function DayLog({ date }: { date: string }) {
  const user = useUser()
  const wk = weekNo(date), dow = parse(date).getDay()
  const pr = user.practice[date] ?? {}, climb = user.climbing[date] ?? {}, run = user.running[date] ?? {}
  const setPr = (v: object) => update(u => ({ ...u, practice: { ...u.practice, [date]: { ...u.practice[date], ...v } } }))
  const add = (id: 'sax' | 'piano1', m: number) => setPr({ [id]: Math.max(0, (pr[id] ?? 0) + m) })
  const piano = (pr.piano1 ?? 0) + (pr.piano2 ?? 0)
  const feel = FEELS.find(f => f.id === pr.feel)
  const tip = feel?.tip({ climb: hintFor('climb', wk, dow) ?? '', run: hintFor('run', wk, dow)?.split(' · ')[0] ?? '' })

  return (
    <div className="quicklog">
      <h3>Log</h3>
      {([['Piano', 'piano1', piano], ['Sax', 'sax', pr.sax ?? 0]] as const).map(([label, id, mins]) => (
        <div className="logline" key={id}>
          <b>{label}</b><span className="num">{mins} min</span>
          <span className="btns"><button className="btn" onClick={() => add(id, 15)}>+15</button><button className="btn" onClick={() => add(id, 30)}>+30</button><button className="btn" onClick={() => add(id, -15)}>−15</button></span>
        </div>
      ))}
      <div className="logline gym">
        <b>Gym</b>
        <span className="seg feels">{FEELS.map(f => <button key={f.id} aria-pressed={pr.feel === f.id} onClick={() => setPr({ feel: pr.feel === f.id ? undefined : f.id })}>{f.label}</button>)}</span>
      </div>
      {tip && <p className="meta">{tip}</p>}
      <div className="logline">
        <label className="inl big"><input type="checkbox" checked={!!climb.done} onChange={e => update(u => ({ ...u, climbing: { ...u.climbing, [date]: { ...u.climbing[date], done: e.target.checked } } }))} /> Climbed</label>
        <label className="inl big"><input type="checkbox" checked={!!run.done} onChange={e => update(u => ({ ...u, running: { ...u.running, [date]: { ...u.running[date], done: e.target.checked } } }))} /> Ran</label>
        <label className="inl">Pull-ups <input type="number" min={0} value={pullReps(user.pullups[date]) || ''} placeholder="0"
          onChange={e => update(u => ({ ...u, pullups: { ...u.pullups, [date]: { ...u.pullups[date], sets: undefined, reps: e.target.value === '' ? undefined : Number(e.target.value) } } }))} /></label>
      </div>
      <textarea rows={2} placeholder="Note (optional)" value={pr.notes ?? ''} onChange={e => setPr({ notes: e.target.value })} />
    </div>
  )
}
