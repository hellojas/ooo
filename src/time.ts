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

