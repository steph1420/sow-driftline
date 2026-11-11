// The device's op log (t254u, Q-HARM-10): every change this device makes or hears is an op; state = fold(Base + ops) with the
// same core as the bridge (core.js). Pure: persistence is ./persist, transport is ./engine.
import { OL_DEFAULT_RULES, olFold, olMaxLamport, olVv, olView, type BaseEntry, type Conflict, type Fold, type Kind, type LogOp, type Rules, type View, type VV } from './core'
import type { MarkRow, Pupil, SessionRow, SheetState, Subject, TickRow } from '../data/contract'
export type { LogOp, BaseEntry, Kind, VV } from './core'
/** What a log keeps on the device (IndexedDB). */
export type LogData = { v: 1; deviceId: string; base: BaseEntry[]; ops: LogOp[]; floor: VV; rules: Rules; roster: { classKey: string; roll: number; name: string }[]; hasBase: boolean; legacyDone?: boolean }
/** The bridge's opsPull / opsPush reply (the part the log uses). */
export type OpsReply = { vv?: VV; lamport?: number; rules?: Rules; floor?: VV; ops?: LogOp[]; base?: BaseEntry[]; roster?: LogData['roster']; accepted?: { opId: string; recvAt: string; status: string; message?: string }[]; resend?: VV | null }
export const newDeviceId = () => 'd' + Array.from({ length: 12 }, () => Math.floor(Math.random() * 36).toString(36)).join('')
export class OpLog {
  private byId = new Map<string, LogOp>(); private memo: { n: number; fold: Fold; view: View } | null = null; private n = 0
  base: BaseEntry[] = []; floor: VV = {}; rules: Rules = { ...OL_DEFAULT_RULES }; roster: LogData['roster'] = []; hasBase = false; legacyDone = false
  /** nextSeq: a counter shared by every tab of this install (one device = one seq run). */
  constructor(public deviceId: string, private nextSeq: (atLeast: number) => number, data?: LogData | null) {
    if (data && data.deviceId === deviceId) { this.base = data.base ?? []; this.floor = data.floor ?? {}; this.rules = data.rules ?? this.rules; this.roster = data.roster ?? []; this.hasBase = !!data.hasBase; this.legacyDone = !!data.legacyDone; for (const o of data.ops ?? []) this.byId.set(o.opId, o) }
  }
  ops(): LogOp[] { return [...this.byId.values()] }
  private changed() { this.n++ }
  /** Version vector of everything this device has (its own ops included). */
  vv(): VV { return olVv(this.ops(), this.floor) }
  /** What the sheet has confirmed (ops with recvAt): sent with each pull so the sheet answers only what is new. */
  serverVv(): VV { return olVv(this.ops().filter((o) => o.recvAt), this.floor) }
  /** A change on this device. Lamport = highest seen + 1; vv = what this device had seen. No clock decides anything. */
  local(kind: Kind, target: string, value: unknown, wallAt = new Date().toISOString()): LogOp {
    const vv = this.vv(); const seq = this.nextSeq((vv[this.deviceId] ?? 0) + 1)
    const lamport = Math.max(olMaxLamport(this.ops(), olMaxLamport(this.base, 0)), 0) + 1
    const op: LogOp = { opId: `${this.deviceId}:${seq}`, deviceId: this.deviceId, seq, lamport, vv, kind, target, value: value === undefined ? null : value, wallAt, recvAt: '', status: '' }
    this.byId.set(op.opId, op); this.changed(); return op
  }
  /** Ops from the sheet or another tab. The sheet's copy (with recvAt and status) replaces ours; duplicates are harmless. */
  receive(ops: LogOp[] = []) {
    let any = false
    for (const o of ops) {
      if (!o || !o.opId) continue; const had = this.byId.get(o.opId)
      if (!had || (o.recvAt && (had.recvAt !== o.recvAt || had.status !== (o.status ?? '')))) { this.byId.set(o.opId, { ...o, recvAt: o.recvAt ?? '', status: o.status ?? '' }); any = true }
    }
    if (any) this.changed()
  }
  adopt(r: OpsReply) {
    if (r.rules && JSON.stringify(r.rules) !== JSON.stringify(this.rules)) { this.rules = r.rules; this.changed() }
    if (r.roster) this.roster = r.roster
    if (r.base) { this.base = r.base; this.floor = r.floor ?? {}; this.hasBase = true; for (const [id, o] of this.byId) if (o.recvAt && o.seq <= (this.floor[o.deviceId] ?? 0)) this.byId.delete(id); this.changed() }
    for (const a of r.accepted ?? []) { const o = this.byId.get(a.opId); if (o && (!o.recvAt || o.status !== a.status)) { this.byId.set(a.opId, { ...o, recvAt: a.recvAt, status: a.status ?? '' }); this.changed() } }
    this.receive(r.ops)
  }
  /** This device's ops the sheet hasn't confirmed, in seq order. */
  unsent(): LogOp[] { return this.ops().filter((o) => o.deviceId === this.deviceId && !o.recvAt).sort((a, b) => a.seq - b.seq) }
  /** The sheet asked for a resend from `seq` (it lost them, or never got them): those count as unsent again. */
  resendFrom(seq: number) { for (const [id, o] of this.byId) if (o.deviceId === this.deviceId && o.seq >= seq && o.recvAt) this.byId.set(id, { ...o, recvAt: '', status: '' }); this.changed() }
  private folded() { if (!this.memo || this.memo.n !== this.n) { const fold = olFold(this.base, this.ops(), this.rules); this.memo = { n: this.n, fold, view: olView(fold) } } return this.memo }
  fold(): Fold { return this.folded().fold }
  view(): View { return this.folded().view }
  conflicts(): Conflict[] { return this.fold().conflicts }
  knows(sid: string) { return !!this.fold().regs[`alive:${sid}`] }
  data(): LogData { return { v: 1, deviceId: this.deviceId, base: this.base, ops: this.ops(), floor: this.floor, rules: this.rules, roster: this.roster, hasBase: this.hasBase, legacyDone: this.legacyDone } }
  /** The app's SheetState from the fold (session ids are the log's stable ids; the sheet shows subjectKey|date). */
  state(): SheetState { return toSheetState(this.view(), this.roster) }
}
const stamp = (c: { recvAt?: string; wallAt?: string } | undefined) => String(c?.recvAt || c?.wallAt || '')
export function toSheetState(v: View, roster: LogData['roster']): SheetState {
  const subjects: Subject[] = Object.values(v.subjects).filter((s) => s.classKey).sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)).map((s) => ({ subjectKey: s.subjectKey, classKey: s.classKey, subject: s.subject, kind: s.kind, active: s.active !== false }))
  const pupils: Pupil[] = roster.map((p) => { const r = v.left[`${p.classKey}|${p.roll}`]; return { classKey: p.classKey, roll: p.roll, name: p.name, status: r?.value === 'Left' ? 'Left' : 'Active', updatedAt: stamp(r?.win) } })
  const sessions: SessionRow[] = v.sessions.map((s) => ({ sessionId: s.sid, subjectKey: s.subjectKey, classKey: s.classKey, date: s.date, topic: s.topic, status: s.status, updatedAt: [s.regs.alive, s.regs.date, s.regs.topic].map((r) => stamp(r?.win)).sort().pop() ?? '' }))
  const meta = new Map(v.sessions.map((s) => [s.sid, s]))
  const ticks: TickRow[] = v.ticks.filter((t) => meta.has(t.sid)).map((t) => { const s = meta.get(t.sid)!; return { tickId: `${t.sid}|${t.roll}`, sessionId: t.sid, subjectKey: s.subjectKey, classKey: s.classKey, roll: t.roll, set: t.set === true, updatedAt: stamp(t.reg.win) } })
  const marks: MarkRow[] = v.marks.filter((m) => meta.has(m.sid)).map((m) => ({ tickId: `${m.sid}|${m.roll}`, sessionId: m.sid, roll: m.roll, at: m.at ?? '', back: m.back === true, updatedAt: stamp(m.reg.win) }))
  return { ok: true, schema: 1, subjects, roster: pupils, sessions, ticks, marks }
}
