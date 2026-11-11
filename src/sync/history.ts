// Persistent Undo/Redo: survives closing the app. One entry = one gesture (a tap or a whole swipe).
// Undo = new ops with the old values and a fresh time.
import { CONFIG } from '../config'
import type { Op } from './ops'
type Cell = { op: Op; before: boolean }
type Entry = { cells: Cell[] }
type Saved = { undo: Entry[]; redo: Entry[] }
const norm = (e: Entry | Cell): Entry => ('cells' in e ? e : { cells: [e] }) // v0.3/0.4 stored single cells
export class History {
  constructor(private st: Storage, private key: string) {}
  private load(): Saved { try { const j = { undo: [], redo: [], ...JSON.parse(this.st.getItem(this.key) || '{}') }; return { undo: j.undo.map(norm), redo: j.redo.map(norm) } } catch { return { undo: [], redo: [] } } }
  /** beta.15 (t245u): never more than undoMax steps each way, and a full phone storage drops the oldest steps instead of throwing (the tick itself must still save). */
  private save(s: Saved) {
    const max = CONFIG.data.undoMax; let undo = s.undo.slice(-max); let redo = s.redo.slice(-max)
    for (;;) {
      try { this.st.setItem(this.key, JSON.stringify({ undo, redo })); return } catch { /* storage full */ }
      if (!undo.length && !redo.length) { try { this.st.removeItem(this.key) } catch { /* storage off */ } return }
      if (redo.length) redo = redo.slice(1); else undo = undo.slice(1)
    }
  }
  record(op: Op, before: boolean) { this.recordMany([{ op, before }]) }
  recordMany(cells: Cell[]) { if (!cells.length) return; const s = this.load(); s.undo = [...s.undo, { cells }]; s.redo = []; this.save(s) }
  dropOldest() { const s = this.load(); if (s.undo.length) { s.undo.shift(); this.save(s) } }
  canUndo() { return this.load().undo.length > 0 }
  canRedo() { return this.load().redo.length > 0 }
  undo(at: string): Op[] | null { const s = this.load(); const e = s.undo.pop(); if (!e) return null; s.redo.push(e); this.save(s); return e.cells.map((c) => ({ ...c.op, set: c.before, updatedAt: at })) }
  redo(at: string): Op[] | null { const s = this.load(); const e = s.redo.pop(); if (!e) return null; s.undo.push(e); this.save(s); return e.cells.map((c) => ({ ...c.op, updatedAt: at })) }
  clear() { this.st.removeItem(this.key) }
}
