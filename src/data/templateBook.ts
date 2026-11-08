// v0.8 F-TP-10: the share templates kept on this device, and their sync with the bridge (newer wins).
// The synced set goes under its own key so the old app's share.templates (with the old {class}) is never overwritten;
// the old keys are read once to adopt and migrate them (t76u). The last-used template stays on this device.
import type { PrefRow, PrefsClient } from '../sync/prefs'
import { fromLegacy, seedSet, type ShareTemplate, type TemplateSet } from './templates'

export const TEMPLATES_KEY = 'share.templates.v2'
export type SyncState = 'local' | 'synced' | 'waiting'
/** updatedAt is null while the set is still the untouched seeds (they never overwrite anything remote). */
export type Saved = { set: TemplateSet; updatedAt: string | null; dirty: boolean; lastUsedId: string }
type Store = { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void }

const valueOf = (rows: PrefRow[], key: string) => rows.find((r) => r.key === key)
function legacyOf(rows: PrefRow[]): TemplateSet | null {
  const t = valueOf(rows, 'share.templates')?.value
  if (!Array.isArray(t) || !t.length) return null
  return fromLegacy({ templates: t as ShareTemplate[], defaultId: String(valueOf(rows, 'share.defaultId')?.value ?? ''), includeClassPrefix: valueOf(rows, 'share.includeClassPrefix')?.value === true })
}

export function templateBook(store: Store, key: string) {
  const fresh = (): Saved => ({ set: seedSet(), updatedAt: null, dirty: false, lastUsedId: '' })
  const load = (): Saved => { try { return { ...fresh(), ...JSON.parse(store.getItem(key) || '{}') } } catch { return fresh() } }
  const save = (s: Saved) => { store.setItem(key, JSON.stringify(s)); return s }
  return {
    load,
    edit: (fn: (s: TemplateSet) => TemplateSet, at: string) => { const s = load(); return save({ ...s, set: fn(s.set), updatedAt: at, dirty: true }) },
    use: (id: string) => save({ ...load(), lastUsedId: id }),
    /** Pull, take the newer side, push our edits. Offline or failing → 'waiting' with the edits kept. */
    async sync(client: PrefsClient, deviceId: string): Promise<SyncState> {
      try {
        const got = await client.pull(); if (!got.supported) return 'local'
        let s = load(); const remote = valueOf(got.rows, TEMPLATES_KEY)
        if (remote && (!s.updatedAt || remote.updatedAt > s.updatedAt)) s = save({ ...s, set: remote.value as TemplateSet, updatedAt: remote.updatedAt, dirty: false })
        else if (!remote && !s.updatedAt) { const old = legacyOf(got.rows); if (old) s = save({ ...s, set: old, updatedAt: new Date().toISOString(), dirty: true }) }
        if (s.dirty && s.updatedAt) { await client.push([{ key: TEMPLATES_KEY, category: 'share', value: s.set, updatedAt: s.updatedAt }], deviceId); save({ ...load(), dirty: false }) }
        return 'synced'
      } catch { return load().dirty ? 'waiting' : 'synced' }
    },
  }
}
