// beta.17 (Steve t250u): late/back-date marks through the sheet (bridge 0.51.0-dl.2), a refused date move is put back
// with a toast, and Restore of a snapshot from before a move keeps the moved date. Real bridge code on the sheet mock.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { storageKey } from '../src/config'
import { restoreOps } from '../src/sync/snapshots'
import { adoptMarks } from '../src/sync/marks'
import { realBridge, SETUP, TOKEN } from './helpers/realBridge'

const K = 'X_Eng_CW'; const id = (d: string) => `${K}|${d}`
const AT = (s: number) => `2026-11-10T10:00:${String(s).padStart(2, '0')}.000Z`

describe('beta.17 bridge dl.2 marks (unit, sheet mock)', () => {
  const push = (b: ReturnType<typeof realBridge>, marks: object[], extra: object = {}) => b.post({ action: 'push', token: TOKEN, marks, withMarks: true, ...extra })
  it('B17-M-01 a pushed mark comes back with withMarks; a pull without it (old app) has no marks field and no Marks tab is made before a mark', () => {
    const b = realBridge('v2')
    expect(b.post({ action: 'pull', token: TOKEN })).not.toHaveProperty('marks'); expect(b.ss.getSheetByName('Marks')).toBeNull()
    const r = push(b, [{ subjectKey: K, date: '2026-11-02', roll: 1, at: AT(1), back: true, updatedAt: AT(1) }])
    expect(r.marksApplied).toBe(1); expect(r.state.marks).toEqual([{ tickId: `${id('2026-11-02')}|1`, sessionId: id('2026-11-02'), roll: 1, at: AT(1), back: true, updatedAt: AT(1) }])
    expect(b.post({ action: 'pull', token: TOKEN, withMarks: true }).marks.length).toBe(1); expect(b.post({ action: 'pull', token: TOKEN })).not.toHaveProperty('marks')
    expect(b.ss.getSheetByName('Marks')!.isHidden).toBe(true)
  })
  it('B17-M-02 newer wins per cell; a cleared mark stays as a tombstone so an older one cannot come back', () => {
    const b = realBridge('v2')
    push(b, [{ subjectKey: K, date: '2026-11-02', roll: 1, at: AT(1), back: false, updatedAt: AT(5) }])
    push(b, [{ subjectKey: K, date: '2026-11-02', roll: 1, at: '', back: false, updatedAt: AT(6) }])
    const r = push(b, [{ subjectKey: K, date: '2026-11-02', roll: 1, at: AT(2), back: true, updatedAt: AT(4) }])
    expect(r.marksApplied).toBe(0); expect(r.state.marks).toMatchObject([{ at: '', updatedAt: AT(6) }])
  })
  it('B17-M-03 a moved date takes its marks; a deleted date drops them; a mark for a date that is not there is ignored; a bad one is rejected', () => {
    const b = realBridge('v2')
    push(b, [{ subjectKey: K, date: '2026-11-02', roll: 1, at: AT(1), back: false, updatedAt: AT(1) }])
    let r = b.post({ action: 'push', token: TOKEN, withMarks: true, structs: [{ kind: 'rename', subjectKey: K, from: '2026-11-02', to: '2026-11-05', at: AT(2) }] })
    expect(r.state.marks).toMatchObject([{ tickId: `${id('2026-11-05')}|1`, sessionId: id('2026-11-05') }])
    r = push(b, [{ subjectKey: K, date: '2026-11-09', roll: 1, at: AT(3), back: false, updatedAt: AT(3) }, { subjectKey: K, date: '2026-11-05', roll: 1.5, at: AT(3), updatedAt: AT(3) }])
    expect(r.marksApplied).toBe(0); expect(r.rejected.length).toBe(1)
    r = b.post({ action: 'push', token: TOKEN, withMarks: true, structs: [{ kind: 'delete', subjectKey: K, date: '2026-11-05', at: AT(4) }] })
    expect(r.state.marks).toEqual([])
  })
  it('B17-M-04 dl.2 still answers dl.1 apps exactly as before (no marks unless asked) and dl.1 ignores marks without an error', () => {
    const v2 = realBridge('v2'); const r = v2.post({ action: 'push', token: TOKEN, ticks: [{ subjectKey: K, date: '2026-11-02', topic: '', roll: 2, set: true, updatedAt: AT(1) }] })
    expect(r.ok).toBe(true); expect(r.state).not.toHaveProperty('marks')
    const dl1 = realBridge('dl1'); const q = dl1.post({ action: 'push', token: TOKEN, withMarks: true, marks: [{ subjectKey: K, date: '2026-11-02', roll: 1, at: AT(1), updatedAt: AT(1) }] })
    expect(q.ok).toBe(true); expect(q.state).not.toHaveProperty('marks'); expect(dl1.post({ action: 'ping', token: TOKEN }).caps).not.toContain('marks')
  })
  it('B17-M-05 adoptMarks: newer sheet marks in, a waiting local change wins, a tombstone clears', () => {
    const local = { 'a|1': { at: AT(1), u: AT(1) }, 'a|2': { at: AT(1), u: AT(9) } }
    const out = adoptMarks(local, [{ tickId: 'a|1', sessionId: 'a', roll: 1, at: '', back: false, updatedAt: AT(2) }, { tickId: 'a|2', sessionId: 'a', roll: 2, at: AT(3), back: true, updatedAt: AT(3) },
      { tickId: 'a|3', sessionId: 'a', roll: 3, at: AT(4), back: true, updatedAt: AT(4) }, { tickId: 'a|4', sessionId: 'a', roll: 4, at: AT(4), back: false, updatedAt: AT(4) }], new Set(['a|4']))
    expect(out).toEqual({ 'a|2': { at: AT(1), u: AT(9) }, 'a|3': { at: AT(4), back: true, u: AT(4) } })
    expect(adoptMarks(local, [], new Set())).toBeNull()
  })
})

describe('beta.17 restoreOps with moved dates', () => {
  it('B17-R-01 a snapshot from before a move restores onto the moved date; no op for the old day', () => {
    const row = (d: string) => ({ sessionId: id(d), subjectKey: K, classKey: 'X', date: d, topic: '', status: 'Open', updatedAt: '' })
    const tk = (d: string, roll: number, set: boolean) => ({ tickId: `${id(d)}|${roll}`, sessionId: id(d), subjectKey: K, classKey: 'X', roll, set, updatedAt: AT(1) })
    const snap = { ok: true as const, schema: 1, subjects: [], roster: [], sessions: [row('2026-11-02')], ticks: [tk('2026-11-02', 1, true), tk('2026-11-02', 2, false)] }
    const cur = { ...snap, sessions: [row('2026-11-05')], ticks: [tk('2026-11-05', 1, false), tk('2026-11-05', 2, true)] }
    const ops = restoreOps(cur, snap, AT(9), (x) => (x === id('2026-11-02') ? id('2026-11-05') : x))
    expect(ops.map((o) => [o.sessionId, o.date, o.roll, o.set])).toEqual([[id('2026-11-05'), '2026-11-05', 1, true], [id('2026-11-05'), '2026-11-05', 2, false]])
  })
})

describe('beta.17 through the store', () => {
  let b: ReturnType<typeof realBridge>
  const until = async (f: () => boolean, ms = 8000) => { const t = Date.now(); while (!f()) { if (Date.now() - t > ms) return false; await new Promise((r) => setTimeout(r, 20)) } return true }
  const S0 = async () => { const { useApp } = await import('../src/store/store'); return () => useApp.getState() }
  const start = async (which: 'deployed' | 'dl1' | 'v2') => { b = realBridge(which); vi.stubGlobal('fetch', b.fetch); const S = await S0(); S().reset(); await S().importSetup(SETUP); return S }
  const save = async (S: () => { save: string; waiting: number }) => { window.dispatchEvent(new Event('online')); return until(() => S().save === 'saved' && S().waiting === 0) }
  const sheet = () => b.post({ action: 'pull', token: TOKEN, withMarks: true })
  beforeEach(() => { history.replaceState(null, '', '/'); localStorage.clear() })
  afterEach(() => { vi.unstubAllGlobals() })

  it('B17-S-01 on a dl.1 bridge a tick keeps its mark on the device: nothing queued for marks, no error', async () => {
    const S = await start('dl1'); S().tick(id('2026-11-02'), 3); expect(localStorage.getItem(storageKey('marksOut'))).toBeNull()
    expect(await save(S)).toBe(true); expect(S().error).toBeNull(); expect(S().marks[`${id('2026-11-02')}|3`]?.at).toBeTruthy()
    expect(b.pushes().some((p) => 'marks' in p)).toBe(false)
  }, 15000)
  it('B17-S-02 on dl.2 a mark (back-date too) reaches the sheet, an untick clears it there, and a move carries it', async () => {
    const S = await start('v2'); S().setMarkMode('back'); S().tick(id('2026-11-02'), 3); expect(await save(S)).toBe(true)
    expect(sheet().marks).toMatchObject([{ tickId: `${id('2026-11-02')}|3`, back: true }])
    S().moveSession(id('2026-11-02'), '2026-11-04'); expect(await save(S)).toBe(true)
    expect(sheet().marks).toMatchObject([{ tickId: `${id('2026-11-04')}|3` }]); expect(S().marks[`${id('2026-11-04')}|3`]?.back).toBe(true)
    S().tick(id('2026-11-04'), 3); expect(await save(S)).toBe(true); expect(sheet().marks).toMatchObject([{ tickId: `${id('2026-11-04')}|3`, at: '' }])
    expect(S().marks[`${id('2026-11-04')}|3`]).toBeUndefined()
  }, 15000)
  it('B17-S-03 on dl.2 a mark made on another device shows up here after a pull', async () => {
    const S = await start('v2')
    b.post({ action: 'push', token: TOKEN, ticks: [{ subjectKey: K, date: '2026-11-02', topic: '', roll: 2, set: true, updatedAt: AT(1) }], marks: [{ subjectKey: K, date: '2026-11-02', roll: 2, at: AT(1), back: true, updatedAt: AT(1) }] })
    await S().refresh(); expect(S().marks[`${id('2026-11-02')}|2`]).toEqual({ at: AT(1), back: true, u: AT(1) })
  }, 15000)
  for (const which of ['deployed', 'dl1', 'v2'] as const) {
    it(`B17-S-04 (${which}) the sheet refuses a move (that day was taken on another device): toast, the date stays where the sheet has it, its ticks too`, async () => {
      const S = await start(which)
      b.post({ action: 'push', token: TOKEN, sessions: [{ subjectKey: K, date: '2026-11-06', topic: 'Other phone', updatedAt: AT(1) }] }) // not pulled here yet
      S().moveSession(id('2026-11-02'), '2026-11-06'); S().tick(id('2026-11-06'), 2); expect(S().data.sessions.find((x) => x.subjectKey === K)?.date).toBe('2026-11-06')
      expect(await save(S)).toBe(true)
      const sh = sheet(); expect(sh.sessions.map((x: { sessionId: string }) => x.sessionId).sort()).toEqual([id('2026-11-02'), id('2026-11-06')])
      const on = (sid: string) => sh.ticks.filter((t: { sessionId: string; set: boolean }) => t.sessionId === sid && t.set).map((t: { roll: number }) => t.roll).sort()
      expect(on(id('2026-11-02'))).toEqual([1, 2]); expect(on(id('2026-11-06'))).toEqual([])
      expect(S().data.sessions.filter((x) => x.subjectKey === K).map((x) => [x.sessionId, x.date, x.topic]).sort()).toEqual([[id('2026-11-02'), '2026-11-02', 'Letters'], [id('2026-11-06'), '2026-11-06', 'Other phone']])
      expect(S().data.ticks.filter((t) => t.sessionId === id('2026-11-02') && t.set).map((t) => t.roll).sort()).toEqual([1, 2])
      expect(S().notice?.text).toMatch(/^The sheet already has CW on Fri 6 Nov · kept on Mon 2 Nov$/)
      S().undo(); expect(await save(S)).toBe(true); expect(on(id('2026-11-02'))).toEqual([1, 2]) // Undo now undoes the tick, not the refused move
      expect(sheet().ticks.filter((t: { sessionId: string; roll: number; set: boolean }) => t.sessionId === id('2026-11-02') && t.set).map((t: { roll: number }) => t.roll)).toEqual([1])
      expect(sheet().sessions.length).toBe(2)
    }, 15000)
  }
  it('B17-S-05 Restore of a snapshot taken before a move keeps the moved date (no old column, on the app or the sheet)', async () => {
    const S = await start('dl1'); S().snapshotNow('Before'); const snap = S().snaps[0]!.at
    S().moveSession(id('2026-11-02'), '2026-11-05'); S().tick(id('2026-11-05'), 1); S().tick(id('2026-11-05'), 3); expect(await save(S)).toBe(true)
    S().restore(snap); expect(await save(S)).toBe(true)
    expect(S().data.sessions.filter((x) => x.subjectKey === K).map((x) => x.sessionId)).toEqual([id('2026-11-05')])
    const sh = sheet(); expect(sh.sessions.map((x: { sessionId: string }) => x.sessionId)).toEqual([id('2026-11-05')])
    expect(sh.ticks.filter((t: { set: boolean }) => t.set).map((t: { roll: number }) => t.roll)).toEqual([1])
  }, 15000)
})
