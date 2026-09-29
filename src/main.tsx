import { Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// Clean up any service worker + caches left by earlier builds.
if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {})
if ('caches' in window) caches.keys().then(ks => ks.forEach(k => caches.delete(k))).catch(() => {})

class Boundary extends Component<{ children: ReactNode }, { err?: Error }> {
  state: { err?: Error } = {}
  static getDerivedStateFromError(err: Error) { return { err } }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 560 }}>
        <h2>Something broke</h2>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{String(this.state.err.stack ?? this.state.err)}</pre>
        <button onClick={() => location.reload()}>Reload</button>{' '}
        <button onClick={() => { if (confirm('Erase logged data on this device? (Synced data is kept.)')) { localStorage.removeItem('project-ooo:v1'); location.reload() } }}>Reset local data</button>
      </div>
    )
  }
}
createRoot(document.getElementById('root')!).render(<Boundary><App /></Boundary>)
