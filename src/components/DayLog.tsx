import { hintFor, pullReps } from '../model'
import { parse, weekNo } from '../dates'
import { update, useUser } from '../storage'
import type { UserData } from '../types'

type Feel = NonNullable<UserData['practice'][string]['feel']>
const FEELS: { id: Feel; label: string; tip: (w: { climb: string; run: string }) => string }[] = [
  { id: 'fresh', label: '💪 Fresh', tip: w => `Good day to climb hard${w.climb ? ' — ' + w.climb : ''}, then pull-ups.` },
  { id: 'ok', label: '🙂 OK', tip: w => `Volume climbing, or a run${w.run ? ' — ' + w.run : ''}. Pull-ups if you like.` },
  { id: 'tired', label: '😴 Tired', tip: () => 'Easy run or a walk. Or rest — it counts.' },
  { id: 'sore', label: '🤕 Finger sore', tip: w => `No crimping. A run${w.run ? ' — ' + w.run : ''} and pull-ups, or rest.` },
]

/** Deliberately light: rough minutes, checkboxes, one pull-up number. */
export function DayLog({ date }: { date: string }) {
  const user = useUser()
  const wk = weekNo(date), dow = parse(date).getDay()
  const pr = user.practice[date] ?? {}, climb = user.climbing[date] ?? {}, run = user.running[date] ?? {}
  const week = user.weekly[wk] ?? {}
  const setPr = (v: object) => update(u => ({ ...u, practice: { ...u.practice, [date]: { ...u.practice[date], ...v } } }))
  const setWeek = (v: object) => update(u => ({ ...u, weekly: { ...u.weekly, [wk]: { ...u.weekly[wk], ...v } } }))
  const add = (id: 'sax' | 'piano1', m: number) => setPr({ [id]: Math.max(0, (pr[id] ?? 0) + m) })
  const piano = (pr.piano1 ?? 0) + (pr.piano2 ?? 0)
  const feel = FEELS.find(f => f.id === pr.feel)
  const cardTip = feel?.tip({ climb: hintFor('climb', wk, dow) ?? '', run: hintFor('run', wk, dow)?.split(' · ')[0] ?? '' })

  return (
    <>
      <h3>Music today (rough time)</h3>
      <div className="blocks">
        {([['Piano', 'piano1', piano], ['Sax', 'sax', pr.sax ?? 0]] as const).map(([label, id, mins]) => (
          <div className="block-card" key={id}>
            <b>{label}</b><span className="big">{mins} min</span>
            <div className="row"><button className="btn" onClick={() => add(id, 15)}>+15</button><button className="btn" onClick={() => add(id, 30)}>+30</button><button className="btn" onClick={() => add(id, 60)}>+60</button><button className="btn" onClick={() => add(id, -15)}>−15</button></div>
          </div>
        ))}
      </div>
      <ul className="checks">
        <li><label><input type="checkbox" checked={!!week.recordedStandard} onChange={e => setWeek({ recordedStandard: e.target.checked })} /> Standard of the week memorized (this week)</label></li>
      </ul>

      <h3>Gym · by feel</h3>
      <div className="seg feels">
        {FEELS.map(f => <button key={f.id} aria-pressed={pr.feel === f.id} onClick={() => setPr({ feel: pr.feel === f.id ? undefined : f.id })}>{f.label}</button>)}
      </div>
      {cardTip && <p className="sub tip">{cardTip}</p>}
      <ul className="checks big">
        <li><label><input type="checkbox" checked={!!climb.done} onChange={e => update(u => ({ ...u, climbing: { ...u.climbing, [date]: { ...u.climbing[date], done: e.target.checked } } }))} /> Climbed</label></li>
        <li><label><input type="checkbox" checked={!!run.done} onChange={e => update(u => ({ ...u, running: { ...u.running, [date]: { ...u.running[date], done: e.target.checked } } }))} /> Ran</label></li>
      </ul>
      <div className="row">
        <label>Pull-ups today (total reps)<input type="number" min={0} value={pullReps(user.pullups[date]) || ''} placeholder="0"
          onChange={e => update(u => ({ ...u, pullups: { ...u.pullups, [date]: { ...u.pullups[date], sets: undefined, reps: e.target.value === '' ? undefined : Number(e.target.value) } } }))} /></label>
      </div>

      <label className="block">Note (optional)<textarea rows={2} value={pr.notes ?? ''} onChange={e => setPr({ notes: e.target.value })} /></label>
    </>
  )
}
