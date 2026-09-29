import { useEffect, useState } from 'react'
import { CheckIn } from './components/CheckIn'
import { Today, clampDay } from './components/Today'
import { MonthCal } from './components/MonthCal'
import { WeekBoard } from './components/WeekBoard'
import { Weekly } from './components/Weekly'
import { Practice } from './components/Practice'
import { Resources } from './components/Resources'
import { Settings } from './components/Settings'
import { Programs } from './components/Programs'
import { startReminders } from './reminders'
import { useUser } from './storage'
import { today } from './dates'
import { Ic } from './components/Icons'
import type { Program } from './types'

// Top-level: Today · Calendar · Practice · Review · Configure. Calendar holds Week / Month / Agenda / Music / Fitness.
type Top = 'today' | 'calendar' | 'practice' | 'programs' | 'review' | 'play' | 'configure'
type CalSub = 'week' | 'month'
const TOPS: [Top, string][] = [['today', 'Today'], ['calendar', 'Calendar'], ['practice', 'Roadmap'], ['programs', 'Programs'], ['review', 'Review'], ['play', 'Play'], ['configure', 'Configure']]
const CALS: [CalSub, string][] = [['week', 'Week'], ['month', 'Month']]

const readHash = (): [Top, CalSub, string | undefined] => {
  const [a, b] = location.hash.replace(/^#\/?/, '').split('/')
  const top = (TOPS.some(([t]) => t === a) ? a : 'today') as Top
  const cal = (CALS.some(([c]) => c === b) ? b : 'week') as CalSub
  const day = top === 'today' && /^\d{4}-\d{2}-\d{2}$/.test(b ?? '') ? b : undefined
  return [top, cal, day]
}

function useTheme() {
  const [t, setT] = useState<string>(() => { try { return localStorage.getItem('ooo:theme') ?? 'auto' } catch { return 'auto' } })
  useEffect(() => {
    if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = t
    try { localStorage.setItem('ooo:theme', t) } catch { /* ignore */ }
  }, [t])
  return [t, () => setT(t === 'auto' ? 'dark' : t === 'dark' ? 'light' : 'auto')] as const
}

export default function App() {
  const user = useUser()
  const [theme, cycle] = useTheme()
  const [[view, cal, hashDay], setRoute] = useState(readHash)
  const setView = (v: Top, c: CalSub = cal) => { location.hash = v === 'calendar' ? `/${v}/${c}` : v === 'today' ? `/today/${day}` : `/${v}` }
  useEffect(() => { const f = () => setRoute(readHash()); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, [])
  useEffect(() => startReminders(() => user), [user])
  const [day, setDayRaw] = useState(() => clampDay(hashDay ?? today()))
  const setDay = (d: string) => { setDayRaw(d); if (view === 'today') location.hash = `/today/${d}` }
  useEffect(() => { if (hashDay && hashDay !== day) setDayRaw(clampDay(hashDay)) }, [hashDay]) // eslint-disable-line react-hooks/exhaustive-deps
  const [open, setOpen] = useState<{ p: Program; d: string } | null>(null)
  const onOpen = (p: Program, d: string) => setOpen({ p, d })
  const openDay = (d: string) => { setDayRaw(d); location.hash = `/today/${d}`; window.scrollTo(0, 0) }
  const toFitness = () => setView('practice')

  return (
    <div className="wrap">
      <header className="masthead">
        <h1><Ic.logo className="logo" />PROJECT OOO <span className="tagline">jas fine tuning</span></h1>
        <nav className="tabs desk" role="tablist">
          {TOPS.filter(([v]) => v !== 'configure').map(([v, l]) => <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}>{l}</button>)}
        </nav>
        <button className="gear desk" aria-pressed={view === 'configure'} aria-label="Configure" title="Configure" onClick={() => setView('configure')}><Ic.gear /></button>
      </header>

      {view === 'today' && <Today date={day} setDate={setDay} onOpen={onOpen} onNav={toFitness} />}

      {view === 'calendar' && <>
        <div className="subtabs">{CALS.map(([c, l]) => <button key={c} aria-pressed={cal === c} onClick={() => setView('calendar', c)}>{l}</button>)}</div>
        {cal === 'week' && <WeekBoard onOpenDay={openDay} onOpen={onOpen} />}
        {cal === 'month' && <MonthCal onOpenDay={openDay} />}
      </>}

      {view === 'practice' && <Practice onOpenDay={openDay} />}
      {view === 'programs' && <Programs onOpen={onOpen} />}
      {view === 'review' && <Weekly onOpenDay={openDay} />}
      {view === 'play' && <Resources />}
      {view === 'configure' && <Settings theme={theme} cycleTheme={cycle} />}

      {open && <CheckIn p={open.p} date={open.d} onClose={() => setOpen(null)} />}
    </div>
  )
}
