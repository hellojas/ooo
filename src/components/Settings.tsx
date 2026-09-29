import { trips } from '../data'
import { downloadIcs } from '../ics'
import { canNotify, enableReminders } from '../reminders'
import { exportJson, importJson, update, useUser } from '../storage'
import { logOut, signIn, useSync } from '../sync'

export function Settings({ theme, cycleTheme }: { theme: string; cycleTheme: () => void }) {
  const user = useUser(), sync = useSync()
  return (
    <>
      <section className="panel">
        <h2>Travel</h2><p>Sessions on trip days show as missed. Untick a trip to treat it as not happening.</p>
        <ul className="checks">{trips.map(t => <li key={t.name}><label><input type="checkbox" checked={!user.settings.tripsOff.includes(t.name)}
          onChange={e => update(u => ({ ...u, settings: { ...u.settings, tripsOff: e.target.checked ? u.settings.tripsOff.filter(x => x !== t.name) : [...u.settings.tripsOff, t.name] } }))} />
          {t.name} <span className="sub">{t.from} → {t.to}</span></label></li>)}</ul>
        <label className="inl">Taipei start <input type="date" value={user.settings.taipeiStart ?? ''} min="2026-12-01" max="2026-12-28"
          onChange={e => update(u => ({ ...u, settings: { ...u.settings, taipeiStart: e.target.value || undefined } }))} /></label>
        <p className="sub">Changing the Taipei start recomputes which sessions you’d miss.</p>
      </section>
      <section className="panel">
        <h2>Account &amp; sync</h2>
        {sync.user
          ? <p>Signed in as {sync.user.email} · {sync.state === 'synced' ? 'synced ☁' : sync.state === 'error' ? `sync error: ${sync.error}` : 'syncing…'} <button className="btn" onClick={logOut}>Sign out</button></p>
          : <p>Data is stored on this device only. <button className="btn primary" onClick={signIn}>Sign in with Google to sync</button>{sync.error && <span className="sub"> {sync.error}</span>}</p>}
      </section>
      <section className="panel">
        <h2>App</h2>
        <div className="row">
          <button className="btn" onClick={cycleTheme}>Theme: {theme}</button>
          {canNotify() && <button className="btn" onClick={async () => alert((await enableReminders()) ? 'Reminders on while the app is open.' : 'Notifications blocked.')}>Enable reminders</button>}
          <button className="btn" onClick={() => downloadIcs(user)}>Calendar export (.ics)</button>
        </div>
        <h3>Backup</h3>
        <div className="row">
          <button className="btn" onClick={() => { const b = new Blob([exportJson()], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'ooo-backup.json'; a.click() }}>Export JSON</button>
          <label className="btn">Import JSON<input type="file" accept="application/json" hidden onChange={async e => { const f = e.target.files?.[0]; if (f) importJson(await f.text()) }} /></label>
        </div>
      </section>
    </>
  )
}
