// v0.7.0 S7/S8: date edits kept on this device (move a date, topic, add a date). Pure. Spec: FEATURES.md F-DT-01/05/06, F-OV-05.
// The copy bridge (0.50) has no add-date or topic support yet, so these live on the device until bridge 0.51.0-dl.
import type { SessionRow, SheetState } from './contract'
import { addDays, dowOf } from './dial'
export type SessionEdit = { id: string; sessionId: string; at: string; date?: string; prevDate?: string; topic?: string; prevTopic?: string; add?: SessionRow }
/** Applies edits in order; safe to apply twice. */
export function applyEdits(s: SheetState, edits: SessionEdit[]): SheetState {
  if (!edits.length) return s
  let sessions = [...s.sessions]
  for (const e of edits) {
    if (e.add && !sessions.some((x) => x.sessionId === e.sessionId)) sessions.push({ ...e.add })
    if (e.date != null || e.topic != null) sessions = sessions.map((x) => (x.sessionId === e.sessionId ? { ...x, ...(e.date != null ? { date: e.date } : {}), ...(e.topic != null ? { topic: e.topic } : {}) } : x))
  }
  return { ...s, sessions }
}
/** Reverses one edit on already-edited data. */
export function revertEdit(s: SheetState, e: SessionEdit): SheetState {
  if (e.add) return { ...s, sessions: s.sessions.filter((x) => x.sessionId !== e.sessionId), ticks: s.ticks.filter((t) => t.sessionId !== e.sessionId) }
  return { ...s, sessions: s.sessions.map((x) => (x.sessionId === e.sessionId ? { ...x, ...(e.prevDate != null ? { date: e.prevDate } : {}), ...(e.prevTopic != null ? { topic: e.prevTopic } : {}) } : x)) }
}
/** F-DT-05: same subject (= same label CW/HW/Test) already has a session on that day. */
export const collides = (s: SheetState, subjectKey: string, date: string, exceptSessionId?: string) =>
  s.sessions.some((x) => x.subjectKey === subjectKey && x.date === date && x.sessionId !== exceptSessionId)
/** Next school days (Mon–Fri) after today that this subject doesn't have yet. */
export function nextClassDays(s: SheetState, subjectKey: string, today: string, n = 3): string[] {
  const out: string[] = []; let d = today
  for (let i = 0; i < 60 && out.length < n; i++) { d = addDays(d, 1); if (dowOf(d) < 5 && !collides(s, subjectKey, d)) out.push(d) }
  return out
}
