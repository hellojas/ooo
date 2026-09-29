import { useEffect, useState } from 'react'
import { programs } from './data'
import { Calendar } from './components/Calendar'
import { CheckIn } from './components/CheckIn'
import { Today, clampDay } from './components/Today'
import { WeekView } from './components/Week'
import { MonthCal } from './components/MonthCal'
import { Weekly } from './components/Weekly'
import { Practice } from './components/Practice'
import { Resources } from './components/Resources'
import { Settings } from './components/Settings'
import { ProgressStrip } from './components/Progress'
import { AbsTables, Counts, OnlineTables, Where } from './components/Tables'
import { startReminders } from './reminders'
import { useUser } from './storage'
import { today, weekNo } from './dates'
import { Ic } from './components/Icons'
import type { Program } from './types'

// Top-level: Today · Calendar · Practice · Review · Configure. Calendar holds Week / Month / Agenda / Music / Fitness.
type Top = 'today' | 'calendar' | 'practice' | 'review' | 'play' | 'configure'
type CalSub = 'week' | 'month' | 'agenda' | 'music' | 'fitness'
type Sub = 'inperson' | 'online' | 'plan'
const TOPS: [Top, string][] = [['today', 'Today'], ['calendar', 'Calendar'], ['practice', 'Roadmap'], ['review', 'Review'], ['play', 'Play'], ['configure', 'Configure']]
const ICON: Record<Top, (p: object) => JSX.Element> = { today: Ic.today, calendar: Ic.calendar, practice: Ic.practice, review: Ic.review, play: Ic.play, configure: Ic.gear }
const CALS: [CalSub, string][] = [['month', 'Month'], ['week', 'Week'], ['music', 'Music'], ['fitness', 'Fitness']]
const inPerson = programs.filter(p => p.kind === 'inperson')
const plan = programs.filter(p => p.plan)
const abs = programs.filter(p => p.kind === 'abs')

const readHash = (): [Top, CalSub] => {
  const [a, b] = location.hash.replace(/^#\/?/, '').split('/')
  const top = (TOPS.some(([t]) => t === a) ? a : 'today') as Top
  const cal = (CALS.some(([c]) => c === b) ? b : 'month') as CalSub
  return [top, cal]
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
  const [[view, cal], setRoute] = useState(readHash)
  const setView = (v: Top, c: CalSub = cal) => { location.hash = v === 'calendar' ? `/${v}/${c}` : `/${v}` }
  useEffect(() => { const f = () => setRoute(readHash()); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, [])
  useEffect(() => startReminders(() => user), [user])
  const [day, setDay] = useState(clampDay(today()))
  const [wk, setWk] = useState(Math.min(11, Math.max(1, weekNo(clampDay(today())))))
  const [sub, setSub] = useState<Sub>('plan')
  const [open, setOpen] = useState<{ p: Program; d: string } | null>(null)
  const onOpen = (p: Program, d: string) => setOpen({ p, d })
  const openDay = (d: string) => { setDay(d); setView('today'); window.scrollTo(0, 0) }
  const toFitness = () => setView('calendar', 'fitness')

  return (
    <div className="wrap">
      <header className="masthead">
        <h1><Ic.logo className="logo" />PROJECT OOO <span className="tagline">jas fine tuning</span></h1>
        <nav className="tabs desk" role="tablist">
          {TOPS.filter(([v]) => v !== 'configure').map(([v, l]) => { const Icon = ICON[v]; return <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}><Icon />{l}</button> })}
        </nav>
        <button className="gear desk" aria-pressed={view === 'configure'} aria-label="Configure" title="Configure" onClick={() => setView('configure')}><Ic.gear /></button>
      </header>

      {view === 'today' && <Today date={day} setDate={setDay} onOpen={onOpen} onNav={toFitness} />}

      {view === 'calendar' && <>
        <div className="subtabs">{CALS.map(([c, l]) => <button key={c} aria-pressed={cal === c} onClick={() => setView('calendar', c)}>{l}</button>)}</div>
        {cal === 'week' && <WeekView wk={wk} setWk={setWk} onOpen={onOpen} onOpenDay={openDay} onNav={toFitness} />}
        {(cal === 'month' || cal === 'agenda') && <MonthCal onOpenDay={openDay} />}
        {cal === 'music' && <>
          <ProgressStrip kind="jazz" />
          <div className="subtabs small">
            {([['inperson', 'Classes'], ['online', 'Open Studio'], ['plan', 'My plan']] as [Sub, string][]).map(([s, l]) => <button key={s} aria-pressed={sub === s} onClick={() => setSub(s)}>{l}</button>)}
          </div>
          <Calendar showTravel showOnline={sub !== 'inperson'} showVideos={sub === 'online'} phaseProgs={[]} showConsidering={sub === 'inperson'}
            visible={p => p.kind === 'inperson' && (sub === 'inperson' || (sub === 'plan' && !!p.plan))} onOpen={onOpen} />
          {sub === 'inperson' && <Where pool={inPerson} />}
          {sub === 'online' && <OnlineTables />}
          {sub === 'plan' && <><Where pool={plan} /><Counts pool={plan} /></>}
        </>}
        {cal === 'fitness' && <>
          <ProgressStrip kind="abs" />
          <Calendar showTravel showOnline={false} showVideos={false} phaseProgs={['c25k', 'pull', 'v8']} visible={p => p.kind === 'abs'} onOpen={onOpen} />
          <Where pool={abs} /><Counts pool={abs} /><AbsTables />
        </>}
      </>}

      {['play', 'configure'].includes(view) && <div className="subnav mob">
        {([['play', 'Play'], ['configure', 'Configure']] as [Top, string][]).map(([v, l]) => <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>{l}</button>)}
      </div>}
      {view === 'practice' && <Practice onOpenDay={openDay} />}
      {view === 'review' && <Weekly onOpenDay={openDay} />}
      {view === 'play' && <Resources />}
      {view === 'configure' && <Settings theme={theme} cycleTheme={cycle} />}

      <nav className="bottombar mob" aria-label="Main">
        <button aria-current={view === 'today'} onClick={() => setView('today')}><Ic.today />Today</button>
        <button aria-current={view === 'calendar'} onClick={() => setView('calendar')}><Ic.calendar />Calendar</button>
        <button aria-current={view === 'practice'} onClick={() => setView('practice')}><Ic.practice />Roadmap</button>
        <button aria-current={view === 'review'} onClick={() => setView('review')}><Ic.review />Review</button>
        <button aria-current={['play', 'configure'].includes(view)} onClick={() => setView('play')}><Ic.play />More</button>
      </nav>
      {open && <CheckIn p={open.p} date={open.d} onClose={() => setOpen(null)} />}
    </div>
  )
}
