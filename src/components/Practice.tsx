import { useState } from 'react'
import plan from '../../data/block-tasks.json'
import { today, weekNo } from '../dates'
import { update, useUser } from '../storage'
import { standardOfWeek } from '../tasks'

const STAGES = ['Melody from memory', 'Shells through the form', 'Comping at a recorded tempo', 'Solo without losing the form', 'Complete performance recorded']
const RUBRIC = ['Time', 'Form', 'Voicings']
const daysAgo = (d?: string) => d ? Math.floor((Date.now() - new Date(d + 'T12:00').getTime()) / 864e5) : undefined

/** Repertoire pipeline for the 10 standards + the transcription log. */
export function Practice() {
  const user = useUser()
  const wk = Math.max(1, weekNo(today()))
  const current = standardOfWeek(user, wk)
  const [song, setSong] = useState(''), [note, setNote] = useState('')
  const set = (name: string, v: object) => update(u => ({ ...u, tunes: { ...u.tunes, [name]: { ...{ checks: [] }, ...u.tunes[name], ...v } } }))
  const touch = (name: string) => set(name, { last: today() })
  return (
    <>
      <section className="plain">
        <h2>Repertoire</h2>
        <p className="meta">One standard a week. Each one goes assigned → learning → memorized → gig-ready → recorded. Anything untouched for 7+ days gets a review flag.</p>
        <ul className="tunes">
          {plan.standards.map((name, i) => {
            const t = user.tunes[name] ?? { checks: [] }
            const n = t.checks.length, ago = daysAgo(t.last)
            const stage = n === 0 ? (i + 1 <= wk ? 'learning' : 'assigned wk ' + (i + 1)) : n < 3 ? 'learning' : n < 5 ? 'memorized' : 'recorded'
            const due = n > 0 && n < 5 && ago != null && ago >= 7
            return (
              <li key={name} className={'tune-row' + (name === current ? ' current' : '')}>
                <div className="tune-head" onClick={() => touch(name)}>
                  <span className="serif">{name}</span>
                  <span className="meta">{stage}{name === current ? ' · this week' : ''}{ago != null ? ` · ${ago === 0 ? 'today' : ago + 'd ago'}` : ''}{due ? ' · review due' : ''}</span>
                </div>
                <div className="stages">{STAGES.map((s, j) => <label key={s} className={'stage' + (t.checks.includes(s) ? ' on' : '')}><input type="checkbox" checked={t.checks.includes(s)} onChange={e => set(name, { checks: e.target.checked ? [...t.checks, s] : t.checks.filter(x => x !== s), last: today() })} />{j + 1}. {s}</label>)}</div>
                <div className="row">
                  <label className="inl">Take <input type="url" placeholder="Drive / Voice Memos link" value={t.recordingUrl ?? ''} onChange={e => set(name, { recordingUrl: e.target.value })} /></label>
                  {t.recordingUrl && <a href={t.recordingUrl} target="_blank" rel="noreferrer">listen ↗</a>}
                  {t.recordingUrl && RUBRIC.map(r => <label key={r} className="inl">{r} <select value={(t as { rubric?: Record<string, number> }).rubric?.[r] ?? ''} onChange={e => set(name, { rubric: { ...(t as { rubric?: Record<string, number> }).rubric, [r]: Number(e.target.value) } })}><option value="">–</option><option>1</option><option>2</option><option>3</option></select></label>)}
                </div>
              </li>
            )
          })}
        </ul>
      </section>
      <section className="plain">
        <h2>Transcriptions</h2>
        <p className="meta">Songs played by ear, functionally labeled. What did you steal?</p>
        <div className="row">
          <input placeholder="Song" value={song} onChange={e => setSong(e.target.value)} />
          <input placeholder="Progression / what you stole" value={note} onChange={e => setNote(e.target.value)} />
          <button className="btn primary" onClick={() => { if (song.trim()) { update(u => ({ ...u, transcriptions: [{ id: String(Date.now()), date: today(), song: song.trim(), note }, ...u.transcriptions] })); setSong(''); setNote('') } }}>Add</button>
        </div>
        <p className="meta">{user.transcriptions.length} so far · milestone: 8+ by week 3</p>
        <ul className="translist">{user.transcriptions.map(t => <li key={t.id}><b>{t.song}</b> <span className="meta">{t.date}</span>{t.note && <div>{t.note}</div>}<button className="linkbtn quiet" onClick={() => update(u => ({ ...u, transcriptions: u.transcriptions.filter(x => x.id !== t.id) }))}>remove</button></li>)}</ul>
      </section>
    </>
  )
}
