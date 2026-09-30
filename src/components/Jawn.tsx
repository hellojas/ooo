import { useState } from 'react'
import jawn from '../../data/jawn.json'

// Soft lock only: the content ships in the app bundle (base64), so this keeps it out of casual view, not truly secret.
const PW = 'loo'
const KEY = 'ooo:jawn'
type Item = { t: string; n: string }
const decode = (): { dates: Item[]; games: Item[] } => JSON.parse(decodeURIComponent(escape(atob(jawn.blob))))

export function Jawn() {
  const [ok, setOk] = useState(false)   // always asks; nothing remembered
  const [pw, setPw] = useState(''), [bad, setBad] = useState(false)
  const [ideas, setIdeas] = useState<Item[]>(() => { try { return JSON.parse(localStorage.getItem(KEY + ':mine') ?? '[]') } catch { return [] } })
  const [t, setT] = useState(''), [n, setN] = useState('')
  if (!ok) return (
    <section className="plain gate">
      <p className="meta">who climbs the next 14 flights of stairs?</p>
      <form onSubmit={e => { e.preventDefault(); if (pw === PW) setOk(true); else setBad(true) }} className="row">
        <input type="password" placeholder="password" value={pw} onChange={e => { setPw(e.target.value); setBad(false) }} autoFocus />
        <button className="btn primary">Open</button>{bad && <span className="meta">nope</span>}
      </form>
    </section>
  )
  const d = decode()
  const save = (list: Item[]) => { setIdeas(list); try { localStorage.setItem(KEY + ':mine', JSON.stringify(list)) } catch { /* */ } }
  const List = ({ items }: { items: Item[] }) => <ul className="jawn">{items.map((i, k) => <li key={k}><b className="serif">{i.t}</b>{i.n && <span>{i.n}</span>}</li>)}</ul>
  return (
    <>
      <section className="plain"><h2 className="serif">Date night</h2><List items={d.dates} /></section>
      <section className="plain"><h2 className="serif">Games</h2><List items={d.games} /></section>
      <section className="plain"><h2 className="serif">Ours</h2>
        {ideas.length > 0 && <ul className="jawn">{ideas.map((i, k) => <li key={k}><b className="serif">{i.t}</b>{i.n && <span>{i.n}</span>}<button className="linkbtn quiet" onClick={() => save(ideas.filter((_, j) => j !== k))}>remove</button></li>)}</ul>}
        <div className="row"><input placeholder="Idea" value={t} onChange={e => setT(e.target.value)} /><input placeholder="Notes" value={n} onChange={e => setN(e.target.value)} /><button className="btn" onClick={() => { if (t.trim()) { save([...ideas, { t: t.trim(), n }]); setT(''); setN('') } }}>Add</button></div>
        <p className="meta">Saved on this device only.</p>
      </section>
    </>
  )
}
