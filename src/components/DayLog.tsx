import { useState } from 'react'
import { DEFAULT_TARGETS } from '../model'
import { update, useUser } from '../storage'
import { useEffect, useRef } from 'react'
import { weekNo } from '../dates'
import type { UserData } from '../types'

const num = (v: string) => (v === '' ? undefined : Number(v))
type Sec = 'climbing' | 'running' | 'pullups'
const patch = (section: Sec, date: string, v: object) =>
  update(u => ({ ...u, [section]: { ...u[section], [date]: { ...(u[section] as Record<string, object>)[date], ...v } } }) as UserData)

export function DayLog({ date }: { date: string }) {
  const user = useUser()
  const wk = weekNo(date)
  const pr = user.practice[date] ?? {}, climb = user.climbing[date] ?? {}, run = user.running[date] ?? {}, pull = user.pullups[date] ?? {}
  const week = user.weekly[wk] ?? {}
  const setPr = (v: object) => update(u => ({ ...u, practice: { ...u.practice, [date]: { ...u.practice[date], ...v } } }))
  const setWeek = (v: object) => update(u => ({ ...u, weekly: { ...u.weekly, [wk]: { ...u.weekly[wk], ...v } } }))
  const addMin = (id: string, m: number) => setPr({ [id]: Math.max(0, ((pr as Record<string, number>)[id] ?? 0) + m) })
  const [grade, setGrade] = useState(''), [style, setStyle] = useState(''), [reps, setReps] = useState(''), [wt, setWt] = useState('0')

  return (
    <>
      <h3>Practice log</h3>
      <div className="blocks">
        <Block label="Sax" target={user.settings.targets?.sax ?? DEFAULT_TARGETS.sax} mins={pr.sax ?? 0} onAdd={m => addMin('sax', m)} />
        <Block label="Piano" target={user.settings.targets?.piano ?? DEFAULT_TARGETS.piano} mins={(pr.piano1 ?? 0) + (pr.piano2 ?? 0)} onAdd={m => addMin('piano1', m)} />
        <div className="block-card"><b>Transcribe</b><span>{pr.transcribe ?? 0} min</span><div className="row">
          <button className="btn" onClick={() => addMin('transcribe', 15)}>+15</button><button className="btn" onClick={() => addMin('transcribe', 30)}>+30</button><button className="btn" onClick={() => addMin('transcribe', -15)}>−15</button></div></div>
        <div className="block-card"><b>Arrangement</b><span>{pr.arrange ?? 0} min</span><div className="row">
          <button className="btn" onClick={() => addMin('arrange', 15)}>+15</button><button className="btn" onClick={() => addMin('arrange', 30)}>+30</button><button className="btn" onClick={() => addMin('arrange', -15)}>−15</button></div></div>
      </div>
      <div className="row">
        <label>Standard of the week (wk {wk})<input value={week.standard ?? ''} onChange={e => setWeek({ standard: e.target.value })} /></label>
        <label>Song transcribed today<input value={pr.songTranscribed ?? ''} onChange={e => setPr({ songTranscribed: e.target.value })} /></label>
      </div>
      <ul className="checks">
        <li><label><input type="checkbox" checked={!!week.recordedStandard} onChange={e => setWeek({ recordedStandard: e.target.checked })} /> Standard memorized + recorded this week (counts toward “standards memorized”)</label></li>
        <li><label><input type="checkbox" checked={!!week.recordedArrangement} onChange={e => setWeek({ recordedArrangement: e.target.checked })} /> Arrangement recorded this week</label></li>
      </ul>

      <h3>Climbing</h3>
      <div className="row">
        <label>Gym<select value={climb.gym ?? ''} onChange={e => patch('climbing', date, { gym: e.target.value || undefined })}><option value="">–</option><option>BK</option><option>LES</option></select></label>
        <label>Session<select value={climb.sessionType ?? ''} onChange={e => patch('climbing', date, { sessionType: e.target.value || undefined })}><option value="">–</option><option>volume</option><option>limit</option></select></label>
        <label>Finger feel 1–5<input type="number" min={1} max={5} value={climb.fingerFeel ?? ''} onChange={e => patch('climbing', date, { fingerFeel: num(e.target.value) })} /></label>
      </div>
      <div className="row">
        <label>Send grade<input placeholder="V6" value={grade} onChange={e => setGrade(e.target.value)} /></label>
        <label>Style<input placeholder="sloper" value={style} onChange={e => setStyle(e.target.value)} /></label>
        <button className="btn" onClick={() => { if (grade) { patch('climbing', date, { sends: [...(climb.sends ?? []), { grade, style }] }); setGrade(''); setStyle('') } }}>Add send</button>
      </div>
      <p className="sub">{(climb.sends ?? []).map(s => `${s.grade}${s.style ? ' ' + s.style : ''}`).join(' · ') || 'No sends logged'}</p>
      <label className="block">Climb notes<input value={climb.notes ?? ''} onChange={e => patch('climbing', date, { notes: e.target.value })} /></label>

      <h3>Run</h3>
      <div className="row">
        <label>Minutes<input type="number" value={run.minutes ?? ''} onChange={e => patch('running', date, { minutes: num(e.target.value) })} /></label>
        <label>C25K week<input type="number" value={run.c25kWeek ?? ''} onChange={e => patch('running', date, { c25kWeek: num(e.target.value) })} /></label>
        <label>Felt<input value={run.felt ?? ''} onChange={e => patch('running', date, { felt: e.target.value })} /></label>
      </div>

      <h3>Pull-ups</h3>
      <div className="row">
        <label>Reps<input type="number" value={reps} onChange={e => setReps(e.target.value)} /></label>
        <label>+lb<input type="number" value={wt} onChange={e => setWt(e.target.value)} /></label>
        <button className="btn" onClick={() => { if (reps) { patch('pullups', date, { sets: [...(pull.sets ?? []), { reps: Number(reps), weightLb: Number(wt) }] }); setReps('') } }}>Add set</button>
        <label>Max test<input type="number" value={pull.maxTest ?? ''} onChange={e => patch('pullups', date, { maxTest: num(e.target.value) })} /></label>
      </div>
      <p className="sub">{(pull.sets ?? []).map(s => `${s.reps}${s.weightLb ? '+' + s.weightLb : ''}`).join(' · ') || 'No sets logged'}</p>

      <label className="block">Day notes<textarea rows={2} value={pr.notes ?? ''} onChange={e => setPr({ notes: e.target.value })} /></label>
    </>
  )
}

function Block({ label, target, mins, onAdd }: { label: string; target: number; mins: number; onAdd: (m: number) => void }) {
  const [start, setStart] = useState<number | null>(null)
  const [, tick] = useState(0)
  const t = useRef<number>()
  useEffect(() => { if (start) { t.current = window.setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(t.current) } }, [start])
  const running = start ? Math.floor((Date.now() - start) / 1000) : 0
  return (
    <div className="block-card">
      <b>{label}</b>
      <div className="bar"><i style={{ width: `${Math.min(100, (mins / target) * 100)}%` }} /></div>
      <span>{mins} / {target} min</span>
      <div className="row">
        {start
          ? <button className="btn primary" onClick={() => { onAdd(Math.max(1, Math.round(running / 60))); setStart(null) }}>Stop {Math.floor(running / 60)}:{String(running % 60).padStart(2, '0')}</button>
          : <button className="btn" onClick={() => setStart(Date.now())}>▶ Timer</button>}
        <button className="btn" onClick={() => onAdd(15)}>+15</button><button className="btn" onClick={() => onAdd(30)}>+30</button><button className="btn" onClick={() => onAdd(-15)}>−15</button>
      </div>
    </div>
  )
}
