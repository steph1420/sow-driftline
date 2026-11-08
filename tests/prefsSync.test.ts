// @vitest-environment node
// v0.8 Phase 7 (F-TP-10): templates sync through the bridge's prefsPull/prefsPush (Prefs tab, newer wins per key).
// Runs the real bridge/Code.js in a VM over a mock spreadsheet: two devices, no network, no real sheet.
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import { MockSpreadsheet, makeGlobals } from '../bridge/test/mockSheets'
import { prefsClient } from '../src/sync/prefs'
import { templateBook, TEMPLATES_KEY } from '../src/data/templateBook'
import { addTemplate, renameTemplate, seedSet } from '../src/data/templates'

const CODE = readFileSync(new URL('../bridge/Code.js', import.meta.url), 'utf8')
function bridge() {
  const ss = new MockSpreadsheet(); const { g } = makeGlobals(ss)
  const ctx = vm.createContext({ ...g, Date, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, parseInt }); vm.runInContext(CODE, ctx)
  const c = ctx as Record<string, (...a: unknown[]) => any>; const token = c.token_(); let online = true
  const fetcher = (async (_u: string, init: { body: string }) => { if (!online) throw new Error('offline'); const r = c.doPost({ postData: { contents: init.body } }).text; return { ok: true, json: async () => JSON.parse(r) } }) as never
  return { token, fetcher, setOnline: (b: boolean) => { online = b }, post: (b: object) => JSON.parse(c.doPost({ postData: { contents: JSON.stringify(b) } }).text) }
}
const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } }
let clock = Date.now() - 3600e3 /* the bridge clamps future stamps */; const tick = () => new Date((clock += 1000)).toISOString()

describe('PS templates sync (two devices, one bridge)', () => {
  it('PS-01 an edit on A appears on B after B pulls; B never sends untouched seeds over it', async () => {
    const br = bridge(); const cli = prefsClient('https://copy/exec', () => br.token, br.fetcher)
    const a = templateBook(mem(), 'k'); const b = templateBook(mem(), 'k')
    expect(await b.sync(cli, 'B')).toBe('synced')
    a.edit((s) => renameTemplate(s, 'pending', 'Still to come'), tick()); expect(await a.sync(cli, 'A')).toBe('synced')
    expect(await b.sync(cli, 'B')).toBe('synced'); expect(b.load().set.templates[0]!.name).toBe('Still to come')
  })
  it('PS-02 newer wins per key: the later edit stays on both', async () => {
    const br = bridge(); const cli = prefsClient('https://copy/exec', () => br.token, br.fetcher)
    const a = templateBook(mem(), 'k'); const b = templateBook(mem(), 'k')
    a.edit((s) => addTemplate(s, 'From A'), tick()); b.edit((s) => addTemplate(s, 'From B'), tick())
    await b.sync(cli, 'B'); await a.sync(cli, 'A'); await b.sync(cli, 'B')
    for (const d of [a, b]) expect(d.load().set.templates.at(-1)!.name).toBe('From B')
  })
  it('PS-03 offline edits wait (amber cloud) and go up when back online', async () => {
    const br = bridge(); const cli = prefsClient('https://copy/exec', () => br.token, br.fetcher); const a = templateBook(mem(), 'k')
    br.setOnline(false); a.edit((s) => addTemplate(s, 'Offline one'), tick())
    expect(await a.sync(cli, 'A')).toBe('waiting'); expect(a.load().dirty).toBe(true)
    br.setOnline(true); expect(await a.sync(cli, 'A')).toBe('synced'); expect(a.load().dirty).toBe(false)
    const row = br.post({ action: 'prefsPull', token: br.token }).prefs.find((p: { key: string }) => p.key === TEMPLATES_KEY)
    expect(row.value.templates.at(-1).name).toBe('Offline one'); expect(row.category).toBe('share')
  })
  it('PS-04 the old app\'s synced templates are adopted once, {class} migrated, under a new key (old keys untouched)', async () => {
    const br = bridge(); const cli = prefsClient('https://copy/exec', () => br.token, br.fetcher)
    br.post({ action: 'prefsPush', token: br.token, deviceId: 'old', rows: [
      { key: 'share.templates', category: 'share', value: [{ id: 'u1', name: 'Mine', body: '{class} • {date}' }], updatedAt: '2026-11-01T10:00:00Z' },
      { key: 'share.defaultId', category: 'share', value: 'u1', updatedAt: '2026-11-01T10:00:00Z' },
      { key: 'share.includeClassPrefix', category: 'share', value: true, updatedAt: '2026-11-01T10:00:00Z' }] })
    const a = templateBook(mem(), 'k'); await a.sync(cli, 'A')
    expect(a.load().set).toEqual({ templates: [{ id: 'u1', name: 'Mine', body: '{notebook} • {date}' }], defaultId: 'u1' })
    const rows = br.post({ action: 'prefsPull', token: br.token }).prefs
    expect(rows.find((p: { key: string }) => p.key === 'share.templates').value[0].body).toBe('{class} • {date}')
    expect(rows.find((p: { key: string }) => p.key === TEMPLATES_KEY)).toBeTruthy()
  })
  it('PS-05 a bridge without prefs actions keeps templates on this device, nothing breaks', async () => {
    const f = (async () => ({ ok: true, json: async () => ({ ok: false, error: 'unknown action' }) })) as never
    const a = templateBook(mem(), 'k'); a.edit((s) => addTemplate(s, 'Local'), tick())
    expect(await a.sync(prefsClient('https://x/exec', () => 't', f), 'A')).toBe('local'); expect(a.load().set.templates.at(-1)!.name).toBe('Local')
  })
  it('PS-06 the last-used template stays per device and is never pushed', async () => {
    const br = bridge(); const cli = prefsClient('https://copy/exec', () => br.token, br.fetcher); const a = templateBook(mem(), 'k')
    a.use('completed'); a.edit((s) => s, tick()); await a.sync(cli, 'A')
    expect(JSON.stringify(br.post({ action: 'prefsPull', token: br.token }).prefs)).not.toContain('lastUsed')
    expect(a.load().lastUsedId).toBe('completed'); expect(seedSet().templates).toHaveLength(4)
  })
})
