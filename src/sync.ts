import { getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from 'firebase/auth'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useSyncExternalStore } from 'react'
import { auth, db, googleProvider } from './firebase'
import { getState, replace, setRemoteSaver } from './storage'
import { emptyUser } from './types'

// Optional: set VITE_ALLOWED_EMAIL to lock the app to one Google account.
const ALLOWED = import.meta.env.VITE_ALLOWED_EMAIL as string | undefined

export type SyncStatus = { user: User | null; state: 'signed-out' | 'syncing' | 'synced' | 'error'; error?: string }
let status: SyncStatus = { user: null, state: 'signed-out' }
const subs = new Set<() => void>()
const set = (s: SyncStatus) => { status = s; subs.forEach(f => f()) }
export const useSync = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f) } }, () => status)

export const signIn = async () => {
  set({ ...status, state: 'syncing', error: undefined })
  try { await signInWithPopup(auth, googleProvider) }
  catch (e) {
    const code = (e as { code?: string }).code ?? ''
    if (/popup-blocked|popup-closed|cancelled-popup|operation-not-supported/.test(code)) { try { await signInWithRedirect(auth, googleProvider); return } catch (e2) { e = e2 } }
    const msg = /unauthorized-domain/.test(code) ? `This domain (${location.hostname}) isn’t authorized in Firebase → Authentication → Settings → Authorized domains.` : String((e as Error).message ?? e)
    set({ user: null, state: 'error', error: msg })
  }
}
getRedirectResult(auth).catch(e => set({ user: null, state: 'error', error: String(e.message ?? e) }))
export const logOut = () => signOut(auth)

let unsub: (() => void) | undefined
let timer: number | undefined

onAuthStateChanged(auth, user => {
  unsub?.(); unsub = undefined; setRemoteSaver(null)
  if (!user) return set({ user: null, state: 'signed-out' })
  if (ALLOWED && user.email !== ALLOWED) {
    signOut(auth); return set({ user: null, state: 'error', error: 'This account is not allowed.' })
  }
  set({ user, state: 'syncing' })
  const ref = doc(db, 'users', user.uid)
  unsub = onSnapshot(ref, snap => {
    if (snap.metadata.hasPendingWrites) return
    if (snap.exists()) replace({ ...emptyUser(), ...JSON.parse(snap.data().json) })
    else setDoc(ref, { json: JSON.stringify(getState()), updatedAt: Date.now() }) // first sign-in: upload local data
    set({ user, state: 'synced' })
  }, e => set({ user, state: 'error', error: e.message }))
  setRemoteSaver(data => {
    clearTimeout(timer)
    timer = window.setTimeout(() => setDoc(ref, { json: JSON.stringify(data), updatedAt: Date.now() }).catch(e => set({ user, state: 'error', error: e.message })), 600)
  })
})
