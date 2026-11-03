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
  private save(s: Saved) { this.st.setItem(this.key, JSON.stringify(s)) }
  record(op: Op, before: boolean) { this.recordMany([{ op, before }]) }
  recordMany(cells: Cell[]) { if (!cells.length) return; const s = this.load(); s.undo = [...s.undo, { cells }].slice(-CONFIG.data.undoMax); s.redo = []; this.save(s) }
  canUndo() { return this.load().undo.length > 0 }
  canRedo() { return this.load().redo.length > 0 }
  undo(at: string): Op[] | null { const s = this.load(); const e = s.undo.pop(); if (!e) return null; s.redo.push(e); this.save(s); return e.cells.map((c) => ({ ...c.op, set: c.before, updatedAt: at })) }
  redo(at: string): Op[] | null { const s = this.load(); const e = s.redo.pop(); if (!e) return null; s.undo.push(e); this.save(s); return e.cells.map((c) => ({ ...c.op, updatedAt: at })) }
  clear() { this.st.removeItem(this.key) }
}
