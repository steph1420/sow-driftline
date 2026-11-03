// D2 writes — failing first. B-B4-1, Q-TOK-1, Q-DUP-1 (Steve t151u/t152u).
import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import type { SheetState, TickRow } from '../src/data/contract'
import { applyOps, mergePending, type Op } from '../src/sync/ops'
import { createEngine, memLock, memChannelHub } from '../src/sync/engine'
import { Outbox } from '../src/sync/outbox'
import { takeSnapshot, listSnapshots, restoreOps } from '../src/sync/snapshots'
import { History } from '../src/sync/history'
import { parseSetup } from '../src/data/setup'
import { copyWriter, COPY_SHEET_ID, LIVE_SHEET_ID } from '../src/data/sheetSource'
afterEach(cleanup)
beforeEach(() => localStorage.clear())

const base = (): SheetState => ({
  ok: true, schema: 1,
  subjects: [{ subjectKey: 'A_ENG_CW', classKey: 'A', subject: 'English', kind: 'CW', active: true }],
  roster: [1, 2, 3].map((roll) => ({ classKey: 'A', roll, name: roll === 3 ? 'Lia Park' : 'Lia Park', status: 'Active' as const, updatedAt: '' })),
  sessions: [{ sessionId: 's1', subjectKey: 'A_ENG_CW', classKey: 'A', date: '2026-11-03', topic: '', status: 'Open', updatedAt: '' }],
  ticks: [],
})
const op = (roll: number, set: boolean, at: string): Op => ({ sessionId: 's1', subjectKey: 'A_ENG_CW', classKey: 'A', date: '2026-11-03', roll, set, updatedAt: at })
const isSet = (s: SheetState, roll: number) => s.ticks.some((t) => t.sessionId === 's1' && t.roll === roll && t.set)

/** Fake bridge with the real per-tick newer-wins rule of applyPush_. */
function fakeBridge(start: SheetState) {
  let st = structuredClone(start); const calls: Op[][] = []
  return { calls, get: () => st, push: async (ops: Op[]) => { calls.push(ops); await new Promise((r) => setTimeout(r, 5)); st = applyOps(st, ops); return structuredClone(st) } }
}

describe('D2 per-cell merge', () => {
  it('D2-OPS-01 newer op wins per cell, older is ignored', () => {
    let s = applyOps(base(), [op(1, true, '2026-11-03T10:00:00.000Z')])
    s = applyOps(s, [op(1, false, '2026-11-03T09:00:00.000Z')])
    expect(isSet(s, 1)).toBe(true)
  })
  it('D2-OPS-02 a pull never drops pending local ticks', () => {
    const remote = base(); const pending = [op(2, true, '2026-11-03T10:00:00.000Z')]
    expect(isSet(mergePending(remote, pending), 2)).toBe(true)
  })
})

describe('B-B4-1 two tabs never overwrite each other', () => {
  it('D2-TAB-01 tab A ticks roll 1, tab B (stale) ticks roll 2: both survive on the sheet and in both tabs', async () => {
    const bridge = fakeBridge(base()); const lock = memLock(); const hub = memChannelHub()
    const states: Record<string, SheetState> = { A: base(), B: base() }
    const mk = (id: string) => createEngine({ storage: localStorage, key: 'sow-driftline:outbox:test', push: bridge.push, lock, channel: hub.join(), graceMs: 0,
      onState: (f) => { states[id] = f(states[id]!) } })
    const A = mk('A'), B = mk('B')
    A.local(op(1, true, '2026-11-03T10:00:00.000Z'))
    B.local(op(2, true, '2026-11-03T10:00:01.000Z'))
    await Promise.all([A.flush(), B.flush()])
    expect(isSet(bridge.get(), 1) && isSet(bridge.get(), 2)).toBe(true)
    expect(isSet(states.A!, 2) && isSet(states.B!, 1)).toBe(true)
    // single writer: pushes never overlap and never send a whole-sheet overwrite
    expect(bridge.calls.every((c) => c.length <= 2)).toBe(true)
  })
  it('D2-Q-01 offline: ops wait in the outbox and go out later', async () => {
    let online = false; const bridge = fakeBridge(base())
    const e = createEngine({ storage: localStorage, key: 'k', push: async (o) => { if (!online) throw new Error('You’re offline'); return bridge.push(o) }, lock: memLock(), graceMs: 0, onState: () => {} })
    e.local(op(1, true, '2026-11-03T10:00:00.000Z'))
    await e.flush(); expect(e.status()).toBe('offline'); expect(new Outbox(localStorage, 'k').list().length).toBe(1)
    online = true; await e.flush()
    expect(e.status()).toBe('saved'); expect(new Outbox(localStorage, 'k').list().length).toBe(0); expect(isSet(bridge.get(), 1)).toBe(true)
  })
})

describe('D2 snapshots + undo', () => {
  it('D2-SNAP-01 automatic snapshots dedupe and restore as newer ops', () => {
    const s0 = base(); takeSnapshot(localStorage, 'snap', s0, 'Before', '2026-11-03T09:00:00.000Z', 5)
    takeSnapshot(localStorage, 'snap', s0, 'Same', '2026-11-03T09:01:00.000Z', 5)
    expect(listSnapshots(localStorage, 'snap').length).toBe(1)
    const s1 = applyOps(s0, [op(1, true, '2026-11-03T10:00:00.000Z')])
    const ops = restoreOps(s1, listSnapshots(localStorage, 'snap')[0]!.state, '2026-11-03T11:00:00.000Z')
    expect(ops).toEqual([op(1, false, '2026-11-03T11:00:00.000Z')])
  })
  // v0.5 changed D2-UNDO-01: undo/redo return a list (a swipe is one step)
  it('D2-UNDO-01 undo/redo survives an app restart', () => {
    const h = new History(localStorage, 'undo'); h.record(op(1, true, '2026-11-03T10:00:00.000Z'), false)
    const h2 = new History(localStorage, 'undo')
    expect(h2.undo('2026-11-03T10:05:00.000Z')).toEqual([op(1, false, '2026-11-03T10:05:00.000Z')])
    expect(new History(localStorage, 'undo').redo('2026-11-03T10:06:00.000Z')).toEqual([op(1, true, '2026-11-03T10:06:00.000Z')])
  })
})

describe('Q-TOK-1 connect: pairing code or setup file, COPY only', () => {
  it('D2-TOK-01 setup file is parsed and validated', () => {
    expect(parseSetup(JSON.stringify({ kind: 'sow-driftline-setup', bridgeUrl: 'https://script.google.com/macros/s/x/exec', token: 'abc' }))).toEqual({ bridgeUrl: 'https://script.google.com/macros/s/x/exec', token: 'abc' })
    expect(() => parseSetup('{"kind":"x"}')).toThrow()
    expect(() => parseSetup(JSON.stringify({ kind: 'sow-driftline-setup', bridgeUrl: 'https://evil.example/exec', token: 'a' }))).toThrow()
  })
  // v0.5 changed D2-TOK-02: Beta rule
  it('D2-TOK-02 writes are refused unless the bridge is the test copy', async () => {
    const mk = (sheetId: string) => copyWriter('https://x/exec', () => 'tok', (async (_u: string, i: { body: string }) => {
      const b = JSON.parse(i.body); return { ok: true, json: async () => (b.action === 'ping' ? { ok: true, schema: 1, sheetId } : { ok: true, state: base() }) } as Response }) as never, 'beta')
    await expect(mk(LIVE_SHEET_ID)([op(1, true, '2026-11-03T10:00:00.000Z')])).rejects.toThrow(/not the test copy/i)
    await expect(mk(COPY_SHEET_ID)([op(1, true, '2026-11-03T10:00:00.000Z')])).resolves.toBeTruthy()
  })
})

describe('Q-DUP-1 duplicate names, roll is the key', () => {
  it('D2-DUP-01 tapping one "Lia Park" ticks only that roll and rolls show when names collide', async () => {
    const { Checklist } = await import('../src/screens/Checklist')
    const ticks: [string, number][] = []
    render(<Checklist state={base()} classKey="A" today="2026-11-03" layout="phone" onTick={(s, r) => ticks.push([s, r])} />)
    const btns = document.querySelectorAll('button.t'); fireEvent.click(btns[1]!)
    expect(ticks).toEqual([['s1', 2]])
    expect(screen.getAllByText(/^#\d+$/).length).toBe(3)
  })
})
void ({} as TickRow)

describe('D2 store (demo, on device)', () => {
  it('D2-STO-01 tick, undo after restart, redo; snapshot list exists', async () => {
    const { useApp } = await import('../src/store/store')
    useApp.getState().reset(); await useApp.getState().refresh()
    const s = useApp.getState(); const se = s.data.sessions[0]!; const was = s.data.ticks.some((t) => t.sessionId === se.sessionId && t.roll === 1 && t.set)
    s.tick(se.sessionId, 1)
    const now = () => useApp.getState().data.ticks.some((t) => t.sessionId === se.sessionId && t.roll === 1 && t.set)
    expect(now()).toBe(!was)
    useApp.getState().reset() // "restart": ticks + undo come back from the device
    expect(now()).toBe(!was); expect(useApp.getState().canUndo).toBe(true)
    useApp.getState().undo(); expect(now()).toBe(was)
    useApp.getState().redo(); expect(now()).toBe(!was)
    expect(useApp.getState().snaps.length).toBeGreaterThan(0)
  })
})

describe('D4P quick sync (t155u)', () => {
  it('D4P-SYNC-01 pull merges per box newest-wins and never clobbers pending local ticks', async () => {
    const { mergeNewest } = await import('../src/sync/ops')
    const local = applyOps(base(), [op(1, true, '2026-11-03T10:00:05.000Z'), op(2, true, '2026-11-03T10:00:00.000Z')])
    const remote = applyOps(base(), [op(1, false, '2026-11-03T10:00:01.000Z'), op(2, false, '2026-11-03T10:00:09.000Z'), op(3, true, '2026-11-03T10:00:02.000Z')])
    const m = mergeNewest(local, remote, [op(3, false, '2026-11-03T10:00:10.000Z')])
    expect([isSet(m, 1), isSet(m, 2), isSet(m, 3)]).toEqual([true, false, false])
  })
  it('D4P-SYNC-02 another device saves → this app picks it up by polling; paused when hidden', async () => {
    const { createPoller } = await import('../src/sync/poller')
    const bridge = fakeBridge(base()); let st = base(); let hidden = false
    const p = createPoller({ pull: async () => structuredClone(bridge.get()), everyMs: 10, hidden: () => hidden, onPulled: (r) => { st = mergeNewest2(st, r) } })
    p.start(); await bridge.push([op(2, true, '2026-11-03T10:00:00.000Z')])
    await new Promise((r) => setTimeout(r, 40)); expect(isSet(st, 2)).toBe(true)
    hidden = true; const n = p.count(); await new Promise((r) => setTimeout(r, 40)); expect(p.count()).toBe(n)
    hidden = false; await p.now(); expect(p.count()).toBe(n + 1); p.stop()
  })
})
import { mergeNewest as mergeNewest2 } from '../src/sync/ops'

/** Faithful bridge mock at the fetch level: ping (COPY id), pull, push with applyPush_ rules (per-tick newer wins, roster check). */
function bridgeFetch(start: SheetState) {
  let st = structuredClone(start)
  const f = async (_u: string, i: { body: string }) => {
    const b = JSON.parse(i.body); let out: unknown
    if (b.token !== 'tok') out = { ok: false, error: 'bad token' }
    else if (b.action === 'ping') out = { ok: true, schema: 1, sheetId: COPY_SHEET_ID }
    else if (b.action === 'pull') out = structuredClone(st)
    else if (b.action === 'push') {
      const ops: Op[] = b.ticks.filter((t: { roll: number }) => st.roster.some((p) => p.roll === t.roll)).map((t: Op) => { const se = st.sessions.find((x) => x.date === t.date && x.subjectKey === t.subjectKey)!; return { ...t, sessionId: se.sessionId, classKey: se.classKey } })
      st = applyOps(st, ops); out = { ok: true, applied: ops.length, ignored: 0, rejected: [], state: structuredClone(st) }
    } else out = { ok: false, error: 'unknown action' }
    return { ok: true, json: async () => out } as Response
  }
  return { f, get: () => st }
}
describe('D4P end to end against a faithful bridge mock', () => {
  it('D4P-E2E-01 device A ticks → saved to sheet → device B picks it up by quick sync', async () => {
    const { sheetBridgeSource } = await import('../src/data/sheetSource')
    const { createPoller } = await import('../src/sync/poller')
    const { mergeNewest } = await import('../src/sync/ops')
    const br = bridgeFetch(base()); const tok = () => 'tok'
    let a = base(); let b = base()
    const A = createEngine({ storage: localStorage, key: 'eA', push: copyWriter('https://x/exec', tok, br.f as never), lock: memLock(), graceMs: 0, onState: (fn) => { a = fn(a) } })
    A.local(op(2, true, '2026-11-03T10:00:00.000Z')); await A.flush()
    expect(A.status()).toBe('saved'); expect(isSet(br.get(), 2)).toBe(true)
    const P = createPoller({ pull: () => sheetBridgeSource('https://x/exec', tok, br.f as never).pull(), everyMs: 1000, hidden: () => false, onPulled: (r) => { b = mergeNewest(b, r) } })
    await P.now(); expect(isSet(b, 2)).toBe(true); expect(isSet(a, 2)).toBe(true)
  })
})
