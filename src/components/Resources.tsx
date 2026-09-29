import { useState } from 'react'
import { courses, programs } from '../data'
import { Coffee } from './Coffee'

const SECTIONS = [['coffee', 'Coffee shops'], ['links', 'Program Links']] as const

/** Reference material. Coffee shops is one section; Links is a single screen of the real deep links. */
export function Resources() {
  const [sec, setSec] = useState<(typeof SECTIONS)[number][0]>('coffee')
  const seen = new Set<string>()
  const links = programs.filter(p => p.url && !seen.has(p.url) && seen.add(p.url))
  return (
    <>
      <div className="subtabs" role="group" aria-label="Resources">
        {SECTIONS.map(([id, label]) => <button key={id} aria-pressed={sec === id} onClick={() => setSec(id)}>{label}</button>)}
      </div>
      {sec === 'coffee' && <Coffee />}
      {sec === 'links' && (
        <section className="plain">
          <h2>Program Links</h2>
          <h3>Classes &amp; places</h3>
          <ul className="linklist">{links.map(p => <li key={p.id}><a href={p.url} target="_blank" rel="noreferrer">{p.name}</a><span className="sub">{p.loc}</span></li>)}</ul>
          <h3>Open Studio courses</h3>
          <ul className="linklist">{courses.map(c => <li key={c.id}><a href={c.url} target="_blank" rel="noreferrer">{c.name}</a><span className="sub">week {c.wk[0] === c.wk[1] ? c.wk[0] : `${c.wk[0]}–${c.wk[1]}`}</span></li>)}</ul>
        </section>
      )}
    </>
  )
}
