import { useEffect, useRef, useState } from 'react'
import { DOW, END, parse, START, today as todayKey, weekNo } from '../dates'
import { attKey, itemsOn, PRACTICE_BLOCKS, phasesForWeek, coursesForWeek, tripOn, videosOn } from '../model'
import { update, useUser } from '../storage'
import { courses } from '../data'
import { Chip } from './Chip'
import type { Program } from '../types'

const clamp = (k: string) => (k < START ? START : k > END ? END : k)

export function Today({ onOpen }: { onOpen: (p: Program, d: string) => void }) {
  const user = useUser()
  const real = todayKey()
  const [date, setDate] = useState(clamp(real))
  const wk = weekNo(date)
  const trip = tripOn(date, user.settings.tripsOff)
  const items = itemsOn(date, user).sort((a, b) => a.p.time.localeCompare(b.p.time))
  const practice = user.practice[date] ?? {}
  const shift = (n: number) => { const d = parse(date); d.setDate(d.getDate() + n); setDate(clamp(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)) }
  const add = (id: string, min: number) => update(u => ({ ...u, practice: { ...u.practice, [date]: { ...u.practice[date], [id]: Math.max(0, (u.practice[date]?.[id as 'sax'] ?? 0) + min) } } }))
  const setField = (f: 'notes' | 'standardOfWeek' | 'songTranscribed', v: string) => update(u => ({ ...u, practice: { ...u.practice, [date]: { ...u.practice[date], [f]: v } } }))

  return (
    <section className="panel">
      <div className="daynav">
        <button className="btn" onClick={() => shift(-1)} aria-label="Previous day">‹</button>
        <h2>{DOW[parse(date).getDay()]}, {date}{date === real ? ' · today' : ''}</h2>
        <button className="btn" onClick={() => shift(1)} aria-label="Next day">›</button>
      </div>
      <p>{wk >= 1 ? `Week ${wk}` : 'Before week 1'}{trip ? ` · ✈ ${trip.name}` : ''}</p>
      {wk >= 1 && <div className="wk online" style={{ margin: '0 0 12px' }}>
        {coursesForWeek(wk).map(c => <span key={c.id} className="pill" style={{ '--c': `var(--${c.id})` } as React.CSSProperties} title={c.feeds}>{c.short}</span>)}
        {phasesForWeek(wk).map((p, i) => <span key={i} className="pill phase" style={{ '--c': `var(--${p.id})` } as React.CSSProperties} title={p.text}>{p.short}</span>)}
      </div>}

      <h3>Schedule</h3>
      <div className="chips wide">
        {items.length === 0 && <p>Nothing scheduled.</p>}
        {items.map(({ p, missed, maybe }) => <Chip key={p.id} p={p} missed={missed} maybe={maybe} att={user.attendance[attKey(p.id, date)]} onOpen={() => onOpen(p, date)} />)}
        {videosOn(date).map((v, i) => <div key={i} className="chip online" style={{ '--c': `var(--${v.course})` } as React.CSSProperties}><b>{courses.find(c => c.id === v.course)?.short}</b><span>{v.what}</span></div>)}
      </div>

      <h3>Practice</h3>
      <div className="blocks">
        {PRACTICE_BLOCKS.map(b => <Block key={b.id} label={b.label} target={b.target} mins={practice[b.id] ?? 0} onAdd={m => add(b.id, m)} />)}
      </div>
      <div className="row">
        <label>Standard of the week<input value={practice.standardOfWeek ?? ''} onChange={e => setField('standardOfWeek', e.target.value)} /></label>
        <label>Song transcribed today<input value={practice.songTranscribed ?? ''} onChange={e => setField('songTranscribed', e.target.value)} /></label>
      </div>
      <label className="block">Notes<textarea rows={2} value={practice.notes ?? ''} onChange={e => setField('notes', e.target.value)} /></label>
    </section>
  )
}

function Block({ label, target, mins, onAdd }: { label: string; target: number; mins: number; onAdd: (m: number) => void }) {
  const [start, setStart] = useState<number | null>(null)
  const [, tick] = useState(0)
  const t = useRef<number>()
  useEffect(() => { if (start) { t.current = window.setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(t.current) } }, [start])
  const running = start ? Math.floor((Date.now() - start) / 1000) : 0
  const stop = () => { if (start) { onAdd(Math.max(1, Math.round(running / 60))); setStart(null) } }
  return (
    <div className="block-card">
      <b>{label}</b>
      <div className="bar"><i style={{ width: `${Math.min(100, (mins / target) * 100)}%` }} /></div>
      <span>{mins} / {target} min</span>
      <div className="row">
        {start
          ? <button className="btn primary" onClick={stop}>Stop {Math.floor(running / 60)}:{String(running % 60).padStart(2, '0')}</button>
          : <button className="btn" onClick={() => setStart(Date.now())}>▶ Timer</button>}
        <button className="btn" onClick={() => onAdd(15)}>+15</button>
        <button className="btn" onClick={() => onAdd(30)}>+30</button>
        <button className="btn" onClick={() => onAdd(-15)}>−15</button>
      </div>
    </div>
  )
}
