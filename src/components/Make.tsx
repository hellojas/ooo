import { useState } from 'react'
import { today } from '../dates'
import { update, useUser } from '../storage'
import seed from '../../data/make-seed.json'
import type { MakeItem, MakeKind } from '../types'

export const KINDS: MakeKind[] = ['project', 'paper', 'book', 'art']
/** The list, seeded from data/make-seed.json until you touch it. */
export const makeItems = (items?: MakeItem[]) => items ?? (seed as MakeItem[])
export const makeList = (items?: MakeItem[]) => makeItems(items).filter(x => !x.done)
/** The one Make item in play: first undone in the list. Reorder by hand. */
export const currentMake = (items?: MakeItem[]) => makeList(items)[0]
const uid = () => Math.random().toString(36).slice(2, 9)

export function setMake(fn: (items: MakeItem[]) => MakeItem[]) { update(u => ({ ...u, make: fn(makeItems(u.make)) })) }

/** Roadmap → Make: projects, dev work, papers. A list with a next step each. The top one is what Today shows. */
export function MakeList() {
  const user = useUser()
  const items = makeItems(user.make)
  const [title, setTitle] = useState(''), [kind, setKind] = useState<MakeKind>('project'), [showDone, setShowDone] = useState(false)
  const add = () => { if (!title.trim()) return; setMake(l => [...l, { id: uid(), title: title.trim(), kind }]); setTitle('') }
  const move = (id: string, dir: -1 | 1) => setMake(l => { const i = l.findIndex(x => x.id === id), j = i + dir; if (i < 0 || j < 0 || j >= l.length) return l; const c = [...l]; [c[i], c[j]] = [c[j], c[i]]; return c })
  const patch = (id: string, v: Partial<MakeItem>) => setMake(l => l.map(x => x.id === id ? { ...x, ...v } : x))
  const open = items.filter(x => !x.done), done = items.filter(x => x.done)
  const minutes = Object.values(user.practice).reduce((n, p) => n + (p.make ?? 0), 0)
  return (
    <section className="plain make">
      <h2>Make</h2>
      <p className="lede serif">Projects, dev work, papers. A list, not a curriculum: the top one is what Today shows.</p>
      <p className="meta">A paper is read deeply: one page of notes and a tiny repro before it’s done. Books belong to the Tuesday and Friday coffee mornings. {minutes > 0 ? `${Math.round(minutes / 6) / 10} h logged so far.` : ''}</p>
      <form className="row" onSubmit={e => { e.preventDefault(); add() }}>
        <input placeholder="New project or paper…" value={title} onChange={e => setTitle(e.target.value)} />
        <select value={kind} onChange={e => setKind(e.target.value as MakeKind)}>{KINDS.map(k => <option key={k} value={k}>{k}</option>)}</select>
        <button className="btn primary">Add</button>
      </form>
      {open.length === 0 && <p className="empty">Nothing on the list. Add the thing you keep thinking about.</p>}
      <ol className="makelist">
        {open.map((x, i) => (
          <li key={x.id} className={i === 0 ? 'top' : ''}>
            <span className="qn num">{i + 1}</span>
            <span className="qbody">
              <b>{x.url ? <a href={x.url} target="_blank" rel="noreferrer">{x.title} ↗</a> : x.title}</b> <small className="qtag">{x.kind}</small>{i === 0 && <small className="qtag now">up next</small>}
              <label className="block small">Next step <input value={x.next ?? ''} placeholder="the smallest next thing…" onChange={e => patch(x.id, { next: e.target.value })} /></label>
              <label className="block small">Link <input type="url" value={x.url ?? ''} placeholder="repo, PDF, doc…" onChange={e => patch(x.id, { url: e.target.value })} /></label>
            </span>
            <span className="qacts">
              <button className="linkbtn quiet" onClick={() => move(x.id, -1)} disabled={i === 0}>up</button>
              <button className="linkbtn quiet" onClick={() => move(x.id, 1)} disabled={i === open.length - 1}>down</button>
              <button className="linkbtn quiet" onClick={() => patch(x.id, { done: today() })}>done</button>
              <button className="linkbtn quiet" onClick={() => setMake(l => l.filter(y => y.id !== x.id))}>remove</button>
            </span>
          </li>
        ))}
      </ol>
      {done.length > 0 && <p className="meta"><button className="linkbtn quiet" onClick={() => setShowDone(!showDone)}>{showDone ? 'hide' : 'show'} {done.length} done</button></p>}
      {showDone && <ul className="makelist done">{done.map(x => <li key={x.id}><span>✓ </span><span>{x.title} <small className="meta">· {x.kind} · {x.done}</small></span> <button className="linkbtn quiet" onClick={() => patch(x.id, { done: undefined })}>undo</button></li>)}</ul>}
    </section>
  )
}
