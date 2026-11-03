// Automatic on-device snapshots (ring buffer) + restore as newer ops (so the sheet keeps per-cell history rules).
import type { SheetState } from '../data/contract'
import { cellKey, type Op } from './ops'
export type Snapshot = { at: string; label: string; state: SheetState }
const sig = (s: SheetState) => s.ticks.filter((t) => t.set).map(cellKey).sort().join(',')
export function listSnapshots(st: Storage, key: string): Snapshot[] { try { return JSON.parse(st.getItem(key) || '[]') as Snapshot[] } catch { return [] } }
export function takeSnapshot(st: Storage, key: string, s: SheetState, label: string, at: string, max: number) {
  const l = listSnapshots(st, key); if (l[0] && sig(l[0].state) === sig(s)) return false
  const next = [{ at, label, state: s }, ...l].slice(0, max)
  try { st.setItem(key, JSON.stringify(next)) } catch { st.setItem(key, JSON.stringify(next.slice(0, Math.max(1, Math.floor(max / 2))))) }
  return true
}
export function restoreOps(cur: SheetState, snap: SheetState, at: string): Op[] {
  const want = new Set(snap.ticks.filter((t) => t.set).map(cellKey)); const out: Op[] = []; const seen = new Set<string>()
  const ses = new Map([...snap.sessions, ...cur.sessions].map((x) => [x.sessionId, x]))
  for (const t of [...cur.ticks, ...snap.ticks]) {
    const k = cellKey(t); if (seen.has(k)) continue; seen.add(k)
    const now = cur.ticks.some((x) => cellKey(x) === k && x.set); const w = want.has(k)
    if (now !== w) out.push({ sessionId: t.sessionId, subjectKey: t.subjectKey, classKey: t.classKey, date: ses.get(t.sessionId)?.date ?? '', roll: t.roll, set: w, updatedAt: at })
  }
  return out
}
