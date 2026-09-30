import { update, useUser } from '../storage'
import { attKey, fmtMin, stateOf } from '../model'
import { span } from '../time'
import { gcalUrl } from '../ics'
import type { Attendance, Program } from '../types'

export function CheckIn({ p, date, onClose }: { p: Program; date: string; onClose: () => void }) {
  const user = useUser()
  const k = attKey(p.id, date)
  const att = user.attendance[k]
  const t = span(p.time)
  const until = user.practice[date]?.until?.[p.id]
  const setUntil = (v?: number) => update(u => ({ ...u, practice: { ...u.practice, [date]: { ...u.practice[date], until: { ...u.practice[date]?.until, [p.id]: v as number } } } }))
  const set = (a: Attendance | undefined) => update(u => {
    const attendance = { ...u.attendance }
    if (a) attendance[k] = a; else delete attendance[k]
    return { ...u, attendance }
  })
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()} role="dialog" aria-label={`Check in: ${p.name}`}>
        <h3>{p.name}</h3>
        <dl className="detail">
          <dt>When</dt><dd>{date} · {p.time}</dd>
          {p.loc && <><dt>Where</dt><dd>{p.loc}</dd></>}
          {p.go && <><dt>From home</dt><dd>{p.go}</dd></>}
          <dt>Status</dt><dd>{{ considering: 'Considering — not on your plan yet', planned: 'Planned / trial — not registered (TBD)', registered: 'Registered' }[stateOf(p, user)]}{p.uncertain?.includes(date) ? ' · the school hasn’t confirmed this date' : ''}{p.kind !== 'inperson' ? '' : ' · change in Programs'}</dd>
        </dl>
        <div className="seg">
          {(['went', 'missed', 'skipped'] as Attendance[]).map(a => (
            <button key={a} aria-pressed={att === a} onClick={() => set(att === a ? undefined : a)}>{a}</button>
          ))}
        </div>
        {p.kind === 'inperson' && t && t[1] - t[0] > 120 && (
          <div className="row">
            <label className="inl">I’ll stay until
              <select value={until ?? t[1]} onChange={e => setUntil(Number(e.target.value) === t[1] ? undefined : Number(e.target.value))}>
                {Array.from({ length: Math.floor((t[1] - t[0]) / 30) }, (_, i) => t[0] + 30 * (i + 1)).map(m => <option key={m} value={m}>{fmtMin(m)}{m === t[1] ? ' (end)' : ''}</option>)}
              </select></label>
            <span className="meta">Your window, not the organizer’s. The schedule plans around it.</span>
          </div>
        )}
        <div className="row end">
          <span className="links">
            {p.url && <a href={p.url} target="_blank" rel="noreferrer">Source ↗</a>}
            <a href={gcalUrl(p, date)} target="_blank" rel="noreferrer">Add to Google Calendar ↗</a>
          </span>
          <button className="btn primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
