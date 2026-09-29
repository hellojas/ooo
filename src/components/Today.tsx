import type { CSSProperties } from 'react'
import { DOW, END, key, parse, START, today as todayKey, weekNo } from '../dates'
import { coursesForWeek, DEFAULT_START, phasesForWeek, setTaipeiStart, startFor, tripOn } from '../model'
import { update, useUser } from '../storage'
import { DaySchedule } from './DaySchedule'
import { DayLog } from './DayLog'
import { WeekProgress } from './WeekProgress'
import type { Program } from '../types'

export const clampDay = (k: string) => (k < START ? START : k > END ? END : k)
export const shiftDay = (k: string, n: number) => { const d = parse(k); d.setDate(d.getDate() + n); return clampDay(key(d)) }

/** This week's focus: courses link to their course page; training phases show their prescription. */
export function WeekFocus({ wk, onNav }: { wk: number; onNav: (v: 'abs') => void }) {
  if (wk < 1) return null
  return (
    <div className="focus">
      {coursesForWeek(wk).map(c => <a key={c.id} className="focus-row" style={{ '--c': `var(--${c.id})` } as CSSProperties} href={c.url} target="_blank" rel="noreferrer"><b>{c.short}</b><span>{c.feeds}</span></a>)}
      {phasesForWeek(wk).map((p, i) => <button key={i} className="focus-row phase" style={{ '--c': `var(--${p.id})` } as CSSProperties} onClick={() => onNav('abs')}><b>{p.short}</b><span>{p.text}</span></button>)}
    </div>
  )
}

export function Today({ date, setDate, onOpen, onNav }: { date: string; setDate: (d: string) => void; onOpen: (p: Program, d: string) => void; onNav: (v: 'abs') => void }) {
  const user = useUser()
  setTaipeiStart(user.settings.taipeiStart)
  const real = todayKey(), wk = weekNo(date)
  const trip = tripOn(date, user.settings.tripsOff)
  return (
    <section className="panel">
      <div className="daynav">
        <button className="btn" onClick={() => setDate(shiftDay(date, -1))} aria-label="Previous day">‹</button>
        <h2>{DOW[parse(date).getDay()]}, {date}{date === real ? ' · today' : ''}</h2>
        <button className="btn" onClick={() => setDate(shiftDay(date, 1))} aria-label="Next day">›</button>
      </div>
      <p>{wk >= 1 ? `Week ${wk}` : 'Before week 1'}{trip ? ` · ✈ ${trip.name}` : ''}</p>
      {wk >= 1 && <><h3>Week {wk} so far</h3><WeekProgress wk={wk} from={date} /></>}
      <h3>This week’s focus</h3>
      <WeekFocus wk={wk} onNav={onNav} />
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>Schedule</h3>
        <label className="inl">Day starts <input type="time" value={startFor(user, date)}
          onChange={e => update(u => ({ ...u, practice: { ...u.practice, [date]: { ...u.practice[date], startTime: e.target.value || undefined } } }))} />
          {user.practice[date]?.startTime && <button className="linkbtn" onClick={() => update(u => ({ ...u, practice: { ...u.practice, [date]: { ...u.practice[date], startTime: undefined } } }))}>reset to {user.settings.startTime || DEFAULT_START}</button>}</label>
      </div>
      <DaySchedule date={date} onOpen={onOpen} />
      <DayLog date={date} />
    </section>
  )
}
