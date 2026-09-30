import { programs } from './data'
import { stateOf, tripOn } from './model'
import { span } from './time'
export { span }
import type { UserData } from './types'

const pad = (n: number) => String(n).padStart(2, '0')
const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')

/** ICS of the plan items (+ abs and reading) that aren't lost to travel. */
export function buildIcs(user: UserData, opts: { planOnly?: boolean } = {}): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PROJECT OOO//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:PROJECT OOO', 'X-WR-TIMEZONE:America/New_York']
  for (const p of programs) {
    if (opts.planOnly && p.kind === 'inperson' && stateOf(p, user) === 'considering') continue
    if (user.settings.hiddenItems.includes(p.id)) continue
    const t = span(p.time)
    for (const d of p.dates) {
      if (tripOn(d, user.settings.tripsOff)) continue
      const [y, mo, da] = d.split('-').map(Number)
      const fmt = (min: number) => `${y}${pad(mo)}${pad(da)}T${pad(Math.floor(min / 60))}${pad(min % 60)}00`
      lines.push('BEGIN:VEVENT', `UID:${p.id}-${d}@project-ooo`, `DTSTAMP:20260929T000000Z`,
        t ? `DTSTART;TZID=America/New_York:${fmt(t[0])}` : `DTSTART;VALUE=DATE:${y}${pad(mo)}${pad(da)}`,
        ...(t ? [`DTEND;TZID=America/New_York:${fmt(t[1])}`] : []),
        `SUMMARY:${esc(p.short + (p.uncertain?.includes(d) ? ' (confirm)' : ''))}`,
        ...(p.loc ? [`LOCATION:${esc(p.loc)}`] : []), ...(p.url ? [`URL:${p.url}`] : []),
        'BEGIN:VALARM', 'TRIGGER:-PT45M', 'ACTION:DISPLAY', `DESCRIPTION:${esc(p.short)}`, 'END:VALARM', 'END:VEVENT')
    }
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export const downloadIcs = (user: UserData) => {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([buildIcs(user, { planOnly: true })], { type: 'text/calendar' }))
  a.download = 'project-ooo.ics'; a.click()
}

/** Google Calendar "add event" link for one session. */
export function gcalUrl(p: { short: string; time: string; loc?: string; url?: string }, date: string): string {
  const t = span(p.time), d = date.replace(/-/g, '')
  const f = (m: number) => `${d}T${pad(Math.floor(m / 60))}${pad(m % 60)}00`
  const q = new URLSearchParams({ action: 'TEMPLATE', text: p.short, dates: t ? `${f(t[0])}/${f(t[1])}` : `${d}/${d}`, ctz: 'America/New_York' })
  if (p.loc) q.set('location', p.loc)
  if (p.url) q.set('details', p.url)
  return 'https://calendar.google.com/calendar/render?' + q.toString()
}
