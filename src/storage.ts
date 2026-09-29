import { useSyncExternalStore } from 'react'
import { emptyUser, type UserData } from './types'

/** Swap this for a Firestore implementation later; the UI only talks to Storage. */
export interface Storage {
  load(): UserData
  save(data: UserData): void
}

const KEY = 'project-ooo:v1'
export const localStorageAdapter: Storage = {
  load() {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? { ...emptyUser(), ...JSON.parse(raw) } : emptyUser()
    } catch { return emptyUser() }
  },
  save(data) { try { localStorage.setItem(KEY, JSON.stringify(data)) } catch { /* private mode */ } },
}

let adapter: Storage = localStorageAdapter
let state: UserData = adapter.load()
const subs = new Set<() => void>()

export const setStorage = (s: Storage) => { adapter = s; state = s.load(); subs.forEach(f => f()) }
export const update = (fn: (d: UserData) => UserData) => {
  state = fn(state); adapter.save(state); subs.forEach(f => f())
}
export const useUser = (): UserData =>
  useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f) } }, () => state)

export const exportJson = () => JSON.stringify(state, null, 2)
export const importJson = (s: string) => update(() => ({ ...emptyUser(), ...JSON.parse(s) }))
