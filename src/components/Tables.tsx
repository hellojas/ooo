import type { CSSProperties } from 'react'
import { courses, dayByDay, phasePrograms, phases, skipCourses } from '../data'
import { setTaipeiStart, sessionsAttendable, WEEK_TEMPLATE } from '../model'
import { useUser } from '../storage'
import type { Program } from '../types'

const sw = (id: string) => ({ '--c': `var(--${id})` }) as CSSProperties

export function Where({ pool }: { pool: Program[] }) {
  return (
    <section className="panel">
      <h2>Where things are</h2>
      <p>Travel is a rough estimate from Williamsburg.</p>
      <div className="tblwrap"><table className="t"><thead><tr><th>Program</th><th>When</th><th>Where</th><th>From home</th></tr></thead><tbody>
        {pool.map(p => <tr key={p.id}>
          <td><span className="sw" style={sw(p.id)} /><a href={p.url} target="_blank" rel="noreferrer">{p.name}</a></td>
          <td>{p.time}</td><td>{p.loc}</td><td className="go">{p.go}</td></tr>)}
      </tbody></table></div>
    </section>
  )
}

export function Counts({ pool }: { pool: Program[] }) {
  const user = useUser()
  setTaipeiStart(user.settings.taipeiStart)
  return <div className="counts">{pool.map(p => { const c = sessionsAttendable(p, user); return <div key={p.id}><b>{p.short}</b><span>{c.ok} of {c.total} sessions</span></div> })}</div>
}

export function Template({ title }: { title: string }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <div className="week">{WEEK_TEMPLATE.map(d => <div className="d" key={d.day}><h3>{d.day}</h3><ul>
        {d.items.map((i, k) => <li key={k} className={(i.c ? 'cls' : '') + (i.opt ? ' opt' : '')} style={i.c ? sw(i.c) : undefined}>{i.t}</li>)}
      </ul></div>)}</div>
    </section>
  )
}

export function OnlineTables() {
  const name = (id: string) => courses.find(c => c.id === id)?.short ?? id
  return (
    <>
      <section className="panel">
        <h2>Open Studio curriculum</h2>
        <div className="tblwrap"><table className="t"><thead><tr><th>Course</th><th>Weeks</th><th>Length</th><th>Why now</th></tr></thead><tbody>
          {courses.map(c => <tr key={c.id}><td><span className="sw" style={sw(c.id)} /><a href={c.url} target="_blank" rel="noreferrer">{c.name}</a></td><td>{c.wk[0] === c.wk[1] ? c.wk[0] : `${c.wk[0]}–${c.wk[1]}`}</td><td>{c.hrs}</td><td>{c.feeds}</td></tr>)}
          {skipCourses.map(s => <tr key={s.name} className="skip"><td>{s.name}</td><td>skip</td><td /><td>{s.why}</td></tr>)}
        </tbody></table></div>
      </section>
      <section className="panel">
        <h2>Day by day</h2>
        <div className="tblwrap"><table className="t"><thead><tr><th>Date</th><th>Course</th><th>Video / lesson</th><th>PDF</th></tr></thead><tbody>
          {dayByDay.map((v, i) => <tr key={i}><td>{v.date}</td><td>{name(v.course)}</td><td>{v.what}</td><td>{v.pdf}</td></tr>)}
        </tbody></table></div>
      </section>
    </>
  )
}

export function AbsTables() {
  return (
    <>
      {phasePrograms.map(pp => (
        <section className="panel" key={pp.id}>
          <h2>{pp.name}</h2><p>{pp.goal}</p>
          <div className="tblwrap"><table className="t"><tbody>{pp.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>
        </section>
      ))}
      <section className="panel">
        <h2>C25K week by week</h2>
        <div className="tblwrap"><table className="t"><tbody>
          {phases.filter(p => p.prog === 'c25k').map((p, i) => <tr key={i}><td>{p.short}</td><td>Wk {p.wk[0] === p.wk[1] ? p.wk[0] : `${p.wk[0]}–${p.wk[1]}`}</td><td>{p.text}</td></tr>)}
        </tbody></table></div>
      </section>
    </>
  )
}
