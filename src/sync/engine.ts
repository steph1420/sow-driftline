// D2 auto-save. B-B4-1 fix: (1) only changed cells are pushed, never a whole sheet; (2) one writer at a time
// across tabs (Web Locks); (3) every tab hears every tick (BroadcastChannel) and merges it per cell.
import type { SheetState } from '../data/contract'
import { applyOps, mergeNewest, mergePending, type Op } from './ops'
import { Outbox } from './outbox'
import type { SessionEdit } from '../data/edits'
export type Lock = <T>(name: string, fn: () => Promise<T>) => Promise<T>
export type Channel = { post: (m: unknown) => void; listen: (fn: (m: unknown) => void) => void }
export type SaveStatus = 'saved' | 'saving' | 'offline' | 'error'
/** beta.16: date edits waiting for the sheet (the store keeps them); sent with the ticks, dropped once saved. */
export type EditQueue = { list: () => SessionEdit[]; ack: (sent: SessionEdit[]) => void }
type Opts = { storage: Storage; key: string; push: (ops: Op[], edits: SessionEdit[]) => Promise<SheetState>; edits?: EditQueue; lock: Lock; channel?: Channel; graceMs: number; retryMs?: number
  onState: (f: (s: SheetState) => SheetState) => void; onStatus?: (s: SaveStatus, waiting: number) => void }

export function memLock(): Lock { const q = new Map<string, Promise<unknown>>(); return (n, fn) => { const p = (q.get(n) ?? Promise.resolve()).then(fn, fn); q.set(n, p.catch(() => {})); return p } }
export function memChannelHub() { const ls: ((m: unknown) => void)[] = []; return { join(): Channel { let me: ((m: unknown) => void) | null = null; return { post: (m) => ls.forEach((l) => l !== me && l(m)), listen: (fn) => { me = fn; ls.push(fn) } } } } }
export const webLock: Lock = (n, fn) => (typeof navigator !== 'undefined' && navigator.locks ? navigator.locks.request(n, fn) as Promise<never> : memLock()(n, fn))
export function broadcast(name: string): Channel | undefined {
  if (typeof BroadcastChannel === 'undefined') return undefined
  const c = new BroadcastChannel(name); return { post: (m) => c.postMessage(m), listen: (fn) => { c.onmessage = (e) => fn(e.data) } }
}

export function createEngine(o: Opts) {
  const box = new Outbox(o.storage, o.key); const edits = () => o.edits?.list() ?? []; const count = () => box.list().length + edits().length
  let status: SaveStatus = count() ? 'offline' : 'saved'; let t: ReturnType<typeof setTimeout> | undefined
  let dead = false // beta.14 BK-B14-04: a replaced engine (Back to demo, a new pairing) must not save, retry or report any more
  const tell = (s: SaveStatus) => { if (dead) return; status = s; o.onStatus?.(s, count()) }
  o.channel?.listen((m) => { if (dead) return; const x = m as { ops?: Op[]; state?: SheetState }; if (x.ops) o.onState((s) => applyOps(s, x.ops!)); if (x.state) o.onState((s) => mergeNewest(s, x.state!, box.list())) })
  const schedule = (ms: number) => { clearTimeout(t); if (!dead) t = setTimeout(() => void flush(), ms) }
  async function flush(): Promise<void> {
    clearTimeout(t); if (dead) return
    await o.lock('sow-driftline:push', async () => {
      if (dead) return
      const ops = box.list(); const ed = edits(); if (!ops.length && !ed.length) { tell('saved'); return }
      tell('saving')
      try {
        const st = await o.push(ops, ed); box.ack(ops); if (ed.length) o.edits?.ack(ed); if (dead) return
        o.onState((s) => mergeNewest(s, st, box.list())); o.channel?.post({ state: st }); tell(count() ? 'saving' : 'saved')
        if (count()) schedule(0)
      } catch (e) { tell(/offline/i.test(String(e)) ? 'offline' : 'error'); if (o.retryMs) schedule(o.retryMs) }
    })
  }
  return {
    status: () => status, waiting: count, flush,
    /** beta.16: a date edit was queued; save it after the same grace as a tick. */
    nudge() { if (dead) return; tell('saving'); schedule(o.graceMs > 0 ? o.graceMs : 0) },
    /** Retire this engine: no more saves, retries, status or merges from it. What waits in the outbox stays there. */
    stop() { dead = true; clearTimeout(t) },
    /** A tick on this device: shown at once, queued, told to other tabs, saved after the grace. */
    local(op: Op) { box.add(op); o.onState((s) => applyOps(s, [op])); o.channel?.post({ ops: [op] }); tell('saving'); if (o.graceMs > 0) schedule(o.graceMs) },
    adoptPull: (remote: SheetState) => mergePending(remote, box.list()),
    /** Quick sync pull: per box newest wins, pending local ticks stay on top. */
    pulled(remote: SheetState) { o.onState((s) => mergeNewest(s, remote, box.list())) },
  }
}
