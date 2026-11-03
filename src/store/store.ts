// Single state owner (06 rule 2). D1: read-only data from the RosterSource (demo, or the TEST COPY sheet once paired).
import { create } from 'zustand'
import { storageKey } from '../config'
import type { SheetState } from '../data/contract'
import { classesOf } from '../data/model'
import { DEMO_STATE, fakeSource } from '../data/fakeSource'
import { COPY_BRIDGE_URL, claimPair, sheetBridgeSource } from '../data/sheetSource'

export type Tab = 'checklist' | 'overview' | 'more'
export type Side = 'night' | 'day' | 'system'
export type ClassInfo = { classKey: string; label: string; subject: string }
type State = {
  tab: Tab; side: Side; source: 'demo' | 'copy'; status: 'idle' | 'loading' | 'ok' | 'error'; error: string | null; pulledAt: string | null
  data: SheetState; classes: ClassInfo[]; currentClass: string; jump: number
  setTab: (t: Tab) => void; setSide: (s: Side) => void; setClass: (k: string) => void; jumpToAnchor: () => void
  setToken: (t: string) => void; unpair: () => void; pair: (code: string) => Promise<void>; refresh: () => Promise<void>; reset: () => void
}
const PREFS = storageKey('prefs'); const TOKEN = storageKey('copyToken')
const forceDemo = () => typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo')
const token = () => (forceDemo() ? null : localStorage.getItem(TOKEN))
function loadSide(): Side {
  const u = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('side') : null; if (u === 'night' || u === 'day') return u // stills
  try { const v = JSON.parse(localStorage.getItem(PREFS) || '{}').side; return v === 'night' || v === 'day' ? v : 'system' } catch { return 'system' }
}
export const labelOf = (k: string) => (k === 'demo' ? 'KG-A' : k.replace(/^KG[-_ ]?([A-Z])\b.*/i, 'KG-$1'))
function withData(data: SheetState, prev?: string) {
  const classes = classesOf(data).map((c) => ({ ...c, label: labelOf(c.classKey) }))
  return { data, classes, currentClass: classes.some((c) => c.classKey === prev) ? prev! : classes[0]?.classKey ?? '' }
}
const initial = () => ({ tab: 'checklist' as Tab, side: loadSide(), source: 'demo' as const, status: 'idle' as const, error: null, pulledAt: null, jump: 0, ...withData(DEMO_STATE) })
export const useApp = create<State>((set, get) => ({
  ...initial(),
  setTab: (tab) => set({ tab }),
  setSide: (side) => { localStorage.setItem(PREFS, JSON.stringify({ side })); set({ side }) },
  setClass: (currentClass) => set({ currentClass }),
  jumpToAnchor: () => set({ jump: get().jump + 1 }),
  setToken: (t) => localStorage.setItem(TOKEN, t),
  unpair: () => { localStorage.removeItem(TOKEN); set({ source: 'demo', status: 'idle', error: null, pulledAt: null, ...withData(DEMO_STATE) }) },
  pair: async (code) => { const t = await claimPair(COPY_BRIDGE_URL, code); localStorage.setItem(TOKEN, t); await get().refresh() },
  refresh: async () => {
    const paired = !!token()
    const src = paired ? sheetBridgeSource(COPY_BRIDGE_URL, token) : fakeSource(DEMO_STATE)
    set({ status: 'loading', error: null })
    try { const data = await src.pull(); set({ source: paired ? 'copy' : 'demo', status: 'ok', pulledAt: new Date().toISOString(), ...withData(data, get().currentClass) }) }
    catch (e) { set({ status: 'error', error: e instanceof Error ? e.message : String(e) }) }
  },
  reset: () => set(initial()),
}))
