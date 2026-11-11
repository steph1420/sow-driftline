// The first time this device syncs with a sheet on the op log: whatever was still waiting for the old push path (ticks,
// date edits, marks) becomes ops, so nothing waiting is lost (CRDT_SYNC_PLAN §4). Pure.
import type { Op } from '../sync/ops'
import type { MarkOp } from '../sync/marks'
import type { SessionEdit } from '../data/edits'
import { movedId } from '../data/edits'
import type { Kind } from './core'
export type Change = { kind: Kind; target: string; value: unknown }
/** Old ids were the sheet's `subjectKey|date` and changed on a move; the log keeps the session's first id. */
export function legacyToOps(ticks: Op[], edits: SessionEdit[], marks: MarkOp[]): Change[] {
  const alias = new Map<string, string>(); const res = (id: string) => { let x = id; for (let i = 0; i < 20 && alias.has(x); i++) x = alias.get(x)!; return x }
  const out: Change[] = []
  for (const e of edits) {
    const id = res(e.sessionId)
    if (e.add) { alias.delete(e.sessionId); out.push({ kind: 'session.add', target: e.sessionId, value: { subjectKey: e.add.subjectKey, classKey: e.add.classKey, date: e.add.date, topic: e.add.topic ?? '' } }); continue }
    if (e.del) { out.push({ kind: 'session.remove', target: id, value: null }); continue }
    if (e.date != null) { const to = movedId(e); if (to !== e.sessionId) alias.set(to, id); out.push({ kind: 'session.date', target: id, value: e.date }) }
    if (e.topic != null) out.push({ kind: 'session.topic', target: id, value: e.topic })
  }
  for (const t of ticks) out.push({ kind: 'tick.set', target: `${res(t.sessionId)}|${t.roll}`, value: t.set })
  for (const m of marks) out.push({ kind: 'tick.mark', target: `${res(m.sessionId)}|${m.roll}`, value: m.at ? { at: m.at, back: m.back === true } : null })
  return out
}
