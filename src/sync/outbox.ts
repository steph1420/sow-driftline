// Offline queue, persisted on device. One entry per cell (latest wins), shared by every open tab.
// beta.17: generic over the cell op, so tick ops and (t250u) mark ops queue the same way.
import { cellKey, type Op } from './ops'
export type CellOp = { sessionId: string; roll: number; date: string; updatedAt: string }
export class Outbox<T extends CellOp = Op> {
  constructor(private st: Storage, private key: string) {}
  list(): T[] { try { const v: unknown = JSON.parse(this.st.getItem(this.key) || '[]'); return Array.isArray(v) ? v as T[] : [] } catch { return [] } }
  private save(l: T[]) { if (l.length) this.st.setItem(this.key, JSON.stringify(l)); else this.st.removeItem(this.key) }
  add(o: T) { const l = this.list().filter((x) => !(cellKey(x) === cellKey(o) && x.updatedAt <= o.updatedAt)); if (!l.some((x) => cellKey(x) === cellKey(o))) l.push(o); this.save(l) }
  /** Drop only what was sent; a newer op for the same cell made meanwhile stays. */
  ack(sent: T[]) { const done = new Set(sent.map((o) => cellKey(o) + '@' + o.updatedAt)); this.save(this.list().filter((x) => !done.has(cellKey(x) + '@' + x.updatedAt))) }
  /** beta.16: a moved date takes its waiting ops with it (new id and date), like the sheet's rename does. */
  rekey(from: string, to: string, date: string) { const l = this.list(); if (!l.some((x) => x.sessionId === from)) return; this.save(l.map((x) => (x.sessionId === from ? { ...x, sessionId: to, date } : x))) }
  /** beta.16: a deleted date (Undo of New date) drops its waiting ops, so they cannot bring the date back on the sheet. */
  dropSession(id: string) { const l = this.list(); if (l.some((x) => x.sessionId === id)) this.save(l.filter((x) => x.sessionId !== id)) }
}
