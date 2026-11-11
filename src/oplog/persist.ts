// Where the op log lives on the device: IndexedDB (one record per namespace), or memory when IndexedDB is missing.
// Writes are coalesced (the newest copy wins), so a burst of taps is one write.
import type { LogData } from './log'
export type LogStore = { load(): Promise<LogData | null>; save(d: LogData): void; flush(): Promise<void> }
const DB = 'sow-driftline-oplog', STORE = 'log'
function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE) }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })
}
export function idbStore(key: string): LogStore {
  if (typeof indexedDB === 'undefined') return memStore()
  let next: LogData | null = null; let busy: Promise<void> | null = null
  const write = async () => { while (next) { const d = next; next = null; const db = await open(); await new Promise<void>((res, rej) => { const t = db.transaction(STORE, 'readwrite'); t.objectStore(STORE).put(d, key); t.oncomplete = () => res(); t.onerror = () => rej(t.error) }); db.close() } }
  return {
    async load() { const db = await open(); const v = await new Promise<unknown>((res, rej) => { const q = db.transaction(STORE, 'readonly').objectStore(STORE).get(key); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error) }); db.close(); return v && typeof v === 'object' && (v as LogData).v === 1 ? (v as LogData) : null },
    save(d) { next = d; if (!busy) busy = write().catch(() => { /* storage full or blocked: the in-memory log still syncs */ }).finally(() => { busy = null }) },
    async flush() { while (busy) await busy },
  }
}
export function memStore(): LogStore { let d: LogData | null = null; return { load: async () => d, save: (x) => { d = JSON.parse(JSON.stringify(x)) }, flush: async () => {} } }
