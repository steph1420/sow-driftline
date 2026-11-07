// v0.7d late / back-date rules (Steve t70u, t72u, t79u). Pure, no I/O. Spec: FEATURES.md F-LT-*.
export type MarkMode = 'late' | 'back'
const NI = (): never => { throw new Error('not implemented (v0.7.0)') }
/** Epoch ms of midnight IST at the END of the scheduled day (the moment a copy becomes late). */
export function dueEndMs(_dateIso: string): number { return NI() }
/** true = late, false = on time, null = no known marked time (never guess late). backDated = marked on the due day. */
export function isLate(_markedAtIso: string | null | undefined, _dateIso: string, _backDated = false): boolean | null { return NI() }
/** The mode pill shows only once the due time has passed. */
export function pillVisible(_dateIso: string, _nowMs: number): boolean { return NI() }
/** Mode after opening a date: resets to late unless it is a quick return to the date we just left. */
export function modeOnOpen(_o: { mode: MarkMode; leftDate: string | null; leftAtMs: number | null; openDate: string; nowMs: number; keepMs: number }): MarkMode { return NI() }
