import { programs } from './data'
import { tripOn } from './model'
import type { UserData } from './types'

const pad = (n: number) => String(n).padStart(2, '0')
const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')

/** Parse "Tue 5:30–7p", "Sat 10a", "8–9:30a", "Thu 4:30–6:30p" → [startMin, endMin]. */
export function span(time: string): [number, number] | null {
  const m = time.match(/(\d{1,2})(?::(\d{2}))?(?:[–-](\d{1,2})(?::(\d{2}))?)?\s*([ap])?/i)
  if (!m) return null
  const suffix = (m[5] ?? 'p').toLowerCase()
  const conv = (h: number, mi: number, suf: string) => ((h % 12) + (suf === 'p' ? 12 : 0)) * 60 + mi
  const endH = m[3] ? Number(m[3]) : null
  const endSuf = suffix
  const end = endH != null ? conv(endH, Number(m[4] ?? 0), endSuf) : null
  // start shares the suffix unless that would put it after the end (e.g. 8–9:30a vs 11–1p)
  let start = conv(Number(m[1]), Number(m[2] ?? 0), suffix)
  if (end != null && start >= end) start = conv(Number(m[1]), Number(m[2] ?? 0), suffix === 'p' ? 'a' : 'p')
  return [start, end ?? start + 90]
}

/** ICS of the plan items (+ abs and reading) that aren't lost to travel. */
export function buildIcs(user: UserData, opts: { planOnly?: boolean } = {}): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Project ooo//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Project ooo']
  for (const p of programs) {
    if (opts.planOnly && p.kind === 'inperson' && !p.plan) continue
    if (user.settings.hiddenItems.includes(p.id)) continue
    const t = span(p.time)
    for (const d of p.dates) {
      if (tripOn(d, user.settings.tripsOff)) continue
      const [y, mo, da] = d.split('-').map(Number)
      const fmt = (min: number) => `${y}${pad(mo)}${pad(da)}T${pad(Math.floor(min / 60))}${pad(min % 60)}00`
      lines.push('BEGIN:VEVENT', `UID:${p.id}-${d}@project-ooo`, `DTSTAMP:20260929T000000Z`,
        t ? `DTSTART:${fmt(t[0])}` : `DTSTART;VALUE=DATE:${y}${pad(mo)}${pad(da)}`,
        ...(t ? [`DTEND:${fmt(t[1])}`] : []),
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
