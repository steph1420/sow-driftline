// v0.7d late / back-date rules (Steve t70u, t72u, t79u). Pure, no I/O. Spec: FEATURES.md F-LT-*.
export type MarkMode = 'late' | 'back'
const IST_MS = 330 * 60e3
/** Epoch ms of midnight IST at the END of the scheduled day (the moment a copy becomes late). */
export function dueEndMs(dateIso: string): number {
  const [y, m, d] = dateIso.split('-').map(Number) as [number, number, number]
  return Date.UTC(y, m - 1, d + 1) - IST_MS
}
/** true = late, false = on time, null = no known marked time (never guess late). backDated = marked on the due day. */
export function isLate(markedAtIso: string | null | undefined, dateIso: string, backDated = false): boolean | null {
  if (backDated) return false
  if (!markedAtIso) return null
  const t = Date.parse(markedAtIso); if (isNaN(t)) return null
  return t >= dueEndMs(dateIso)
}
/** The mode pill shows only once the due time has passed. */
export const pillVisible = (dateIso: string, nowMs: number) => nowMs >= dueEndMs(dateIso)
/** Mode after opening a date: resets to late unless it is a quick return to the date we just left. */
export function modeOnOpen(o: { mode: MarkMode; leftDate: string | null; leftAtMs: number | null; openDate: string; nowMs: number; keepMs: number }): MarkMode {
  if (o.mode === 'late') return 'late'
  const quick = o.leftDate === o.openDate && o.leftAtMs != null && o.nowMs - o.leftAtMs <= o.keepMs
  return quick ? o.mode : 'late'
}
