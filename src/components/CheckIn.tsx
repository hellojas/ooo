import { useState } from 'react'
import { update, useUser } from '../storage'
import { attKey } from '../model'
import type { Attendance, Program, UserData } from '../types'

const num = (v: string) => (v === '' ? undefined : Number(v))

export function CheckIn({ p, date, onClose }: { p: Program; date: string; onClose: () => void }) {
  const user = useUser()
  const k = attKey(p.id, date)
  const att = user.attendance[k]
  const set = (a: Attendance | undefined) => update(u => {
    const attendance = { ...u.attendance }
    if (a) attendance[k] = a; else delete attendance[k]
    return { ...u, attendance }
  })
  const climb = user.climbing[date] ?? {}
  const run = user.running[date] ?? {}
  const pull = user.pullups[date] ?? {}
  const [grade, setGrade] = useState(''); const [style, setStyle] = useState('')
  const [reps, setReps] = useState(''); const [wt, setWt] = useState('0')
  const isClimb = p.id === 'climb' || p.id === 'climbLES'
  const isRun = p.id === 'run' || p.id === 'run2'
  const patch = <K extends 'climbing' | 'running' | 'pullups'>(section: K, v: Partial<UserData[K][string]>) =>
    update(u => ({ ...u, [section]: { ...u[section], [date]: { ...(u[section] as Record<string, object>)[date], ...v } } }))

  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()} role="dialog" aria-label={`Check in: ${p.name}`}>
        <h3>{p.name}</h3>
        <p className="sub">{date} · {p.time}{p.loc ? ` · ${p.loc}` : ''}</p>
        <div className="seg">
          {(['went', 'missed', 'skipped'] as Attendance[]).map(a => (
            <button key={a} aria-pressed={att === a} onClick={() => set(att === a ? undefined : a)}>{a}</button>
          ))}
        </div>

        {isClimb && <>
          <div className="row">
            <label>Session<select value={climb.sessionType ?? ''} onChange={e => patch('climbing', { sessionType: (e.target.value || undefined) as never, gym: p.id === 'climbLES' ? 'LES' : 'BK' })}>
              <option value="">–</option><option>volume</option><option>limit</option></select></label>
            <label>Finger feel 1–5<input type="number" min={1} max={5} value={climb.fingerFeel ?? ''} onChange={e => patch('climbing', { fingerFeel: num(e.target.value) })} /></label>
          </div>
          <div className="row">
            <label>Send grade<input placeholder="V6" value={grade} onChange={e => setGrade(e.target.value)} /></label>
            <label>Style<input placeholder="sloper" value={style} onChange={e => setStyle(e.target.value)} /></label>
            <button className="btn" onClick={() => { if (grade) { patch('climbing', { sends: [...(climb.sends ?? []), { grade, style }] }); setGrade(''); setStyle('') } }}>Add send</button>
          </div>
          <p className="sub">{(climb.sends ?? []).map(s => `${s.grade}${s.style ? ' ' + s.style : ''}`).join(' · ') || 'No sends logged'}</p>
        </>}

        {isRun && <div className="row">
          <label>Minutes<input type="number" value={run.minutes ?? ''} onChange={e => patch('running', { minutes: num(e.target.value) })} /></label>
          <label>C25K week<input type="number" value={run.c25kWeek ?? ''} onChange={e => patch('running', { c25kWeek: num(e.target.value) })} /></label>
        </div>}

        {(isRun || p.id === 'climb') && <>
          <h4>Pull-ups</h4>
          <div className="row">
            <label>Reps<input type="number" value={reps} onChange={e => setReps(e.target.value)} /></label>
            <label>+lb<input type="number" value={wt} onChange={e => setWt(e.target.value)} /></label>
            <button className="btn" onClick={() => { if (reps) { patch('pullups', { sets: [...(pull.sets ?? []), { reps: Number(reps), weightLb: Number(wt) }] }); setReps('') } }}>Add set</button>
          </div>
          <p className="sub">{(pull.sets ?? []).map(s => `${s.reps}${s.weightLb ? '+' + s.weightLb : ''}`).join(' · ') || 'No sets'}
            {' '}<label className="inl">Max test <input type="number" value={pull.maxTest ?? ''} onChange={e => patch('pullups', { maxTest: num(e.target.value) })} /></label></p>
        </>}

        <div className="row end">
          {p.url && <a href={p.url} target="_blank" rel="noreferrer">Program page ↗</a>}
          <button className="btn primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
