import { blocksForType, dayTypeFor, itemsOn, startFor, fmtMin } from './model'
import { span } from './ics'
import { today } from './dates'
import type { UserData } from './types'

// Block-start nudges while the app is open (or installed and running). Background push needs a server; see README.
export const canNotify = () => 'Notification' in window
export const enableReminders = async () => canNotify() && (await Notification.requestPermission()) === 'granted'
export const remindersOn = () => canNotify() && Notification.permission === 'granted'

const fired = new Set<string>()
export function startReminders(getUser: () => UserData) {
  const tick = () => {
    if (!remindersOn()) return
    const now = new Date(), k = today(), user = getUser(), mins = now.getHours() * 60 + now.getMinutes()
    const type = dayTypeFor(user, k, k)
    for (const b of blocksForType(k, type, startFor(user, k))) {
      if ((user.practice[k]?.skipped ?? []).includes(b.title)) continue
      const id = `b|${k}|${b.title}`
      if (mins >= b.start - 5 && mins < b.start + 10 && !fired.has(id)) { fired.add(id); new Notification(b.title, { body: `${fmtMin(b.start)}–${fmtMin(b.end)}${b.note ? ' · ' + b.note : ''}` }) }
    }
    for (const { p, missed } of itemsOn(k, user)) {
      if (missed || user.attendance[`${p.id}|${k}`]) continue
      const t = span(p.time); if (!t) continue
      const lead = Number(p.go?.match(/~?(\d+)\s*min/)?.[1] ?? 0) + 15
      const id = `s|${p.id}|${k}`
      if (mins >= t[0] - lead && mins < t[0] && !fired.has(id)) { fired.add(id); new Notification(p.short, { body: `${p.time}${p.go ? ' · leave now: ' + p.go : ''}` }) }
    }
  }
  const t = window.setInterval(tick, 60_000); tick()
  return () => clearInterval(t)
}
