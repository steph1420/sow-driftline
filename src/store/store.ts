// Single state owner (06 rule 2). D0 holds UI state + demo data; data layer arrives in D1.
import { create } from 'zustand'
import { storageKey } from '../config'
import { DEMO_CLASSES, DEMO_SESSIONS, type ClassInfo, type Session } from '../demo/demo'

export type Tab = 'checklist' | 'overview' | 'more'
export type Side = 'night' | 'day' | 'system'
type State = {
  tab: Tab; side: Side; source: 'demo'
  classes: ClassInfo[]; currentClass: string; sessions: Session[]
  setTab: (t: Tab) => void; setSide: (s: Side) => void; reset: () => void
}
const PREFS = storageKey('prefs')
function loadSide(): Side {
  try { const v = JSON.parse(localStorage.getItem(PREFS) || '{}').side; return v === 'night' || v === 'day' ? v : 'system' } catch { return 'system' }
}
const initial = () => ({ tab: 'checklist' as Tab, side: loadSide(), source: 'demo' as const, classes: DEMO_CLASSES, currentClass: DEMO_CLASSES[0].classKey, sessions: DEMO_SESSIONS })
export const useApp = create<State>((set) => ({
  ...initial(),
  setTab: (tab) => set({ tab }),
  setSide: (side) => { localStorage.setItem(PREFS, JSON.stringify({ side })); set({ side }) },
  reset: () => set(initial()),
}))
