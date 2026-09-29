import { useMemo, useState } from 'react'
import { DOW, MONTHS, END, START, parse, today, weekNo } from '../dates'
import { attKey, itemsOn, monthWeeks, setTaipeiStart, stateOf, tripOn } from '../model'
import { project, type QItem } from '../queue'
import { update, useUser } from '../storage'
import { gcalUrl } from '../ics'
import type { Program } from '../types'

type Cat = 'Classes' | 'Piano' | 'Sax' | 'Fitness' | 'Lifestyle' | 'Travel'
const CATS: { id: Cat; color: string }[] = [
  { id: 'Classes', color: '#7c6cf0' }, { id: 'Piano', color: '#4a8df0' }, { id: 'Sax', color: '#f0a03a' },
  { id: 'Fitness', color: '#3fae5a' }, { id: 'Lifestyle', color: '#9a9a9a' }, { id: 'Travel', color: '#e06060' },
]
interface Ev { id: string; cat: Cat; time?: string; title: string; desc?: string; optional?: boolean; done?: boolean; missed?: boolean; q?: QItem; p?: Program; url?: string }

/** Month grid in the reference style. Fixed dates are classes and trips; everything else is the queue, projected. */
export function MonthCal({ onOpenDay }: { onOpenDay: (d: string) => void }) {
  const user = useUser()
  setTaipeiStart(user.settings.taipeiStart)
  const real = today()
  const [m, setM] = useState(() => { const d = parse(real < START ? START : real > END ? END : real); return d.getMonth() })
  const [mode, setMode] = useState<'month' | 'agenda'>('month')
  const [showOpt, setShowOpt] = useState(true)
  const [hide, setHide] = useState<Set<Cat>>(new Set())
  const [sel, setSel] = useState<{ ev: Ev; date: string } | null>(null)
  const projected = useMemo(() => project(user, real), [user, real])

  const eventsOn = (d: string): Ev[] => {
    const out: Ev[] = []
    const trip = tripOn(d, user.settings.tripsOff)
    if (trip) out.push({ id: 'trip', cat: 'Travel', title: `✈ ${trip.name}`, optional: trip.tentative })
    for (const { p, missed, maybe, state } of itemsOn(d, user)) {
      if (['climb', 'climbLES', 'run', 'run2'].includes(p.id)) continue
      const att = user.attendance[attKey(p.id, d)]
      out.push({ id: p.id, cat: p.kind === 'inperson' ? 'Classes' : 'Lifestyle', time: p.time.replace(/^[A-Z][a-z]{2} /, ''), title: p.short, desc: [p.loc, p.go].filter(Boolean).join(' · '),
        optional: !!p.drop || state === 'planned' || maybe, done: att === 'went', missed: missed || att === 'missed' || att === 'skipped', p, url: p.url })
    }
    for (const q of projected.alloc[d] ?? []) {
      const cat: Cat = q.lane === 'piano' ? 'Piano' : q.lane === 'sax' ? 'Sax' : 'Fitness'
      const title = q.kind === 'lesson' ? `Lesson · ${q.label.split(': ')[1]}` : q.kind === 'standard' ? q.label : q.kind === 'technique' ? q.label.replace(/^Technique: /, 'Technique · ') : q.kind === 'sax' ? 'Sax · ' + q.label.split(' · ')[0] : q.label.split(':')[0]
      out.push({ id: q.id, cat, title, desc: q.label, done: user.queueDone?.[q.id] === d, q, url: q.url })
    }
    return out.filter(e => !hide.has(e.cat) && (showOpt || !e.optional))
  }

  const weeks = monthWeeks(2026, m)
  const monthKey = `2026-${String(m + 1).padStart(2, '0')}`
  const inMonth = (d: string) => d.startsWith(monthKey)
  const days = weeks.flat().filter(Boolean) as string[]
  const stats = useMemo(() => {
    const evs = days.flatMap(d => eventsOn(d).map(e => ({ e, d })))
    const piano = Object.entries(user.practice).filter(([d]) => inMonth(d)).reduce((n, [, p]) => n + (p.piano1 ?? 0) + (p.piano2 ?? 0), 0)
    const climbs = Object.entries(user.climbing).filter(([d, c]) => inMonth(d) && c.done).length + evs.filter(x => x.e.q?.kind === 'climb' && !x.e.done && x.d >= real).length
    const jazz = evs.filter(x => x.e.cat === 'Classes' && !x.e.missed).length
    return { events: evs.length, piano: Math.round(piano / 6) / 10, climbs, jazz }
  }, [days, user, hide, showOpt]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDone = (ev: Ev, d: string) => {
    if (ev.q) update(u => { const qd = { ...u.queueDone }; if (qd[ev.q!.id] === d) delete qd[ev.q!.id]; else qd[ev.q!.id] = d; return { ...u, queueDone: qd } })
    else if (ev.p) update(u => { const a = { ...u.attendance }; const k = attKey(ev.p!.id, d); if (a[k] === 'went') delete a[k]; else a[k] = 'went'; return { ...u, attendance: a } })
  }

  return (
    <div className="mcal">
      <div className="mcal-head">
        <div>
          <h2>Fall 2026 sabbatical</h2>
          <p className="sub">{START} → {END} · classes are fixed; piano, sax and workouts are the queue, projected from today. Tick things off and the rest moves.</p>
          <div className="toolbar">
            <button className="pill" onClick={() => setM(Math.max(9, m - 1))} disabled={m <= 9}>←</button>
            <button className="pill active">{MONTHS[m]} 2026</button>
            <button className="pill" onClick={() => setM(Math.min(11, m + 1))} disabled={m >= 11}>→</button>
            <button className={'pill' + (mode === 'month' ? ' active' : '')} onClick={() => setMode('month')}>Month</button>
            <button className={'pill' + (mode === 'agenda' ? ' active' : '')} onClick={() => setMode('agenda')}>Agenda</button>
            <label className="pill"><input type="checkbox" checked={showOpt} onChange={e => setShowOpt(e.target.checked)} /> optional</label>
          </div>
          <div className="legend2">{CATS.map(c => <button key={c.id} className={'pill' + (hide.has(c.id) ? ' off' : '')} onClick={() => { const h = new Set(hide); h.has(c.id) ? h.delete(c.id) : h.add(c.id); setHide(h) }}><i style={{ background: c.color }} />{c.id}</button>)}</div>
        </div>
      </div>
      <div className="stats">
        <div className="stat"><span>Events this month</span><b className="num">{stats.events}</b></div>
        <div className="stat"><span>Piano hours logged</span><b className="num">{stats.piano}</b></div>
        <div className="stat"><span>Climbing sessions</span><b className="num">{stats.climbs}</b></div>
        <div className="stat"><span>Live jazz sessions</span><b className="num">{stats.jazz}</b></div>
      </div>

      {mode === 'month' ? (
        <section className="mgrid-wrap">
          <div className="mdow">{DOW.map(d => <div key={d}>{d}</div>)}</div>
          <div className="mgrid">
            {weeks.flat().map((d, i) => {
              if (!d) return <div key={i} className="mday other" />
              const evs = eventsOn(d), wk = weekNo(d)
              return (
                <div key={d} className={'mday' + (d === real ? ' today' : '') + (tripOn(d, user.settings.tripsOff) ? ' trip' : '')}>
                  <div className="mdate" onClick={() => onOpenDay(d)}><span>{parse(d).getDate()}</span>{parse(d).getDay() === 0 && wk >= 1 && wk <= 11 && <small>wk {wk}</small>}</div>
                  {evs.map(e => <div key={e.id} className={['mev', e.cat, e.optional ? 'optional' : '', e.done ? 'done' : '', e.missed ? 'missed' : ''].join(' ')} style={{ borderLeftColor: CATS.find(c => c.id === e.cat)!.color }} onClick={() => setSel({ ev: e, date: d })}>
                    {e.time && <span className="time">{e.time.split('–')[0]}</span>}{e.title}</div>)}
                </div>
              )
            })}
          </div>
        </section>
      ) : (
        <section className="magenda">
          {days.map(d => { const evs = eventsOn(d); if (!evs.length) return null; return (
            <div key={d} className="magenda-day">
              <div className="mdate" onClick={() => onOpenDay(d)}><b>{DOW[parse(d).getDay()]} {parse(d).getDate()}</b>{weekNo(d) >= 1 && <small> · wk {weekNo(d)}</small>}</div>
              {evs.map(e => <div key={e.id} className={['mev', 'big', e.cat, e.optional ? 'optional' : '', e.done ? 'done' : '', e.missed ? 'missed' : ''].join(' ')} style={{ borderLeftColor: CATS.find(c => c.id === e.cat)!.color }} onClick={() => setSel({ ev: e, date: d })}>
                {e.time && <span className="time">{e.time}</span>}{e.title}{e.desc && e.desc !== e.title && <small> · {e.desc}</small>}</div>)}
            </div>) })}
        </section>
      )}

      {sel && (
        <div className="sheet-bg" onClick={() => setSel(null)}>
          <div className="sheet modal" onClick={e => e.stopPropagation()} role="dialog">
            <p className="eyebrow">{sel.ev.cat} · {sel.date}{sel.ev.q && sel.date >= real && !sel.ev.done ? ' · projected' : ''}</p>
            <h2>{sel.ev.title}</h2>
            <p className="meta">{sel.ev.time ?? ''}{sel.ev.desc && sel.ev.desc !== sel.ev.title ? ` · ${sel.ev.desc}` : ''}</p>
            {sel.ev.p && <p className="meta">Status: {stateOf(sel.ev.p, user)}{sel.ev.missed ? ' · missed (travel)' : ''}</p>}
            {sel.ev.q && <p className="meta">Queue item. Marking it complete here logs it on this date; leaving it undone keeps it at the front of the queue.</p>}
            <div className="actions">
              {(sel.ev.q || sel.ev.p) && <button className="btn primary" onClick={() => { toggleDone(sel.ev, sel.date); setSel(null) }}>{sel.ev.done ? 'Mark not done' : 'Mark complete'}</button>}
              {sel.ev.url && <a className="btn" href={sel.ev.url} target="_blank" rel="noreferrer">Open ↗</a>}
              {sel.ev.p && <a className="btn" href={gcalUrl(sel.ev.p, sel.date)} target="_blank" rel="noreferrer">Google Calendar ↗</a>}
              <button className="btn" onClick={() => { onOpenDay(sel.date); setSel(null) }}>Open day</button>
              <button className="btn" onClick={() => setSel(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
