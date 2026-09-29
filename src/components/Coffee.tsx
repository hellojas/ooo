import { useState } from 'react'
import { shops } from '../data'
import { update, useUser } from '../storage'
import type { Shop } from '../types'

function Card({ s, custom }: { s: Shop; custom?: boolean }) {
  const user = useUser()
  const c = user.coffee[s.n] ?? {}
  const set = (v: object) => update(u => ({ ...u, coffee: { ...u.coffee, [s.n]: { ...u.coffee[s.n], ...v } } }))
  return (
    <div className={'shop' + (c.visited ? ' done' : '')}>
      <input type="checkbox" checked={!!c.visited} aria-label={`Visited ${s.n}`} onChange={e => set({ visited: e.target.checked, date: e.target.checked ? new Date().toISOString().slice(0, 10) : undefined })} />
      <div>
        <h4>{s.u ? <a href={s.u} target="_blank" rel="noreferrer">{s.n}</a> : s.n}</h4>
        {(s.a || s.w) && <div className="addr">{[s.a, s.w].filter(Boolean).join(' · ')}</div>}
        {s.why && <p className="why">{s.why}</p>}
        {s.tags.length > 0 && <div className="tags">{s.tags.map(t => <span key={t}>{t}</span>)}</div>}
        {c.visited && <div className="row">
          <label>Rating<input type="number" min={1} max={5} value={c.rating ?? ''} onChange={e => set({ rating: e.target.value ? Number(e.target.value) : undefined })} /></label>
          <label>Note<input value={c.note ?? ''} onChange={e => set({ note: e.target.value })} /></label>
        </div>}
        {custom && <button className="linkbtn" onClick={() => update(u => ({ ...u, customShops: u.customShops.filter(x => x.n !== s.n) }))}>remove</button>}
      </div>
    </div>
  )
}

export function Coffee() {
  const user = useUser()
  const [n, setN] = useState(''), [a, setA] = useState(''), [u, setU] = useState('')
  const add = () => { if (n.trim()) { update(x => ({ ...x, customShops: [...x.customShops, { n: n.trim(), a, w: '', why: '', tags: [], u }] })); setN(''); setA(''); setU('') } }
  const all = [...user.customShops.map(s => ({ s, custom: true })), ...shops.map(s => ({ s, custom: false }))]
  return (
    <section className="panel">
      <h2>Coffee shops</h2><p>From your Google Maps “Nyc” list, nearest first. Read here Tuesday and Friday mornings.</p>
      <div className="row">
        <label>Add a shop<input placeholder="Name" value={n} onChange={e => setN(e.target.value)} /></label>
        <label>Address<input value={a} onChange={e => setA(e.target.value)} /></label>
        <label>Maps / site link<input type="url" placeholder="https://…" value={u} onChange={e => setU(e.target.value)} /></label>
        <button className="btn" onClick={add}>Add</button>
      </div>
      <div className="shops">{all.map(({ s, custom }) => <Card key={s.n} s={s} custom={custom} />)}</div>
    </section>
  )
}
