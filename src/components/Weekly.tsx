import { useState } from 'react'
import { MILESTONES, phasesForWeek, progress } from '../model'
import { update, useUser } from '../storage'
import { today, weekNo, weekStart } from '../dates'
import { WeekProgress } from './WeekProgress'

export function Weekly() {
  const user = useUser()
  const [wk, setWk] = useState(Math.min(10, Math.max(1, weekNo(today()))))
  const w = user.weekly[wk] ?? {}
  const p = progress(user, wk)
  const set = (v: Partial<typeof w>) => update(u => ({ ...u, weekly: { ...u.weekly, [wk]: { ...u.weekly[wk], ...v } } }))
  const test = [3, 6, 10].includes(wk)
  return (
    <>
      <section className="panel">
        <div className="daynav">
          <button className="btn" onClick={() => setWk(Math.max(1, wk - 1))}>‹</button>
          <h2>Weekly review · week {wk} <small>({weekStart(wk)})</small></h2>
          <button className="btn" onClick={() => setWk(Math.min(10, wk + 1))}>›</button>
        </div>
        <WeekProgress wk={wk} />
        <ul className="checks">
          <li><label><input type="checkbox" checked={!!w.recordedStandard} onChange={e => set({ recordedStandard: e.target.checked })} /> Standard memorized + recorded</label></li>
          <li><label><input type="checkbox" checked={!!w.recordedArrangement} onChange={e => set({ recordedArrangement: e.target.checked })} /> Arrangement recorded</label></li>
          <li>Climbing sessions: <b>{p.climbs}</b> (target 3–4)</li>
          <li>C25K this week: {phasesForWeek(wk).filter(x => x.prog === 'c25k').map(x => x.short + ' — ' + x.text).join('') || '—'}</li>
          {test && <li><label>Pull-up max test <input type="number" min={0} value={w.pullupMax ?? ''} onChange={e => set({ pullupMax: e.target.value === '' ? undefined : Number(e.target.value) })} /></label></li>}
        </ul>
        <label className="block">Recording link (Drive / Voice Memos)<input type="url" placeholder="https://…" value={w.recordingUrl ?? ''} onChange={e => set({ recordingUrl: e.target.value })} /></label>
        <label className="block">Review — one fix, next song<textarea rows={4} value={w.review ?? ''} onChange={e => set({ review: e.target.value })} /></label>
      </section>
      <section className="panel">
        <h2>Milestones</h2>
        {MILESTONES.map(m => (
          <div key={m.wk}>
            <h3>Week {m.wk}</h3>
            <ul className="checks">{m.items.map(it => {
              const id = `${m.wk}:${it}`; const on = user.weekly[0]?.milestones?.includes(id)
              return <li key={id}><label><input type="checkbox" checked={!!on} onChange={e => update(u => {
                const cur = u.weekly[0]?.milestones ?? []
                return { ...u, weekly: { ...u.weekly, 0: { ...u.weekly[0], milestones: e.target.checked ? [...cur, id] : cur.filter(x => x !== id) } } }
              })} /> {it}</label></li>
            })}</ul>
          </div>
        ))}
      </section>
    </>
  )
}
