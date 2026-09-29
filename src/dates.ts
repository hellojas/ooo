// Dates are handled as local "YYYY-MM-DD" strings; never via UTC.
export const parse = (k: string): Date => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const key = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const addDays = (d: Date, n: number): Date => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export const WEEK1 = '2026-10-04' // Sunday
export const START = '2026-10-05'
export const END = '2026-12-23'

/** Week number (1-based, Sunday-start) for a date key; <1 before week 1. */
export const weekNo = (k: string): number =>
  Math.floor((parse(k).getTime() - parse(WEEK1).getTime()) / 864e5 / 7) + 1
export const weekStart = (n: number): string => key(addDays(parse(WEEK1), 7 * (n - 1)))
export const today = (): string => key(new Date())
