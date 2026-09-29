import { shops } from '../data'
import { update, useUser } from '../storage'
import type { Shop } from '../types'

function Card({ s }: { s: Shop }) {
  const user = useUser()
  const c = user.coffee[s.n] ?? {}
  const set = (v: object) => update(u => ({ ...u, coffee: { ...u.coffee, [s.n]: { ...u.coffee[s.n], ...v } } }))
  return (
    <div className={'shop' + (c.visited ? ' done' : '')}>
      <input type="checkbox" checked={!!c.visited} aria-label={`Visited ${s.n}`} onChange={e => set({ visited: e.target.checked, date: e.target.checked ? new Date().toISOString().slice(0, 10) : undefined })} />
      <div>
        <h4><a href={s.u} target="_blank" rel="noreferrer">{s.n}</a></h4>
        <div className="addr">{s.a} · {s.w}</div>
        <p className="why">{s.why}</p>
        <div className="tags">{s.tags.map(t => <span key={t}>{t}</span>)}</div>
        {c.visited && <div className="row">
          <label>Rating<input type="number" min={1} max={5} value={c.rating ?? ''} onChange={e => set({ rating: e.target.value ? Number(e.target.value) : undefined })} /></label>
          <label>Note<input value={c.note ?? ''} onChange={e => set({ note: e.target.value })} /></label>
        </div>}
      </div>
    </div>
  )
}

export function Coffee() {
  return (
    <section className="panel">
      <h2>Read here</h2><p>Rotate these on Tuesday and Friday mornings.</p>
      <div className="shops">{shops.readHere.map(s => <Card key={s.n} s={s} />)}</div>
      <h2>Check out</h2>
      <div className="shops">{shops.checkOut.map(s => <Card key={s.n} s={s} />)}</div>
    </section>
  )
}
