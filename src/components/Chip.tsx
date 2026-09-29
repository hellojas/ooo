import type { CSSProperties } from 'react'
import { useUser } from '../storage'
import { stateOf } from '../model'
import type { Program, Attendance } from '../types'

export function Chip({ p, missed, maybe, att, onOpen }: {
  p: Program; missed: boolean; maybe: boolean; att?: Attendance; onOpen: () => void
}) {
  const st = stateOf(p, useUser())
  const tbd = p.kind === 'inperson' && st !== 'registered'
  const cls = ['chip', p.kind === 'abs' || p.kind === 'read' ? 'life' : '', missed || att === 'missed' || att === 'skipped' ? 'miss' : '', maybe || p.drop || st === 'planned' ? 'maybe' : '', st === 'considering' ? 'consider' : ''].join(' ')
  return (
    <button className={cls} style={{ '--c': `var(--${p.id})` } as CSSProperties} onClick={onOpen}>
      <b>{att === 'went' ? '● ' : ''}{p.short}{p.drop ? ' · flex' : ''}{maybe ? ' · confirm' : ''}{st === 'considering' ? ' (considering)' : tbd ? ' (TBD)' : ''}</b>
      <span>{p.time}</span>
    </button>
  )
}
