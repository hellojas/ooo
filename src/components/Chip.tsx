import type { CSSProperties } from 'react'
import { useUser } from '../storage'
import type { Program, Attendance } from '../types'

export function Chip({ p, missed, maybe, att, onOpen }: {
  p: Program; missed: boolean; maybe: boolean; att?: Attendance; onOpen: () => void
}) {
  const tbd = p.kind === 'inperson' && !useUser().settings.confirmed?.includes(p.id)
  const cls = ['chip', p.kind === 'abs' || p.kind === 'read' ? 'life' : '', missed || att === 'missed' || att === 'skipped' ? 'miss' : '', maybe || p.drop ? 'maybe' : ''].join(' ')
  return (
    <button className={cls} style={{ '--c': `var(--${p.id})` } as CSSProperties} onClick={onOpen}>
      <b>{att === 'went' ? '● ' : ''}{p.short}{p.drop ? ' · flex' : ''}{maybe ? ' · confirm' : ''}{tbd ? ' (TBD)' : ''}</b>
      <span>{p.time}</span>
    </button>
  )
}
