// v0.5 Stable-may-use-LIVE guard (Steve 2:24 widget): Stable = LIVE + copy; Beta = copy only; devices never on LIVE.
import { describe, it, expect } from 'vitest'
import { allowedSheets, COPY_SHEET_ID, LIVE_SHEET_ID, copyWriter, sheetBridgeSource, LIVE_BRIDGE_URL } from '../src/data/sheetSource'
import { namespaceFor } from '../src/config'
const f = (sheetId: string) => (async (_u: string, i: { body: string }) => { const b = JSON.parse(i.body); return { ok: true, json: async () => (b.action === 'ping' ? { ok: true, schema: 1, sheetId } : b.action === 'pull' ? { ok: true, schema: 1, subjects: [], roster: [], sessions: [], ticks: [] } : { ok: true, state: { ok: true, schema: 1, subjects: [], roster: [], sessions: [], ticks: [] } }) } as Response }) as never
const op = { sessionId: 's', subjectKey: 'k', classKey: 'c', date: '2026-11-03', roll: 1, set: true, updatedAt: '2026-11-03T10:00:00.000Z' }
describe('flavor guard', () => {
  it('FLV-01 Beta allows only the copy; Stable allows LIVE and copy', () => {
    expect(allowedSheets('beta')).toEqual([COPY_SHEET_ID]); expect(allowedSheets('stable')).toEqual([LIVE_SHEET_ID, COPY_SHEET_ID])
    expect(LIVE_BRIDGE_URL).toMatch(/^https:\/\/script\.google\.com\/macros\/s\/AKfycby2SaO9/)
  })
  it('FLV-02 Beta refuses LIVE for read and write', async () => {
    await expect(sheetBridgeSource('u', () => 't', f(LIVE_SHEET_ID), 'beta').pull()).rejects.toThrow(/not the test copy/i)
    await expect(copyWriter('u', () => 't', f(LIVE_SHEET_ID), 'beta')([op])).rejects.toThrow(/not the test copy/i)
  })
  it('FLV-03 Stable reads and writes LIVE, still refuses an unknown sheet', async () => {
    await expect(sheetBridgeSource('u', () => 't', f(LIVE_SHEET_ID), 'stable').pull()).resolves.toBeTruthy()
    await expect(copyWriter('u', () => 't', f(LIVE_SHEET_ID), 'stable')([op])).resolves.toBeTruthy()
    await expect(copyWriter('u', () => 't', f('someOtherSheet'), 'stable')([op])).rejects.toThrow(/not an allowed sheet|not the test copy/i)
  })
  it('FLV-04 Beta and Stable never share storage keys (same github.io origin)', () => {
    expect(namespaceFor('stable')).toBe('sow-driftline'); expect(namespaceFor('beta')).toBe('sow-driftline-beta')
  })
})
describe('devices never on LIVE', () => {
  it('FLV-05 after a LIVE ping the devices client sends nothing', async () => {
    await sheetBridgeSource('u', () => 't', f(LIVE_SHEET_ID), 'stable').pull()
    const { devicesClient } = await import('../src/data/devices'); let calls = 0
    const g = (async () => { calls++; return { ok: true, json: async () => ({ ok: true, devices: [] }) } }) as never
    expect(await devicesClient('u', () => 't', g).list()).toEqual({ supported: false, devices: [] })
    await expect(devicesClient('u', () => 't', g).revoke('x')).rejects.toThrow(); expect(calls).toBe(0)
  })
})
