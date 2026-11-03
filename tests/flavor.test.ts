// v0.6 (t169u) changed: copy-only everywhere (dormant Stable→LIVE code removed). Replaces v0.5 FLV-01/03/05.
import { describe, it, expect } from 'vitest'
import * as SS from '../src/data/sheetSource'
import { allowedSheets, COPY_SHEET_ID, LIVE_SHEET_ID, copyWriter, sheetBridgeSource } from '../src/data/sheetSource'
import { namespaceFor } from '../src/config'
const f = (sheetId: string) => (async (_u: string, i: { body: string }) => { const b = JSON.parse(i.body); return { ok: true, json: async () => (b.action === 'ping' ? { ok: true, schema: 1, sheetId } : { ok: true, state: { ok: true, schema: 1, subjects: [], roster: [], sessions: [], ticks: [] } }) } as Response }) as never
const op = { sessionId: 's', subjectKey: 'k', classKey: 'c', date: '2026-11-03', roll: 1, set: true, updatedAt: '2026-11-03T10:00:00.000Z' }
describe('copy-only everywhere', () => {
  it('FLV-01 Stable and Beta both allow only the test copy; no LIVE bridge address in the app', () => {
    expect(allowedSheets('beta')).toEqual([COPY_SHEET_ID]); expect(allowedSheets('stable')).toEqual([COPY_SHEET_ID])
    expect((SS as Record<string, unknown>).LIVE_BRIDGE_URL).toBeUndefined()
  })
  it('FLV-03 Stable refuses LIVE for read and write', async () => {
    await expect(sheetBridgeSource('u', () => 't', f(LIVE_SHEET_ID), 'stable').pull()).rejects.toThrow(/not the test copy/i)
    await expect(copyWriter('u', () => 't', f(LIVE_SHEET_ID), 'stable')([op])).rejects.toThrow(/not the test copy/i)
  })
  it('FLV-04 Beta and Stable never share storage keys (same github.io origin)', () => {
    expect(namespaceFor('stable')).toBe('sow-driftline'); expect(namespaceFor('beta')).toBe('sow-driftline-beta')
  })
})
