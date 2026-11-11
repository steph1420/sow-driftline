// Types for core.js (the one op-log core shared with bridge/Code.js).
export type Kind = 'tick.set' | 'tick.mark' | 'session.add' | 'session.remove' | 'session.date' | 'session.topic' | 'left.set' | 'subject.add' | 'subject.active'
export type VV = Record<string, number>
/** One change. opId = deviceId:seq. recvAt (sheet clock) is set by the bridge; '' = not received yet. wallAt = display only. */
export type LogOp = { opId: string; deviceId: string; seq: number; lamport: number; vv: VV; kind: Kind; target: string; value: unknown; wallAt: string; recvAt?: string; status?: string }
export type Cand = { value: unknown; opId?: string; deviceId: string; seq: number; lamport: number; vv: VV; recvAt: string; wallAt?: string; by?: string }
export type BaseEntry = Cand & { register: string }
export type Rules = { tick: 'set' | 'unset' | 'latest' }
export type Reg = { value: unknown; win: Cand; rule: string; lose: Cand[] }
export type Conflict = { register: string; rule: string; win: Cand; lose: Cand }
export type Fold = { regs: Record<string, Reg>; conflicts: Conflict[]; alias: Record<string, string> }
export type ViewSession = { sid: string; subjectKey: string; classKey: string; date: string; topic: string; status: string; createdAt: string; regs: Record<string, Reg> }
export type ViewTick = { sid: string; viewSid: string; roll: number; reg: Reg; set?: boolean; at?: string; back?: boolean }
export type View = { subjects: Record<string, { subjectKey: string; classKey: string; subject: string; kind: string; order?: number; active: boolean; reg?: Reg; actReg?: Reg }>; sessions: ViewSession[]; ticks: ViewTick[]; left: Record<string, Reg>; marks: ViewTick[]; subs: Record<string, unknown> }
export const OL_KINDS: Kind[]
export const OL_DEFAULT_RULES: Rules
export const OL_TICK_RULES: Rules['tick'][]
export function olWrites(op: LogOp): [string, unknown][]
export function olField(reg: string): string
export function olSidOf(reg: string): { f: string; sid: string; rest: string } | null
export function olCanon(reg: string, alias: Record<string, string>): string
export function olBefore(a: Cand, b: Cand): boolean
export function olNewer(a: Cand, b: Cand): number
export function olResolve(field: string, cands: Cand[], rules?: Rules): { win: Cand; rule: string; lose: Cand[] }
export function olFold(base: BaseEntry[], ops: LogOp[], rules?: Rules): Fold
export function olVv(ops: { deviceId: string; seq: number }[], floor?: VV): VV
export function olSince<T extends { deviceId: string; seq: number }>(ops: T[], vv?: VV): T[]
export function olMaxLamport(ops: { lamport?: number }[], floor?: number): number
export function olView(f: Fold): View
export function olProtectedSids(sessions: { sid: string; subjectKey: string; date: string; topic: string }[], todayIso: string): Record<string, true>
export function olCompact(base: BaseEntry[], ops: LogOp[], rules: Rules, todayIso: string, cutIso: string, floor?: VV): { base: BaseEntry[]; ops: LogOp[]; gone: LogOp[]; floor: VV }
export function olPlain(v: View): Record<string, unknown[]>
