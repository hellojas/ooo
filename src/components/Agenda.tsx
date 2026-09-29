import { DOW, parse, weekStart, addDays, key } from '../dates'
import { attKey, itemsOn, setTaipeiStart, tripOn } from '../model'
import { useUser } from '../storage'
import { Chip } from './Chip'
import type { Program } from '../types'

/** Chronological list of days that have something on them, grouped by week. */
export function Agenda({ visible, showTravel, onOpen }: { visible: (p: Program) => boolean; showTravel: boolean; onOpen: (p: Program, d: string) => void }) {
  const user = useUser()
  setTaipeiStart(user.settings.taipeiStart)
  const eff = showTravel ? user : { ...user, settings: { ...user.settings, tripsOff: ['SF / Toronto', 'Upstate cabin', 'CoRL (optional)', 'Taipei (flexible)'] } }
  const weeks = Array.from({ length: 11 }, (_, i) => i + 1)
  return (
    <div className="agenda">
      {weeks.map(wk => {
        const days = Array.from({ length: 7 }, (_, i) => key(addDays(parse(weekStart(wk)), i)))
        const rows = days.map(k => ({ k, trip: showTravel ? tripOn(k, user.settings.tripsOff) : undefined, items: itemsOn(k, eff).filter(x => visible(x.p)) })).filter(r => r.items.length || r.trip)
        if (!rows.length) return null
        return (
          <section className="panel" key={wk}>
            <h3>Week {wk} <small>{weekStart(wk)}</small></h3>
            {rows.map(({ k, trip, items }) => (
              <div className={'ag-day' + (trip ? ' trip' : '')} key={k}>
                <div className="ag-date"><b>{parse(k).getDate()}</b><span>{DOW[parse(k).getDay()]}</span></div>
                <div className="ag-items">
                  {trip && <div className="ag-trip">✈ {trip.name}{trip.tentative ? ' (tentative)' : ''}</div>}
                  {items.map(({ p, missed, maybe }) => <Chip key={p.id} p={p} missed={missed} maybe={maybe} att={user.attendance[attKey(p.id, k)]} onOpen={() => onOpen(p, k)} />)}
                </div>
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}
