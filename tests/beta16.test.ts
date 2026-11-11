// beta.16 (Steve t245u): date edits reach the sheet. Run against the REAL bridge code (the deployed 0.46.2 and the v2 file)
// on the in-memory sheet mock. Covers the break-it open issues: Undo of an added date coming back on the next sync,
// ticks mixing after move-then-add on the same day, ticks staying on the date's own row. Demo names only, no network.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { editsToPush, applyEdits, inverseEdit, type SessionEdit } from '../src/data/edits'
import { copyWriter } from '../src/data/sheetSource'
import { parseSetup, exportSetup } from '../src/data/setup'
import { storageKey } from '../src/config'
import type { Op } from '../src/sync/ops'
import { realBridge, SETUP, TOKEN, BRIDGES } from './helpers/realBridge'

const K = 'X_Eng_CW'; const id = (d: string) => `${K}|${d}`
const ed = (n: number, e: Omit<SessionEdit, 'id' | 'at'>): SessionEdit => ({ ...e, id: `e${n}`, at: `2026-11-10T10:00:0${n}.000Z` })
const row = (d: string, topic = '') => ({ sessionId: id(d), subjectKey: K, classKey: 'X', date: d, topic, status: 'Open', updatedAt: '' })

describe('beta.16 editsToPush (what a batch asks of the sheet)', () => {
  it('B16-P-01 a move is one rename from the sheet date to the new date', () => {
    expect(editsToPush([ed(1, { sessionId: id('2026-11-02'), subjectKey: K, date: '2026-11-05', prevDate: '2026-11-02', to: id('2026-11-05') })]))
      .toEqual({ structs: [{ kind: 'rename', subjectKey: K, from: '2026-11-02', to: '2026-11-05', at: '2026-11-10T10:00:01.000Z' }], sessions: [] })
  })
  it('B16-P-02 two moves of the same date fold into one rename; moving back to where it was sends nothing', () => {
    const a = ed(1, { sessionId: id('2026-11-02'), subjectKey: K, date: '2026-11-05', prevDate: '2026-11-02', to: id('2026-11-05') })
    const b = ed(2, { sessionId: id('2026-11-05'), subjectKey: K, date: '2026-11-06', prevDate: '2026-11-05', to: id('2026-11-06') })
    expect(editsToPush([a, b]).structs).toMatchObject([{ kind: 'rename', from: '2026-11-02', to: '2026-11-06' }])
    const back = ed(3, { sessionId: id('2026-11-06'), subjectKey: K, date: '2026-11-02', prevDate: '2026-11-06', to: id('2026-11-02') })
    expect(editsToPush([a, b, back])).toEqual({ structs: [], sessions: [] })
  })
  it('B16-P-03 add then Undo (delete) in one batch sends nothing; add alone sends one sessions op', () => {
    const add = ed(1, { sessionId: id('2026-11-06'), subjectKey: K, add: row('2026-11-06') })
    expect(editsToPush([add]).sessions).toMatchObject([{ subjectKey: K, date: '2026-11-06', topic: '' }])
    expect(editsToPush([add, ed(2, { sessionId: id('2026-11-06'), subjectKey: K, del: row('2026-11-06') })])).toEqual({ structs: [], sessions: [] })
  })
  it('B16-P-04 a topic edit after a move goes to the new date, stamped after the rename (the bridge keeps the newer)', () => {
    const r = editsToPush([ed(1, { sessionId: id('2026-11-02'), subjectKey: K, topic: 'Shapes', prevTopic: 'Letters' }),
      ed(2, { sessionId: id('2026-11-02'), subjectKey: K, date: '2026-11-05', prevDate: '2026-11-02', to: id('2026-11-05') })])
    expect(r.sessions).toEqual([{ subjectKey: K, date: '2026-11-05', topic: 'Shapes', updatedAt: '2026-11-10T10:00:02.001Z' }])
    expect(r.structs[0]!.at < r.sessions[0]!.updatedAt).toBe(true)
  })
  it('B16-P-05 beta.14 edits (old id kept after a move) still fold right', () => {
    const r = editsToPush([ed(1, { sessionId: id('2026-11-02'), date: '2026-11-05', prevDate: '2026-11-02' }), ed(2, { sessionId: id('2026-11-02'), topic: 'Moved', prevTopic: 'Letters' })])
    expect(r.structs).toMatchObject([{ kind: 'rename', from: '2026-11-02', to: '2026-11-05' }]); expect(r.sessions).toMatchObject([{ date: '2026-11-05', topic: 'Moved' }])
  })
  it('B16-P-06 applyEdits re-keys a move, merges a stand-in row, and an edit and its inverse cancel out', () => {
    const s = { ok: true as const, schema: 1, subjects: [], roster: [], sessions: [row('2026-11-02', 'Letters'), row('2026-11-05')],
      ticks: [{ tickId: `${id('2026-11-02')}|1`, sessionId: id('2026-11-02'), subjectKey: K, classKey: 'X', roll: 1, set: true, updatedAt: 'a' },
        { tickId: `${id('2026-11-05')}|2`, sessionId: id('2026-11-05'), subjectKey: K, classKey: 'X', roll: 2, set: true, updatedAt: 'b' }] }
    const mv = ed(1, { sessionId: id('2026-11-02'), subjectKey: K, date: '2026-11-05', prevDate: '2026-11-02', to: id('2026-11-05') })
    const out = applyEdits(s, [mv])
    expect(out.sessions).toEqual([{ ...row('2026-11-05', 'Letters') }]); expect(out.ticks.map((t) => t.tickId).sort()).toEqual([`${id('2026-11-05')}|1`, `${id('2026-11-05')}|2`])
    const inv = { ...inverseEdit(out, mv)!, id: 'e2', at: 'z' }; const back = applyEdits(out, [inv])
    expect(back.sessions.map((x) => x.sessionId)).toEqual([id('2026-11-02')]); expect(applyEdits(back, [mv, inv]).sessions.map((x) => x.sessionId)).toEqual([id('2026-11-02')])
  })
})

for (const which of Object.keys(BRIDGES) as (keyof typeof BRIDGES)[]) {
  describe(`beta.16 copyWriter on the real ${which} bridge`, () => {
    it(`B16-W-01 (${which}) move + a tick on the moved date: one session on the new day, both ticks on it, nothing split`, async () => {
      const b = realBridge(which); const w = copyWriter('u', () => TOKEN, b.fetch as never)
      const op: Op = { sessionId: id('2026-11-05'), subjectKey: K, classKey: 'X', date: '2026-11-05', roll: 2, set: true, updatedAt: '2026-11-10T09:00:00.000Z' }
      const st = await w([op], [ed(1, { sessionId: id('2026-11-02'), subjectKey: K, date: '2026-11-05', prevDate: '2026-11-02', to: id('2026-11-05') })])
      expect(st.sessions.map((x) => [x.sessionId, x.topic])).toEqual([[id('2026-11-05'), 'Letters']])
      expect(st.ticks.filter((t) => t.set).map((t) => [t.sessionId, t.roll])).toEqual([[id('2026-11-05'), 1], [id('2026-11-05'), 2]])
    })
    it(`B16-W-02 (${which}) a new date with no ticks yet and its topic reach the sheet`, async () => {
      const b = realBridge(which); const w = copyWriter('u', () => TOKEN, b.fetch as never)
      const st = await w([], [ed(1, { sessionId: id('2026-11-06'), subjectKey: K, add: row('2026-11-06') }), ed(2, { sessionId: id('2026-11-06'), subjectKey: K, topic: 'Rhymes', prevTopic: '' })])
      expect(st.sessions.find((x) => x.sessionId === id('2026-11-06'))?.topic).toBe('Rhymes')
    })
    it(`B16-W-03 (${which}) Undo of an added date after it was saved deletes it, and an older tick cannot bring it back`, async () => {
      const b = realBridge(which); const w = copyWriter('u', () => TOKEN, b.fetch as never)
      await w([], [ed(1, { sessionId: id('2026-11-06'), subjectKey: K, add: row('2026-11-06') })])
      await w([], [ed(3, { sessionId: id('2026-11-06'), subjectKey: K, del: row('2026-11-06') })])
      const late: Op = { sessionId: id('2026-11-06'), subjectKey: K, classKey: 'X', date: '2026-11-06', roll: 3, set: true, updatedAt: '2026-11-10T10:00:02.000Z' }
      const st = await w([late], [])
      expect(st.sessions.map((x) => x.sessionId)).toEqual([id('2026-11-02')])
    })
  })
}

describe('beta.16 through the store, on the real deployed bridge', () => {
  let b: ReturnType<typeof realBridge>
  beforeEach(() => { b = realBridge('deployed'); vi.stubGlobal('fetch', b.fetch); history.replaceState(null, '', '/'); localStorage.clear() })
  afterEach(() => { vi.unstubAllGlobals() })
  const until = async (f: () => boolean, ms = 8000) => { const t = Date.now(); while (!f()) { if (Date.now() - t > ms) return false; await new Promise((r) => setTimeout(r, 20)) } return true }
  const store = async () => { const { useApp } = await import('../src/store/store'); const S = () => useApp.getState(); S().reset(); await S().importSetup(SETUP); return S }
  /** Push now instead of waiting the 3 s grace: the app flushes when the phone comes back online. */
  const save = async (S: () => { save: string; waiting: number }) => { window.dispatchEvent(new Event('online')); return until(() => S().save === 'saved' && S().waiting === 0) }
  const sheet = () => b.state() as { sessions: { sessionId: string; date: string; topic: string }[]; ticks: { sessionId: string; roll: number; set: boolean }[] }
  const on = (sid: string) => sheet().ticks.filter((t) => t.sessionId === sid && t.set).map((t) => t.roll).sort()

  it('B16-S-01 move then add a new date on the old day: each keeps its own ticks on the sheet (no mixing)', async () => {
    const S = await store()
    S().moveSession(id('2026-11-02'), '2026-11-05'); S().tick(id('2026-11-05'), 2)
    const nid = S().addSession(K, '2026-11-02'); expect(nid).toBe(id('2026-11-02')); S().tick(nid, 3)
    expect(await save(S)).toBe(true)
    expect(on(id('2026-11-05'))).toEqual([1, 2]); expect(on(id('2026-11-02'))).toEqual([3])
    expect(S().data.sessions.filter((x) => x.subjectKey === K).map((x) => x.sessionId).sort()).toEqual([id('2026-11-02'), id('2026-11-05')])
    expect(S().edits).toEqual([]) // saved edits leave the queue
  }, 15000)
  it('B16-S-02 Undo of an added date (saved before) removes it from the sheet, and it does not come back on the next sync', async () => {
    const S = await store()
    const nid = S().addSession(K, '2026-11-06'); S().tick(nid, 2); expect(await save(S)).toBe(true)
    expect(sheet().sessions.some((x) => x.sessionId === nid)).toBe(true)
    S().undo(); S().undo(); expect(await save(S)).toBe(true)
    expect(sheet().sessions.some((x) => x.sessionId === nid)).toBe(false)
    await S().refresh(); expect(S().data.sessions.some((x) => x.sessionId === nid)).toBe(false)
  }, 15000)
  it('B16-S-03 topic and Undo of a move after saving: the sheet follows', async () => {
    const S = await store()
    S().setTopic(id('2026-11-02'), 'Shapes'); S().moveSession(id('2026-11-02'), '2026-11-04'); expect(await save(S)).toBe(true)
    expect(sheet().sessions).toMatchObject([{ sessionId: id('2026-11-04'), topic: 'Shapes' }])
    S().undo(); expect(S().data.sessions.find((x) => x.subjectKey === K)?.date).toBe('2026-11-02'); expect(await save(S)).toBe(true)
    expect(sheet().sessions).toMatchObject([{ sessionId: id('2026-11-02'), topic: 'Shapes' }]); expect(on(id('2026-11-02'))).toEqual([1])
    S().redo(); expect(await save(S)).toBe(true); expect(sheet().sessions.map((x) => x.sessionId)).toEqual([id('2026-11-04')])
  }, 15000)
  it('B16-S-04 a tick waiting to save moves with its date; Undo of that tick after the move lands on the moved date', async () => {
    const S = await store()
    S().tick(id('2026-11-02'), 4); S().moveSession(id('2026-11-02'), '2026-11-03'); expect(S().waiting).toBe(2)
    expect(await save(S)).toBe(true); expect(on(id('2026-11-03'))).toEqual([1, 4])
    S().undo(); S().undo(); expect(await save(S)).toBe(true) // undo the move, then the tick
    expect(on(id('2026-11-02'))).toEqual([1]); expect(sheet().sessions.map((x) => x.sessionId)).toEqual([id('2026-11-02')])
  }, 15000)
  it('B16-S-05 a date move saved by beta.14 (old id kept, still waiting) is moved on the sheet after the update', async () => {
    const S = await store(); expect(await save(S)).toBe(true)
    localStorage.setItem(storageKey('edits-copy'), JSON.stringify([{ id: 'old', at: '2026-11-10T09:00:00.000Z', sessionId: id('2026-11-02'), date: '2026-11-05', prevDate: '2026-11-02' },
      { id: 'old2', at: '2026-11-10T09:00:01.000Z', sessionId: id('2026-11-02'), topic: 'Moved', prevTopic: 'Letters' }]))
    await S().refresh(); expect(await save(S)).toBe(true)
    expect(sheet().sessions).toMatchObject([{ sessionId: id('2026-11-05'), topic: 'Moved' }]); expect(on(id('2026-11-05'))).toEqual([1])
    expect(S().data.sessions.filter((x) => x.subjectKey === K).map((x) => x.sessionId)).toEqual([id('2026-11-05')])
  }, 15000)
  it('B16-S-06 a day that subject already has is refused for a move or a new date', async () => {
    const S = await store(); const nid = S().addSession(K, '2026-11-06')
    S().moveSession(id('2026-11-02'), '2026-11-06'); expect(S().data.sessions.find((x) => x.sessionId === id('2026-11-02'))?.date).toBe('2026-11-02')
    expect(S().addSession(K, '2026-11-06')).toBe(''); expect(nid).toBe(id('2026-11-06'))
  }, 15000)
})

describe('beta.16 setup files (t245u)', () => {
  const U = 'https://script.google.com/macros/s/AKfake_1/exec'
  it('B16-F-01 the old SoW file (kind sow-setup, v 1, syncUrl) opens', () => {
    const old = JSON.stringify({ kind: 'sow-setup', v: 1, syncUrl: U, token: 'fake-token', sheetUrl: '', exportedAt: '2026-10-01T10:00:00.000Z', appVersion: '0.47.1' })
    expect(parseSetup(old)).toEqual({ bridgeUrl: U, token: 'fake-token' })
  })
  it('B16-F-02 the new file carries v, exportedAt and an optional sheetUrl, and reads back', () => {
    const t = exportSetup({ bridgeUrl: U, token: 'k', sheetUrl: 'https://docs.google.com/spreadsheets/d/X/edit' }, new Date('2026-11-11T05:00:00.000Z'))
    expect(JSON.parse(t)).toEqual({ kind: 'sow-driftline-setup', v: 1, bridgeUrl: U, token: 'k', sheetUrl: 'https://docs.google.com/spreadsheets/d/X/edit', exportedAt: '2026-11-11T05:00:00.000Z' })
    expect(parseSetup(t)).toEqual({ bridgeUrl: U, token: 'k', sheetUrl: 'https://docs.google.com/spreadsheets/d/X/edit' })
    expect(JSON.parse(exportSetup({ bridgeUrl: U, token: 'k' }))).not.toHaveProperty('sheetUrl')
  })
  it('B16-F-03 a newer file version fails clearly; a Workspace-domain web app URL is fine; anything else is refused', () => {
    expect(() => parseSetup(JSON.stringify({ kind: 'sow-driftline-setup', v: 2, bridgeUrl: U, token: 'k' }))).toThrow(/newer version/)
    expect(parseSetup(JSON.stringify({ kind: 'sow-driftline-setup', bridgeUrl: 'https://script.google.com/a/school.example/macros/s/AK_x/exec', token: 'k' })).bridgeUrl).toContain('/a/school.example/')
    expect(() => parseSetup(JSON.stringify({ kind: 'sow-setup', v: 1, syncUrl: 'https://evil.example/exec', token: 'k' }))).toThrow(/unexpected/)
    expect(() => parseSetup(JSON.stringify({ kind: 'sow-setup', v: 1, bridgeUrl: U, token: 'k' }))).toThrow(/not a setup file/)
  })
})
