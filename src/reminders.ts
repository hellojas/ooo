import { programs } from './data'
import { itemsOn } from './model'
import { today } from './dates'
import type { UserData } from './types'

// In-app reminders: while the app is open (or installed and running) we notify 30 min before each
// session, and at 9pm if today's practice isn't logged. True background push needs a server (see README).
export const canNotify = () => 'Notification' in window
export const enableReminders = async () => canNotify() && (await Notification.requestPermission()) === 'granted'

const fired = new Set<string>()
export function startReminders(getUser: () => UserData) {
  const tick = () => {
    if (!canNotify() || Notification.permission !== 'granted') return
    const now = new Date(), k = today(), user = getUser(), mins = now.getHours() * 60 + now.getMinutes()
    for (const { p, missed } of itemsOn(k, user, programs)) {
      if (missed || user.attendance[`${p.id}|${k}`]) continue
      const m = p.time.match(/(\d{1,2})(?::(\d{2}))?[^\d]*?(a|p)/i)
      if (!m) continue
      const start = ((Number(m[1]) % 12) + (m[3].toLowerCase() === 'p' ? 12 : 0)) * 60 + Number(m[2] ?? 0)
      const id = `${p.id}|${k}`
      if (mins >= start - 30 && mins < start && !fired.has(id)) { fired.add(id); new Notification(p.short, { body: `${p.time} · ${p.go ?? p.loc ?? ''}` }) }
    }
    const pr = user.practice[k]
    if (mins >= 21 * 60 && !(pr?.sax || pr?.piano1 || pr?.piano2) && !fired.has('eve' + k) && k >= '2026-10-05' && k <= '2026-12-23') {
      fired.add('eve' + k); new Notification('Project ooo', { body: 'Log today’s practice and check-ins.' })
    }
  }
  const t = window.setInterval(tick, 60_000); tick()
  return () => clearInterval(t)
}
