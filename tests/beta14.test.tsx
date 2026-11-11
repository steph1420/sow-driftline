// beta.14 break-it on the test copy (t243u): fixes found linking Driftline to the copy's bridge. Fake bridge here; no network.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import { parseSetup } from '../src/data/setup'
import { call, copyWriter, sheetDate, COPY_SHEET_ID } from '../src/data/sheetSource'
import { createEngine, memLock } from '../src/sync/engine'
import { applyOps, type Op } from '../src/sync/ops'
import { storageKey, CONFIG } from '../src/config'
import type { SheetState } from '../src/data/contract'

const URL = 'https://script.google.com/macros/s/fake-copy/exec'
const T0 = '2026-11-02T08:00:00.000Z'
const start = (): SheetState => ({ ok: true, schema: 1,
  subjects: [{ subjectKey: 'X_Eng_CW', classKey: 'X', subject: 'English', kind: 'CW', active: true }],
  roster: [1, 2, 3, 4].map((roll) => ({ classKey: 'X', roll, name: `Pupil ${roll}`, status: 'Active' as const, updatedAt: '' })),
  sessions: [{ sessionId: 'X_Eng_CW|2026-11-02', subjectKey: 'X_Eng_CW', classKey: 'X', date: '2026-11-02', topic: '', status: 'Open', updatedAt: T0 }],
  ticks: [{ tickId: 'X_Eng_CW|2026-11-02|1', sessionId: 'X_Eng_CW|2026-11-02', subjectKey: 'X_Eng_CW', classKey: 'X', roll: 1, set: true, updatedAt: T0 }] })
/** A fake bridge with applyPush_'s session rule: the session is subjectKey|date of the tick it gets. */
function fakeBridge() {
  let st = start(); const pushes: { date: string; roll: number }[][] = []
  const fetch = vi.fn(async (_u: string, init: { body: string }) => {
    const b = JSON.parse(init.body); let out: unknown
    if (b.action === 'ping') out = { ok: true, schema: 1, sheetId: COPY_SHEET_ID }
    else if (b.action === 'pull') out = st
    else if (b.action === 'push') { pushes.push(b.ticks)
      for (const t of b.ticks) { const sid = `${t.subjectKey}|${t.date}`; if (!st.sessions.some((x) => x.sessionId === sid)) st = { ...st, sessions: [...st.sessions, { sessionId: sid, subjectKey: t.subjectKey, classKey: 'X', date: t.date, topic: '', status: 'Open', updatedAt: t.updatedAt }] }
        st = applyOps(st, [{ sessionId: sid, subjectKey: t.subjectKey, classKey: 'X', date: t.date, roll: t.roll, set: t.set, updatedAt: t.updatedAt }]) }
      out = { ok: true, state: st } }
    else out = { ok: false, error: 'unknown action' }
    return new Response(JSON.stringify(out), { status: 200 })
  })
  return { fetch, pushes, get: () => st }
}
const until = async (f: () => boolean, ms = 3000) => { const t = Date.now(); while (!f()) { if (Date.now() - t > ms) return false; await new Promise((r) => setTimeout(r, 10)) } return true }
const setup = JSON.stringify({ kind: 'sow-driftline-setup', bridgeUrl: URL, token: 'tok' })

describe('beta.14 setup file', () => {
  it('B14-SF-01 a file holding null, a number or a list is "not a setup file" (null crashed with a raw TypeError)', () => {
    for (const t of ['null', '5', '[]', '"x"', 'true']) expect(() => parseSetup(t)).toThrow('That file is not a setup file')
  })
  it('B14-SF-02 a setup file saved with a byte-order mark still opens', () => {
    expect(parseSetup('\uFEFF' + JSON.stringify({ kind: 'sow-driftline-setup', bridgeUrl: URL, token: 'k' }))).toEqual({ bridgeUrl: URL, token: 'k' })
  })
})

describe('beta.14 bridge replies', () => {
  it('B14-BR-01 an HTML error page (Apps Script busy) gives a plain message, not a JSON parse error', async () => {
    const f = async () => new Response('<!DOCTYPE html><html>Service invoked too many times</html>', { status: 200 })
    await expect(call(URL, { action: 'pull', token: 't' }, f as never)).rejects.toThrow('The sheet sent an unexpected reply')
  })
  it('B14-BR-02 every bridge request carries a timeout, so a request that never answers cannot hold the save lock', async () => {
    let signal: AbortSignal | undefined
    await call(URL, { action: 'ping', token: 't' }, (async (_u: string, i: { signal?: AbortSignal }) => { signal = i.signal; return new Response('{"ok":true}') }) as never)
    expect(signal).toBeInstanceOf(AbortSignal); expect(CONFIG.timing.bridgeTimeoutMs).toBe(60000)
    const spy = vi.spyOn(AbortSignal, 'timeout'); await call(URL, { action: 'ping', token: 't' }, (async () => new Response('{"ok":true}')) as never)
    expect(spy).toHaveBeenCalledWith(60000); spy.mockRestore()
    const never = (_u: string, i: { signal?: AbortSignal }) => new Promise<Response>((_r, no) => i.signal?.addEventListener('abort', () => no(new DOMException('timed out', 'TimeoutError'))))
    const short = vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => { const c = new AbortController(); setTimeout(() => c.abort(), 5); return c.signal })
    try { await expect(call(URL, { action: 'ping', token: 't' }, never as never)).rejects.toThrow('You’re offline') } finally { short.mockRestore() }
  })
})

describe('beta.14 a date moved on this device', () => {
  it('B14-MV-01 the sheet date of a tick is the one in its session id', () => {
    const o = { subjectKey: 'X_Eng_CW', sessionId: 'X_Eng_CW|2026-11-02', date: '2026-11-05' }
    expect(sheetDate(o)).toBe('2026-11-02'); expect(sheetDate({ ...o, sessionId: 'X_Eng_CW|2026-11-02+' })).toBe('2026-11-02')
    expect(sheetDate({ ...o, sessionId: 's1' })).toBe('2026-11-05') // not a sheet id: the date as is
  })
  it('B14-MV-02 (beta.16) copyWriter files a tick under its op date; ids follow the sheet, the move itself goes as a rename (tests/beta16.test.ts)', async () => {
    const br = fakeBridge(); const w = copyWriter(URL, () => 'tok', br.fetch as never)
    const op: Op = { sessionId: 'X_Eng_CW|2026-11-02', subjectKey: 'X_Eng_CW', classKey: 'X', date: '2026-11-02', roll: 2, set: true, updatedAt: '2026-11-10T10:00:00.000Z' }
    await w([op]); expect(br.pushes[0]![0]!.date).toBe('2026-11-02')
    expect(sheetDate({ ...op, date: '' })).toBe('2026-11-02')
  })
  // B14-MV-03 (move then tick through the store, nothing split) is now B16-W-01 and B16-S-01 on the real bridge code.
})

describe('beta.14 a replaced engine stops', () => {
  it('B14-EN-01 stop(): no save, no retry and no status after it, even for a push already on its way', async () => {
    let resolve!: (s: SheetState) => void; const statuses: string[] = []; let merged = 0
    const e = createEngine({ storage: localStorage, key: storageKey('outbox-t14'), lock: memLock(), graceMs: 0, retryMs: 5,
      push: () => new Promise<SheetState>((r) => { resolve = r }), onState: () => { merged++ }, onStatus: (s) => statuses.push(s) })
    e.local({ sessionId: 's', subjectKey: 'X_Eng_CW', classKey: 'X', date: '2026-11-02', roll: 1, set: true, updatedAt: T0 })
    const f = e.flush(); await new Promise((r) => setTimeout(r, 5)); const n = statuses.length; const m = merged
    e.stop(); resolve(start()); await f; await new Promise((r) => setTimeout(r, 30))
    expect(statuses.length).toBe(n); expect(merged).toBe(m); expect(e.waiting()).toBe(0) // the push landed, so its op left the outbox
  })
  it('B14-EN-02 Back to demo with a tick still waiting: demo shows no save error and nothing more goes to the sheet', async () => {
    const br = fakeBridge(); let down = true
    vi.stubGlobal('fetch', vi.fn(async (u: string, i: { body: string }) => { if (down && JSON.parse(i.body).action === 'push') throw new TypeError('Failed to fetch'); return br.fetch(u, i) }))
    try {
      history.replaceState(null, '', '/'); localStorage.clear()
      const { useApp } = await import('../src/store/store'); const S = () => useApp.getState(); S().reset(); await S().importSetup(setup)
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
      try { S().tick('X_Eng_CW|2026-11-02', 3); S().undo(); S().tick('X_Eng_CW|2026-11-02', 4)
        await vi.advanceTimersByTimeAsync(CONFIG.timing.pendingGraceMs + 10); expect(S().save).toBe('offline')
        S().unpair(); down = false; await vi.advanceTimersByTimeAsync(CONFIG.timing.saveRetryMs * 3) } finally { vi.useRealTimers() }
      expect(S().source).toBe('demo'); expect(S().save).toBe('demo'); expect(br.pushes.length).toBe(0)
      expect(S().data.subjects.some((x) => x.subjectKey === 'X_Eng_CW')).toBe(false) // demo data, never the copy's
    } finally { vi.unstubAllGlobals() }
  })
})

describe('beta.14 a class with no dates', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals() })
  it('B14-ND-01 switching to a class with no dates, then adding its first date, keeps the app on screen (hook order)', async () => {
    const data = { ...start(), subjects: [...start().subjects, { subjectKey: 'Y_Eng_CW', classKey: 'Y', subject: 'English', kind: 'CW', active: true }], roster: [...start().roster, { classKey: 'Y', roll: 1, name: 'Pupil Y', status: 'Active' as const, updatedAt: '' }] }
    vi.stubGlobal('fetch', vi.fn(async (_u: string, i: { body: string }) => { const b = JSON.parse(i.body); return new Response(JSON.stringify(b.action === 'ping' ? { ok: true, sheetId: COPY_SHEET_ID } : b.action === 'pull' ? data : { ok: true, state: data })) }))
    localStorage.clear(); history.replaceState(null, '', '/?today=2026-11-04'); const { App } = await import('../src/App'); const { useApp } = await import('../src/store/store')
    const errs: string[] = []; const ce = vi.spyOn(console, 'error').mockImplementation((m) => { errs.push(String(m)) })
    try {
      useApp.getState().reset(); render(<App />); await act(async () => { await useApp.getState().importSetup(setup) })
      fireEvent.click(screen.getByRole('tab', { name: 'Checklist' })); expect(document.querySelectorAll('button.t').length).toBeGreaterThan(0)
      act(() => useApp.getState().setClass('Y')); expect(screen.getByText('No dates yet')).toBeTruthy()
      act(() => { useApp.getState().addSession('Y_Eng_CW', '2026-11-04') }); expect(document.querySelectorAll('button.t').length).toBe(1)
      act(() => useApp.getState().setClass('X')); expect(screen.getByRole('tab', { name: 'Overview' })).toBeTruthy()
      expect(errs.filter((e) => /hooks/i.test(e))).toEqual([])
    } finally { ce.mockRestore() }
  })
})

describe('beta.14 snapshots stay inside a storage budget', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('B14-SN-01 a term of data: 14 opens then 60 taps; every tap is queued, snapshots keep under the budget', async () => {
    const roster = Array.from({ length: 45 }, (_, r) => ({ classKey: 'X', roll: r + 1, name: 'Pupil Name ' + r, status: 'Active' as const, updatedAt: '' }))
    const sessions = Array.from({ length: 50 }, (_, d) => { const date = `2026-${String(6 + Math.floor(d / 28)).padStart(2, '0')}-${String(1 + (d % 28)).padStart(2, '0')}`; return { sessionId: `X_Eng_CW|${date}`, subjectKey: 'X_Eng_CW', classKey: 'X', date, topic: 'Topic', status: 'Open', updatedAt: T0 } })
    let n = 0
    const data = () => ({ ...start(), roster, sessions, ticks: sessions.flatMap((s) => roster.map((p) => ({ tickId: `${s.sessionId}|${p.roll}`, sessionId: s.sessionId, subjectKey: 'X_Eng_CW', classKey: 'X', roll: p.roll, set: (p.roll + n) % 3 === 0, updatedAt: T0 }))) })
    vi.stubGlobal('fetch', vi.fn(async (_u: string, i: { body: string }) => { const b = JSON.parse(i.body); return new Response(JSON.stringify(b.action === 'ping' ? { ok: true, sheetId: COPY_SHEET_ID } : b.action === 'pull' ? data() : { ok: false, error: 'busy' })) }))
    localStorage.clear(); history.replaceState(null, '', '/'); const { useApp } = await import('../src/store/store'); const S = () => useApp.getState(); S().reset()
    expect(JSON.stringify(data()).length).toBeGreaterThan(380_000) // ~2,250 tick rows
    await S().importSetup(setup)
    for (let i = 0; i < 14; i++) { n = i; await S().refresh(); expect(S().status).toBe('ok') }
    const snapChars = (localStorage.getItem(storageKey('snapshots-copy')) ?? '').length
    expect(snapChars).toBeLessThanOrEqual(CONFIG.data.snapshotBudgetChars); expect(S().snaps.length).toBeGreaterThan(0)
    const last = sessions.at(-1)!.sessionId
    for (let i = 0; i < 60; i++) expect(() => S().tick(last, 1 + (i % 45))).not.toThrow()
    expect(JSON.parse(localStorage.getItem(storageKey('outbox')) ?? '[]').length).toBe(45)
  }, 30000)
  it('B14-SN-02 a full storage never makes a snapshot throw', async () => {
    const { takeSnapshot } = await import('../src/sync/snapshots')
    const full = { getItem: () => null, setItem: () => { throw new DOMException('full', 'QuotaExceededError') }, removeItem: () => {} } as unknown as Storage
    expect(takeSnapshot(full, 'k', start(), 'x', T0, 12)).toBe(false)
    expect(takeSnapshot(localStorage, 'k2', start(), 'x', T0, 12, 10)).toBe(false); expect(localStorage.getItem('k2')).toBeNull() // bigger than the budget: not kept
  })
})

describe('beta.14 stored values of the wrong shape', () => {
  afterEach(() => cleanup())
  it('B14-LS-01 the app still opens and ticks when saved lists hold null, text or an object', async () => {
    const { App } = await import('../src/App'); const { useApp } = await import('../src/store/store')
    for (const junk of ['null', '"x"', '{"a":1}']) for (const k of ['favs', 'hints', 'snapshots-demo', 'demoTicksSchool', 'outbox']) {
      cleanup(); localStorage.clear(); localStorage.setItem(storageKey(k), junk); history.replaceState(null, '', '/?demo=school&today=2026-11-04')
      expect(() => { useApp.getState().reset(); render(<App />); fireEvent.click(screen.getByRole('tab', { name: 'Checklist' })); fireEvent.click(document.querySelector('button.t')!) }, `${k} = ${junk}`).not.toThrow()
    }
  })
})
