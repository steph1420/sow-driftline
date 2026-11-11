// Date edits: move a date, topic, add a date, delete a date (undo of an add). Pure. Spec: FEATURES.md F-DT-01/05/06, F-OV-05.
// beta.16 (t245u): edits are no longer kept only on the device. On the test copy they wait here (an overlay on the pulled
// sheet) until the next push sends them through the bridge's existing `push` (structs rename/delete + sessions), then
// they are dropped. In demo mode they stay on the device for good.
// Sheet rule (bridge 0.46.2 applyPush_/applyStructs_): a session's id is `subjectKey|yyyy-mm-dd` of its date, and a move
// re-keys the session and its ticks. The app follows the same rule, so local ids always match the sheet's.
import type { SessionRow, SheetState, TickRow } from './contract'
import { addDays, dowOf } from './dial'
export type SessionEdit = { id: string; sessionId: string; at: string; subjectKey?: string
  /** move: new date, the date before, and the session's id after the move (old edits from beta.14 have no `to`) */
  date?: string; prevDate?: string; to?: string
  topic?: string; prevTopic?: string
  /** add a session (this row) */
  add?: SessionRow
  /** delete the session (the row as it was, so Redo/Undo can bring it back) */
  del?: SessionRow }
export const subjectOf = (sessionId: string) => sessionId.split('|')[0] ?? ''
/** The sheet's id for a session of `subjectKey` on `date`. */
export const sheetId = (subjectKey: string, date: string) => `${subjectKey}|${date}`
const isMove = (e: SessionEdit) => e.date != null && !e.add && !e.del
/** The id a move gives the session: `subjectKey|newDate`. */
export const movedId = (e: SessionEdit) => e.to ?? sheetId(e.subjectKey ?? subjectOf(e.sessionId), e.date!)
const retick = (t: TickRow, sessionId: string): TickRow => ({ ...t, sessionId, tickId: `${sessionId}|${t.roll}` })

/** Re-keys a session (and its ticks) to `to` on `date`. If `to` already exists (a pull that has not seen the move yet
 *  merged a tick into a stand-in row), the moved row wins and the ticks merge per cell, newer wins. */
export function rekey(s: SheetState, from: string, to: string, date: string): SheetState {
  const row = s.sessions.find((x) => x.sessionId === from); if (!row) return s
  if (from === to) return { ...s, sessions: s.sessions.map((x) => (x.sessionId === from ? { ...x, date } : x)) }
  const sessions = s.sessions.filter((x) => x.sessionId !== to).map((x) => (x.sessionId === from ? { ...x, sessionId: to, date } : x))
  const cells = new Map<number, TickRow>(); const rest: TickRow[] = []
  for (const t of s.ticks) {
    if (t.sessionId !== from && t.sessionId !== to) { rest.push(t); continue }
    const n = retick(t, to); const o = cells.get(n.roll)
    if (!o || String(n.updatedAt) > String(o.updatedAt)) cells.set(n.roll, n)
  }
  return { ...s, sessions, ticks: [...rest, ...cells.values()] }
}
/** Applies edits in order; safe to apply twice (an edit whose session is already where it should be does nothing). */
export function applyEdits(s: SheetState, edits: SessionEdit[]): SheetState {
  if (!edits.length) return s
  let out = s; const alias = new Map<string, string>() // old id → id after a move earlier in this list
  const res = (id: string) => { let x = id; for (let i = 0; i < 20 && alias.has(x); i++) x = alias.get(x)!; return x }
  for (const e of edits) {
    // only beta.14 edits (no subjectKey) kept a moved session's old id; newer edits always name the session's current id
    const id = e.subjectKey ? e.sessionId : res(e.sessionId)
    if (e.add) { alias.delete(id); if (!out.sessions.some((x) => x.sessionId === id)) out = { ...out, sessions: [...out.sessions, { ...e.add, sessionId: id }] }; continue }
    if (e.del) { out = { ...out, sessions: out.sessions.filter((x) => x.sessionId !== id), ticks: out.ticks.filter((t) => t.sessionId !== id) }; continue }
    if (isMove(e)) { const to = movedId(e); if (to !== id) { alias.set(id, to); alias.delete(to) }
      if (out.sessions.some((x) => x.sessionId === id)) out = rekey(out, id, to, e.date!) }
    if (e.topic != null) { const tid = isMove(e) ? res(id) : id; out = { ...out, sessions: out.sessions.map((x) => (x.sessionId === tid ? { ...x, topic: e.topic! } : x)) } }
  }
  return out
}
/** The edit that undoes `e`, given the data as it is now (right after `e`). Redo is the inverse of the inverse. */
export function inverseEdit(s: SheetState, e: SessionEdit): Omit<SessionEdit, 'id' | 'at'> | null {
  const subjectKey = e.subjectKey ?? subjectOf(e.sessionId)
  if (e.add) { const row = s.sessions.find((x) => x.sessionId === e.sessionId); return row ? { sessionId: e.sessionId, subjectKey, del: row } : null }
  if (e.del) return { sessionId: e.sessionId, subjectKey, add: e.del }
  if (isMove(e)) return { sessionId: movedId(e), subjectKey, date: e.prevDate, prevDate: e.date, to: e.sessionId }
  if (e.topic != null) return { sessionId: e.sessionId, subjectKey, topic: e.prevTopic ?? '', prevTopic: e.topic }
  return null
}

export type Struct = { kind: 'rename'; subjectKey: string; from: string; to: string; at: string } | { kind: 'delete'; subjectKey: string; date: string; at: string }
export type SessionOp = { subjectKey: string; date: string; topic: string; updatedAt: string }
const later = (at: string) => new Date(Date.parse(at) + 1).toISOString()
/** beta.16: what a batch of edits asks of the sheet, in the bridge's order (structs first, then ticks, then sessions).
 *  Each session's edits are folded into one result: where it ended up, its topic, whether it was deleted or added. */
export function editsToPush(edits: SessionEdit[]): { structs: Struct[]; sessions: SessionOp[] } {
  type Chain = { subjectKey: string; orig: string | null; cur: string; exists: boolean; topic?: string; delAt?: string; moveAt?: string; lastAt: string; first: number }
  const chains = new Map<string, Chain>() // keyed by the session's current id
  const alias = new Map<string, string>() // beta.14 edits kept the old id after a move
  edits.forEach((e, n) => {
    const subjectKey = e.subjectKey ?? e.add?.subjectKey ?? e.del?.subjectKey ?? subjectOf(e.sessionId)
    const key = e.subjectKey || chains.has(e.sessionId) ? e.sessionId : alias.get(e.sessionId) ?? e.sessionId
    if (e.add) alias.delete(e.sessionId)
    let c = chains.get(key)
    if (!c) { const date = e.add ? e.add.date : e.del ? e.del.date : isMove(e) ? (e.prevDate ?? e.sessionId.slice(subjectKey.length + 1, subjectKey.length + 11)) : e.sessionId.slice(subjectKey.length + 1, subjectKey.length + 11)
      c = { subjectKey, orig: e.add ? null : date, cur: date, exists: true, lastAt: e.at, first: n }; chains.set(key, c) }
    c.lastAt = e.at
    if (e.add) { c.exists = true; c.cur = e.add.date; c.topic = e.add.topic || undefined; return }
    if (e.del) { c.exists = false; if (c.orig != null && !c.delAt) c.delAt = e.at; c.topic = undefined; return }
    if (isMove(e)) { c.cur = e.date!; c.moveAt ??= e.at; const to = movedId(e); if (to !== key) { chains.delete(key); chains.set(to, c); alias.set(e.sessionId, to); alias.set(key, to); alias.delete(to) } }
    if (e.topic != null) c.topic = e.topic
  })
  const structs: Struct[] = []; const sessions: SessionOp[] = []
  for (const c of [...chains.values()].sort((a, b) => a.first - b.first)) {
    const reborn = c.delAt != null && c.exists // deleted on the sheet, then brought back (Redo) in the same batch
    if (c.orig != null && c.delAt) structs.push({ kind: 'delete', subjectKey: c.subjectKey, date: c.orig, at: c.delAt })
    else if (c.orig != null && c.exists && c.cur !== c.orig) structs.push({ kind: 'rename', subjectKey: c.subjectKey, from: c.orig, to: c.cur, at: c.moveAt ?? c.lastAt })
    // a sessions op adds a missing session or saves its topic; its stamp must beat the rename/delete stamp on that row
    if (c.exists && (c.orig == null || reborn || c.topic != null)) sessions.push({ subjectKey: c.subjectKey, date: c.cur, topic: c.topic ?? '', updatedAt: later(c.lastAt) })
  }
  return { structs, sessions }
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
