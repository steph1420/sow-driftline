// v0.5 (t163u) — written before the code.
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import type { SheetState } from '../src/data/contract'
afterEach(cleanup)
beforeEach(() => localStorage.clear())
const st = (): SheetState => ({
  ok: true, schema: 1,
  subjects: [{ subjectKey: 'A_ENG_CW', classKey: 'A', subject: 'English', kind: 'CW', active: true }],
  roster: ['Aarav Rohan Fenwick', 'Mohammed Elias Thornbury', 'Lia Park', 'Zoya Imran'].map((name, i) => ({ classKey: 'A', roll: i + 1, name, status: 'Active' as const, updatedAt: '' })),
  sessions: [{ sessionId: 's1', subjectKey: 'A_ENG_CW', classKey: 'A', date: '2026-11-03', topic: '', status: 'Open', updatedAt: '' }],
  ticks: [{ tickId: 'x', sessionId: 's1', subjectKey: 'A_ENG_CW', classKey: 'A', roll: 1, set: true, updatedAt: '2026-11-03T09:00:00.000Z' }],
})

describe('V05 quick search (ported /sow/ quickSearch)', () => {
  it('V05-QS-01 initials, partial, typo, roll', async () => {
    const { rankMatches } = await import('../src/data/quickSearch')
    const rows = st().roster.map((p) => ({ roll: p.roll, name: p.name }))
    expect(rankMatches('met', rows)[0]!.roll).toBe(2)
    expect(rankMatches('thorn', rows)[0]!.roll).toBe(2)
    expect(rankMatches('zoyz', rows)[0]!.roll).toBe(4)
    expect(rankMatches('3', rows)[0]!.roll).toBe(3)
  })
  it('V05-QS-02 desktop: typing a letter anywhere opens the pill with that text; Esc closes', async () => {
    const { Checklist } = await import('../src/screens/Checklist')
    render(<Checklist state={st()} classKey="A" today="2026-11-03" layout="desktop" onTick={() => {}} />)
    fireEvent.keyDown(document.body, { key: 'l' })
    const pill = screen.getByRole('searchbox', { name: /find a name/i }) as HTMLInputElement
    expect(pill.value).toBe('l')
    fireEvent.change(pill, { target: { value: 'lia p' } })
    expect(document.querySelector('tr.sel td.n')!.textContent).toContain('Lia Park')
    fireEvent.keyDown(pill, { key: 'Escape' })
    expect(screen.queryByRole('searchbox')).toBeNull()
  })
  it('V05-QS-03 phone: search button opens the same pill; "/" opens it too', async () => {
    const { Checklist } = await import('../src/screens/Checklist')
    render(<Checklist state={st()} classKey="A" today="2026-11-03" layout="phone" onTick={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /search names/i }))
    expect(screen.getByRole('searchbox')).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' })
    fireEvent.keyDown(document.body, { key: '/' })
    expect(screen.getByRole('searchbox')).toBeTruthy()
  })
})

describe('V05 centre snap', () => {
  it('V05-SNAP-01 target centred in the list viewport; near the top it is left where it lands', async () => {
    const { centreScrollTop } = await import('../src/screens/scroll')
    // row at page y=1200 (h 60); viewport between bar 56 and dock 820 → middle 438
    expect(centreScrollTop({ rowPageTop: 1200, rowH: 60, viewTop: 56, viewBottom: 820 })).toBe(1200 + 30 - 438)
    expect(centreScrollTop({ rowPageTop: 200, rowH: 60, viewTop: 56, viewBottom: 820 })).toBe(0)
  })
})

describe('V05 swipe to tick', () => {
  const rect = (top: number) => ({ top, bottom: top + 50, left: 0, right: 400, width: 400, height: 50, x: 0, y: top, toJSON() {} })
  it('V05-SW-01 drag down one column ticks every box crossed (value from the first box) as one call', async () => {
    const { Checklist } = await import('../src/screens/Checklist')
    const many = vi.fn(); const one = vi.fn()
    render(<Checklist state={st()} classKey="A" today="2026-11-03" layout="phone" onTick={one} onTickMany={many} />)
    document.querySelectorAll('tbody tr').forEach((tr, i) => { (tr as HTMLElement).getBoundingClientRect = () => rect(100 + i * 50) })
    const btns = document.querySelectorAll('button.t')
    fireEvent.pointerDown(btns[1]!, { clientX: 300, clientY: 175, pointerId: 1 }) // roll 2 (off) → paint ON
    fireEvent.pointerMove(btns[1]!, { clientX: 300, clientY: 285, pointerId: 1 }) // into roll 4
    fireEvent.pointerUp(btns[1]!, { clientX: 300, clientY: 285, pointerId: 1 })
    fireEvent.click(btns[1]!)
    expect(many).toHaveBeenCalledWith('s1', [2, 3, 4], true)
    expect(one).not.toHaveBeenCalled()
  })
  it('V05-SW-02 a small wobble is still a tap', async () => {
    const { Checklist } = await import('../src/screens/Checklist')
    const many = vi.fn(); const one = vi.fn()
    render(<Checklist state={st()} classKey="A" today="2026-11-03" layout="phone" onTick={one} onTickMany={many} />)
    document.querySelectorAll('tbody tr').forEach((tr, i) => { (tr as HTMLElement).getBoundingClientRect = () => rect(100 + i * 50) })
    const b = document.querySelectorAll('button.t')[0]!
    fireEvent.pointerDown(b, { clientX: 300, clientY: 125, pointerId: 1 }); fireEvent.pointerMove(b, { clientX: 302, clientY: 140, pointerId: 1 }); fireEvent.pointerUp(b, { clientX: 302, clientY: 140, pointerId: 1 }); fireEvent.click(b)
    expect(many).not.toHaveBeenCalled(); expect(one).toHaveBeenCalledWith('s1', 1)
  })
  it('V05-SW-03 store: a swipe is ONE undo step', async () => {
    const { useApp } = await import('../src/store/store')
    useApp.getState().reset(); await useApp.getState().refresh()
    const s = useApp.getState(); const sid = s.data.sessions[0]!.sessionId
    const on = (r: number) => useApp.getState().data.ticks.some((t) => t.sessionId === sid && t.roll === r && t.set)
    const before = [1, 2, 3].map(on)
    s.tickMany(sid, [1, 2, 3], true); expect([1, 2, 3].map(on)).toEqual([true, true, true])
    useApp.getState().undo(); expect([1, 2, 3].map(on)).toEqual(before)
  })
})

describe('V05 keyboard', () => {
  it('V05-KB-01 arrows move between boxes, Ctrl+Z / Ctrl+Y undo/redo', async () => {
    const { gridMove } = await import('../src/screens/keyboard')
    expect(gridMove('ArrowDown', 0, 0, 4, 2)).toEqual([1, 0]); expect(gridMove('ArrowRight', 0, 1, 4, 2)).toEqual([0, 1]); expect(gridMove('x', 0, 0, 4, 2)).toBeNull()
    const { App } = await import('../src/App'); const { useApp } = await import('../src/store/store')
    useApp.getState().reset(); render(<App />)
    const undo = vi.spyOn(useApp.getState(), 'undo'); const redo = vi.spyOn(useApp.getState(), 'redo')
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true }); fireEvent.keyDown(window, { key: 'y', ctrlKey: true })
    expect(undo).toHaveBeenCalled(); expect(redo).toHaveBeenCalled()
  })
})

describe('V05 channel + devices', () => {
  it('V05-CH-01 More has a Stable/Beta switch pointing at the two sites', async () => {
    const { channelUrl } = await import('../src/screens/More')
    expect(channelUrl('stable', 'https://steph1420.github.io')).toBe('https://steph1420.github.io/sow-driftline/')
    expect(channelUrl('beta', 'https://steph1420.github.io')).toBe('https://steph1420.github.io/sow-driftline-beta/')
  })
  it('V05-DEV-01 devices client degrades gracefully when the bridge lacks the actions', async () => {
    const { devicesClient } = await import('../src/data/devices')
    const f = (reply: object) => (async () => ({ ok: true, json: async () => reply })) as never
    await expect(devicesClient('https://x/exec', () => 't', f({ ok: false, error: 'unknown action' })).list()).resolves.toEqual({ supported: false, devices: [] })
    const r = await devicesClient('https://x/exec', () => 't', f({ ok: true, devices: [{ id: 'a', name: 'Phone', lastSeen: '2026-11-03T10:00:00Z', createdAt: '', revoked: false }] })).list()
    expect(r.supported).toBe(true); expect(r.devices[0]!.name).toBe('Phone')
  })
  it('V05-DEV-02 pairing sends the device name and keeps a per-device key if the bridge returns one', async () => {
    const { claimPair } = await import('../src/data/sheetSource')
    let sent: Record<string, unknown> = {}
    const f = (async (_u: string, i: { body: string }) => { sent = JSON.parse(i.body); return { ok: true, json: async () => ({ ok: true, deviceKey: 'k'.repeat(64), deviceId: 'd1' }) } }) as never
    expect(await claimPair('https://x/exec', '123456', f, 'My phone')).toBe('k'.repeat(64))
    expect(sent.deviceName).toBe('My phone')
  })
})
void act
