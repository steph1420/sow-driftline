// D2 per-cell ops. One cell = (sessionId, roll). Newer updatedAt wins — same rule as bridge applyPush_.
import type { SheetState } from '../data/contract'
export type Op = { sessionId: string; subjectKey: string; classKey: string; date: string; roll: number; set: boolean; updatedAt: string }
export const cellKey = (o: { sessionId: string; roll: number }) => `${o.sessionId}|${o.roll}`
export function applyOps(s: SheetState, ops: Op[]): SheetState {
  if (!ops.length) return s
  const ticks = [...s.ticks]; const idx = new Map(ticks.map((t, i) => [cellKey(t), i]))
  const sessions = [...s.sessions]
  for (const o of ops) {
    if (!sessions.some((x) => x.sessionId === o.sessionId)) sessions.push({ sessionId: o.sessionId, subjectKey: o.subjectKey, classKey: o.classKey, date: o.date, topic: '', status: 'Open', updatedAt: o.updatedAt })
    const i = idx.get(cellKey(o))
    if (i != null) { if (String(ticks[i]!.updatedAt) >= o.updatedAt) continue; ticks[i] = { ...ticks[i]!, set: o.set, updatedAt: o.updatedAt } }
    else { idx.set(cellKey(o), ticks.length); ticks.push({ tickId: cellKey(o), sessionId: o.sessionId, subjectKey: o.subjectKey, classKey: o.classKey, roll: o.roll, set: o.set, updatedAt: o.updatedAt }) }
  }
  return { ...s, sessions, ticks }
}
/** A pulled sheet plus anything still waiting to be saved. */
export const mergePending = (remote: SheetState, pending: Op[]) => applyOps(remote, pending)
/** Quick sync: a pulled sheet merged with what this app shows, per box newest wins; pending ops always on top. */
export function mergeNewest(local: SheetState, remote: SheetState, pending: Op[] = []): SheetState {
  const r = new Map(remote.ticks.map((t) => [cellKey(t), t]))
  const keep = local.ticks.filter((t) => { const x = r.get(cellKey(t)); return !x || String(t.updatedAt) > String(x.updatedAt) })
  const ses = new Map(remote.sessions.map((x) => [x.sessionId, x]))
  const ops: Op[] = keep.map((t) => ({ sessionId: t.sessionId, subjectKey: t.subjectKey, classKey: t.classKey, date: ses.get(t.sessionId)?.date ?? local.sessions.find((x) => x.sessionId === t.sessionId)?.date ?? '', roll: t.roll, set: t.set, updatedAt: String(t.updatedAt) }))
  return applyOps(applyOps(remote, ops.filter((o) => o.date)), pending)
}
