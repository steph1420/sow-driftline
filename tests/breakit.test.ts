// @vitest-environment node
// v0.8 Phase 10 break-it: adversarial template sync (real bridge Code.js in a VM, two devices, no network, no real sheet).
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import { MockSpreadsheet, makeGlobals } from '../bridge/test/mockSheets'
import { prefsClient } from '../src/sync/prefs'
import { templateBook } from '../src/data/templateBook'
import { addTemplate } from '../src/data/templates'

const CODE = readFileSync(new URL('../bridge/Code.js', import.meta.url), 'utf8')
function bridge() {
  const ss = new MockSpreadsheet(); const { g } = makeGlobals(ss)
  const ctx = vm.createContext({ ...g, Date, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, parseInt }); vm.runInContext(CODE, ctx)
  const c = ctx as Record<string, (...a: unknown[]) => any>; const token = c.token_(); let during: (() => void) | null = null
  const fetcher = (async (_u: string, init: { body: string }) => { const r = c.doPost({ postData: { contents: init.body } }).text
    if (JSON.parse(init.body).action === 'prefsPush' && during) { const f = during; during = null; f() }
    return { ok: true, json: async () => JSON.parse(r) } }) as never
  return { token, fetcher, whilePushing: (f: () => void) => { during = f } }
}
const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } }
let clock = Date.now() - 3600e3; const at = () => new Date((clock += 1000)).toISOString()

describe('P10 break-it: template sync', () => {
  it('BK-SYNC-01 an edit made while a push is in flight is not dropped (it goes up on the next sync)', async () => {
    const br = bridge(); const cli = prefsClient('https://copy/exec', () => br.token, br.fetcher)
    const a = templateBook(mem(), 'k'); const b = templateBook(mem(), 'k')
    a.edit((s) => addTemplate(s, 'First'), at())
    br.whilePushing(() => a.edit((s) => addTemplate(s, 'Typed during push'), at()))
    await a.sync(cli, 'A')
    expect(a.load().dirty).toBe(true)
    await a.sync(cli, 'A'); await b.sync(cli, 'B')
    expect(b.load().set.templates.map((t) => t.name)).toContain('Typed during push')
  })
  it('BK-SYNC-02 twenty interleaved edits on two devices converge on the newest', async () => {
    const br = bridge(); const cli = prefsClient('https://copy/exec', () => br.token, br.fetcher)
    const a = templateBook(mem(), 'k'); const b = templateBook(mem(), 'k')
    for (let i = 0; i < 20; i++) { const d = i % 3 ? a : b; d.edit((s) => addTemplate(s, `E${i}`), at()); if (i % 4 === 0) await (i % 8 ? a : b).sync(cli, i % 8 ? 'A' : 'B') }
    await a.sync(cli, 'A'); await b.sync(cli, 'B'); await a.sync(cli, 'A')
    expect(a.load().set).toEqual(b.load().set); expect(a.load().set.templates.at(-1)!.name).toBe('E19')
  })
})
