import { useState } from 'react'
import plan from '../../data/block-tasks.json'
import { programs } from '../data'
import { DOW, addDays, key, parse, today, weekNo, weekStart } from '../dates'
import { DAY_TYPES, dayTypeFor, stateOf, type DayType } from '../model'
import { update, useUser } from '../storage'
import { WeekProgress } from './WeekProgress'
import { ProgressStrip } from './Progress'
import { replan } from '../replan'
import { standardOfWeek } from '../tasks'
import { LogView } from './LogView'

/** Sunday setup: three prompts, next week's standard, confirm classes, pre-set day types. Plus the log. */
export function Weekly({ onOpenDay }: { onOpenDay: (d: string) => void }) {
  const user = useUser()
  const [wk, setWk] = useState(Math.min(10, Math.max(1, weekNo(today()))))
  const [tab, setTab] = useState<'review' | 'log'>('review')
  const w = user.weekly[wk] ?? {}
  const cur = standardOfWeek(user, wk)
  const nextW = user.weekly[wk + 1] ?? {}
  const set = (n: number, v: object) => update(u => ({ ...u, weekly: { ...u.weekly, [n]: { ...u.weekly[n], ...v } } }))
  const test = [3, 6, 10].includes(wk)
  const nextDays = Array.from({ length: 7 }, (_, i) => key(addDays(parse(weekStart(wk + 1)), i)))
  return (
    <>
      <div className="subtabs"><button aria-pressed={tab === 'review'} onClick={() => setTab('review')}>Review</button><button aria-pressed={tab === 'log'} onClick={() => setTab('log')}>Log</button></div>
      {tab === 'log' && <LogView onOpenDay={onOpenDay} />}
      {tab === 'review' && <>
        <section className="plain">
          <div className="daynav">
            <button className="btn" onClick={() => setWk(Math.max(1, wk - 1))}>‹</button>
            <h2>Week {wk} review <small>{weekStart(wk)}</small></h2>
            <button className="btn" onClick={() => setWk(Math.min(10, wk + 1))}>›</button>
          </div>
          <ProgressStrip kind="jazz" />
          <WeekProgress wk={wk} />
          <h3>Five minutes, three prompts</h3>
          <label className="block">What’s starting to sound like music?<textarea rows={2} value={w.improved ?? ''} onChange={e => set(wk, { improved: e.target.value })} /></label>
          <label className="block">One fix for next week<textarea rows={2} value={w.review ?? ''} onChange={e => set(wk, { review: e.target.value })} /></label>
          <div className="block">
            <span className="lbl">Next week’s tune</span>
            <div className="seg small">
              <button aria-pressed={nextW.standard === cur} onClick={() => set(wk + 1, { standard: cur })}>Keep {cur}</button>
              <button aria-pressed={!nextW.standard || nextW.standard === plan.standards[wk]} onClick={() => set(wk + 1, { standard: undefined })}>Move on{plan.standards[wk] ? ` → ${plan.standards[wk]}` : ''}</button>
            </div>
            <label className="inl">or swap to <input list="stds" value={nextW.standard && nextW.standard !== cur ? nextW.standard : ''} placeholder="any standard" onChange={e => set(wk + 1, { standard: e.target.value || undefined })} /><datalist id="stds">{plan.standards.map(s => <option key={s} value={s} />)}</datalist></label>
          </div>
          <label className="block">Song to play by ear next week<input value={nextW.byEar ?? ''} placeholder="e.g. a pop song you know cold" onChange={e => set(wk + 1, { byEar: e.target.value })} /></label>
          <ul className="checks">
            <li><label><input type="checkbox" checked={!!w.recordedStandard} onChange={e => set(wk, { recordedStandard: e.target.checked })} /> This week’s standard recorded (head + one chorus)</label></li>
            <li><label><input type="checkbox" checked={!!w.recordedArrangement} onChange={e => set(wk, { recordedArrangement: e.target.checked })} /> By-ear arrangement recorded</label></li>
            {test && <li><label className="inl">Pull-up max test <input type="number" min={0} value={w.pullupMax ?? ''} onChange={e => set(wk, { pullupMax: e.target.value === '' ? undefined : Number(e.target.value) })} /></label></li>}
          </ul>
          <label className="block">The takes <input type="url" placeholder="Drive / Voice Memos link" value={w.recordingUrl ?? ''} onChange={e => set(wk, { recordingUrl: e.target.value })} /></label>
        </section>
        <section className="plain">
          <h3>Adjust next week from this one</h3>
          <p className="meta">One button. It keeps the tune if it isn’t memorized, nudges the piano guideline up or down by how the week went, and eases next week if your body complained. You can still change anything below.</p>
          <button className="btn primary" onClick={() => { const r = replan(user, wk); update(() => r.user) }}>Replan week {wk + 1}</button>
          {w.replan && <ul className="checks replan">{w.replan.map((c, i) => <li key={i}>{c}</li>)}</ul>}
        </section>
        <section className="plain">
          <h3>Set up week {wk + 1}</h3>
          <p className="meta">The app decides each day: trips → Travel, weekends → Rest, a class that afternoon → Class, a missed day or a tired/sore body → Light, five days in a row → Light. Override a day here only if you already know something it doesn’t.</p>
          <div className="daytypes">{nextDays.map(d => { const t = dayTypeFor(user, d, today()); return (
            <div key={d} className="dt"><span>{DOW[parse(d).getDay()]} {parse(d).getDate()}</span>
              <select value={user.practice[d]?.dayType ?? ''} onChange={e => update(u => ({ ...u, practice: { ...u.practice, [d]: { ...u.practice[d], dayType: (e.target.value || undefined) as DayType | undefined } } }))}>
                <option value="">auto ({t})</option>{DAY_TYPES.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}</select></div>) })}</div>
          <p className="meta">Classes next week: {programs.filter(p => p.kind === 'inperson' && stateOf(p, user) !== 'considering' && p.dates.some(d => nextDays.includes(d))).map(p => `${p.short}${stateOf(p, user) === 'registered' ? '' : ' (planned)'}`).join(' · ') || 'none'} — change in Configure.</p>
        </section>
      </>}
    </>
  )
}
