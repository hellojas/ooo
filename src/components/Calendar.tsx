import type { CSSProperties } from 'react'
import { DOW, MONTHS, parse, weekNo } from '../dates'
import { courses, programs, trips, OS_URL } from '../data'
import { attKey, coursesForWeek, itemsOn, monthWeeks, phasesForWeek, tripOn, videosOn } from '../model'
import { useUser } from '../storage'
import { Chip } from './Chip'
import type { Program } from '../types'

export interface CalOpts {
  visible: (p: Program) => boolean
  showOnline: boolean
  showVideos: boolean
  phaseProgs: string[]           // which training bars to show
  showTravel: boolean
  onOpen: (p: Program, date: string) => void
  months?: number[]
}

export function Calendar(o: CalOpts) {
  const user = useUser()
  const tripsOff = o.showTravel ? user.settings.tripsOff : trips.map(t => t.name)
  const eff = { ...user, settings: { ...user.settings, tripsOff } }
  const pool = programs.filter(o.visible)

  return <>{(o.months ?? [9, 10, 11]).map(m => {
    const weeks = monthWeeks(2026, m)
    return (
      <section className="month" key={m}>
        <h2>{MONTHS[m]} <small>2026</small></h2>
        <div className="dow">{DOW.map(d => <div key={d}>{d}</div>)}</div>
        <div className="grid">
          {weeks.map((w, wi) => {
            const first = w.find(Boolean)!
            const n = weekNo(first)
            const bars = [
              ...(o.showOnline ? coursesForWeek(n).map(c => ({ id: c.id, label: c.short, url: OS_URL, title: c.feeds, phase: false })) : []),
              ...phasesForWeek(n).filter(p => o.phaseProgs.includes(p.prog)).map(p => ({ id: p.id, label: p.short, url: undefined, title: p.text, phase: true })),
            ]
            return (
              <div style={{ display: 'contents' }} key={wi}>
                {bars.length > 0 && n >= 1 && (
                  <div className={'wk' + (o.showOnline ? ' online' : '')}>
                    <span className="lbl">Wk {n}</span>
                    {bars.map((b, i) => {
                      const st = { '--c': `var(--${b.id})` } as CSSProperties
                      return b.url
                        ? <a key={i} className="pill" style={st} href={b.url} target="_blank" rel="noreferrer" title={b.title}>{b.label}</a>
                        : <span key={i} className="pill phase" style={st} title={b.title}>{b.label}</span>
                    })}
                  </div>
                )}
                {w.map((k, di) => {
                  if (!k) return <div className="day pad" key={di} />
                  const trip = o.showTravel ? tripOn(k) : undefined
                  const items = itemsOn(k, eff, pool)
                  const vids = o.showVideos ? videosOn(k) : []
                  const isFirst = trip && (k === trip.from || k.endsWith('-01'))
                  return (
                    <div key={di} className={'day' + (trip ? ' trip' + (trip.tentative ? ' tentative' : '') : '')}>
                      <div className="n" data-dow={DOW[di]}>{parse(k).getDate()}{isFirst && <em>{trip!.name}</em>}</div>
                      <div className="chips">
                        {items.map(({ p, missed, maybe }) => (
                          <Chip key={p.id} p={p} missed={missed} maybe={maybe} att={user.attendance[attKey(p.id, k)]} onOpen={() => o.onOpen(p, k)} />
                        ))}
                        {vids.map((v, i) => {
                          const c = courses.find(x => x.id === v.course)
                          return <a key={i} className="chip online" style={{ '--c': `var(--${v.course})` } as CSSProperties} href={OS_URL} target="_blank" rel="noreferrer"><b>{c?.short}</b><span>{v.what}{v.pdf ? ` · ${v.pdf}` : ''}</span></a>
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </section>
    )
  })}</>
}
