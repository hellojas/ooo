import type { SVGProps } from 'react'
// Stroke icons in the Lucide style, inline so nothing is fetched.
const I = ({ children, ...p }: SVGProps<SVGSVGElement>) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>{children}</svg>
export const Ic = {
  today: (p: SVGProps<SVGSVGElement>) => <I {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><rect x="8" y="14" width="3" height="3" fill="currentColor" stroke="none" /></I>,
  calendar: (p: SVGProps<SVGSVGElement>) => <I {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></I>,
  practice: (p: SVGProps<SVGSVGElement>) => <I {...p}><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></I>,
  review: (p: SVGProps<SVGSVGElement>) => <I {...p}><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></I>,
  play: (p: SVGProps<SVGSVGElement>) => <I {...p}><path d="M17 8h1a4 4 0 1 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" /><path d="M6 2v2M10 2v2M14 2v2" /></I>,
  gear: (p: SVGProps<SVGSVGElement>) => <I {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></I>,
  start: (p: SVGProps<SVGSVGElement>) => <I {...p}><path d="M6 4l14 8-14 8z" fill="currentColor" stroke="none" /></I>,
  stop: (p: SVGProps<SVGSVGElement>) => <I {...p}><rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none" /></I>,
  lesson: (p: SVGProps<SVGSVGElement>) => <I {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></I>,
  chart: (p: SVGProps<SVGSVGElement>) => <I {...p}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></I>,
  piano: (p: SVGProps<SVGSVGElement>) => <I {...p}><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 6v7M10 6v7M14 6v7M18 6v7" /><path d="M5 13h2M9 13h2M13 13h2M17 13h2" strokeWidth="2.6" /></I>,
  sax: (p: SVGProps<SVGSVGElement>) => <I {...p}><path d="M7 3l2 2" /><path d="M9 5c0 4 1 8 3 10s4 3 5 3a3 3 0 0 0 0-6c-1 0-2-1-3-3s-2-4-5-4z" /><path d="M11 9l2-1M12 12l2-1" /><circle cx="17" cy="15" r=".8" fill="currentColor" stroke="none" /></I>,
  workout: (p: SVGProps<SVGSVGElement>) => <I {...p}><path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12" /><path d="M8 7h-2v10h2zM16 7h2v10h-2z" /></I>,
  logo: (p: SVGProps<SVGSVGElement>) => <svg width="40" height="22" viewBox="0 0 40 22" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" {...p}><circle cx="9" cy="11" r="7.5" /><circle cx="20" cy="11" r="7.5" /><circle cx="31" cy="11" r="7.5" /></svg>,
}
