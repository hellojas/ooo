import programsJson from '../data/programs.json'
import onlineJson from '../data/online-curriculum.json'
import phasesJson from '../data/training-phases.json'
import tripsJson from '../data/trips.json'
import coffeeJson from '../data/coffee-shops.json'
import type { Course, DayVideo, Phase, PhaseProgram, Program, Shop, Trip } from './types'

export const programs = programsJson as Program[]
export const courses = onlineJson.courses as Course[]
export const skipCourses = onlineJson.skip as { name: string; why: string }[]
export const dayByDay = onlineJson.dayByDay as DayVideo[]
export const phases = phasesJson.phases as Phase[]
export const phasePrograms = phasesJson.programs as PhaseProgram[]
export const trips = tripsJson as Trip[]
export const shops = coffeeJson as { readHere: Shop[]; checkOut: Shop[] }
export const OS_URL = 'https://app.openstudiojazz.com/courses'
export const byId = (id: string) => programs.find(p => p.id === id)
