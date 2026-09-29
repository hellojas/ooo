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
  const [showLater, setShowLater] = useState(false)
  const [takeUrl, setTakeUrl] = useState<Record<string, string>>({})
  const set = (name: string, v: object) => update(u => ({ ...u, tunes: { ...u.tunes, [name]: { ...{ checks: [] }, ...u.tunes[name], ...v } } }))
  const touch = (name: string) => set(name, { last: today() })
  return (
    <>
      <section className="plain">
        <h2>Repertoire</h2>
        <p className="meta">One standard a week. Each one goes assigned → learning → memorized → gig-ready → recorded. Anything untouched for 7+ days gets a review flag.</p>
        {(() => {
          const rows = plan.standards.map((name, i) => ({ name, i, t: user.tunes[name] ?? { checks: [] } }))
          const learned = rows.filter(r => r.name !== current && r.t.checks.length > 0)
          const revisit = learned.sort((a, b) => (a.t.last ?? '').localeCompare(b.t.last ?? ''))[0]
          const later = rows.filter(r => r.name !== current && r !== revisit)
          const Tune = ({ name, i, t, full }: { name: string; i: number; t: typeof rows[number]['t']; full: boolean }) => {
            const n = t.checks.length, ago = daysAgo(t.last)
            const stage = n === 0 ? (i + 1 <= wk ? 'learning' : 'assigned wk ' + (i + 1)) : n < 3 ? 'learning' : n < 5 ? 'memorized' : 'recorded'
            const due = n > 0 && n < 5 && ago != null && ago >= 7
            const takes = t.takes ?? (t.recordingUrl ? [{ date: t.last ?? '', url: t.recordingUrl, rubric: t.rubric }] : [])
            return (
              <li className={'tune-row' + (name === current ? ' current' : '') + (full ? '' : ' compact')}>
                <div className="tune-head" onClick={() => touch(name)}>
                  <span className="serif">{name}</span>
                  <span className="meta">{stage}{name === current ? ' · this week' : ''}{ago != null ? ` · ${ago === 0 ? 'today' : ago + 'd ago'}` : ''}{due ? ' · review due' : ''}{!full && n > 0 ? ` · ${n}/5` : ''}</span>
                </div>
                {full && <>
                  <div className="stages">{STAGES.map((s, j) => <label key={s} className={'stage' + (t.checks.includes(s) ? ' on' : '')}><input type="checkbox" checked={t.checks.includes(s)} onChange={e => set(name, { checks: e.target.checked ? [...t.checks, s] : t.checks.filter(x => x !== s), last: today() })} />{j + 1}. {s}</label>)}</div>
                  {takes.length > 0 && <ul className="takes">{takes.map((k, j) => <li key={j}><span className="num">{k.date || '—'}</span> <a href={k.url} target="_blank" rel="noreferrer">listen ↗</a>
                    {RUBRIC.map(r => <label key={r} className="inl">{r} <select value={k.rubric?.[r] ?? ''} onChange={e => set(name, { takes: takes.map((x, q) => q === j ? { ...x, rubric: { ...x.rubric, [r]: Number(e.target.value) } } : x) })}><option value="">–</option><option>1</option><option>2</option><option>3</option></select></label>)}</li>)}</ul>}
                  <div className="row"><input type="url" placeholder="Add a take (Drive / Voice Memos link)" value={takeUrl[name] ?? ''} onChange={e => setTakeUrl({ ...takeUrl, [name]: e.target.value })} />
                    <button className="btn" onClick={() => { const u = takeUrl[name]?.trim(); if (u) { set(name, { takes: [...takes, { date: today(), url: u }], last: today() }); setTakeUrl({ ...takeUrl, [name]: '' }) } }}>Add take</button></div>
                </>}
              </li>
            )
          }
          const curRow = rows.find(r => r.name === current)
          return <>
            <h3>Working on</h3>
            <ul className="tunes">{curRow ? <Tune {...curRow} full /> : <li className="meta">Set this week’s tune in Review.</li>}</ul>
            {revisit && <><h3>Revisit</h3><ul className="tunes"><Tune {...revisit} full /></ul></>}
            <h3><button className="linkbtn quiet" onClick={() => setShowLater(!showLater)}>{showLater ? 'Hide' : 'Show'} the rest ({later.length})</button></h3>
            {showLater && <ul className="tunes">{later.map(r => <Tune key={r.name} {...r} full={false} />)}</ul>}
          </>
        })()}
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
