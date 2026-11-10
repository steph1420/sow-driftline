// Offline queue, persisted on device. One entry per cell (latest wins), shared by every open tab.
import { cellKey, type Op } from './ops'
export class Outbox {
  constructor(private st: Storage, private key: string) {}
  list(): Op[] { try { const v: unknown = JSON.parse(this.st.getItem(this.key) || '[]'); return Array.isArray(v) ? v as Op[] : [] } catch { return [] } }
  private save(l: Op[]) { if (l.length) this.st.setItem(this.key, JSON.stringify(l)); else this.st.removeItem(this.key) }
  add(o: Op) { const l = this.list().filter((x) => !(cellKey(x) === cellKey(o) && x.updatedAt <= o.updatedAt)); if (!l.some((x) => cellKey(x) === cellKey(o))) l.push(o); this.save(l) }
  /** Drop only what was sent; a newer op for the same cell made meanwhile stays. */
  ack(sent: Op[]) { const done = new Set(sent.map((o) => cellKey(o) + '@' + o.updatedAt)); this.save(this.list().filter((x) => !done.has(cellKey(x) + '@' + x.updatedAt))) }
}
