// Single state owner (06 rule 2). D2: ticks with auto-save to the TEST COPY (paired) or on-device demo.
import { create } from 'zustand'
import { storageKey } from '../config'
import type { SheetState } from '../data/contract'
import { classesOf } from '../data/model'
import { DEMO_STATE, fakeSource } from '../data/fakeSource'
import { LIVE_BRIDGE_URL, LIVE_SHEET_ID, lastSheetId, COPY_BRIDGE_URL, claimPair, copyWriter, sheetBridgeSource, verifyCopy } from '../data/sheetSource'
import { CONFIG, FLAVOR } from '../config'
import { parseSetup } from '../data/setup'
import { applyOps, type Op } from '../sync/ops'
import { broadcast, createEngine, webLock, type SaveStatus } from '../sync/engine'
import { History } from '../sync/history'
import { createPoller } from '../sync/poller'
import { listSnapshots, restoreOps, takeSnapshot, type Snapshot } from '../sync/snapshots'

export type Tab = 'checklist' | 'overview' | 'more'
export type Side = 'night' | 'day' | 'system'
export type ClassInfo = { classKey: string; label: string; subject: string }
type State = {
  tab: Tab; side: Side; source: 'demo' | 'copy'; status: 'idle' | 'loading' | 'ok' | 'error'; error: string | null; pulledAt: string | null
  data: SheetState; classes: ClassInfo[]; currentClass: string; jump: number
  setTab: (t: Tab) => void; setSide: (s: Side) => void; setClass: (k: string) => void; jumpToAnchor: () => void
  save: SaveStatus | 'demo'; waiting: number; canUndo: boolean; canRedo: boolean; snaps: Snapshot[]; dev: Dev
  tick: (sessionId: string, roll: number) => void; tickMany: (sessionId: string, rolls: number[], value: boolean) => void; deviceName: string; setDeviceName: (n: string) => void; undo: () => void; redo: () => void; restore: (at: string) => void; snapshotNow: (label: string) => void
  importSetup: (text: string) => Promise<void>; setDev: (d: Partial<Dev>) => void
  setToken: (t: string) => void; unpair: () => void; pair: (code: string, target?: 'live' | 'copy') => Promise<void>; refresh: () => Promise<void>; reset: () => void
}
export type Dev = { railSide: 'right' | 'left'; railBubble: boolean; swipeTick: boolean }
const PREFS = storageKey('prefs'); const TOKEN = storageKey('copyToken'); const BRIDGE = storageKey('copyBridge'); const DEV = storageKey('dev')
const DEMO_TICKS = storageKey('demoTicks'); const DEVNAME = storageKey('deviceName')
const guessName = () => { const u = typeof navigator !== 'undefined' ? navigator.userAgent : ''; return /iPad/.test(u) ? 'iPad' : /iPhone/.test(u) ? 'iPhone' : /Android/.test(u) ? 'Android phone' : /Mac/.test(u) ? 'Mac' : /Windows/.test(u) ? 'Windows PC' : 'This device' }
const src = () => (token() ? 'copy' : 'demo') as 'copy' | 'demo'
const hist = () => new History(localStorage, storageKey(`undo-${src()}`))
const snapKey = () => storageKey(`snapshots-${src()}`)
const bridgeUrl = () => localStorage.getItem(BRIDGE) || COPY_BRIDGE_URL
let lastMs = 0 // strictly increasing, so a quick Undo→Redo is never seen as “older”
const nowIso = () => { lastMs = Math.max(Date.now(), lastMs + 1); return new Date(lastMs).toISOString() }
const loadDev = (): Dev => { try { return { railSide: 'right', railBubble: true, swipeTick: true, ...JSON.parse(localStorage.getItem(DEV) || '{}') } } catch { return { railSide: 'right', railBubble: true, swipeTick: true } } }
const demoOps = (): Op[] => { try { return JSON.parse(localStorage.getItem(DEMO_TICKS) || '[]') } catch { return [] } }
let engine: ReturnType<typeof createEngine> | null = null
let poller: ReturnType<typeof createPoller> | null = null
function syncLoop(on: boolean) {
  poller?.stop(); poller = null; if (!on) return
  poller = createPoller({ pull: () => sheetBridgeSource(bridgeUrl(), token).pull(), everyMs: CONFIG.timing.quickSyncMs, hidden: () => typeof document !== 'undefined' && document.hidden,
    onPulled: (r) => { if (engine && useApp.getState().source === 'copy') { engine.pulled(r); useApp.setState({ pulledAt: nowIso() }) } } })
  poller.start()
}
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
const initial = () => ({ tab: 'checklist' as Tab, side: loadSide(), source: 'demo' as const, status: 'idle' as const, error: null, pulledAt: null, jump: 0, save: 'demo' as const, waiting: 0, canUndo: false, canRedo: false, snaps: [] as Snapshot[], dev: loadDev(), deviceName: (typeof localStorage !== 'undefined' && localStorage.getItem(DEVNAME)) || guessName(), ...withData(applyOps(DEMO_STATE, demoOps())) })
export const useApp = create<State>((set, get) => ({
  ...initial(),
  setTab: (tab) => set({ tab }),
  setSide: (side) => { localStorage.setItem(PREFS, JSON.stringify({ side })); set({ side }) },
  setClass: (currentClass) => set({ currentClass }),
  jumpToAnchor: () => set({ jump: get().jump + 1 }),
  tick: (sessionId, roll) => {
    const d = get().data; const se = d.sessions.find((x) => x.sessionId === sessionId); if (!se) return
    const before = d.ticks.some((t) => t.sessionId === sessionId && t.roll === roll && t.set)
    const op: Op = { sessionId, subjectKey: se.subjectKey, classKey: se.classKey, date: se.date, roll, set: !before, updatedAt: nowIso() }
    hist().record(op, before); write(op)
  },
  tickMany: (sessionId, rolls, value) => {
    const d = get().data; const se = d.sessions.find((x) => x.sessionId === sessionId); if (!se) return
    const at = nowIso(); const cells = rolls.map((roll) => ({ op: { sessionId, subjectKey: se.subjectKey, classKey: se.classKey, date: se.date, roll, set: value, updatedAt: at } as Op, before: d.ticks.some((t) => t.sessionId === sessionId && t.roll === roll && t.set) }))
      .filter((c) => c.before !== value)
    hist().recordMany(cells); for (const c of cells) write(c.op)
  },
  setDeviceName: (deviceName) => { localStorage.setItem(DEVNAME, deviceName); set({ deviceName }) },
  undo: () => { for (const op of hist().undo(nowIso()) ?? []) write(op); useApp.setState(flags()) },
  redo: () => { for (const op of hist().redo(nowIso()) ?? []) write(op); useApp.setState(flags()) },
  snapshotNow: (label) => { takeSnapshot(localStorage, snapKey(), get().data, label, nowIso(), CONFIG.data.snapshotsMax); set({ snaps: listSnapshots(localStorage, snapKey()) }) },
  restore: (at) => {
    const snap = listSnapshots(localStorage, snapKey()).find((x) => x.at === at); if (!snap) return
    get().snapshotNow('Before restore')
    for (const op of restoreOps(get().data, snap.state, nowIso())) write(op)
  },
  importSetup: async (text) => {
    const { bridgeUrl: u, token: t } = parseSetup(text)
    await verifyCopy(u, t) // refuses anything that is not the test copy; nothing is stored until it passes
    localStorage.setItem(BRIDGE, u); localStorage.setItem(TOKEN, t); engine = null; await get().refresh()
  },
  setDev: (d) => { const dev = { ...get().dev, ...d }; localStorage.setItem(DEV, JSON.stringify(dev)); set({ dev }) },
  setToken: (t) => localStorage.setItem(TOKEN, t),
  unpair: () => { syncLoop(false); localStorage.removeItem(TOKEN); localStorage.removeItem(BRIDGE); engine = null; set({ source: 'demo', status: 'idle', error: null, pulledAt: null, save: 'demo', waiting: 0, ...flags(), ...withData(applyOps(DEMO_STATE, demoOps())) }) },
  pair: async (code, target = 'copy') => { const u = target === 'live' && FLAVOR === 'stable' ? LIVE_BRIDGE_URL : COPY_BRIDGE_URL; const t = await claimPair(u, code, undefined, target === 'live' ? undefined : get().deviceName); localStorage.setItem(BRIDGE, u); localStorage.setItem(TOKEN, t); engine = null; await get().refresh() },
  refresh: async () => {
    const paired = !!token()
    const rs = paired ? sheetBridgeSource(bridgeUrl(), token) : fakeSource(applyOps(DEMO_STATE, demoOps()))
    set({ status: 'loading', error: null })
    try {
      let data = await rs.pull()
      if (paired) { data = eng().adoptPull(data); void eng().flush() }
      set({ source: paired ? 'copy' : 'demo', status: 'ok', pulledAt: nowIso(), save: paired ? eng().status() : 'demo', waiting: paired ? eng().waiting() : 0, ...flags(), ...withData(data, get().currentClass) })
      get().snapshotNow(paired ? 'Opened' : 'Opened (demo)'); syncLoop(paired)
    }
    catch (e) { set({ status: 'error', error: e instanceof Error ? e.message : String(e) }) }
  },
  reset: () => { syncLoop(false); engine = null; set({ ...initial(), ...flags() }) },
}))

const flags = () => { const h = hist(); return { canUndo: h.canUndo(), canRedo: h.canRedo(), snaps: listSnapshots(localStorage, snapKey()) } }
function eng() {
  if (!engine) engine = createEngine({ storage: localStorage, key: storageKey('outbox'), lock: webLock, channel: broadcast(storageKey('tabs')), graceMs: CONFIG.timing.pendingGraceMs, retryMs: CONFIG.timing.saveRetryMs,
    push: copyWriter(bridgeUrl(), token), onState: (f) => useApp.setState((s) => withData(f(s.data), s.currentClass)), onStatus: (save, waiting) => useApp.setState({ save, waiting }) })
  return engine
}
/** One write path: copy → engine (queue, other tabs, auto-save); demo → on device only. */
function write(op: Op) {
  if (useApp.getState().source === 'copy' && token()) eng().local(op)
  else { const l = demoOps().filter((x) => !(x.sessionId === op.sessionId && x.roll === op.roll)); l.push(op); localStorage.setItem(DEMO_TICKS, JSON.stringify(l)); useApp.setState((s) => withData(applyOps(s.data, [op]), s.currentClass)) }
  useApp.setState(flags())
}
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { if (engine) void engine.flush(); void poller?.now() })
  window.addEventListener('focus', () => void poller?.now())
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void poller?.now() })
  window.addEventListener('pagehide', () => { if (engine) void engine.flush() })
  setInterval(() => { const s = useApp.getState(); if (s.status === 'ok') s.snapshotNow('Auto') }, CONFIG.timing.snapshotEveryMs)
}
export const currentBridge = () => ({ url: bridgeUrl(), token })
export const onLive = () => lastSheetId === LIVE_SHEET_ID
export const sheetLabel = () => (onLive() ? 'live sheet' : 'test copy')
