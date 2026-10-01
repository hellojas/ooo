import { useState } from 'react'
import plan from '../../data/block-tasks.json'
import { today, weekNo } from '../dates'
import { update, useUser } from '../storage'
import { standardOfWeek } from '../tasks'
import { MASTER } from '../queue'
import { QueueView } from './Queue'
import { MakeList } from './Make'
import { ByEar } from './ByEar'


const RUBRIC = ['Time', 'Form', 'Voicings']
const daysAgo = (d?: string) => d ? Math.floor((Date.now() - new Date(d + 'T12:00').getTime()) / 864e5) : undefined
const agoText = (d?: string) => { const a = daysAgo(d); return a == null ? '' : a < 0 ? `planned ${d}` : a === 0 ? 'today' : `${a}d ago` }

/** Repertoire pipeline for the 10 standards + the transcription log. */
export function Practice({ onOpenDay }: { onOpenDay: (d: string) => void }) {
  const [tab, setTab] = useState<'repertoire' | 'library' | 'byear' | 'make'>('repertoire')
  const user = useUser()
  const wk = Math.max(1, weekNo(today()))
  const current = standardOfWeek(user, wk)
  const [showLater, setShowLater] = useState(false)
  const [takeUrl, setTakeUrl] = useState<Record<string, string>>({})
  const set = (name: string, v: object) => update(u => ({ ...u, tunes: { ...u.tunes, [name]: { ...{ checks: [] }, ...u.tunes[name], ...v } } }))
  const touch = (name: string) => set(name, { last: today() })
  return (
    <>
      <div className="subtabs"><button aria-pressed={tab === 'repertoire'} onClick={() => setTab('repertoire')}>Repertoire</button><button aria-pressed={tab === 'library'} onClick={() => setTab('library')}>Curriculum</button><button aria-pressed={tab === 'byear'} onClick={() => setTab('byear')}>By ear</button><button aria-pressed={tab === 'make'} onClick={() => setTab('make')}>Make</button></div>
      {tab === 'make' && <MakeList />}
      {tab === 'byear' && <ByEar />}
      {tab === 'library' && <QueueView onOpenDay={onOpenDay} />}
      {tab === 'repertoire' && <>
      <section className="plain">
        <h2>Repertoire</h2>
        <p className="meta">One tune at a time. The five steps are the same ones the curriculum queues on Today — tick them here or there. Anything untouched for 7+ days gets a review flag.</p>
        {(() => {
          const qDoneOf = (name: string) => MASTER.filter(x => x.kind === 'standard' && x.tune === name && user.queueDone?.[x.id]).length
          const rows = plan.standards.map((name, i) => ({ name, i, t: user.tunes[name] ?? { checks: [] } }))
          const learned = rows.filter(r => r.name !== current && qDoneOf(r.name) > 0)
          const revisit = learned.sort((a, b) => (a.t.last ?? '').localeCompare(b.t.last ?? ''))[0]
          const later = rows.filter(r => r.name !== current && r !== revisit)
          const Tune = ({ name, i, t, full }: { name: string; i: number; t: typeof rows[number]['t']; full: boolean }) => {
            const qSteps = MASTER.filter(x => x.kind === 'standard' && x.tune === name)
            const qDone = qSteps.filter(x => user.queueDone?.[x.id]).length
            const n = qDone, ago = daysAgo(t.last)
            const stage = n === 0 ? (name === current ? 'learning' : 'assigned wk ' + (i + 1)) : n < 3 ? 'learning' : n < 5 ? 'memorized' : 'recorded'
            const due = n > 0 && n < 5 && ago != null && ago >= 7
            const takes = t.takes ?? (t.recordingUrl ? [{ date: t.last ?? '', url: t.recordingUrl, rubric: t.rubric }] : [])
            return (
              <li className={'tune-row' + (name === current ? ' current' : '') + (full ? '' : ' compact')}>
                <div className="tune-head" onClick={() => touch(name)}>
                  <span className="serif">{name}</span>
                  <span className="meta">{stage}{name === current ? ' · this week' : ''}{t.key ? ` · ${t.key}` : ''}{t.tempo ? ` · ${t.tempo}${t.targetTempo ? '/' + t.targetTempo : ''} bpm` : ''}{t.last ? ` · ${agoText(t.last)}` : ''}{due ? ' · review due' : ''}{` · ${qDone}/5`}</span>
                </div>
                {full && <>
                  <div className="row tunemeta">
                    <label className="inl">Key <input className="narrow" placeholder="Gm" value={t.key ?? ''} onChange={e => set(name, { key: e.target.value })} /></label>
                    <label className="inl">Tempo <input type="number" className="narrow" placeholder="72" value={t.tempo ?? ''} onChange={e => set(name, { tempo: e.target.value === '' ? undefined : Number(e.target.value) })} /> / target <input type="number" className="narrow" placeholder="120" value={t.targetTempo ?? ''} onChange={e => set(name, { targetTempo: e.target.value === '' ? undefined : Number(e.target.value) })} /> bpm</label>
                  </div>
                  <div className="stages col">{qSteps.map((q, j) => { const on = !!user.queueDone?.[q.id]; return <label key={q.id} className={'stage' + (on ? ' on' : '')}><input type="checkbox" checked={on} onChange={e => update(u => { const qd = { ...u.queueDone }; if (e.target.checked) qd[q.id] = today(); else delete qd[q.id]; return { ...u, queueDone: qd, tunes: { ...u.tunes, [name]: { ...{ checks: [] }, ...u.tunes[name], last: today() } } } })} />{j + 1}. {q.label.split(': ')[1]}{on ? <small className="meta"> · {user.queueDone![q.id]}</small> : null}</label> })}</div>
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
      </>}
    </>
  )
}