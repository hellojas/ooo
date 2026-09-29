import { useState } from 'react'
import { programs, trips } from '../data'
import { DOW } from '../dates'
import { downloadIcs } from '../ics'
import { DEFAULT_START, WEEKLY_METRICS } from '../model'
import { canNotify, enableReminders } from '../reminders'
import { exportJson, importJson, update, useUser } from '../storage'
import { logOut, signIn, useSync } from '../sync'

const KINDS = [['inperson', 'Music · in person'], ['abs', 'Abs'], ['read', 'Reading']] as const

export function Settings({ theme, cycleTheme }: { theme: string; cycleTheme: () => void }) {
  const user = useUser(), sync = useSync()
  const [msg, setMsg] = useState('')
  const s = user.settings
  const set = (v: Partial<typeof s>) => update(u => ({ ...u, settings: { ...u.settings, ...v } }))
  const taipei = trips.find(t => t.name.startsWith('Taipei'))!

  const doExport = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([exportJson()], { type: 'application/json' }))
    a.download = 'project-ooo-backup.json'; a.click(); setMsg('Backup downloaded.')
  }
  const doImport = async (f?: File) => {
    if (!f) return
    if (!confirm('Replace everything currently logged with this backup?')) return
    try { importJson(await f.text()); setMsg('Backup restored.') } catch { setMsg('That file isn’t a valid backup.') }
  }

  return (
    <div className="settings">
      <section className="panel">
        <h2>Schedule</h2>
        <h3>Trips</h3>
        <p className="sub">Sessions on trip days show as missed. Untick a trip if it isn’t happening.</p>
        <ul className="checks">{trips.map(t => <li key={t.name}><label><input type="checkbox" checked={!s.tripsOff.includes(t.name)}
          onChange={e => set({ tripsOff: e.target.checked ? s.tripsOff.filter(x => x !== t.name) : [...s.tripsOff, t.name] })} />
          {t.name} <span className="sub">{t.name.startsWith('Taipei') ? `${s.taipeiStart ?? t.from} → ${t.to}` : `${t.from} → ${t.to}`}</span></label></li>)}</ul>
        <label className="inl">Taipei start <input type="date" value={s.taipeiStart ?? taipei.from} min="2026-12-01" max="2026-12-28" onChange={e => set({ taipeiStart: e.target.value || undefined })} /></label>
        <h3>Day start by weekday</h3>
        <p className="sub">When your first block (sax) begins on each weekday. Everything in the day shifts to match. You can still change a single day on Today.</p>
        <div className="row">
          {DOW.map((d, i) => <label key={d}>{d}<input type="time" value={s.startTimes?.[i] ?? s.startTime ?? DEFAULT_START}
            onChange={e => set({ startTimes: { ...s.startTimes, [i]: e.target.value || DEFAULT_START } })} /></label>)}
        </div>
        <h3>Weekly guidelines</h3>
        <p className="sub">Targets per week, not per day — hit them however the week allows. They scale down automatically for travel days.</p>
        <div className="row">
          {WEEKLY_METRICS.map(m => <label key={m.id}>{m.label} ({m.unit === 'min' ? 'min' : m.unit === 'reps' ? 'reps' : '×'})<input type="number" min={0} value={s.targets?.[m.id] ?? m.def}
            onChange={e => set({ targets: { ...s.targets, [m.id]: Number(e.target.value) } })} /></label>)}
        </div>
      </section>

      <section className="panel">
        <h2>Sessions on the calendar</h2>
        <p className="sub">Untick anything you’re not doing. In-person classes show “(TBD)” until you tick “registered”. It disappears from every view, reminders and the .ics export.</p>
        {KINDS.map(([kind, label]) => <div key={kind}>
          <h3>{label}</h3>
          <ul className="checks">{programs.filter(p => p.kind === kind).map(p => <li key={p.id}><label><input type="checkbox" checked={!s.hiddenItems.includes(p.id)}
            onChange={e => set({ hiddenItems: e.target.checked ? s.hiddenItems.filter(x => x !== p.id) : [...s.hiddenItems, p.id] })} />
            {p.short} <span className="sub">{p.time}{p.drop ? ' · flex' : ''}</span></label>
            {kind === 'inperson' && <label className="inl"><input type="checkbox" checked={!!s.confirmed?.includes(p.id)} onChange={e => set({ confirmed: e.target.checked ? [...(s.confirmed ?? []), p.id] : (s.confirmed ?? []).filter(x => x !== p.id) })} /> registered</label>}</li>)}</ul>
        </div>)}
      </section>

      <section className="panel">
        <h2>Data &amp; export</h2>
        <div className="setrow"><div><b>Calendar (.ics)</b><span className="sub">Plan sessions that aren’t lost to travel, with a 45-min alert. Import into Google or Apple Calendar.</span></div>
          <button className="btn" onClick={() => downloadIcs(user)}>Download</button></div>
        <div className="setrow"><div><b>Backup</b><span className="sub">Everything you’ve logged, as one JSON file.</span></div>
          <div className="row"><button className="btn" onClick={doExport}>Export</button>
            <label className="btn">Import<input type="file" accept="application/json" hidden onChange={e => { doImport(e.target.files?.[0]); e.target.value = '' }} /></label></div></div>
        {msg && <p className="sub">{msg}</p>}
      </section>

      <section className="panel">
        <h2>App</h2>
        <div className="setrow"><div><b>Account &amp; sync</b>
          <span className="sub">{sync.user ? `${sync.user.email} · ${sync.state === 'synced' ? 'synced' : sync.state === 'error' ? `error: ${sync.error}` : 'syncing…'}` : `This device only.${sync.error ? ' ' + sync.error : ''}`}</span></div>
          {sync.user ? <button className="btn" onClick={logOut}>Sign out</button> : <button className="btn primary" onClick={signIn}>Sign in with Google</button>}</div>
        {canNotify() && <div className="setrow"><div><b>Reminders</b><span className="sub">30 min before sessions and a 9pm log nudge, while the app is open.</span></div>
          <button className="btn" onClick={async () => setMsg((await enableReminders()) ? 'Reminders on.' : 'Notifications are blocked in this browser.')}>Enable</button></div>}
        <div className="setrow"><div><b>Theme</b><span className="sub">{theme}</span></div><button className="btn" onClick={cycleTheme}>Switch</button></div>
      </section>
    </div>
  )
}
