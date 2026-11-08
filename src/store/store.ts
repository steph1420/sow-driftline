// Single state owner (06 rule 2). D2: ticks with auto-save to the TEST COPY (paired) or on-device demo.
import { create } from 'zustand'
import { storageKey } from '../config'
import type { SheetState } from '../data/contract'
import { classesOf } from '../data/model'
import { DEMO_STATE, fakeSource } from '../data/fakeSource'
import { schoolState, wantsSchool } from '../data/demoSchool'
import { todayIso } from '../data/today'
import { LIVE_SHEET_ID, lastSheetId, COPY_BRIDGE_URL, claimPair, copyWriter, sheetBridgeSource, verifyCopy } from '../data/sheetSource'
import { CONFIG, FLAVOR } from '../config'
import { parseSetup } from '../data/setup'
import { applyOps, cellKey, type Op } from '../sync/ops'
import { applyEdits, revertEdit, type SessionEdit } from '../data/edits'
import { modeOnOpen, type MarkMode } from '../data/late'
import { broadcast, createEngine, webLock, type SaveStatus } from '../sync/engine'
import { History } from '../sync/history'
import { createPoller } from '../sync/poller'
import { listSnapshots, restoreOps, takeSnapshot, type Snapshot } from '../sync/snapshots'

export type Tab = 'checklist' | 'overview' | 'more'
export type Side = 'night' | 'day' | 'system'
export type ClassInfo = { classKey: string; label: string; subject: string }
type State = {
  tab: Tab; side: Side; source: 'demo' | 'copy'; status: 'idle' | 'loading' | 'ok' | 'error'; error: string | null; pulledAt: string | null
  data: SheetState; classes: ClassInfo[]; currentClass: string; jump: number; focus: string | null; subject: string; setSubject: (subjectKey: string) => void; pending: boolean; setPending: (b: boolean) => void; pickSession: (sessionId: string) => void; quickHalf: 'done' | 'go' | null; find: string | null; setFind: (q: string | null) => void; openQuick: (half: 'done' | 'go' | null) => void; openSession: (classKey: string, sessionId: string) => void
  setTab: (t: Tab) => void; setSide: (s: Side) => void; setClass: (k: string) => void; jumpToAnchor: () => void
  view: View; setView: (v: Partial<View>) => void; quick: boolean; setQuick: (b: boolean) => void; openClass: (k: string) => void
  save: SaveStatus | 'demo'; waiting: number; canUndo: boolean; canRedo: boolean; snaps: Snapshot[]; dev: Dev
  tick: (sessionId: string, roll: number) => void; tickMany: (sessionId: string, rolls: number[], value: boolean) => void; deviceName: string; setDeviceName: (n: string) => void; undo: () => void; redo: () => void; restore: (at: string) => void; snapshotNow: (label: string) => void
  importSetup: (text: string) => Promise<void>; setDev: (d: Partial<Dev>) => void
  /** v0.7.0 S7/S8 date edits (on device) and S9 marks (marked time per tick, on device). */
  edits: SessionEdit[]; moveSession: (sessionId: string, date: string) => void; setTopic: (sessionId: string, topic: string) => void; addSession: (subjectKey: string, date: string) => string
  marks: Marks; markMode: MarkMode; setMarkMode: (m: MarkMode) => void; lateToast: number; hints: string[]; dismissHint: (id: string) => void
  setToken: (t: string) => void; unpair: () => void; pair: (code: string) => Promise<void>; refresh: () => Promise<void>; reset: () => void
}
export type View = { weeks: boolean; phoneCols: 1 | 2 } // t122u: phoneCols
export type Marks = Record<string, { at: string; back?: boolean }>
export type Dev = { railSide: 'right' | 'left'; railBubble: boolean; swipeTick: boolean }
const PREFS = storageKey('prefs'); const TOKEN = storageKey('copyToken'); const BRIDGE = storageKey('copyBridge'); const DEV = storageKey('dev')
const demoTicksKey = () => storageKey(wantsSchool() ? 'demoTicksSchool' : 'demoTicks')
const demoBase = () => (wantsSchool() ? schoolState(todayIso()) : DEMO_STATE); const VIEW = storageKey('view')
const loadView = (): View => { try { return { weeks: false, phoneCols: 1, ...JSON.parse(localStorage.getItem(VIEW) || '{}') } } catch { return { weeks: false, phoneCols: 1 } } }; const DEVNAME = storageKey('deviceName')
const guessName = () => { const u = typeof navigator !== 'undefined' ? navigator.userAgent : ''; return /iPad/.test(u) ? 'iPad' : /iPhone/.test(u) ? 'iPhone' : /Android/.test(u) ? 'Android phone' : /Mac/.test(u) ? 'Mac' : /Windows/.test(u) ? 'Windows PC' : 'This device' }
const src = () => (token() ? 'copy' : 'demo') as 'copy' | 'demo'
const hist = () => new History(localStorage, storageKey(`undo-${src()}`))
const snapKey = () => storageKey(`snapshots-${src()}`)
const bridgeUrl = () => localStorage.getItem(BRIDGE) || COPY_BRIDGE_URL
let lastMs = 0 // strictly increasing, so a quick Undo→Redo is never seen as “older”
const nowIso = () => { lastMs = Math.max(Date.now(), lastMs + 1); return new Date(lastMs).toISOString() }
const loadDev = (): Dev => { try { return { railSide: 'right', railBubble: true, swipeTick: true, ...JSON.parse(localStorage.getItem(DEV) || '{}') } } catch { return { railSide: 'right', railBubble: true, swipeTick: true } } }
const EDITS = () => storageKey(`edits-${src()}${wantsSchool() ? '-school' : ''}`); const MARKS = () => storageKey(`marks-${src()}${wantsSchool() ? '-school' : ''}`); const HINTS = storageKey('hints')
const LASTTAB = storageKey('lastTab')
const loadTab = (): Tab => { try { const v = localStorage.getItem(LASTTAB); return v === 'checklist' || v === 'overview' || v === 'more' ? v : 'overview' } catch { return 'overview' } }
const loadJson = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d } catch { return d } }
const loadEdits = (): SessionEdit[] => loadJson(EDITS(), [] as SessionEdit[]); const loadMarks = (): Marks => loadJson(MARKS(), {} as Marks)
/** Undo order across ticks and date edits (in memory). */
let order: ('tick' | 'edit')[] = []
let left: { date: string; at: number } | null = null
/** 'now' for the late rule; ?today= stills pretend it is midday that day. */
export const nowMs = () => { const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('today') : null; return q ? Date.parse(`${q}T12:00:00+05:30`) : Date.now() }
const demoOps = (): Op[] => { try { return JSON.parse(localStorage.getItem(demoTicksKey()) || '[]') } catch { return [] } }
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
export const firstSubject = (d: SheetState, k: string) => d.subjects.find((x) => x.classKey === k && x.active)?.subjectKey ?? ''
function withData(raw: SheetState, prev?: string, prevSubject?: string) {
  const data = applyEdits(raw, loadEdits())
  const classes = classesOf(data).map((c) => ({ ...c, label: labelOf(c.classKey) }))
  const currentClass = classes.some((c) => c.classKey === prev) ? prev! : classes[0]?.classKey ?? ''
  const keep = prevSubject && data.subjects.some((x) => x.subjectKey === prevSubject && x.classKey === currentClass)
  return { data, classes, currentClass, subject: keep ? prevSubject! : firstSubject(data, currentClass) }
}
const initial = () => ({ tab: loadTab(), // t112u/t113u: first open is Overview, then the last tab used
  side: loadSide(), source: 'demo' as const, status: 'idle' as const, error: null, pulledAt: null, jump: 0, focus: null as string | null, pending: false, quickHalf: null as 'done' | 'go' | null, find: null as string | null, save: 'demo' as const, waiting: 0, canUndo: false, canRedo: false, snaps: [] as Snapshot[], dev: loadDev(), view: loadView(), quick: false, edits: loadEdits(), marks: loadMarks(), markMode: 'late' as MarkMode, lateToast: 0, hints: loadJson(HINTS, [] as string[]), deviceName: (typeof localStorage !== 'undefined' && localStorage.getItem(DEVNAME)) || guessName(), ...withData(applyOps(demoBase(), demoOps())) })
export const useApp = create<State>((set, get) => ({
  ...initial(),
  setTab: (tab) => set({ tab, find: null }),
  setSide: (side) => { localStorage.setItem(PREFS, JSON.stringify({ side })); set({ side }) },
  setClass: (currentClass) => set({ currentClass, subject: firstSubject(get().data, currentClass), focus: null, find: null }),
  setSubject: (subjectKey) => { const x = get().data.subjects.find((y) => y.subjectKey === subjectKey); if (x) set({ currentClass: x.classKey, subject: subjectKey, focus: null, jump: get().jump + 1 }) },
  setPending: (pending) => set({ pending }),
  pickSession: (focus) => { const s = get(); const from = s.data.sessions.find((x) => x.sessionId === s.focus)?.date ?? null; const to = s.data.sessions.find((x) => x.sessionId === focus)?.date ?? ''
    const markMode = modeOnOpen({ mode: s.markMode, leftDate: left?.date ?? null, leftAtMs: left?.at ?? null, openDate: to, nowMs: Date.now(), keepMs: CONFIG.timing.modeKeepMs }); left = from ? { date: from, at: Date.now() } : null
    set({ focus, markMode, jump: s.jump + 1 }) },
  setMarkMode: (markMode) => set({ markMode }),
  dismissHint: (id) => { const hints = [...new Set([...get().hints, id])]; localStorage.setItem(HINTS, JSON.stringify(hints)); set({ hints }) },
  moveSession: (sessionId, date) => { const se = get().data.sessions.find((x) => x.sessionId === sessionId); if (!se || se.date === date) return; edit({ sessionId, date, prevDate: se.date }) },
  setTopic: (sessionId, topic) => { const se = get().data.sessions.find((x) => x.sessionId === sessionId); if (!se || se.topic === topic) return; edit({ sessionId, topic, prevTopic: se.topic }) },
  addSession: (subjectKey, date) => { const sub = get().data.subjects.find((x) => x.subjectKey === subjectKey); if (!sub) return ''
    let sessionId = `${subjectKey}|${date}`; while (get().data.sessions.some((x) => x.sessionId === sessionId)) sessionId += '+'
    edit({ sessionId, add: { sessionId, subjectKey, classKey: sub.classKey, date, topic: '', status: 'Open', updatedAt: nowIso() } }); return sessionId },
  openQuick: (quickHalf) => set({ quick: true, quickHalf }),
  setFind: (find) => set({ find }), // v0.8 F-CL-06: name search row, opened from the bar magnifier
  jumpToAnchor: () => set({ focus: null, jump: get().jump + 1 }),
  tick: (sessionId, roll) => {
    const d = get().data; const se = d.sessions.find((x) => x.sessionId === sessionId); if (!se) return
    const before = d.ticks.some((t) => t.sessionId === sessionId && t.roll === roll && t.set)
    const op: Op = { sessionId, subjectKey: se.subjectKey, classKey: se.classKey, date: se.date, roll, set: !before, updatedAt: nowIso() }
    hist().record(op, before); order.push('tick'); mark(op); write(op)
  },
  tickMany: (sessionId, rolls, value) => {
    const d = get().data; const se = d.sessions.find((x) => x.sessionId === sessionId); if (!se) return
    const at = nowIso(); const cells = rolls.map((roll) => ({ op: { sessionId, subjectKey: se.subjectKey, classKey: se.classKey, date: se.date, roll, set: value, updatedAt: at } as Op, before: d.ticks.some((t) => t.sessionId === sessionId && t.roll === roll && t.set) }))
      .filter((c) => c.before !== value)
    hist().recordMany(cells); if (cells.length) order.push('tick'); for (const c of cells) { mark(c.op); write(c.op) }
  },
  setDeviceName: (deviceName) => { localStorage.setItem(DEVNAME, deviceName); set({ deviceName }) },
  undo: () => { if (order[order.length - 1] === 'edit') { order.pop(); undoEdit(); return } order.pop(); for (const op of hist().undo(nowIso()) ?? []) write(op); useApp.setState(flags()) },
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
  setView: (v) => { const view = { ...get().view, ...v }; localStorage.setItem(VIEW, JSON.stringify(view)); set({ view }) },
  setQuick: (quick) => set(quick ? { quick } : { quick, quickHalf: null }),
  openClass: (k) => set({ currentClass: k, subject: firstSubject(get().data, k), tab: 'checklist', quick: false, focus: null, jump: get().jump + 1 }),
  /** v0.7j: a class card opens that class on Checklist at that card's session. */
  openSession: (classKey, sessionId) => set({ currentClass: classKey, subject: get().data.sessions.find((x) => x.sessionId === sessionId)?.subjectKey ?? firstSubject(get().data, classKey), tab: 'checklist', quick: false, focus: sessionId, jump: get().jump + 1 }),
  setDev: (d) => { const dev = { ...get().dev, ...d }; localStorage.setItem(DEV, JSON.stringify(dev)); set({ dev }) },
  setToken: (t) => localStorage.setItem(TOKEN, t),
  unpair: () => { syncLoop(false); localStorage.removeItem(TOKEN); localStorage.removeItem(BRIDGE); engine = null; set({ source: 'demo', status: 'idle', error: null, pulledAt: null, save: 'demo', waiting: 0, ...flags(), ...withData(applyOps(demoBase(), demoOps())) }) },
  pair: async (code) => { const u = COPY_BRIDGE_URL; const t = await claimPair(u, code, undefined, get().deviceName); localStorage.setItem(BRIDGE, u); localStorage.setItem(TOKEN, t); engine = null; await get().refresh() },
  refresh: async () => {
    const paired = !!token()
    const rs = paired ? sheetBridgeSource(bridgeUrl(), token) : fakeSource(applyOps(demoBase(), demoOps()))
    set({ status: 'loading', error: null })
    try {
      let data = await rs.pull()
      if (paired) { data = eng().adoptPull(data); void eng().flush() }
      set({ source: paired ? 'copy' : 'demo', status: 'ok', pulledAt: nowIso(), save: paired ? eng().status() : 'demo', waiting: paired ? eng().waiting() : 0, ...flags(), ...withData(data, get().currentClass, get().subject) })
      get().snapshotNow(paired ? 'Opened' : 'Opened (demo)'); syncLoop(paired)
    }
    catch (e) { set({ status: 'error', error: e instanceof Error ? e.message : String(e) }) }
  },
  reset: () => { syncLoop(false); engine = null; order = []; left = null; set({ ...initial(), ...flags() }) },
}))

const flags = () => { const h = hist(); return { canUndo: h.canUndo() || order[order.length - 1] === 'edit', canRedo: h.canRedo(), snaps: listSnapshots(localStorage, snapKey()) } }
function eng() {
  if (!engine) engine = createEngine({ storage: localStorage, key: storageKey('outbox'), lock: webLock, channel: broadcast(storageKey('tabs')), graceMs: CONFIG.timing.pendingGraceMs, retryMs: CONFIG.timing.saveRetryMs,
    push: copyWriter(bridgeUrl(), token), onState: (f) => useApp.setState((s) => withData(f(s.data), s.currentClass, s.subject)), onStatus: (save, waiting) => useApp.setState({ save, waiting }) })
  return engine
}
/** One write path: copy → engine (queue, other tabs, auto-save); demo → on device only. */
function write(op: Op) {
  if (useApp.getState().source === 'copy' && token()) eng().local(op)
  else { const l = demoOps().filter((x) => !(x.sessionId === op.sessionId && x.roll === op.roll)); l.push(op); localStorage.setItem(demoTicksKey(), JSON.stringify(l)); useApp.setState((s) => withData(applyOps(s.data, [op]), s.currentClass, s.subject)) }
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

/** v0.7.0 S7/S8: record a date edit on this device (undoable). */
function edit(e: Omit<SessionEdit, 'id' | 'at'>) {
  const at = nowIso(); const full: SessionEdit = { ...e, id: at, at }; const edits = [...loadEdits(), full]
  localStorage.setItem(EDITS(), JSON.stringify(edits)); order.push('edit')
  useApp.setState((s) => ({ edits, ...withData(s.data, s.currentClass, s.subject) })); useApp.setState(flags())
}
function undoEdit() {
  const edits = loadEdits(); const e = edits.pop(); if (!e) return
  localStorage.setItem(EDITS(), JSON.stringify(edits))
  useApp.setState((s) => ({ edits, focus: e.add && s.focus === e.sessionId ? null : s.focus, ...withData(revertEdit(s.data, e), s.currentClass, s.subject) })); useApp.setState(flags())
}
/** v0.7.0 S9 (F-LT-05): marked time per tick, kept apart from updatedAt so "newer wins" is untouched. Back-date = marked on the due day. */
function mark(op: Op) {
  const s = useApp.getState(); const marks = { ...s.marks }; const k = cellKey(op)
  if (op.set) marks[k] = { at: new Date(nowMs()).toISOString(), ...(s.markMode === 'back' ? { back: true } : {}) }; else delete marks[k]
  localStorage.setItem(MARKS(), JSON.stringify(marks))
  const late = op.set && s.markMode === 'late' && nowMs() >= Date.parse(`${op.date}T00:00:00+05:30`) + 864e5
  useApp.setState({ marks, ...(late ? { lateToast: s.lateToast + 1 } : {}) })
}

// t113u: remember the last tab on this device
useApp.subscribe((s, p) => { if (s.tab !== p.tab) { try { localStorage.setItem(LASTTAB, s.tab) } catch { /* storage off */ } } })
