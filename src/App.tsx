import { useEffect, useState } from 'react'
import { programs, trips } from './data'
import { Calendar } from './components/Calendar'
import { CheckIn } from './components/CheckIn'
import { Today, clampDay } from './components/Today'
import { WeekView } from './components/Week'
import { Agenda } from './components/Agenda'
import { Weekly } from './components/Weekly'
import { Practice } from './components/Practice'
import { Resources } from './components/Resources'
import { Settings } from './components/Settings'
import { ProgressStrip } from './components/Progress'
import { AbsTables, Counts, OnlineTables, Template, Where } from './components/Tables'
import { downloadIcs } from './ics'
import { startReminders } from './reminders'
import { useUser } from './storage'
import { today, weekNo } from './dates'
import type { Program } from './types'

// Top-level: Today · Calendar · Practice · Review · Configure. Calendar holds Week / Month / Agenda / Music / Fitness.
type Top = 'today' | 'calendar' | 'practice' | 'review' | 'play' | 'configure'
type CalSub = 'week' | 'month' | 'agenda' | 'music' | 'fitness'
type Sub = 'inperson' | 'online' | 'plan'
const TOPS: [Top, string][] = [['today', 'Today'], ['calendar', 'Calendar'], ['practice', 'Practice'], ['review', 'Review'], ['play', 'Play'], ['configure', 'Configure']]
const CALS: [CalSub, string][] = [['week', 'Week'], ['month', 'Month'], ['agenda', 'Agenda'], ['music', 'Music'], ['fitness', 'Fitness']]
const inPerson = programs.filter(p => p.kind === 'inperson')
const plan = programs.filter(p => p.plan)
const abs = programs.filter(p => p.kind === 'abs')

const readHash = (): [Top, CalSub] => {
  const [a, b] = location.hash.replace(/^#\/?/, '').split('/')
  const top = (TOPS.some(([t]) => t === a) ? a : 'today') as Top
  const cal = (CALS.some(([c]) => c === b) ? b : 'week') as CalSub
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
  const [groups, setGroups] = useState<Record<string, boolean>>({ online: true, inperson: true, abs: true, read: true, travel: true })
  const g = (k: string) => groups[k]
  const flip = (k: string) => setGroups({ ...groups, [k]: !groups[k] })
  const onOpen = (p: Program, d: string) => setOpen({ p, d })
  const openDay = (d: string) => { setDay(d); setView('today'); window.scrollTo(0, 0) }
  const toFitness = () => setView('calendar', 'fitness')
  const visible = (p: Program) => (p.kind === 'inperson' ? !!p.plan && g('inperson') : p.kind === 'abs' ? g('abs') : g('read'))

  return (
    <div className="wrap">
      <header className="masthead">
        <h1>PROJECT OOO <span className="tagline">Oct 5 – Dec 23</span></h1>
        <nav className="tabs desk" role="tablist">
          {TOPS.filter(([v]) => v !== 'configure').map(([v, l]) => <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}>{l}</button>)}
        </nav>
        <button className="gear desk" aria-pressed={view === 'configure'} aria-label="Configure" title="Configure" onClick={() => setView('configure')}>⚙</button>
      </header>

      {view === 'today' && <Today date={day} setDate={setDay} onOpen={onOpen} onNav={toFitness} />}

      {view === 'calendar' && <>
        <div className="subtabs">{CALS.map(([c, l]) => <button key={c} aria-pressed={cal === c} onClick={() => setView('calendar', c)}>{l}</button>)}</div>
        {cal === 'week' && <WeekView wk={wk} setWk={setWk} onOpen={onOpen} onOpenDay={openDay} onNav={toFitness} />}
        {(cal === 'month' || cal === 'agenda') && <>
          <div className="fullbar">
            <div className="trips">{trips.map(t => <div key={t.name} className={'trip-card' + (t.tentative ? ' tent' : '')}><b>{t.name}</b><span>{t.from.slice(5)} → {t.to.slice(5)}</span></div>)}</div>
            <button className="btn" onClick={() => downloadIcs(user)}>Export plan (.ics)</button>
          </div>
          <div className="legend">
            <Group label="Music" items={[['online', 'Online'], ['inperson', 'Classes']]} on={g} flip={flip} />
            <Group label="Life" items={[['abs', 'Fitness'], ['read', 'Coffee'], ['travel', 'Travel']]} on={g} flip={flip} />
          </div>
          {cal === 'month'
            ? <Calendar showTravel={g('travel')} showOnline={g('online')} showVideos={false} phaseProgs={g('abs') ? ['c25k', 'pull', 'v8'] : []} visible={visible} onOpen={onOpen} />
            : <Agenda visible={visible} showTravel={g('travel')} onOpen={onOpen} />}
          <Template title="A typical week" />
        </>}
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

      {['resources', 'jawn', 'configure'].includes(view) && <div className="subnav mob">
        {([['play', 'Play'], ['configure', 'Configure']] as [Top, string][]).map(([v, l]) => <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>{l}</button>)}
      </div>}
      {view === 'practice' && <Practice />}
      {view === 'review' && <Weekly onOpenDay={openDay} />}
      {view === 'play' && <Resources />}
      {view === 'configure' && <Settings theme={theme} cycleTheme={cycle} />}

      <nav className="bottombar mob" aria-label="Main">
        <button aria-current={view === 'today'} onClick={() => setView('today')}>Today</button>
        <button aria-current={view === 'calendar'} onClick={() => setView('calendar')}>Calendar</button>
        <button aria-current={view === 'practice'} onClick={() => setView('practice')}>Practice</button>
        <button aria-current={view === 'review'} onClick={() => setView('review')}>Review</button>
        <button aria-current={['play', 'configure'].includes(view)} onClick={() => setView('play')}>More</button>
      </nav>
      {open && <CheckIn p={open.p} date={open.d} onClose={() => setOpen(null)} />}
    </div>
  )
}

function Group({ label, items, on, flip }: { label: string; items: [string, string][]; on: (k: string) => boolean; flip: (k: string) => void }) {
  return (
    <div className="lgroup"><span className="gh">{label}</span>
      {items.map(([k, l]) => <button key={k} className="item" aria-pressed={on(k)} onClick={() => flip(k)}>{l}</button>)}
    </div>
  )
}
