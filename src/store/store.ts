// Single state owner (06 rule 2). D2: ticks with auto-save to the TEST COPY (paired) or on-device demo.
import { cleanQoStyle, type QoStyle } from '../data/qoCard'
import { create } from 'zustand'
import { storageKey } from '../config'
import { SCALE_DEFAULT, cleanScale, type DisplayScale } from '../shell/displayScale'
import type { SheetState } from '../data/contract'
import { classLabel, classesOf } from '../data/model'
import { DEMO_STATE, fakeSource } from '../data/fakeSource'
import { pastSchoolState, schoolState, wantsSchool } from '../data/demoSchool'
import { yearById, yearOf } from '../data/schoolYear'
import { todayIso } from '../data/today'
import { LIVE_SHEET_ID, lastSheetId, COPY_BRIDGE_URL, claimPair, copyWriter, sheetBridgeSource, verifyCopy } from '../data/sheetSource'
import { CONFIG, FLAVOR } from '../config'
import { exportSetup, parseSetup } from '../data/setup'
import { cleanSort, type NameSort } from '../data/sortNames'
import { applyOps, cellKey, type Op } from '../sync/ops'
import { applyEdits, revertEdit, type SessionEdit } from '../data/edits'
import { modeOnOpen, type MarkMode } from '../data/late'
import { scopeSubjects, stepScope, validPick, type ScopePick } from '../data/scope'
import type { DateFmt, DateSub } from '../data/dateFormat'
import { cleanHaptics, type Haptics } from '../shell/haptics'
import { cleanAnimScale, cleanMoments, type AnimScale, type MomentId, type Moments } from '../config/motion'
import { broadcast, createEngine, webLock, type SaveStatus } from '../sync/engine'
import { History } from '../sync/history'
import { createPoller } from '../sync/poller'
import { listSnapshots, restoreOps, takeSnapshot, type Snapshot } from '../sync/snapshots'

export type Tab = 'checklist' | 'overview' | 'settings'
export type Side = 'night' | 'day' | 'system'
export type Contrast = 'standard' | 'high'
/** F-SH-06: a new version is waiting; `apply` reloads into it (only ever on the teacher's tap). */
export type Update = { ready: boolean; apply: (() => void) | null; checkedAt: number | null }
export type ClassInfo = { classKey: string; label: string; subject: string }
type State = {
  tab: Tab; side: Side; contrast: Contrast; setContrast: (c: Contrast) => void; haptics: Haptics; setHaptics: (h: Haptics) => void; railHide: boolean; setRailHide: (on: boolean) => void; animScale: AnimScale; setAnimScale: (k: AnimScale) => void; moments: Moments; setMoment: (id: MomentId, on: boolean) => void; scale: DisplayScale; setScale: (p: Partial<DisplayScale>) => void; resetScale: () => void; update: Update; setUpdate: (u: Partial<Update>) => void; source: 'demo' | 'copy'; status: 'idle' | 'loading' | 'ok' | 'error'; error: string | null; pulledAt: string | null
  data: SheetState; classes: ClassInfo[]; currentClass: string; jump: number; focus: string | null; subject: string; setSubject: (subjectKey: string) => void; pending: boolean; setPending: (b: boolean) => void; pickSession: (sessionId: string) => void; find: string | null; setFind: (q: string | null) => void; openedAt: number; openSession: (classKey: string, sessionId: string) => void
  setTab: (t: Tab) => void; setSide: (s: Side) => void; setClass: (k: string) => void; jumpToAnchor: () => void
  view: View; setView: (v: Partial<View>) => void; quick: boolean; setQuick: (b: boolean) => void; quickPull: number; setQuickPull: (px: number) => void; openClass: (k: string) => void
  save: SaveStatus | 'demo'; waiting: number; canUndo: boolean; canRedo: boolean; snaps: Snapshot[]; dev: Dev
  tick: (sessionId: string, roll: number) => void; tickMany: (sessionId: string, rolls: number[], value: boolean) => void; deviceName: string; setDeviceName: (n: string) => void; undo: () => void; redo: () => void; restore: (at: string) => void; snapshotNow: (label: string) => void
  /** beta.13 (t230u): Checklist name order, on this device. */
  nameSort: NameSort; setNameSort: (s: NameSort) => void
  importSetup: (text: string) => Promise<void>; setDev: (d: Partial<Dev>) => void
  /** v0.7.0 S7/S8 date edits (on device) and S9 marks (marked time per tick, on device). */
  edits: SessionEdit[]; moveSession: (sessionId: string, date: string) => void; setTopic: (sessionId: string, topic: string) => void; addSession: (subjectKey: string, date: string) => string
  marks: Marks; markMode: MarkMode; setMarkMode: (m: MarkMode) => void; lateToast: number; hints: string[]; dismissHint: (id: string) => void
  /** v0.8 F-SH-08/09: a past school year (id like '2025-26') shown view-only, or null for now. */
  viewing: string | null; viewYear: (id: string | null) => void
  /** RDs2 Classes panel: starred subjects, the strip's pick (the chip swipe walks it) and whether the walk loops. On this device. */
  favs: string[]; toggleFav: (subjectKey: string) => void; scope: ScopePick; setScope: (p: ScopePick) => void; loop: boolean; setLoop: (b: boolean) => void; stepSubject: (dir: 1 | -1) => boolean
  setToken: (t: string) => void; unpair: () => void; pair: (code: string) => Promise<void>; refresh: () => Promise<void>; reset: () => void
}
export type View = { weeks: boolean; phoneCols: 1 | 2; dateFmt: DateFmt; dateSub: DateSub } // t122u: phoneCols; RDs2: header date format + subtext
export type Marks = Record<string, { at: string; back?: boolean }>
export type Dev = { railBubble: boolean; swipeTick: boolean; pastSessions: boolean; qoCard: QoStyle } // t150u: qoCard is dev-only
const PREFS = storageKey('prefs'); const TOKEN = storageKey('copyToken'); const BRIDGE = storageKey('copyBridge'); const DEV = storageKey('dev')
const demoTicksKey = () => storageKey(wantsSchool() ? 'demoTicksSchool' : 'demoTicks')
const demoBase = () => (wantsSchool() ? schoolState(todayIso(), Math.min(nowMs(), Date.now())) /* never stamp demo ticks in the future: newer-wins must keep real taps */ : DEMO_STATE); const VIEW = storageKey('view')
const VIEW_DEFAULT: View = { weeks: false, phoneCols: 1, dateFmt: 'dm', dateSub: 'count' }
const loadView = (): View => { const v = { ...VIEW_DEFAULT, ...loadJson<Partial<View>>(VIEW, {}) }
  return { weeks: !!v.weeks, phoneCols: v.phoneCols === 2 ? 2 : 1, dateFmt: (['dm', 'dow', 'dmon'] as const).includes(v.dateFmt) ? v.dateFmt : 'dm', dateSub: v.dateSub === 'topic' ? 'topic' : 'count' } }; const DEVNAME = storageKey('deviceName')
const guessName = () => { const u = typeof navigator !== 'undefined' ? navigator.userAgent : ''; return /iPad/.test(u) ? 'iPad' : /iPhone/.test(u) ? 'iPhone' : /Android/.test(u) ? 'Android phone' : /Mac/.test(u) ? 'Mac' : /Windows/.test(u) ? 'Windows PC' : 'This device' }
const src = () => (token() ? 'copy' : 'demo') as 'copy' | 'demo'
const hist = () => new History(localStorage, storageKey(`undo-${src()}`))
const snapKey = () => storageKey(`snapshots-${src()}`)
const bridgeUrl = () => localStorage.getItem(BRIDGE) || COPY_BRIDGE_URL
let lastMs = 0 // strictly increasing, so a quick Undo→Redo is never seen as “older”
const nowIso = () => { lastMs = Math.max(Date.now(), lastMs + 1); return new Date(lastMs).toISOString() }
const DEV_DEFAULTS: Dev = { railBubble: true, swipeTick: true, pastSessions: false, qoCard: 'd4' }
const loadDev = (): Dev => { const d = { ...DEV_DEFAULTS, ...loadJson<Partial<Dev>>(DEV, {}) }; return { railBubble: d.railBubble, swipeTick: d.swipeTick, pastSessions: d.pastSessions, qoCard: cleanQoStyle(d.qoCard) } } // RDs2: the A–Z side is fixed (left)
const FAVS = storageKey('favs'); const SORT = storageKey('nameSort'); const SCOPE = storageKey('scope')
const loadScope = (data: SheetState) => { const v = loadJson<{ pick?: ScopePick; loop?: boolean }>(SCOPE, {}); return { scope: validPick(data, v.pick), loop: v.loop === true } }
const saveScope = (scope: ScopePick, loop: boolean) => localStorage.setItem(SCOPE, JSON.stringify({ pick: scope, loop }))
const EDITS = () => storageKey(`edits-${src()}${wantsSchool() ? '-school' : ''}`); const MARKS = () => storageKey(`marks-${src()}${wantsSchool() ? '-school' : ''}`); const HINTS = storageKey('hints')
const LASTTAB = storageKey('lastTab')
const loadTab = (): Tab => { try { const v = localStorage.getItem(LASTTAB); return v === 'checklist' || v === 'overview' ? v : v === 'settings' || v === 'more' /* v0.8: More became Settings */ ? 'settings' : 'overview' } catch { return 'overview' } }
const loadJson = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d } catch { return d } }
const loadEdits = (): SessionEdit[] => loadJson(EDITS(), [] as SessionEdit[]); const loadMarks = (): Marks => loadJson(MARKS(), {} as Marks)
/** Undo and redo order across ticks and date edits (in memory); undone edits wait in `redoEdits` for Redo. */
type Step = 'tick' | 'edit'
let order: Step[] = []; let redoOrder: Step[] = []; let redoEdits: SessionEdit[] = []
/** A new action: it goes on the undo order and drops whatever was waiting for Redo. */
const did = (k: Step) => { order.push(k); redoOrder = []; redoEdits = []
  // beta.15 (t245u): Undo keeps the last undoMax steps in all, ticks and date edits together
  while (order.length > CONFIG.data.undoMax) { if (order.shift() === 'tick') hist().dropOldest() } }
let left: { date: string; at: number } | null = null
/** 'now' for the late rule; ?today= stills pretend it is midday that day. */
export const nowMs = () => { const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('today') : null; return q ? Date.parse(`${q}T12:00:00+05:30`) : Date.now() }
const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? v : []) // beta.14 BK-B14-08: a stored value of the wrong shape must not stop the app opening
const demoOps = (): Op[] => { try { return list<Op>(JSON.parse(localStorage.getItem(demoTicksKey()) || '[]')) } catch { return [] } }
let engine: ReturnType<typeof createEngine> | null = null
/** beta.14 BK-B14-04: the old engine is stopped, not just forgotten (its retry timer kept saving and set the save dot in demo). */
const dropEngine = () => { engine?.stop(); engine = null }
let poller: ReturnType<typeof createPoller> | null = null
function syncLoop(on: boolean) {
  poller?.stop(); poller = null; if (!on) return
  poller = createPoller({ pull: () => sheetBridgeSource(bridgeUrl(), token).pull(), everyMs: CONFIG.timing.quickSyncMs, hidden: () => typeof document !== 'undefined' && document.hidden,
    onPulled: (r) => { if (engine && useApp.getState().source === 'copy') { engine.pulled(r); useApp.setState({ pulledAt: nowIso() }) } } })
  poller.start()
}
const forceDemo = () => typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo')
const token = () => (forceDemo() ? null : localStorage.getItem(TOKEN))
type Prefs = { side: Side; contrast: Contrast; scale: DisplayScale; haptics: Haptics; railHide: boolean; animScale: AnimScale; moments: Moments }
function loadPrefs(): Prefs {
  const p = loadJson<Partial<Prefs>>(PREFS, {}); const u = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('side') : null
  const side = u === 'night' || u === 'day' ? u /* stills */ : p.side === 'night' || p.side === 'day' ? p.side : 'system'
  return { side, contrast: p.contrast === 'high' ? 'high' : 'standard', scale: cleanScale(p.scale), haptics: cleanHaptics(p.haptics), railHide: p.railHide === true, animScale: cleanAnimScale(p.animScale), moments: cleanMoments(p.moments) }
}
const savePrefs = (p: Partial<Prefs>) => { const s = useApp.getState(); localStorage.setItem(PREFS, JSON.stringify({ side: s.side, contrast: s.contrast, scale: s.scale, haptics: s.haptics, railHide: s.railHide, animScale: s.animScale, moments: s.moments, ...p })) }
export const firstSubject = (d: SheetState, k: string) => d.subjects.find((x) => x.classKey === k && x.active)?.subjectKey ?? ''
/** Classes and the current class/subject for a data set (kept when they still exist). */
function shape(data: SheetState, prev?: string, prevSubject?: string) {
  const classes = classesOf(data).map((c) => ({ ...c, label: classLabel(c.classKey) }))
  const currentClass = classes.some((c) => c.classKey === prev) ? prev! : classes[0]?.classKey ?? ''
  const keep = prevSubject && data.subjects.some((x) => x.subjectKey === prevSubject && x.classKey === currentClass)
  return { data, classes, currentClass, subject: keep ? prevSubject! : firstSubject(data, currentClass) }
}
const withData = (raw: SheetState, prev?: string, prevSubject?: string) => shape(applyEdits(raw, loadEdits()), prev, prevSubject)
/** The current year's view while a past year is shown, so Back to now is instant (refresh then catches up). */
let live: ReturnType<typeof shape> | null = null
const viewOnly = () => useApp.getState().viewing !== null
/** Wraps a write action so it does nothing while a past year is shown (F-SH-09: view-only). */
const liveOnly = <A extends unknown[]>(fn: (...a: A) => void) => (...a: A) => { if (!viewOnly()) fn(...a) }
const initial = () => ({ tab: loadTab(), // t112u/t113u: first open is Overview, then the last tab used
  ...loadPrefs(), update: { ready: false, apply: null, checkedAt: null } as Update, source: 'demo' as const, status: 'idle' as const, error: null, pulledAt: null, jump: 0, focus: null as string | null, pending: false, find: null as string | null, openedAt: nowMs(), save: 'demo' as const, waiting: 0, canUndo: false, canRedo: false, snaps: [] as Snapshot[], dev: loadDev(), view: loadView(), quick: false, quickPull: 0, edits: loadEdits(), marks: loadMarks(), markMode: 'late' as MarkMode, lateToast: 0, viewing: null as string | null, hints: list<string>(loadJson(HINTS, [])).filter((x) => typeof x === 'string'), favs: list<string>(loadJson(FAVS, [])).filter((x) => typeof x === 'string'), nameSort: cleanSort(loadJson(SORT, null)), ...loadScope(applyOps(demoBase(), demoOps())), deviceName: (typeof localStorage !== 'undefined' && localStorage.getItem(DEVNAME)) || guessName(), ...withData(applyOps(demoBase(), demoOps())) })
export const useApp = create<State>((set, get) => ({
  ...initial(),
  setTab: (tab) => set({ tab, find: null }),
  setSide: (side) => { savePrefs({ side }); set({ side }) },
  setContrast: (contrast) => { savePrefs({ contrast }); set({ contrast }) },
  setHaptics: (haptics) => { savePrefs({ haptics }); set({ haptics }) },
  setRailHide: (railHide) => { savePrefs({ railHide }); set({ railHide }) },
  setAnimScale: (k) => { const animScale = cleanAnimScale(k); savePrefs({ animScale }); set({ animScale }) }, // t210u
  setMoment: (id, on) => { const moments = { ...get().moments, [id]: on }; savePrefs({ moments }); set({ moments }) }, // beta.9 Motion details
  toggleFav: (k) => { const f = get().favs; const favs = f.includes(k) ? f.filter((x) => x !== k) : [...f, k]; localStorage.setItem(FAVS, JSON.stringify(favs)); set({ favs }) },
  setScope: (scope) => { saveScope(scope, get().loop); set({ scope }) },
  setLoop: (loop) => { saveScope(get().scope, loop); set({ loop }) },
  stepSubject: (dir) => { const s = get(); const next = stepScope(scopeSubjects(s.data, validPick(s.data, s.scope), s.favs).map((x) => x.subjectKey), s.subject, dir, s.loop); if (!next || next === s.subject) return false; s.setSubject(next); return true },
  setScale: (p) => { const scale = cleanScale({ ...get().scale, ...p }); savePrefs({ scale }); set({ scale }) },
  resetScale: () => { savePrefs({ scale: SCALE_DEFAULT }); set({ scale: SCALE_DEFAULT }) },
  setUpdate: (u) => set({ update: { ...get().update, ...u } }),
  setClass: (currentClass) => set({ currentClass, subject: firstSubject(get().data, currentClass), focus: null, find: null }),
  setSubject: (subjectKey) => { const x = get().data.subjects.find((y) => y.subjectKey === subjectKey); if (x) set({ currentClass: x.classKey, subject: subjectKey, focus: null, jump: get().jump + 1 }) },
  setPending: (pending) => set({ pending }),
  pickSession: (focus) => { const s = get(); const from = s.data.sessions.find((x) => x.sessionId === s.focus)?.date ?? null; const to = s.data.sessions.find((x) => x.sessionId === focus)?.date ?? ''
    const markMode = modeOnOpen({ mode: s.markMode, leftDate: left?.date ?? null, leftAtMs: left?.at ?? null, openDate: to, nowMs: Date.now(), keepMs: CONFIG.timing.modeKeepMs }); left = from ? { date: from, at: Date.now() } : null
    set({ focus, markMode, jump: s.jump + 1 }) },
  setMarkMode: (markMode) => set({ markMode }),
  dismissHint: (id) => { const hints = [...new Set([...get().hints, id])]; localStorage.setItem(HINTS, JSON.stringify(hints)); set({ hints }) },
  moveSession: liveOnly((sessionId, date) => { const se = get().data.sessions.find((x) => x.sessionId === sessionId); if (!se || se.date === date) return; edit({ sessionId, date, prevDate: se.date }) }),
  setTopic: liveOnly((sessionId, topic) => { const se = get().data.sessions.find((x) => x.sessionId === sessionId); if (!se || se.topic === topic) return; edit({ sessionId, topic, prevTopic: se.topic }) }),
  addSession: (subjectKey, date) => { if (viewOnly()) return ''; const sub = get().data.subjects.find((x) => x.subjectKey === subjectKey); if (!sub) return ''
    let sessionId = `${subjectKey}|${date}`; while (get().data.sessions.some((x) => x.sessionId === sessionId)) sessionId += '+'
    edit({ sessionId, add: { sessionId, subjectKey, classKey: sub.classKey, date, topic: '', status: 'Open', updatedAt: nowIso() } }); return sessionId },
  setFind: (find) => set({ find }), // v0.8 F-CL-06: name search row, opened from the bar magnifier
  jumpToAnchor: () => set({ focus: null, jump: get().jump + 1 }),
  tick: liveOnly((sessionId, roll) => {
    const d = get().data; const se = d.sessions.find((x) => x.sessionId === sessionId); if (!se) return
    const before = d.ticks.some((t) => t.sessionId === sessionId && t.roll === roll && t.set)
    const op: Op = { sessionId, subjectKey: se.subjectKey, classKey: se.classKey, date: se.date, roll, set: !before, updatedAt: nowIso() }
    hist().record(op, before); did('tick'); mark(op); write(op)
  }),
  tickMany: liveOnly((sessionId, rolls, value) => {
    const d = get().data; const se = d.sessions.find((x) => x.sessionId === sessionId); if (!se) return
    const at = nowIso(); const cells = rolls.map((roll) => ({ op: { sessionId, subjectKey: se.subjectKey, classKey: se.classKey, date: se.date, roll, set: value, updatedAt: at } as Op, before: d.ticks.some((t) => t.sessionId === sessionId && t.roll === roll && t.set) }))
      .filter((c) => c.before !== value)
    hist().recordMany(cells); if (cells.length) did('tick'); for (const c of cells) { mark(c.op); write(c.op) }
  }),
  setDeviceName: (deviceName) => { localStorage.setItem(DEVNAME, deviceName); set({ deviceName }) },
  undo: liveOnly(() => {
    if (order[order.length - 1] === 'edit') { order.pop(); const e = undoEdit(); if (e) { redoEdits.push(e); redoOrder.push('edit') } useApp.setState(flags()); return }
    order.pop(); const ops = hist().undo(nowIso()); if (ops) redoOrder.push('tick'); for (const op of ops ?? []) write(op); useApp.setState(flags())
  }),
  redo: liveOnly(() => {
    if (redoOrder[redoOrder.length - 1] === 'edit') { redoOrder.pop(); order.push('edit'); applyEdit(redoEdits.pop()!); useApp.setState(flags()); return }
    redoOrder.pop(); const ops = hist().redo(nowIso()); if (ops) order.push('tick'); for (const op of ops ?? []) write(op); useApp.setState(flags())
  }),
  snapshotNow: liveOnly((label: string) => { takeSnapshot(localStorage, snapKey(), get().data, label, nowIso(), CONFIG.data.snapshotsMax); set({ snaps: listSnapshots(localStorage, snapKey()) }) }),
  restore: liveOnly((at: string) => {
    const snap = listSnapshots(localStorage, snapKey()).find((x) => x.at === at); if (!snap) return
    get().snapshotNow('Before restore')
    for (const op of restoreOps(get().data, snap.state, nowIso())) write(op)
  }),
  setNameSort: (v) => { const nameSort = cleanSort(v); localStorage.setItem(SORT, JSON.stringify(nameSort)); set({ nameSort }) },
  importSetup: async (text) => {
    const { bridgeUrl: u, token: t } = parseSetup(text)
    await verifyCopy(u, t) // refuses anything that is not the test copy; nothing is stored until it passes
    localStorage.setItem(BRIDGE, u); localStorage.setItem(TOKEN, t); dropEngine(); await get().refresh()
  },
  setView: (v) => { const view = { ...get().view, ...v }; localStorage.setItem(VIEW, JSON.stringify(view)); set({ view }) },
  setQuick: (quick) => set({ quick, quickPull: 0 }),
  setQuickPull: (quickPull) => set({ quickPull: Math.max(0, quickPull) }), // t146u: px the Checklist dock tab has pulled Quick overview up
  openClass: (k) => set({ currentClass: k, subject: firstSubject(get().data, k), tab: 'checklist', quick: false, focus: null, jump: get().jump + 1 }),
  /** v0.7j: a class card opens that class on Checklist at that card's session. */
  openSession: (classKey, sessionId) => set({ currentClass: classKey, subject: get().data.sessions.find((x) => x.sessionId === sessionId)?.subjectKey ?? firstSubject(get().data, classKey), tab: 'checklist', quick: false, focus: sessionId, jump: get().jump + 1 }),
  setDev: (d) => { const dev = { ...get().dev, ...d }; localStorage.setItem(DEV, JSON.stringify(dev)); set({ dev }); if (!dev.pastSessions) get().viewYear(null) },
  viewYear: (id) => {
    const s = get(); const now = yearOf(todayIso()).id; const next = id === now ? null : id
    if (next === s.viewing) return
    if (next === null) { set({ viewing: null, focus: null, find: null, ...live }); live = null; void get().refresh(); return }
    if (s.viewing === null) { live = shape(s.data, s.currentClass, s.subject); syncLoop(false) }
    set({ viewing: next, focus: null, find: null, pending: false, ...shape(pastSchoolState(yearById(next), yearOf(todayIso()))) })
  },
  setToken: (t) => localStorage.setItem(TOKEN, t),
  unpair: () => { syncLoop(false); localStorage.removeItem(TOKEN); localStorage.removeItem(BRIDGE); dropEngine(); set({ source: 'demo', status: 'idle', error: null, pulledAt: null, save: 'demo', waiting: 0, ...flags(), ...withData(applyOps(demoBase(), demoOps())) }) },
  pair: async (code) => { const u = COPY_BRIDGE_URL; const t = await claimPair(u, code, undefined, get().deviceName); localStorage.setItem(BRIDGE, u); localStorage.setItem(TOKEN, t); dropEngine(); await get().refresh() },
  refresh: async () => {
    const paired = !!token()
    const rs = paired ? sheetBridgeSource(bridgeUrl(), token) : fakeSource(applyOps(demoBase(), demoOps()))
    set({ status: 'loading', error: null })
    try {
      let data = await rs.pull()
      if (paired) { data = eng().adoptPull(data); void eng().flush() }
      live = null; set({ viewing: null, source: paired ? 'copy' : 'demo', status: 'ok', pulledAt: nowIso(), save: paired ? eng().status() : 'demo', waiting: paired ? eng().waiting() : 0, ...flags(), ...withData(data, get().currentClass, get().subject) })
      get().snapshotNow(paired ? 'Opened' : 'Opened (demo)'); syncLoop(paired)
    }
    catch (e) { set({ status: 'error', error: e instanceof Error ? e.message : String(e) }) }
  },
  reset: () => { syncLoop(false); dropEngine(); order = []; redoOrder = []; redoEdits = []; left = null; live = null; set({ ...initial(), ...flags() }) },
}))

const flags = () => { const h = hist(); return { canUndo: h.canUndo() || order[order.length - 1] === 'edit', canRedo: h.canRedo() || redoOrder[redoOrder.length - 1] === 'edit', snaps: listSnapshots(localStorage, snapKey()) } }
/** While a past year is shown, engine state updates are ignored; Back to now pulls again. */
function eng() {
  if (!engine) engine = createEngine({ storage: localStorage, key: storageKey('outbox'), lock: webLock, channel: broadcast(storageKey('tabs')), graceMs: CONFIG.timing.pendingGraceMs, retryMs: CONFIG.timing.saveRetryMs,
    push: copyWriter(bridgeUrl(), token), onState: (f) => { if (!viewOnly()) useApp.setState((s) => withData(f(s.data), s.currentClass, s.subject)) }, onStatus: (save, waiting) => useApp.setState({ save, waiting }) })
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
/** beta.13 (t234u): this device's connection as a setup file (the text importSetup reads), or null in demo mode. */
export const setupFileText = (): string | null => { const t = token(); return t ? exportSetup({ bridgeUrl: bridgeUrl(), token: t }) : null }
export const onLive = () => lastSheetId === LIVE_SHEET_ID
export const sheetLabel = () => (onLive() ? 'live sheet' : 'test copy')

/** v0.7.0 S7/S8: record a date edit on this device (undoable). */
function edit(e: Omit<SessionEdit, 'id' | 'at'>) { did('edit'); applyEdit(e); useApp.setState(flags()) }
/** Stores the edit with a fresh time (a redo is a new edit as far as sync is concerned). */
function applyEdit(e: Omit<SessionEdit, 'id' | 'at'>) {
  const at = nowIso(); const edits = [...loadEdits(), { ...e, id: at, at }]
  localStorage.setItem(EDITS(), JSON.stringify(edits))
  useApp.setState((s) => ({ edits, ...withData(s.data, s.currentClass, s.subject) }))
}
function undoEdit(): SessionEdit | undefined {
  const edits = loadEdits(); const e = edits.pop(); if (!e) return undefined
  localStorage.setItem(EDITS(), JSON.stringify(edits))
  useApp.setState((s) => ({ edits, focus: e.add && s.focus === e.sessionId ? null : s.focus, ...withData(revertEdit(s.data, e), s.currentClass, s.subject) }))
  return e
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
