import { useState } from 'react'
import { programs } from '../data'
import { fmtMin, stateOf, type PState } from '../model'
import { span } from '../time'
import { update, useUser } from '../storage'
import { Calendar } from './Calendar'
import { AbsTables, Counts, OnlineTables, Where } from './Tables'
import type { Program } from '../types'

/** Everything you could sign up for, in one place. Decide here; the calendar and Today follow. */
export function Programs({ onOpen }: { onOpen: (p: Program, d: string) => void }) {
  const user = useUser()
  const [tab, setTab] = useState<'classes' | 'online' | 'fitness'>('classes')
  const [sub, setSub] = useState<'inperson' | 'online' | 'plan'>('inperson')
  const set = (id: string, st: PState) => update(u => ({ ...u, settings: { ...u.settings, programState: { ...u.settings.programState, [id]: st } } }))
  const classes = programs.filter(p => p.kind === 'inperson')
  return (
    <>
      <div className="subtabs"><button aria-pressed={tab === 'classes'} onClick={() => setTab('classes')}>Classes</button><button aria-pressed={tab === 'online'} onClick={() => setTab('online')}>Open Studio</button><button aria-pressed={tab === 'fitness'} onClick={() => setTab('fitness')}>Fitness</button></div>
      {tab === 'classes' && <>
        <section className="plain">
          <h2>Every class, one list</h2>
          <p className="meta">Nothing here is a commitment. Set each one to Considering (shown only here), Planned (on the calendar, outlined) or Registered (solid). Dates are what the schools published on Sep 29; “confirm” marks holiday weeks they haven’t confirmed. For long drop-ins, set how long you usually stay — the schedule and travel chain use it every time.</p>
          <div className="tblwrap"><table className="t"><thead><tr><th>Class</th><th>When</th><th>Dates</th><th>Where</th><th>From home</th><th>I usually stay until</th><th>Status</th></tr></thead><tbody>
            {classes.map(p => { const st = stateOf(p, user); return (
              <tr key={p.id} className={st === 'considering' ? 'skip' : ''}>
                <td><span className="sw" style={{ '--c': `var(--${p.id})` } as React.CSSProperties} /><a href={p.url} target="_blank" rel="noreferrer">{p.name}</a>{p.drop && <small className="qtag">flex</small>}</td>
                <td>{p.time}</td>
                <td>{p.dates.length} · {p.dates[0].slice(5)} → {p.dates[p.dates.length - 1].slice(5)}{p.uncertain?.length ? ` · ${p.uncertain.length} to confirm` : ''}</td>
                <td>{p.loc}</td><td className="go">{p.go}</td>
                <td>{(() => { const t = span(p.time); if (!t || t[1] - t[0] <= 120) return <span className="meta">whole thing</span>; const opts = Array.from({ length: Math.floor((t[1] - t[0]) / 30) }, (_, i) => t[0] + 30 * (i + 1)); const v = user.settings.visitUntil?.[p.id] ?? t[1]; return <select value={v} onChange={e => update(u => ({ ...u, settings: { ...u.settings, visitUntil: { ...u.settings.visitUntil, [p.id]: Number(e.target.value) } } }))}>{opts.map(m => <option key={m} value={m}>{fmtMin(m)}{m === t[1] ? ' (end)' : ''}</option>)}</select> })()}</td>
                <td><select value={st} onChange={e => set(p.id, e.target.value as PState)}><option value="considering">Considering</option><option value="planned">Planned</option><option value="registered">Registered</option></select></td>
              </tr>) })}
          </tbody></table></div>
        </section>
        <div className="subtabs small">{([['inperson', 'All classes'], ['plan', 'Planned + registered']] as const).map(([k, l]) => <button key={k} aria-pressed={sub === k} onClick={() => setSub(k)}>{l}</button>)}</div>
        <Calendar showTravel showOnline={false} showVideos={false} phaseProgs={[]} showConsidering={sub === 'inperson'} visible={p => p.kind === 'inperson' && (sub === 'inperson' || stateOf(p, user) !== 'considering')} onOpen={onOpen} />
        {sub === 'plan' && <><Where pool={classes.filter(p => stateOf(p, user) !== 'considering')} /><Counts pool={classes.filter(p => stateOf(p, user) !== 'considering')} /></>}
      </>}
      {tab === 'online' && <>
        <Calendar showTravel showOnline showVideos phaseProgs={[]} visible={() => false} onOpen={onOpen} />
        <OnlineTables />
      </>}
      {tab === 'fitness' && <>
        <Calendar showTravel showOnline={false} showVideos={false} phaseProgs={['c25k', 'pull', 'v8']} visible={p => p.kind === 'abs'} onOpen={onOpen} />
        <Where pool={programs.filter(p => p.kind === 'abs')} /><Counts pool={programs.filter(p => p.kind === 'abs')} /><AbsTables />
      </>}
    </>
  )
}
