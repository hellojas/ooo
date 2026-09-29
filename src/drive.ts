import links from '../data/drive-links.json'
import { dayByDay } from './data'

export interface DriveLink { label: string; url: string }
export const DRIVE_FOLDER: DriveLink = { label: 'openstudiojazz folder (Drive)', url: 'https://drive.google.com/drive/folders/1b5Rx97AAOeevGxpxnaT91KndPQpnkmqE' }
export const allDriveLinks = links as (DriveLink & { match: string })[]

/** Drive links for the PDF text on a day ("JCB – Piano.pdf · Baker The Blues (browse)"). */
export const pdfLinks = (pdf?: string): DriveLink[] => pdf ? allDriveLinks.filter(l => pdf.toLowerCase().includes(l.match.toLowerCase())) : []

/** Every Drive link used across a course's days. */
export const courseLinks = (courseId: string): DriveLink[] => {
  const seen = new Map<string, DriveLink>()
  for (const v of dayByDay.filter(d => d.course === courseId)) for (const l of pdfLinks(v.pdf)) seen.set(l.url, l)
  return [...seen.values()]
}
