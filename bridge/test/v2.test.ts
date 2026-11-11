// @vitest-environment node
// Bridge v2 = 0.51.0-dl.1 (t245u): setup-file maker + ping caps, on top of 0.46.2 + device registry. Additive only.
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import { MockSpreadsheet, makeGlobals } from './mockSheets'
import { parseSetup } from '../../src/data/setup'
const CODE = readFileSync(new URL('../Code.js', import.meta.url), 'utf8')
const EXEC = 'https://script.google.com/macros/s/AKfake_Deploy-1/exec'
function env(execUrl: string | null = EXEC) {
  const ss = new MockSpreadsheet('COPY_ID'); const { g, props } = makeGlobals(ss); const shown: string[] = []; const alerts: string[] = []
  const ui = { ...g.SpreadsheetApp.getUi(), alert: (_t: string, m: string) => { alerts.push(m) }, showModalDialog: (h: { html: string }) => { shown.push(h.html) }, ButtonSet: { OK: 'OK' } }
  const ctx = vm.createContext({ ...g, SpreadsheetApp: { ...g.SpreadsheetApp, getUi: () => ui },
    Utilities: { ...g.Utilities, base64Encode: (s: string) => Buffer.from(s, 'utf8').toString('base64') },
    ScriptApp: { getService: () => ({ getUrl: () => execUrl }) },
    HtmlService: { createHtmlOutput: (html: string) => ({ html, setWidth() { return this }, setHeight() { return this } }) },
    Date, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, parseInt })
  vm.runInContext(CODE, ctx)
  const c = ctx as unknown as Record<string, (...a: unknown[]) => any>
  c.buildTabs_(ss)
  const post = (body: object) => JSON.parse(c.doPost({ postData: { contents: JSON.stringify(body) } }).text)
  return { c, ss, props, post, shown, alerts, token: c.token_() as string }
}
describe('bridge v2 (0.51.0-dl.2)', () => {
  it('BR2-01 ping still answers as before, plus the version and caps', () => {
    const { post, token } = env(); const p = post({ action: 'ping', token })
    expect(p).toMatchObject({ ok: true, schema: 1, sheetId: 'COPY_ID', version: '0.51.0-dl.2' }); expect(p.caps).toContain('setupFile'); expect(p.caps).toContain('structs')
    expect(post({ action: 'ping', token: 'nope' })).toMatchObject({ ok: false, error: 'bad token' })
  })
  it('BR2-02 setupFile_ builds the file the app opens (new format, with v, exportedAt and sheetUrl)', () => {
    const { c, token } = env(); const text = c.setupFile_(EXEC, token, 'https://docs.google.com/spreadsheets/d/COPY_ID/edit', '2026-11-11T05:00:00.000Z')
    const j = JSON.parse(text)
    expect(j).toEqual({ kind: 'sow-driftline-setup', v: 1, bridgeUrl: EXEC, token, sheetUrl: 'https://docs.google.com/spreadsheets/d/COPY_ID/edit', exportedAt: '2026-11-11T05:00:00.000Z', bridgeVersion: '0.51.0-dl.2' })
    expect(parseSetup(text)).toMatchObject({ bridgeUrl: EXEC, token })
  })
  it('BR2-03 no deployment (or a /dev URL) gives a plain message, no file', () => {
    const { c, token } = env(); expect(() => c.setupFile_(null, token)).toThrow(/Deploy the web app first/)
    expect(() => c.setupFile_('https://script.google.com/macros/s/AKfake/dev', token)).toThrow(/Deploy the web app first/)
  })
  it('BR2-04 the menu shows a download dialog; the token is only inside the file data, never as visible text', () => {
    const e = env(); e.c.menuSetupFile()
    expect(e.shown.length).toBe(1); const html = e.shown[0]!
    expect(html).toContain('download="sow-driftline-setup.json"'); expect(html).not.toContain(e.token)
    const b64 = /base64,([A-Za-z0-9+/=]+)/.exec(html)![1]!; expect(JSON.parse(Buffer.from(b64, 'base64').toString('utf8')).token).toBe(e.token)
    const none = env(null); none.c.menuSetupFile(); expect(none.shown.length).toBe(0); expect(none.alerts[0]).toMatch(/Deploy the web app first/)
  })
  it('BR2-05 the menu has the new item next to the old ones', () => {
    const items: string[] = []; const ss = new MockSpreadsheet('X'); const { g } = makeGlobals(ss)
    const m = { addItem: (_t: string, fn: string) => { items.push(fn); return m }, addSeparator: () => m, addToUi: () => {} }
    const ctx = vm.createContext({ ...g, SpreadsheetApp: { ...g.SpreadsheetApp, getUi: () => ({ createMenu: () => m }) }, Date, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, parseInt })
    vm.runInContext(CODE, ctx); (ctx as unknown as { onOpen: () => void }).onOpen()
    expect(items).toEqual(['menuSetup', 'menuToken', 'menuSetupFile', 'menuRemoveSubject'])
  })
})
