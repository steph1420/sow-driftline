// Persistent Undo/Redo: survives closing the app. Undo = a new op with the old value and a fresh time.
import { CONFIG } from '../config'
import type { Op } from './ops'
type Entry = { op: Op; before: boolean }
type Saved = { undo: Entry[]; redo: Entry[] }
export class History {
  constructor(private st: Storage, private key: string) {}
  private load(): Saved { try { return { undo: [], redo: [], ...JSON.parse(this.st.getItem(this.key) || '{}') } } catch { return { undo: [], redo: [] } } }
  private save(s: Saved) { this.st.setItem(this.key, JSON.stringify(s)) }
  record(op: Op, before: boolean) { const s = this.load(); s.undo = [...s.undo, { op, before }].slice(-CONFIG.data.undoMax); s.redo = []; this.save(s) }
  canUndo() { return this.load().undo.length > 0 }
  canRedo() { return this.load().redo.length > 0 }
  undo(at: string): Op | null { const s = this.load(); const e = s.undo.pop(); if (!e) return null; s.redo.push(e); this.save(s); return { ...e.op, set: e.before, updatedAt: at } }
  redo(at: string): Op | null { const s = this.load(); const e = s.redo.pop(); if (!e) return null; s.undo.push(e); this.save(s); return { ...e.op, updatedAt: at } }
  clear() { this.st.removeItem(this.key) }
}
