import { useState } from 'react'
import { lunch, shops } from '../data'
import { update, useUser } from '../storage'
import type { Shop } from '../types'

function Card({ s, custom }: { s: Shop; custom?: boolean }) {
  const user = useUser()
  const c = user.coffee[s.n] ?? {}
  const [showLunch, setShowLunch] = useState(false)
  const set = (v: object) => update(u => ({ ...u, coffee: { ...u.coffee, [s.n]: { ...u.coffee[s.n], ...v } } }))
  const nearby = lunch.filter(l => l.nb === s.nb && l.nb !== 'Elsewhere')
  return (
    <div className={'shop' + (c.visited ? ' done' : '')}>
      <input type="checkbox" checked={!!c.visited} aria-label={`Visited ${s.n}`} onChange={e => set({ visited: e.target.checked, date: e.target.checked ? new Date().toISOString().slice(0, 10) : undefined })} />
      <div>
        <h4>{s.u ? <a href={s.u} target="_blank" rel="noreferrer">{s.n}</a> : s.n}</h4>
        {(s.a || s.w) && <div className="addr">{[s.a, s.w].filter(Boolean).join(' · ')}</div>}
        {s.why && <p className="why">{s.why}</p>}
        <div className="row">
          {c.visited && <><label className="inl">Rating <input type="number" min={1} max={5} value={c.rating ?? ''} onChange={e => set({ rating: e.target.value ? Number(e.target.value) : undefined })} /></label>
            <input placeholder="Memory / book note" value={c.note ?? ''} onChange={e => set({ note: e.target.value })} /></>}
          {nearby.length > 0 && <button className="linkbtn quiet" onClick={() => setShowLunch(!showLunch)}>{showLunch ? 'hide' : `lunch nearby (${nearby.length})`}</button>}
          {custom && <button className="linkbtn quiet" onClick={() => update(u => ({ ...u, customShops: u.customShops.filter(x => x.n !== s.n) }))}>remove</button>}
        </div>
        {showLunch && <ul className="lunchlist">{nearby.map(l => <li key={l.n}><a href={l.u} target="_blank" rel="noreferrer">{l.n}</a>{l.a && <span className="meta"> · {l.a.replace(/, (Brooklyn|New York), NY.*$/, '')}</span>}{l.note && <span className="meta"> · {l.note}</span>}</li>)}</ul>}
      </div>
    </div>
  )
}

export function Coffee() {
  const user = useUser()
  const [n, setN] = useState(''), [a, setA] = useState(''), [u, setU] = useState('')
  const NBS = ['Williamsburg', 'Greenpoint', 'East Williamsburg', 'Bushwick', 'Lower East Side', 'East Village', 'West Village', 'SoHo', 'Chelsea', 'Midtown', 'Upper West Side', 'Upper East Side', 'Prospect Heights', 'Park Slope', 'Carroll Gardens', 'Downtown Brooklyn', 'Long Island City', 'Harlem', 'Tribeca', 'Chinatown']
  const guessNb = (addr: string) => NBS.find(x => addr.toLowerCase().includes(x.toLowerCase())) ?? 'Added'
  const add = () => { if (n.trim()) { update(x => ({ ...x, customShops: [...x.customShops, { n: n.trim(), a, w: '', why: '', tags: [], u, nb: guessNb(a) }] })); setN(''); setA(''); setU('') } }
  const all = [...user.customShops, ...shops]
  const groups = [...new Set(all.map(s => s.nb ?? 'Elsewhere'))]
  return (
    <section className="plain">
      <h2>Coffee shops</h2>
      <p className="meta">Protected mornings, Tuesday and Friday. From your Maps “Nyc” list, by neighborhood; each shop can show lunch spots from the same list nearby.</p>
      <details className="addshop"><summary>Add a shop</summary>
        <div className="row"><input placeholder="Name" value={n} onChange={e => setN(e.target.value)} /><input placeholder="Address" value={a} onChange={e => setA(e.target.value)} /><input type="url" placeholder="Link" value={u} onChange={e => setU(e.target.value)} /><button className="btn" onClick={add}>Add</button></div>
      </details>
      {groups.map(g => (
        <div key={g}><h3>{g}</h3><div className="shops">{all.filter(s => (s.nb ?? 'Elsewhere') === g).map(s => <Card key={s.n} s={s} custom={user.customShops.some(x => x.n === s.n)} />)}</div></div>
      ))}
    </section>
  )
}
