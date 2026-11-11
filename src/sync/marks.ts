// beta.17 (t250u): late / back-date marks shared through the sheet (bridge 0.51.0-dl.2 caps 'marks'). Pure.
// A mark belongs to one tick cell (sessionId|roll). Newer updatedAt wins per cell; at '' = cleared.
import type { MarkRow } from '../data/contract'
import { cellKey } from './ops'
export type Mark = { at: string; back?: boolean; u?: string }
export type Marks = Record<string, Mark>
export type MarkOp = { sessionId: string; subjectKey: string; date: string; roll: number; at: string; back: boolean; updatedAt: string }
/** The sheet's marks merged into this device's: a cell takes the sheet's mark when it is newer, unless a local change is still waiting. */
export function adoptMarks(local: Marks, remote: MarkRow[], waiting: Set<string>): Marks | null {
  let out: Marks | null = null
  for (const r of remote) {
    const k = cellKey(r); if (waiting.has(k)) continue
    const l = local[k]; if (String(r.updatedAt) <= String(l?.u ?? '')) continue
    if (!r.at && !l) continue
    out ??= { ...local }
    if (r.at) out[k] = { at: r.at, ...(r.back ? { back: true } : {}), u: String(r.updatedAt) }; else delete out[k]
  }
  return out
}
