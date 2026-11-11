// Op-log sync engine (t254u): pushes this device's unsent ops (opsPush), takes what the sheet has that it doesn't (opsPull),
// one writer across tabs (Web Locks), every tab hears every op (BroadcastChannel). A seq gap the sheet reports is resent;
// a duplicate is harmless. Same status words as the old engine (saved / saving / offline / error).
import type { Channel, Lock, SaveStatus } from '../sync/engine'
import type { LogOp, OpLog, OpsReply } from './log'
import type { LogStore } from './persist'
import { CONFIG } from '../config'
export type OpRefusal = { op: LogOp; message: string }
type Opts = { log: OpLog; store: LogStore; call: (body: Record<string, unknown>) => Promise<OpsReply>; lock: Lock; channel?: Channel; graceMs: number; retryMs?: number
  onState: () => void; onStatus?: (s: SaveStatus, waiting: number) => void; onRefused?: (r: OpRefusal[]) => void }
export function createOpEngine(o: Opts) {
  const log = o.log; let status: SaveStatus = log.unsent().length ? 'offline' : 'saved'; let t: ReturnType<typeof setTimeout> | undefined; let dead = false
  const count = () => log.unsent().length
  const tell = (s: SaveStatus) => { if (dead) return; status = s; o.onStatus?.(s, count()) }
  const keep = () => o.store.save(log.data())
  o.channel?.listen((m) => { if (dead) return; const x = m as { oplog?: LogOp[] }; if (x.oplog) { log.receive(x.oplog); o.onState() } })
  const schedule = (ms: number) => { clearTimeout(t); if (!dead) t = setTimeout(() => void flush(), ms) }
  const take = (r: OpsReply) => { log.adopt(r); keep(); if (!dead) { o.channel?.post({ oplog: r.ops ?? [] }); o.onState() } }
  async function flush(): Promise<void> {
    clearTimeout(t); if (dead) return
    await o.lock('sow-driftline:push', async () => {
      if (dead) return
      if (!count()) { tell('saved'); return }
      tell('saving')
      try {
        const refused: OpRefusal[] = []; let resends = 0
        for (let i = 0; i < CONFIG.sync.opsMaxRounds && count(); i++) {
          const batch = log.unsent().slice(0, CONFIG.sync.opsBatch)
          const r = await o.call({ action: 'opsPush', deviceId: log.deviceId, ops: batch, vv: log.hasBase ? log.serverVv() : undefined })
          take(r)
          for (const a of r.accepted ?? []) if (a.status === 'refused') { const op = log.ops().find((x) => x.opId === a.opId); if (op && batch.some((b) => b.opId === a.opId)) refused.push({ op, message: a.message ?? '' }) }
          const from = r.resend?.[log.deviceId]; if (from) { if (++resends > 2) throw new Error('Sheet: the sheet keeps asking for the same ops'); log.resendFrom(from) }
        }
        if (dead) return
        if (refused.length) o.onRefused?.(refused)
        tell(count() ? 'saving' : 'saved'); if (count()) schedule(o.retryMs ?? 0)
      } catch (e) { tell(/offline/i.test(String(e)) ? 'offline' : 'error'); if (o.retryMs) schedule(o.retryMs) }
    })
  }
  return {
    status: () => status, waiting: count, flush,
    async pull() { const r = await o.call({ action: 'opsPull', vv: log.hasBase ? log.serverVv() : undefined }); if (!dead) take(r); return r },
    /** A change on this device: shown at once, kept, told to other tabs, saved after the grace. */
    local(op: LogOp) { keep(); o.channel?.post({ oplog: [op] }); o.onState(); tell('saving'); if (o.graceMs > 0) schedule(o.graceMs) },
    nudge() { if (dead) return; tell('saving'); schedule(o.graceMs > 0 ? o.graceMs : 0) },
    stop() { dead = true; clearTimeout(t) },
  }
}
