// v0.8 F-TP: share templates on this device (templateBook) as a small store, synced with the test copy when paired:
// pulled when the app opens or after Sync › Refresh, pushed 2 s after an edit settles, retried when back online.
import { create } from 'zustand'
import { CONFIG, storageKey } from '../config'
import { templateBook, type Saved, type SyncState } from '../data/templateBook'
import type { TemplateSet } from '../data/templates'
import { prefsClient } from '../sync/prefs'
import { currentBridge, useApp } from './store'

const book = templateBook(localStorage, storageKey('shareTemplates'))
type State = Saved & { sync: SyncState; reload: () => void; edit: (fn: (s: TemplateSet) => TemplateSet) => void; use: (id: string) => void }

let timer: ReturnType<typeof setTimeout> | null = null
const paired = () => useApp.getState().source === 'copy'
async function syncNow() {
  if (!paired()) return
  const b = currentBridge(); const sync = await book.sync(prefsClient(b.url, b.token), useApp.getState().deviceName)
  useTemplates.setState({ ...book.load(), sync })
}
const later = () => { if (timer) clearTimeout(timer); timer = setTimeout(() => void syncNow(), CONFIG.timing.prefsPushMs) }

export const useTemplates = create<State>((set) => ({
  ...book.load(), sync: 'local',
  reload: () => set({ ...book.load(), sync: 'local' }),
  edit: (fn) => { set({ ...book.edit(fn, new Date().toISOString()), ...(paired() ? { sync: 'waiting' as const } : {}) }); if (paired()) later() },
  use: (id) => set(book.use(id)),
}))

// Pull when the class data (re)loads from the test copy; push what waited once back online.
useApp.subscribe((s, p) => { if (s.status === 'ok' && p.status !== 'ok' && s.source === 'copy') void syncNow() })
if (typeof window !== 'undefined') window.addEventListener('online', () => { if (useTemplates.getState().dirty) void syncNow() })
