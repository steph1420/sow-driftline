// Op-log harness (t254u): the real bridge/Code.js on the in-memory sheet, plus a tiny independent device client.
// Demo names only. No network.
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { MockSpreadsheet, makeGlobals, type MockSheet } from './mockSheets'
export const CODE_URL = new URL('../Code.js', import.meta.url)
type Fn = (...a: unknown[]) => any
export const SK = 'X_Eng_CW', D1 = '2026-11-02', D2 = '2026-11-04', S1 = `${SK}|${D1}`
const T0 = '2026-11-02T08:00:00.000Z'
export function olEnv(file: URL | string = CODE_URL) {
  const ss = new MockSpreadsheet('COPY_ID'); const { g, props, created } = makeGlobals(ss)
  const alerts: string[] = []; const ui = { ...g.SpreadsheetApp.getUi(), alert: (_t: string, m?: string) => { alerts.push(String(m ?? _t)); return 'OK' }, Button: { OK: 'OK' }, ButtonSet: { OK: 1, OK_CANCEL: 2 } }
  const ctx = vm.createContext({ ...g, SpreadsheetApp: { ...g.SpreadsheetApp, getUi: () => ui }, Date, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, parseInt, isNaN })
  vm.runInContext(readFileSync(file, 'utf8'), ctx)
  const c = ctx as unknown as Record<string, Fn>
  c.buildTabs_(ss)
  const d = (iso: string) => new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))
  c.write_(ss, 'Subjects', 7, [[SK, 'X', 'Eng', 'CW', true, 1, T0], ['X_Eng_HW', 'X', 'Eng', 'HW', true, 2, T0]])
  c.write_(ss, 'Roster', 7, [1, 2, 3, 4, 5, 6, 7].map((r) => ['X', r, `Pupil ${r}`, r === 6 ? 'Left' : 'Active', r === 6 ? d('2026-10-01') : '', '', T0]))
  c.write_(ss, 'Sessions', 8, [[S1, SK, 'X', d(D1), 'Letters', 'Open', T0, T0], [`${SK}|2026-10-28`, SK, 'X', d('2026-10-28'), 'Letters', 'Open', T0, T0]])
  c.write_(ss, 'Ticks', 8, [[`${S1}|1`, S1, SK, 'X', 1, true, T0, 'migrate'], [`${S1}|2`, S1, SK, 'X', 2, false, T0, 'app'], [`${SK}|2026-10-28|1`, `${SK}|2026-10-28`, SK, 'X', 1, true, T0, 'sheet']])
  const token = c.token_() as string
  const post = (body: Record<string, unknown>) => JSON.parse(c.doPost({ postData: { contents: JSON.stringify({ token, ...body }) } }).text)
  const tab = (n: string) => (ss.getSheetByName(n) as MockSheet)
  const cells = (n: string) => JSON.stringify([...tab(n).cells.entries()].sort())
  const edit = (n: string, r: number, col: number, v: unknown) => { tab(n).getRange(r, col).setValue(v); c.onEdit({ range: tab(n).getRange(r, col), source: ss }) }
  const migrate = () => c.olMigrate_(ss)
  return { ss, c, g, props, created, post, tab, cells, edit, migrate, alerts, d }
}
/** A minimal device: seq, lamport and version vector, independent of the app's code. */
export function device(id: string, post: (b: Record<string, unknown>) => any, wallSkewMs = 0) {
  let seq = 0, lamport = 0; const vv: Record<string, number> = {}; const mine: any[] = []; let unsent: any[] = []
  const see = (ops: any[]) => { for (const o of ops ?? []) { if ((vv[o.deviceId] ?? 0) < o.seq) vv[o.deviceId] = o.seq; lamport = Math.max(lamport, o.lamport ?? 0) } }
  return {
    id, vv, mine,
    op(kind: string, target: string, value: unknown) {
      seq++; lamport++; const o = { opId: `${id}:${seq}`, deviceId: id, seq, lamport, vv: { ...vv }, kind, target, value, wallAt: new Date(Date.now() + wallSkewMs).toISOString() }
      vv[id] = seq; mine.push(o); unsent.push(o); return o
    },
    push(ops = unsent) { const r = post({ action: 'opsPush', deviceId: id, ops, vv: { ...vv } }); if (r.ok) { see(r.ops); const got = new Set((r.accepted ?? []).map((a: any) => a.opId)); unsent = unsent.filter((o) => !got.has(o.opId)) } return r },
    pull() { const r = post({ action: 'opsPull', vv: Object.keys(vv).length ? { ...vv } : undefined }); if (r.ok) see(r.ops); return r },
    unsent: () => unsent,
  }
}
