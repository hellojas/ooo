import { useEffect, useState } from 'react'
import { programs } from './data'
import { Calendar } from './components/Calendar'
import { CheckIn } from './components/CheckIn'
import { Today, clampDay } from './components/Today'
import { WeekView } from './components/Week'
import { LogView } from './components/LogView'
import { Settings } from './components/Settings'
import { Weekly } from './components/Weekly'
import { Coffee } from './components/Coffee'
import { ProgressStrip } from './components/Progress'
import { today, weekNo } from './dates'
import { AbsTables, Counts, OnlineTables, Template, Where } from './components/Tables'
import { useUser } from './storage'
import { startReminders } from './reminders'
import type { Program } from './types'

type View = 'today' | 'week' | 'full' | 'jazz' | 'abs' | 'coffee' | 'log' | 'review' | 'settings'
type Sub = 'inperson' | 'online' | 'plan'
const inPerson = programs.filter(p => p.kind === 'inperson')
const plan = programs.filter(p => p.plan)
const abs = programs.filter(p => p.kind === 'abs')

function useTheme() {
  const [t, setT] = useState<string>(() => { try { return localStorage.getItem('ooo:theme') ?? 'auto' } catch { return 'auto' } })
  useEffect(() => {
    if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = t
    try { localStorage.setItem('ooo:theme', t) } catch { /* ignore */ }
  }, [t])
  return [t, () => setT(t === 'auto' ? 'dark' : t === 'dark' ? 'light' : 'auto')] as const
}

export default function App() {
  const [theme, cycle] = useTheme()
  const userRef = useUser()
  useEffect(() => startReminders(() => userRef), [userRef])
  const [view, setView] = useState<View>('today')
  const [day, setDay] = useState(clampDay(today()))
  const [wk, setWk] = useState(Math.min(11, Math.max(1, weekNo(clampDay(today())))))
  const openDay = (d: string) => { setDay(d); setView('today'); window.scrollTo(0, 0) }
  const [sub, setSub] = useState<Sub>('plan')
  const [open, setOpen] = useState<{ p: Program; d: string } | null>(null)
  const [groups, setGroups] = useState<Record<string, boolean>>({ online: true, inperson: true, abs: true, read: true, travel: true })
  const g = (k: string) => groups[k]
  const flip = (k: string) => setGroups({ ...groups, [k]: !groups[k] })
  const onOpen = (p: Program, d: string) => setOpen({ p, d })
  const tabs: [View, string][] = [['today', 'Today'], ['week', 'Week'], ['full', 'Full sabbatical'], ['jazz', 'Jazz'], ['abs', 'Abs'], ['coffee', 'Coffee'], ['log', 'Log'], ['review', 'Review'], ['settings', 'Settings']]

  return (
    <div className="wrap">
      <header>
        <h1>PROJECT OOO <small>· jas fine tuning</small></h1>
        <p>Sabbatical, Oct 5 – Dec 23. Tap any session to check in.</p>
      </header>

      <div className="tabs" role="tablist">
        {tabs.map(([v, l]) => <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}>{l}</button>)}
      </div>

      {view === 'today' && <Today date={day} setDate={setDay} onOpen={onOpen} onNav={setView} />}
      {view === 'week' && <WeekView wk={wk} setWk={setWk} onOpen={onOpen} onOpenDay={openDay} onNav={setView} />}

      {view === 'full' && <>
        <div className="legend">
          <Group label="Music" items={[['online', 'Online', true], ['inperson', 'In person (plan)']]} on={g} flip={flip} />
          <Group label="Life" items={[['abs', 'Abs'], ['read', 'Read'], ['travel', 'Travel']]} on={g} flip={flip} />
        </div>
        <Calendar showTravel={g('travel')} showOnline={g('online')} showVideos={false} phaseProgs={g('abs') ? ['c25k', 'pull', 'v8'] : []}
          visible={p => (p.kind === 'inperson' ? !!p.plan && g('inperson') : p.kind === 'abs' ? g('abs') : g('read'))} onOpen={onOpen} />
        <Template title="Full sabbatical week" />
      </>}

      {view === 'jazz' && <>
        <ProgressStrip kind="jazz" />
        <div className="subtabs">
          {([['inperson', 'In person'], ['online', 'Online'], ['plan', 'Suggested plan']] as [Sub, string][]).map(([s, l]) =>
            <button key={s} aria-pressed={sub === s} onClick={() => setSub(s)}>{l}</button>)}
        </div>
        <Calendar showTravel showOnline={sub !== 'inperson'} showVideos={sub === 'online'} phaseProgs={[]}
          visible={p => p.kind === 'inperson' && (sub === 'inperson' || (sub === 'plan' && !!p.plan))} onOpen={onOpen} />
        {sub === 'inperson' && <Where pool={inPerson} />}
        {sub === 'online' && <OnlineTables />}
        {sub === 'plan' && <><Where pool={plan} /><Counts pool={plan} /><Template title="Suggested jazz week" /></>}
      </>}

      {view === 'abs' && <>
        <ProgressStrip kind="abs" />
        <Calendar showTravel showOnline={false} showVideos={false} phaseProgs={['c25k', 'pull', 'v8']} visible={p => p.kind === 'abs'} onOpen={onOpen} />
        <Where pool={abs} /><Counts pool={abs} /><AbsTables />
      </>}

      {view === 'coffee' && <Coffee />}
      {view === 'review' && <Weekly />}
      {view === 'log' && <LogView onOpenDay={openDay} />}
      {view === 'settings' && <Settings theme={theme} cycleTheme={cycle} />}

      {open && <CheckIn p={open.p} date={open.d} onClose={() => setOpen(null)} />}
    </div>
  )
}

function Group({ label, items, on, flip }: { label: string; items: ([string, string] | [string, string, boolean])[]; on: (k: string) => boolean; flip: (k: string) => void }) {
  return (
    <div className="lgroup"><span className="gh">{label}</span>
      {items.map(([k, l]) => <button key={k} className="item" aria-pressed={on(k)} onClick={() => flip(k)}>{l}</button>)}
    </div>
  )
}
