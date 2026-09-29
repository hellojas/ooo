import { update, useUser } from '../storage'
import { attKey } from '../model'
import type { Attendance, Program } from '../types'

export function CheckIn({ p, date, onClose }: { p: Program; date: string; onClose: () => void }) {
  const user = useUser()
  const k = attKey(p.id, date)
  const att = user.attendance[k]
  const set = (a: Attendance | undefined) => update(u => {
    const attendance = { ...u.attendance }
    if (a) attendance[k] = a; else delete attendance[k]
    return { ...u, attendance }
  })
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()} role="dialog" aria-label={`Check in: ${p.name}`}>
        <h3>{p.name}</h3>
        <p className="sub">{date} · {p.time}{p.loc ? ` · ${p.loc}` : ''}</p>
        <div className="seg">
          {(['went', 'missed', 'skipped'] as Attendance[]).map(a => (
            <button key={a} aria-pressed={att === a} onClick={() => set(att === a ? undefined : a)}>{a}</button>
          ))}
        </div>
        <div className="row end">
          {p.url && <a href={p.url} target="_blank" rel="noreferrer">Program page ↗</a>}
          <button className="btn primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
