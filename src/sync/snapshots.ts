// Automatic on-device snapshots (ring buffer) + restore as newer ops (so the sheet keeps per-cell history rules).
import type { SheetState } from '../data/contract'
import { cellKey, type Op } from './ops'
import { CONFIG } from '../config'
export type Snapshot = { at: string; label: string; state: SheetState }
const sig = (s: SheetState) => s.ticks.filter((t) => t.set).map(cellKey).sort().join(',')
export function listSnapshots(st: Storage, key: string): Snapshot[] { try { const v: unknown = JSON.parse(st.getItem(key) || '[]'); return Array.isArray(v) ? v.filter((x) => x && typeof x === 'object' && x.state) as Snapshot[] : [] } catch { return [] } }
/** beta.14 BK-B14-07: the ring keeps only the newest snapshots that fit `budget` characters, and never throws. Twelve full
 * copies of a term's sheet filled the storage quota, and then the next tick could not be queued (the tap was lost). */
export function takeSnapshot(st: Storage, key: string, s: SheetState, label: string, at: string, max: number, budget: number = CONFIG.data.snapshotBudgetChars) {
  const l = listSnapshots(st, key); if (l[0] && sig(l[0].state) === sig(s)) return false
  const next: Snapshot[] = []; let used = 2
  for (const x of [{ at, label, state: s }, ...l].slice(0, max)) { const n = JSON.stringify(x).length + 1; if (used + n > budget) break; next.push(x); used += n }
  try { if (next.length) st.setItem(key, JSON.stringify(next)); else st.removeItem(key) } catch { try { st.removeItem(key) } catch { /* storage off */ } return false }
  return next[0]?.at === at
}
/** beta.17 (t250u): `moved` maps a session id in the snapshot to where that date lives now (dates moved after the
 *  snapshot). The snapshot's ticks are restored onto the moved date, so Restore never brings back the old date's column. */
export function restoreOps(cur: SheetState, snapIn: SheetState, at: string, moved: (sessionId: string) => string = (x) => x): Op[] {
  const ids = new Map(snapIn.sessions.map((x) => [x.sessionId, moved(x.sessionId)]))
  const snap: SheetState = { ...snapIn, sessions: snapIn.sessions.map((x) => ({ ...x, sessionId: ids.get(x.sessionId)! })),
    ticks: snapIn.ticks.map((t) => { const sid = ids.get(t.sessionId) ?? moved(t.sessionId); return sid === t.sessionId ? t : { ...t, sessionId: sid, tickId: `${sid}|${t.roll}` } }) }
  const want = new Set(snap.ticks.filter((t) => t.set).map(cellKey)); const out: Op[] = []; const seen = new Set<string>()
  const ses = new Map([...snap.sessions, ...cur.sessions].map((x) => [x.sessionId, x]))
  for (const t of [...cur.ticks, ...snap.ticks]) {
    const k = cellKey(t); if (seen.has(k)) continue; seen.add(k)
    const now = cur.ticks.some((x) => cellKey(x) === k && x.set); const w = want.has(k)
    if (now !== w) out.push({ sessionId: t.sessionId, subjectKey: t.subjectKey, classKey: t.classKey, date: ses.get(t.sessionId)?.date ?? '', roll: t.roll, set: w, updatedAt: at })
  }
  return out
}
