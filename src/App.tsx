import { useEffect, useState } from 'react'
import { programs, trips } from './data'
import { Calendar } from './components/Calendar'
import { CheckIn } from './components/CheckIn'
import { Today } from './components/Today'
import { Weekly } from './components/Weekly'
import { Coffee } from './components/Coffee'
import { ProgressStrip } from './components/Progress'
import { AbsTables, Counts, OnlineTables, Template, Where } from './components/Tables'
import { exportJson, importJson, update, useUser } from './storage'
import { downloadIcs } from './ics'
import { canNotify, enableReminders, startReminders } from './reminders'
import { logOut, signIn, useSync } from './sync'
import type { Program } from './types'

type View = 'today' | 'full' | 'jazz' | 'abs' | 'coffee' | 'review'
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
  const user = useUser()
  const [theme, cycle] = useTheme()
  const sync = useSync()
  const userRef = useUser()
  useEffect(() => startReminders(() => userRef), [userRef])
  const [view, setView] = useState<View>('today')
  const [sub, setSub] = useState<Sub>('plan')
  const [open, setOpen] = useState<{ p: Program; d: string } | null>(null)
  const [groups, setGroups] = useState<Record<string, boolean>>({ online: true, inperson: true, abs: true, read: true, travel: true })
  const g = (k: string) => groups[k]
  const flip = (k: string) => setGroups({ ...groups, [k]: !groups[k] })
  const onOpen = (p: Program, d: string) => setOpen({ p, d })
  const tabs: [View, string][] = [['today', 'Today'], ['full', 'Full sabbatical'], ['jazz', 'Jazz'], ['abs', 'Abs'], ['coffee', 'Coffee shops'], ['review', 'Review']]

  return (
    <div className="wrap">
      <header>
        <h1>Project ooo <small>· Jas fine tuning</small></h1>
        <p>Sabbatical, Oct 5 – Dec 23. Tap any session to check in.</p>
        <div className="hdr-actions">
          {sync.user
            ? <button className="btn" onClick={logOut} title={sync.error}>{sync.state === 'synced' ? '☁ Synced' : sync.state === 'error' ? '⚠ Sync error' : '☁ Syncing…'} · Sign out</button>
            : <button className="btn primary" onClick={signIn}>Sign in with Google to sync</button>}
          {sync.error && !sync.user && <span className="sub">{sync.error}</span>}
          <button className="btn" onClick={cycle}>Theme: {theme}</button>
          <button className="btn" onClick={() => { const b = new Blob([exportJson()], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'ooo-backup.json'; a.click() }}>Export</button>
          <button className="btn" onClick={() => downloadIcs(user)}>Calendar (.ics)</button>
          {canNotify() && <button className="btn" onClick={async () => alert((await enableReminders()) ? 'Reminders on while the app is open.' : 'Notifications blocked.')}>Reminders</button>}
          <label className="btn">Import<input type="file" accept="application/json" hidden onChange={async e => { const f = e.target.files?.[0]; if (f) importJson(await f.text()) }} /></label>
        </div>
      </header>

      <div className="tabs" role="tablist">
        {tabs.map(([v, l]) => <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}>{l}</button>)}
      </div>

      {view === 'today' && <Today onOpen={onOpen} />}

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

      <footer className="foot">
        Trips: {trips.map(t => t.name).join(' · ')}
        {user.settings.tripsOff.length > 0 && <> · ignoring: {user.settings.tripsOff.join(', ')}</>}
        <div className="row"><label className="inl">Taipei start <input type="date" value={user.settings.taipeiStart ?? ''} min="2026-12-01" max="2026-12-28" onChange={e => update(u => ({ ...u, settings: { ...u.settings, taipeiStart: e.target.value || undefined } }))} /></label></div>
        <div className="row">{trips.map(t => <label key={t.name} className="inl"><input type="checkbox" checked={!user.settings.tripsOff.includes(t.name)}
          onChange={e => update(u => ({ ...u, settings: { ...u.settings, tripsOff: e.target.checked ? u.settings.tripsOff.filter(x => x !== t.name) : [...u.settings.tripsOff, t.name] } }))} /> {t.name}</label>)}</div>
      </footer>
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
