import { DOW, parse, weekStart, addDays, key, today } from '../dates'
import { DaySchedule } from './DaySchedule'
import { WeekFocus } from './Today'
import type { Program } from '../types'

export function WeekView({ wk, setWk, onOpen, onOpenDay, onNav }: { wk: number; setWk: (n: number) => void; onOpen: (p: Program, d: string) => void; onOpenDay: (d: string) => void; onNav: (v: 'abs') => void }) {
  const start = parse(weekStart(wk)), t = today()
  return (
    <section className="panel">
      <div className="daynav">
        <button className="btn" onClick={() => setWk(Math.max(1, wk - 1))}>‹</button>
        <h2>Week {wk} <small>({weekStart(wk)})</small></h2>
        <button className="btn" onClick={() => setWk(Math.min(11, wk + 1))}>›</button>
      </div>
      <WeekFocus wk={wk} onNav={onNav} />
      <div className="weekview">
        {DOW.map((d, i) => { const k = key(addDays(start, i)); return (
          <div className={'wv-day' + (k === t ? ' now' : '')} key={d}>
            <h3><button className="linkbtn" onClick={() => onOpenDay(k)}>{d} {parse(k).getMonth() + 1}/{parse(k).getDate()}</button></h3>
            <DaySchedule date={k} onOpen={onOpen} />
          </div>) })}
      </div>
    </section>
  )
}
