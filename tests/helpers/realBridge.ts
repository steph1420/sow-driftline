// beta.16: the real Apps Script bridge (deployed 0.46.2, or the v2 file) running on the in-memory sheet mock, behind a fake
// fetch. App sync tests go through the exact applyPush_/applyStructs_ rules the sheet uses. No network, demo names only.
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { MockSpreadsheet, makeGlobals } from '../../bridge/test/mockSheets'
import { COPY_SHEET_ID } from '../../src/data/sheetSource'
export const BRIDGES = { deployed: '../../bridge/legacy/Code-0.46.2.js', v2: '../../bridge/Code.js' } as const
export const TOKEN = 'test-token'
type Fn = (...a: unknown[]) => any
export function realBridge(which: keyof typeof BRIDGES = 'deployed') {
  const ss = new MockSpreadsheet(COPY_SHEET_ID); const { g, props } = makeGlobals(ss); props.set('SOW_TOKEN', TOKEN)
  const ctx = vm.createContext({ ...g, Date, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, parseInt, isNaN, encodeURIComponent })
  vm.runInContext(readFileSync(new URL(BRIDGES[which], import.meta.url), 'utf8'), ctx)
  const c = ctx as unknown as Record<string, Fn>
  c.buildTabs_(ss)
  const d = (iso: string) => new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))
  const T0 = '2026-11-02T08:00:00.000Z'
  c.write_(ss, 'Subjects', 7, [['X_Eng_CW', 'X', 'Eng', 'CW', true, 1, T0]])
  c.write_(ss, 'Roster', 7, [1, 2, 3, 4].map((r) => ['X', r, `Pupil ${r}`, 'Active', '', '', T0]))
  c.write_(ss, 'Sessions', 8, [['X_Eng_CW|2026-11-02', 'X_Eng_CW', 'X', d('2026-11-02'), 'Letters', 'Open', T0, T0]])
  c.write_(ss, 'Ticks', 8, [['X_Eng_CW|2026-11-02|1', 'X_Eng_CW|2026-11-02', 'X_Eng_CW', 'X', 1, true, T0, 'migrate']])
  const bodies: Record<string, any>[] = []
  const post = (body: Record<string, unknown>) => JSON.parse(c.doPost({ postData: { contents: JSON.stringify(body) } }).text)
  const fetch = async (_u: string, init: { body: string }) => { const b = JSON.parse(init.body); bodies.push(b); return new Response(JSON.stringify(post(b)), { status: 200 }) }
  const state = () => post({ action: 'pull', token: TOKEN })
  return { ss, c, props, post, fetch, bodies, state, pushes: () => bodies.filter((b) => b.action === 'push') }
}
export const SETUP = JSON.stringify({ kind: 'sow-driftline-setup', bridgeUrl: 'https://script.google.com/macros/s/fake-copy/exec', token: TOKEN })
