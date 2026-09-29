import { useEffect, useState } from 'react'
import { DOW, END, MONTHS, key, parse, START, today as todayKey, weekNo } from '../dates'
import { courses } from '../data'
import { DAY_TYPES, blocksForType, coursesForWeek, dayTypeFor, defaultStartFor, fmtMin, itemsOn, phasesForWeek, setTaipeiStart, startFor, streak, tripOn, type DayType } from '../model'
import { span } from '../ics'
import { update, useUser } from '../storage'
import { standardOfWeek, tasksFor } from '../tasks'
import { courseLinks } from '../drive'
import { DaySchedule } from './DaySchedule'
import { DayLog } from './DayLog'
import { WeekProgress } from './WeekProgress'
import type { Program } from '../types'

export const clampDay = (k: string) => (k < START ? START : k > END ? END : k)
export const shiftDay = (k: string, n: number) => { const d = parse(k); d.setDate(d.getDate() + n); return clampDay(key(d)) }
export const fmtDate = (k: string) => { const d = parse(k); return `${DOW[d.getDay()]}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}` }

const useNow = () => {
  const [n, setN] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setN(new Date()), 30_000); return () => clearInterval(t) }, [])
  return n
}

/** This week's courses + phases: quiet rows, course links + PDFs. */
export function WeekFocus({ wk, onNav }: { wk: number; onNav: (v: 'fitness') => void }) {
  if (wk < 1) return null
  const pdfs = coursesForWeek(wk).flatMap(c => courseLinks(c.id)).filter((l, i, a) => a.findIndex(x => x.url === l.url) === i)
  return (
    <div className="focus">
      {coursesForWeek(wk).map(c => <a key={c.id} className="focus-row" href={c.url} target="_blank" rel="noreferrer"><b>{c.short} ↗</b><span>{c.feeds}</span></a>)}
      {pdfs.length > 0 && <div className="pdfrow">{pdfs.map(l => <a key={l.url} href={l.url} target="_blank" rel="noreferrer">📄 {l.label}</a>)}</div>}
      {phasesForWeek(wk).map((p, i) => <button key={i} className="focus-row" onClick={() => onNav('fitness')}><b>{p.short}</b><span>{p.text}</span></button>)}
    </div>
  )
}

export function Today({ date, setDate, onOpen, onNav }: { date: string; setDate: (d: string) => void; onOpen: (p: Program, d: string) => void; onNav: (v: 'fitness') => void }) {
  const user = useUser()
  setTaipeiStart(user.settings.taipeiStart)
  const now = useNow()
  const real = todayKey(), wk = weekNo(date), isToday = date === real
  const trip = tripOn(date, user.settings.tripsOff)
  const type = dayTypeFor(user, date, real)
  const setType = (t: DayType) => update(u => ({ ...u, practice: { ...u.practice, [date]: { ...u.practice[date], dayType: t } } }))
  const nowMin = isToday ? now.getHours() * 60 + now.getMinutes() : undefined
  const st = streak(user, date)
  const std = standardOfWeek(user, wk)
  const [showWeek, setShowWeek] = useState(false)

  // Now / next: current template block or fixed session, then the next fixed commitment.
  const blocks = blocksForType(date, type, startFor(user, date)).filter(b => !(user.practice[date]?.skipped ?? []).includes(b.title))
  const sessions = itemsOn(date, user).filter(x => !x.missed && !['climb', 'climbLES', 'run', 'run2'].includes(x.p.id)).map(x => ({ p: x.p, t: span(x.p.time) })).filter(x => x.t) as { p: Program; t: [number, number] }[]
  const cur = nowMin == null ? undefined : blocks.find(b => nowMin >= b.start && nowMin < b.end) ?? sessions.filter(s => nowMin >= s.t[0] && nowMin < s.t[1]).map(s => ({ title: s.p.short, start: s.t[0], end: s.t[1] }))[0]
  const next = nowMin == null ? undefined : [...blocks.map(b => ({ title: b.title, start: b.start })), ...sessions.map(s => ({ title: s.p.short, start: s.t[0] }))].filter(x => x.start > nowMin).sort((a, b) => a.start - b.start)[0]
  const nextClass = sessions.filter(s => s.p.kind === 'inperson' && (nowMin == null || s.t[0] > nowMin)).sort((a, b) => a.t[0] - b.t[0])[0]
  const tasks = tasksFor(date, user, type)
  const firstTask = Object.values(tasks).flat().find(t => t.id.startsWith('std'))?.label.split(': ')[1]
  const lesson = courses.find(c => c.id === coursesForWeek(wk)[0]?.id)
  const pianoToday = (user.practice[date]?.piano1 ?? 0) + (user.practice[date]?.piano2 ?? 0)

  return (
    <div className="today">
      <div className="daynav">
        <button className="btn" onClick={() => setDate(shiftDay(date, -1))} aria-label="Previous day">‹</button>
        <h2>{fmtDate(date)}{isToday ? '' : date < real ? ' · past' : ' · preview'}</h2>
        <button className="btn" onClick={() => setDate(shiftDay(date, 1))} aria-label="Next day">›</button>
      </div>
      <p className="meta">{wk >= 1 ? `Week ${wk}` : date < START ? 'Before the sabbatical' : 'After'}{trip ? ` · ✈ ${trip.name}` : ''}{st.days > 0 ? ` · 🔥 ${st.days}-day streak` : ''}{!isToday && <> · <button className="linkbtn quiet" onClick={() => setDate(clampDay(real))}>jump to today</button></>}</p>

      <div className="seg types" role="group" aria-label="Day type">
        {DAY_TYPES.map(t => <button key={t.id} aria-pressed={type === t.id} title={t.hint} onClick={() => setType(t.id)}>{t.label}</button>)}
      </div>
      {!user.practice[date]?.dayType && type === 'floor' && <p className="meta">Yesterday was a miss, so today defaults to a Floor day. Never miss twice.</p>}

      {type !== 'rest' && (
        <section className="hero">
          <p className="eyebrow">{wk >= 1 ? `Week ${wk} · standard of the week` : 'Standard'}</p>
          <h1 className="tune">{std ?? 'Pick a standard'}</h1>
          {firstTask && <p className="lede">{firstTask}{type === 'floor' ? ' · floor day, two things and done' : ''}</p>}
          <div className="hero-links">
            {lesson && <a href={lesson.url} target="_blank" rel="noreferrer">{lesson.short} ↗</a>}
            {nextClass && <span>Next: <b>{nextClass.p.short}</b> {fmtMin(nextClass.t[0])}{nextClass.p.go ? ` · ${nextClass.p.go.split('·')[0].trim()}` : ''}</span>}
          </div>
        </section>
      )}

      {isToday && (cur || next) && (
        <div className="nowbar">
          {cur ? <><span className="eyebrow">Now</span><b className="num">{cur.title}</b><span>until {fmtMin(cur.end)}</span></> : <><span className="eyebrow">Next</span><b>{next!.title}</b><span>at {fmtMin(next!.start)}</span></>}
          {cur && next && <span className="dim">then {next.title} {fmtMin(next.start)}</span>}
        </div>
      )}

      <div className="cols">
        <div>
          <div className="row between">
            <h3>Schedule</h3>
            <label className="inl">Starts <input type="time" value={startFor(user, date)}
              onChange={e => update(u => ({ ...u, practice: { ...u.practice, [date]: { ...u.practice[date], startTime: e.target.value || undefined } } }))} />
              {user.practice[date]?.startTime && <button className="linkbtn quiet" onClick={() => update(u => ({ ...u, practice: { ...u.practice, [date]: { ...u.practice[date], startTime: undefined } } }))}>reset ({defaultStartFor(user, date)})</button>}</label>
          </div>
          <DaySchedule date={date} onOpen={onOpen} showTasks nowMin={nowMin} />
        </div>
        <aside>
          <DayLog date={date} />
          <button className="linkbtn" onClick={() => setShowWeek(!showWeek)}>{showWeek ? 'Hide' : 'Show'} week {wk} summary</button>
          {showWeek && wk >= 1 && <><WeekProgress wk={wk} from={date} /><h3>This week</h3><WeekFocus wk={wk} onNav={onNav} /></>}
        </aside>
      </div>

      {type !== 'rest' && <div className="logbar mob">
        <span className="num">{pianoToday} min piano</span>
        {[15, 30].map(m => <button key={m} className="btn" onClick={() => update(u => ({ ...u, practice: { ...u.practice, [date]: { ...u.practice[date], piano1: (u.practice[date]?.piano1 ?? 0) + m } } }))}>+{m}</button>)}
        <button className="btn" onClick={() => update(u => ({ ...u, practice: { ...u.practice, [date]: { ...u.practice[date], sax: (u.practice[date]?.sax ?? 0) + 15 } } }))}>sax +15</button>
      </div>}
    </div>
  )
}
