// t254u (Q-HARM-10, CRDT_SYNC_PLAN §9/§12/§13): the op log on the device. Pure log + core first, then the store through the
// real bridge 0.60.0-ol.1 (migrated) on the sheet mock: clock skew ±1 day, offline concurrency, duplicates, gaps, old-app
// pushes, and the beta.17 behaviours (date moves, refused moves, marks, Restore) on the op path. Demo names only.
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OpLog, type LogOp } from '../src/oplog/log'
import { olCompact, olFold, olPlain, olView } from '../src/oplog/core'
import { legacyToOps } from '../src/oplog/legacy'
import { idbStore } from '../src/oplog/persist'
import { realBridge, SETUP, TOKEN } from './helpers/realBridge'
const DAY = 864e5
const seqs = () => { let n = 0; return (min: number) => (n = Math.max(n + 1, min)) }
const L = (id: string, skew = 0) => { const l = new OpLog(id, seqs()); const local = l.local.bind(l); l.local = (k, t, v, w = new Date(Date.now() + skew).toISOString()) => local(k, t, v, w); return l }
/** A fake sheet for pure tests: stamps recvAt in arrival order, like the bridge. */
const fakeSheet = () => { let t = Date.parse('2026-11-11T10:00:00.000Z'); const all: LogOp[] = []
  return { take(ops: LogOp[]) { for (const o of ops) if (!all.some((x) => x.opId === o.opId)) all.push({ ...o, recvAt: new Date(t++).toISOString(), status: '' }); return all.slice() }, all } }
const sync = (sh: ReturnType<typeof fakeSheet>, ...logs: OpLog[]) => { for (const l of logs) l.receive(sh.take(l.unsent())); for (const l of logs) l.receive(sh.all) }
const val = (l: OpLog, reg: string) => l.fold().regs[reg]?.value

describe('op log on the device (pure, §9)', () => {
  it('OL-A-01 clock +1 day on A cannot block B’s later causal un-tick', () => {
    const sh = fakeSheet(), a = L('daaaaaaa', DAY), b = L('dbbbbbbb')
    a.local('tick.set', 'S|2', true); sync(sh, a, b); b.local('tick.set', 'S|2', false); sync(sh, a, b)
    expect(val(a, 'tick:S|2')).toBe(false); expect(val(b, 'tick:S|2')).toBe(false); expect(a.conflicts()).toHaveLength(0)
  })
  it('OL-A-02 clock −1 day: a later causal op is applied, never "ignored"', () => {
    const sh = fakeSheet(), s = L('dsheetxx'), a = L('daaaaaaa', -DAY)
    s.local('tick.set', 'T|1', false); sync(sh, s, a); a.local('tick.set', 'T|1', true); sync(sh, s, a)
    expect(val(s, 'tick:T|1')).toBe(true)
  })
  it('OL-A-03 offline tick vs untick → Set wins on both, one conflict; the rule from the sheet can be Unset wins', () => {
    const sh = fakeSheet(), a = L('daaaaaaa'), b = L('dbbbbbbb')
    a.local('tick.set', 'T|1', true); b.local('tick.set', 'T|1', false); sync(sh, b, a)
    expect(val(a, 'tick:T|1')).toBe(true); expect(val(b, 'tick:T|1')).toBe(true); expect(a.conflicts()).toHaveLength(1); expect(a.conflicts()[0]!.rule).toBe('set wins')
    b.adopt({ rules: { tick: 'unset' } }); expect(val(b, 'tick:T|1')).toBe(false)
  })
  it('OL-A-04 Left: device vs sheet → sheet wins; device vs device → later receipt', () => {
    const sh = fakeSheet(), a = L('daaaaaaa'), b = L('dbbbbbbb')
    a.local('left.set', 'X|7', 'Left'); const s: LogOp = { opId: 'sheet:1', deviceId: 'sheet', seq: 1, lamport: 1, vv: {}, kind: 'left.set', target: 'X|7', value: 'Active', wallAt: '' }
    sh.take([s]); sync(sh, a); expect(val(a, 'left:X|7')).toBe('Active')
    a.local('left.set', 'X|5', 'Left'); b.local('left.set', 'X|5', 'Active'); sync(sh, a, b) // a arrives first
    expect(val(a, 'left:X|5')).toBe('Active'); expect(val(b, 'left:X|5')).toBe('Active')
  })
  it('OL-A-05 a duplicate is idempotent; ops are kept by seq, so a clock jumping back never skips one (§9 case 9)', () => {
    let t = Date.now(); const a = new OpLog('daaaaaaa', seqs()), b = new OpLog('dbbbbbbb', seqs())
    const o1 = a.local('tick.set', 'T|1', true, new Date(t).toISOString()); b.receive([o1]); b.receive([o1]); expect(b.ops()).toHaveLength(1)
    a.adopt({ accepted: [{ opId: o1.opId, recvAt: new Date(t).toISOString(), status: '' }] })
    t -= DAY; a.local('tick.set', 'T|2', true, new Date(t).toISOString())
    expect(a.unsent().map((o) => o.target)).toEqual(['T|2']); a.resendFrom(1); expect(a.unsent().map((o) => o.seq)).toEqual([1, 2])
  })
  it('OL-A-06 any delivery order gives the same state on every device (random, 3 devices, offline bursts)', () => {
    let r = 7; const rnd = (n: number) => { r = (r * 48271) % 2147483647; return r % n }
    for (let run = 0; run < 30; run++) {
      const sh = fakeSheet(), ds = [L('daaaaaaa', DAY), L('dbbbbbbb', -DAY), L('dccccccc')]
      for (let i = 0; i < 40; i++) { const d = ds[rnd(3)]!; const k = rnd(10); if (k < 6) d.local('tick.set', `S|${1 + rnd(4)}`, rnd(2) === 0); else if (k < 8) d.local('left.set', `X|${1 + rnd(3)}`, rnd(2) ? 'Left' : 'Active'); else d.local('session.topic', 'S', `t${rnd(5)}`); if (rnd(4) === 0) sync(sh, ...ds.filter(() => rnd(2) === 0)) }
      sync(sh, ...ds); sync(sh, ...ds)
      const v = ds.map((d) => JSON.stringify(Object.entries(d.fold().regs).map(([k, x]) => [k, x.value]).sort()))
      expect(v[1]).toBe(v[0]); expect(v[2]).toBe(v[0])
    }
  })
  it('OL-A-07 compaction (§9 case 8): fold + delete keeps the state; current and previous SoW stay as ops', () => {
    let r = 11; const rnd = (n: number) => { r = (r * 48271) % 2147483647; return r % n }
    const sh = fakeSheet(), a = L('daaaaaaa'), b = L('dbbbbbbb'); const dates = ['2026-08-03', '2026-08-05', '2026-09-01', '2026-09-03', '2026-10-01', '2026-11-02']
    dates.forEach((d, i) => a.local('session.add', `K|${d}`, { subjectKey: 'K', classKey: 'X', date: d, topic: i < 2 ? 'Old' : i < 4 ? 'Mid' : 'Now' }))
    for (let i = 0; i < 120; i++) { const l = rnd(2) ? a : b; l.local('tick.set', `K|${dates[rnd(6)]}|${1 + rnd(5)}`, rnd(2) === 0); if (rnd(5) === 0) sync(sh, a, b) }
    a.local('left.set', 'X|2', 'Left'); b.local('left.set', 'X|2', 'Active'); sync(sh, a, b); sync(sh, a, b)
    const view = (base: any, ops: any) => JSON.stringify(olPlain(olView(olFold(base, ops))))
    const before = view([], sh.all), c = olCompact([], sh.all, { tick: 'set' }, '2026-11-11', '2026-12-31T00:00:00.000Z')
    expect(view(c.base, c.ops)).toBe(before); expect(c.gone.length).toBeGreaterThan(0)
    expect(c.ops.some((o) => o.target.startsWith('K|2026-08-03'))).toBe(false); expect(c.ops.some((o) => o.target.startsWith('K|2026-10-01'))).toBe(true) // Now = current
    expect(c.ops.filter((o) => o.target === 'X|2')).toHaveLength(1)
  })
  it('OL-A-08 what waited on the old push path becomes ops on the session’s first id', () => {
    const ops = legacyToOps([{ sessionId: 'K|2026-11-05', subjectKey: 'K', classKey: 'X', date: '2026-11-05', roll: 2, set: true, updatedAt: '' }],
      [{ id: '1', at: '1', sessionId: 'K|2026-11-02', subjectKey: 'K', date: '2026-11-05', prevDate: '2026-11-02', to: 'K|2026-11-05' }, { id: '2', at: '2', sessionId: 'K|2026-11-05', subjectKey: 'K', topic: 'Sounds', prevTopic: '' }],
      [{ sessionId: 'K|2026-11-05', subjectKey: 'K', date: '2026-11-05', roll: 2, at: '2026-11-05T05:00:00.000Z', back: true, updatedAt: '' }])
    expect(ops).toEqual([{ kind: 'session.date', target: 'K|2026-11-02', value: '2026-11-05' }, { kind: 'session.topic', target: 'K|2026-11-02', value: 'Sounds' },
      { kind: 'tick.set', target: 'K|2026-11-02|2', value: true }, { kind: 'tick.mark', target: 'K|2026-11-02|2', value: { at: '2026-11-05T05:00:00.000Z', back: true } }])
  })
  it('OL-A-09 the log lives in IndexedDB and comes back', async () => {
    const st = idbStore('test-oplog'); const a = new OpLog('daaaaaaa', seqs()); a.local('tick.set', 'T|1', true); st.save(a.data()); await st.flush()
    const back = new OpLog('daaaaaaa', seqs(), await st.load()); expect(back.ops().map((o) => o.opId)).toEqual(['daaaaaaa:1'])
  })
})

describe('op log through the store and the real ol.1 bridge', () => {
  type B = ReturnType<typeof realBridge>; let b: B
  const K = 'X_Eng_CW'; const id = (d: string) => `${K}|${d}`; const S1 = id('2026-11-02')
  const until = async (f: () => boolean, ms = 8000) => { const t = Date.now(); while (!f()) { if (Date.now() - t > ms) return false; await new Promise((r) => setTimeout(r, 20)) } return true }
  const S0 = async () => { const { useApp } = await import('../src/store/store'); return () => useApp.getState() }
  let net: 'on' | 'off' = 'on'; let mangle: ((body: any) => any) | null = null; let dropReply = 0
  const fetchVia = (bb: B) => async (u: string, init: { body: string }) => {
    if (net === 'off') throw new TypeError('Failed to fetch')
    let body = JSON.parse(init.body); if (mangle && body.action === 'opsPush') { body = mangle(body); mangle = null }
    const r = await bb.fetch(u, { body: JSON.stringify(body) }); if (dropReply && body.action === 'opsPush') { dropReply--; throw new TypeError('Failed to fetch') } return r }
  const start = async (migrated = true, which: 'v2' | 'dl1' = 'v2') => { b = realBridge(which); if (migrated) b.c.olMigrate_(b.ss); vi.stubGlobal('fetch', fetchVia(b)); const S = await S0(); S().reset(); await S().importSetup(SETUP); return S }
  const save = async (S: () => { save: string; waiting: number }) => { window.dispatchEvent(new Event('online')); return until(() => S().save === 'saved' && S().waiting === 0) }
  const sheet = () => b.post({ action: 'pull', token: TOKEN })
  const gone = async (S: () => { save: string }) => { window.dispatchEvent(new Event('online')); return until(() => S().save === 'offline') }
  const setOn = (sid: string) => sheet().ticks.filter((t: any) => t.sessionId === sid && t.set).map((t: any) => t.roll).sort()
  const other = (n: number, kind: string, target: string, value: unknown, vv: Record<string, number> = {}, skew = 0) =>
    b.post({ action: 'opsPush', token: TOKEN, deviceId: 'dotherph', ops: [{ opId: `dotherph:${n}`, deviceId: 'dotherph', seq: n, lamport: n, vv, kind, target, value, wallAt: new Date(Date.now() + skew).toISOString() }] })
  const opsTab = () => b.c.olReadOps_(b.ss) as any[]
  beforeEach(() => { history.replaceState(null, '', '/'); localStorage.clear(); net = 'on'; mangle = null; dropReply = 0 })
  afterEach(() => { vi.unstubAllGlobals() })

  it('OL-S-00 an un-migrated sheet (ol.1 before Migrate, or dl.1) stays on the push path; the op path is dormant', async () => {
    for (const w of ['v2', 'dl1'] as const) {
      const S = await start(false, w); expect(S().syncPath).toBe('push'); S().tick(S1, 3); expect(await save(S)).toBe(true)
      expect(setOn(S1)).toEqual([1, 3]); expect(b.bodies.some((x) => /^ops/.test(x.action))).toBe(false)
    }
  }, 20000)
  it('OL-S-01 migrated: ticks go as ops (device id, seq, vv); the sheet view and the app agree', async () => {
    const S = await start(); expect(S().syncPath).toBe('oplog')
    S().tick(S1, 3); S().tick(S1, 1); expect(await save(S)).toBe(true)
    expect(setOn(S1)).toEqual([3]); const mine = opsTab().filter((o) => o.deviceId !== 'sheet')
    expect(mine.map((o) => [o.seq, o.kind, o.target, o.kind === 'tick.mark' ? !!o.value : o.value])).toEqual([[1, 'tick.mark', `${S1}|3`, true], [2, 'tick.set', `${S1}|3`, true], [3, 'tick.set', `${S1}|1`, false]]) // a tick also stamps its mark (F-LT-05)
    expect(new Set(mine.map((o) => o.deviceId)).size).toBe(1); expect(mine[2].vv[mine[0].deviceId]).toBe(2)
    expect(S().data.ticks.filter((t) => t.set).map((t) => t.roll)).toEqual([3]); expect(b.pushes()).toHaveLength(0)
  }, 15000)
  it('OL-S-02 offline concurrency: this phone ticks while another un-ticks the same box → Set wins on both, conflict logged and kept in the store', async () => {
    const S = await start(); net = 'off'; S().tick(S1, 2); await gone(S)
    other(1, 'tick.set', `${S1}|2`, false) // the other phone never saw this phone's tick
    net = 'on'; expect(await save(S)).toBe(true); await S().refresh()
    expect(setOn(S1)).toContain(2); expect(S().data.ticks.find((t) => t.tickId === `${S1}|2`)?.set).toBe(true)
    expect(b.c.olRows_(b.ss, 'conflicts')).toHaveLength(1); expect(S().conflicts.map((c) => c.rule)).toEqual(['set wins'])
  }, 15000)
  it('OL-S-03 clock skew ±1 day on the other phone changes nothing: causal order decides', async () => {
    const S = await start()
    other(1, 'tick.set', `${S1}|4`, true, {}, DAY); await S().refresh(); expect(S().data.ticks.find((t) => t.tickId === `${S1}|4`)?.set).toBe(true)
    S().tick(S1, 4); expect(await save(S)).toBe(true); expect(setOn(S1)).not.toContain(4) // this phone saw it, so its un-tick wins
    await S().refresh(); const vv = b.post({ action: 'opsPull', token: TOKEN }).vv
    other(2, 'tick.set', `${S1}|4`, true, vv, -DAY); await S().refresh(); expect(S().data.ticks.find((t) => t.tickId === `${S1}|4`)?.set).toBe(true); expect(setOn(S1)).toContain(4)
  }, 15000)
  it('OL-S-04 a lost reply is retried without doubling; a seq gap is resent', async () => {
    const S = await start(); dropReply = 1; S().tick(S1, 3); await gone(S)
    expect(await save(S)).toBe(true); expect(opsTab().filter((o) => o.kind === 'tick.set')).toHaveLength(1)
    S().tick(S1, 2); S().tick(S1, 4); mangle = (body) => ({ ...body, ops: body.ops.slice(1) }) // the first op never arrives
    expect(await save(S)).toBe(true); expect(opsTab().map((o) => o.seq)).toEqual([1, 2, 3, 4, 5, 6]); expect(setOn(S1)).toEqual([1, 2, 3, 4])
  }, 15000)
  it('OL-S-05 the old app’s push after Migrate gets "update the app" and can’t change anything', async () => {
    const S = await start(); S().tick(S1, 3); expect(await save(S)).toBe(true)
    const r = b.post({ action: 'push', token: TOKEN, ticks: [{ subjectKey: K, date: '2026-11-02', topic: '', roll: 3, set: false, updatedAt: new Date(Date.now() + DAY).toISOString() }] })
    expect(r).toMatchObject({ ok: false, error: 'update the app' }); await S().refresh(); expect(setOn(S1)).toEqual([1, 3]); expect(S().data.ticks.find((t) => t.tickId === `${S1}|3`)?.set).toBe(true)
  }, 15000)
  it('OL-S-06 a date move is an op on the session (ticks follow); Undo moves it back with a new op', async () => {
    const S = await start(); S().moveSession(S1, '2026-11-04'); S().tick(S1, 2); expect(await save(S)).toBe(true)
    expect(sheet().sessions.map((x: any) => x.sessionId)).toEqual([id('2026-11-04')]); expect(setOn(id('2026-11-04'))).toEqual([1, 2])
    expect(S().data.sessions.find((x) => x.sessionId === S1)?.date).toBe('2026-11-04')
    S().undo(); S().undo(); expect(await save(S)).toBe(true); expect(setOn(S1)).toEqual([1]); expect(opsTab().filter((o) => o.kind === 'session.date').map((o) => o.value)).toEqual(['2026-11-04', '2026-11-02'])
  }, 15000)
  it('OL-S-07 a refused move on the op path: toast, the date stays, its ticks stay on it; Undo then undoes the tick', async () => {
    const S = await start(); other(1, 'session.add', id('2026-11-06'), { subjectKey: K, classKey: 'X', date: '2026-11-06', topic: 'Other phone' })
    S().moveSession(S1, '2026-11-06'); S().tick(S1, 2); expect(await save(S)).toBe(true)
    expect(setOn(S1)).toEqual([1, 2]); expect(setOn(id('2026-11-06'))).toEqual([])
    expect(S().data.sessions.filter((x) => x.subjectKey === K).map((x) => [x.sessionId, x.date, x.topic]).sort()).toEqual([[S1, '2026-11-02', 'Letters'], [id('2026-11-06'), '2026-11-06', 'Other phone']])
    expect(S().notice?.text).toBe('The sheet already has CW on Fri 6 Nov · kept on Mon 2 Nov')
    S().undo(); expect(await save(S)).toBe(true); expect(setOn(S1)).toEqual([1])
  }, 15000)
  it('OL-S-08 marks on the op path: a back-date mark reaches the sheet, a move carries it, an untick clears it', async () => {
    const S = await start(); S().setMarkMode('back'); S().tick(S1, 3); expect(await save(S)).toBe(true)
    const marks = () => { const p = b.post({ action: 'opsPull', token: TOKEN }); return olView(olFold(p.base, p.ops, p.rules)).marks.map((m) => [m.viewSid, m.roll, m.back]) }
    expect(marks()).toEqual([[S1, 3, true]])
    S().moveSession(S1, '2026-11-04'); expect(await save(S)).toBe(true); expect(marks()).toEqual([[id('2026-11-04'), 3, true]]); expect(S().marks[`${S1}|3`]?.back).toBe(true)
    S().tick(S1, 3); expect(await save(S)).toBe(true); expect(marks()).toEqual([]); expect(S().marks[`${S1}|3`]).toBeUndefined()
  }, 15000)
  it('OL-S-09 Restore of a snapshot from before a move keeps the moved date (no old column)', async () => {
    const S = await start(); S().snapshotNow('Before'); const snap = S().snaps[0]!.at
    S().moveSession(S1, '2026-11-05'); S().tick(S1, 1); S().tick(S1, 3); expect(await save(S)).toBe(true)
    S().restore(snap); expect(await save(S)).toBe(true)
    expect(S().data.sessions.filter((x) => x.subjectKey === K).map((x) => x.date)).toEqual(['2026-11-05'])
    expect(sheet().sessions.map((x: any) => x.sessionId)).toEqual([id('2026-11-05')]); expect(setOn(id('2026-11-05'))).toEqual([1])
  }, 15000)
  it('OL-S-10 what waited on the push path when the sheet was migrated is not lost (ticks, a move, a mark)', async () => {
    const S = await start(false); net = 'off'; S().tick(S1, 2); S().moveSession(S1, '2026-11-04'); await gone(S)
    b.c.olMigrate_(b.ss); net = 'on'; await S().refresh(); expect(S().syncPath).toBe('oplog'); expect(await save(S)).toBe(true)
    expect(sheet().sessions.map((x: any) => x.sessionId)).toEqual([id('2026-11-04')]); expect(setOn(id('2026-11-04'))).toEqual([1, 2])
    expect(JSON.parse(localStorage.getItem((await import('../src/config')).storageKey('outbox')) || '[]')).toEqual([])
  }, 15000)
  it('OL-S-11 a sheet migrated while this phone is on the push path: the next save switches to the op path', async () => {
    const S = await start(false); b.c.olMigrate_(b.ss); S().tick(S1, 4)
    expect(await until(() => S().syncPath === 'oplog' && S().save === 'saved' && S().waiting === 0, 10000)).toBe(true); expect(setOn(S1)).toEqual([1, 4])
  }, 15000)
})
