import { useState } from 'react'
import { today } from '../dates'
import { update, useUser } from '../storage'
import type { Transcription } from '../types'

export const EAR_STEPS = ['Rough out the chords (bass line first, label by function)', 'Get the melody', 'Play it in the original key', 'Record a pass', 'Transpose to two more keys']
export const earDone = (t: Transcription) => (t.steps ?? []).length >= EAR_STEPS.length
/** The song you're currently working on by ear: newest one that isn't finished. */
export const currentByEar = (list: Transcription[]) => list.find(t => !earDone(t))

/** Songs learned by ear. Dynamic: add anything from Spotify or wherever, tick the steps, count what's done. */
export function ByEar() {
  const user = useUser()
  const [song, setSong] = useState(''), [url, setUrl] = useState('')
  const list = user.transcriptions
  const done = list.filter(earDone).length
  const set = (id: string, v: Partial<Transcription>) => update(u => ({ ...u, transcriptions: u.transcriptions.map(t => t.id === id ? { ...t, ...v } : t) }))
  const add = () => { if (song.trim()) { update(u => ({ ...u, transcriptions: [{ id: String(Date.now()), date: today(), song: song.trim(), note: '', url: url.trim() || undefined, steps: [], keys: 0 }, ...u.transcriptions] })); setSong(''); setUrl('') } }
  const cur = currentByEar(list)
  return (
    <>
      <section className="plain">
        <div className="row between"><div><h2>By ear</h2><p className="meta">Pick something you love. Chords and melody by ear, one recording, then two more keys. That’s a song learned.</p></div>
          <div className="stat mini"><span>Songs by ear</span><b className="num">{done}</b></div></div>
        <div className="row">
          <input placeholder="Song (from Spotify, a playlist, anywhere)" value={song} onChange={e => setSong(e.target.value)} />
          <input type="url" placeholder="Link (optional)" value={url} onChange={e => setUrl(e.target.value)} />
          <button className="btn primary" onClick={add}>Add song</button>
        </div>
        {cur && <p className="meta">Currently on: <b>{cur.song}</b> — it shows up in piano block 2 as today’s ear work.</p>}
      </section>
      {list.length === 0 && <section className="plain"><p className="empty">Nothing yet. Add the first song you want to figure out.</p></section>}
      {list.map(t => (
        <section className={'plain ear' + (earDone(t) ? ' done' : '')} key={t.id}>
          <div className="row between">
            <div><h2 className="serif">{t.url ? <a href={t.url} target="_blank" rel="noreferrer">{t.song} ↗</a> : t.song}</h2><p className="meta">added {t.date}{earDone(t) ? ` · learned${t.done ? ' ' + t.done : ''}` : ` · ${(t.steps ?? []).length}/${EAR_STEPS.length}`}</p></div>
            <button className="linkbtn quiet" onClick={() => update(u => ({ ...u, transcriptions: u.transcriptions.filter(x => x.id !== t.id) }))}>remove</button>
          </div>
          <ul className="checks">{EAR_STEPS.map(st => <li key={st}><label><input type="checkbox" checked={(t.steps ?? []).includes(st)} onChange={e => { const steps = e.target.checked ? [...(t.steps ?? []), st] : (t.steps ?? []).filter(x => x !== st); set(t.id, { steps, done: steps.length >= EAR_STEPS.length ? today() : undefined }) }} /> {st}</label>
            {st.startsWith('Transpose') && <label className="inl">keys done <input type="number" min={0} max={11} className="narrow" value={t.keys ?? 0} onChange={e => set(t.id, { keys: Number(e.target.value) })} /></label>}</li>)}</ul>
          <input placeholder="What did you steal? (progression, a voicing, a move)" value={t.note} onChange={e => set(t.id, { note: e.target.value })} />
        </section>
      ))}
    </>
  )
}
