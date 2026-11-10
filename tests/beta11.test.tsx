// beta.11 fixes (t227u, t228u/t231u–t233u, t229u). Demo data only.
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import type { SheetState } from '../src/data/contract'
import { flashClass, flashMs } from '../src/screens/flash'
import { openLayers, pushLayer, resetLayers } from '../src/ui/useBackLayer'

const K = vi.hoisted(() => ({ v: 1 }))
vi.mock('../src/ui/useMotionOn', async (orig) => ({ ...(await orig<typeof import('../src/ui/useMotionOn')>()), useAnimScale: () => K.v }))

const css = readFileSync('src/shell/shell.css', 'utf8')
const st = (): SheetState => ({
  ok: true, schema: 1,
  subjects: [{ subjectKey: 'A_ENG_CW', classKey: 'A', subject: 'English', kind: 'CW', active: true }],
  roster: ['Asha Demo', 'Bela Sample', 'Chen Test', 'Dara Example'].map((name, i) => ({ classKey: 'A', roll: i + 1, name, status: 'Active' as const, updatedAt: '' })),
  sessions: [{ sessionId: 's1', subjectKey: 'A_ENG_CW', classKey: 'A', date: '2026-11-03', topic: '', status: 'Open', updatedAt: '' }],
  ticks: [],
})
const td = (n: string) => Array.from(document.querySelectorAll('.sow-grid td.n')).find((x) => x.textContent === n) as HTMLElement
const pop = () => act(() => { window.dispatchEvent(new PopStateEvent('popstate', { state: history.state })) })
afterEach(() => { cleanup(); vi.useRealTimers(); K.v = 1; resetLayers() })
beforeEach(() => localStorage.clear())

describe('beta.11 fix 2: the row flash clears itself (t228u, t233u)', () => {
  it('B11-FL-01 the flash lasts the fade at the Animation scale; Off is 0 (no flash, instant clear)', () => {
    expect(flashMs(1)).toBe(1200); expect(flashMs(2)).toBe(2400); expect(flashMs(0.25)).toBe(300); expect(flashMs(0)).toBe(0)
    expect(flashClass(null, 0, 1)).toBe(''); expect(flashClass({ row: 2, n: 1 }, 1, 1)).toBe('')
    expect(flashClass({ row: 2, n: 1 }, 2, 1)).toBe('sel flash'); expect(flashClass({ row: 2, n: 2 }, 2, 1)).toBe('sel flash2')
    expect(flashClass({ row: 2, n: 1 }, 2, 0)).toBe('sel')
  })
  it('B11-FL-02 the CSS: no lasting tint on the picked row; the fade runs on the motion token and ends on no tint', () => {
    expect(css).not.toMatch(/tr\.sel td\s*\{/)
    expect(css).toMatch(/tr\.flash td \{ animation: sow-flash var\(--dl-motion-slow[^;]*both;/)
    expect(css).toMatch(/tr\.flash2 td \{ animation: sow-flash2 var\(--dl-motion-slow[^;]*both;/)
    for (const k of ['sow-flash', 'sow-flash2', 'sow-flash-n', 'sow-flash-n2']) expect(css).toMatch(new RegExp(`@keyframes ${k} \\{[^\\n]*to \\{ background: transparent;`))
  })
  it('B11-FL-03 a name tap flashes that row once, then it clears by itself; a scroll does not bring it back', async () => {
    vi.useFakeTimers(); const { Checklist } = await import('../src/screens/Checklist')
    render(<Checklist state={st()} classKey="A" today="2026-11-03" layout="phone" onTick={() => {}} />)
    const row = () => td('Bela Sample').closest('tr')!
    fireEvent.click(td('Bela Sample')); expect(row().className).toBe('sel flash')
    act(() => { vi.advanceTimersByTime(1199) }); expect(row().className).toContain('flash')
    act(() => { vi.advanceTimersByTime(2) }); expect(row().className).toBe('')
    act(() => { window.dispatchEvent(new Event('scroll')); vi.advanceTimersByTime(100) }); expect(document.querySelector('.sow-grid tr.sel, .sow-grid tr.flash, .sow-grid tr.flash2')).toBeNull()
  })
  it('B11-FL-04 one row at a time; lighting the same row again restarts its fade', async () => {
    vi.useFakeTimers(); const { Checklist } = await import('../src/screens/Checklist')
    render(<Checklist state={st()} classKey="A" today="2026-11-03" layout="phone" onTick={() => {}} />)
    const tr = (n: string) => td(n).closest('tr')!
    fireEvent.click(td('Asha Demo')); fireEvent.click(td('Chen Test'))
    expect(tr('Asha Demo').className).toBe(''); expect(tr('Chen Test').className).toBe('sel flash2')
    act(() => { vi.advanceTimersByTime(800) }); fireEvent.click(td('Chen Test')); expect(tr('Chen Test').className).toBe('sel flash')
    act(() => { vi.advanceTimersByTime(800) }); expect(tr('Chen Test').className).toBe('sel flash') // the timer restarted too
    act(() => { vi.advanceTimersByTime(500) }); expect(document.querySelectorAll('.sow-grid tbody tr[class]').length).toBe(0)
  })
  it('B11-FL-05 an A–Z rail jump flashes the first row for the letter, once, and clears', async () => {
    vi.useFakeTimers(); const { Checklist } = await import('../src/screens/Checklist')
    render(<Checklist state={st()} classKey="A" today="2026-11-03" layout="phone" onTick={() => {}} />)
    const rail = screen.getByRole('navigation', { name: 'Jump by letter' })
    rail.getBoundingClientRect = () => ({ top: 0, height: 260, bottom: 260, left: 0, right: 10, width: 10, x: 0, y: 0, toJSON: () => ({}) })
    fireEvent.pointerDown(rail, { clientY: 25 }); fireEvent.pointerUp(rail) // C
    expect(td('Chen Test').closest('tr')!.className).toBe('sel flash')
    act(() => { vi.advanceTimersByTime(1300) }); act(() => { window.dispatchEvent(new Event('scroll')) })
    expect(td('Chen Test').closest('tr')!.className).toBe('')
  })
  it('B11-FL-06 Animation scale Off: no flash class, and the state clears at once', async () => {
    K.v = 0; vi.useFakeTimers(); const { Checklist } = await import('../src/screens/Checklist')
    render(<Checklist state={st()} classKey="A" today="2026-11-03" layout="phone" onTick={() => {}} />)
    fireEvent.click(td('Dara Example')); expect(td('Dara Example').closest('tr')!.className).toBe('sel')
    act(() => { vi.advanceTimersByTime(0) }); expect(td('Dara Example').closest('tr')!.className).toBe('')
  })
  it('B11-FL-07 scale 2×: stays lit for the slower fade (2.4 s), then clears', async () => {
    K.v = 2; vi.useFakeTimers(); const { Checklist } = await import('../src/screens/Checklist')
    render(<Checklist state={st()} classKey="A" today="2026-11-03" layout="phone" onTick={() => {}} />)
    fireEvent.click(td('Asha Demo')); act(() => { vi.advanceTimersByTime(2300) })
    expect(td('Asha Demo').closest('tr')!.className).toContain('flash')
    act(() => { vi.advanceTimersByTime(200) }); expect(td('Asha Demo').closest('tr')!.className).toBe('')
  })
})

describe('beta.11 fix 1: the Reschedule warning has a fixed slot (t227u)', () => {
  afterEach(() => { history.replaceState(null, '', '/') })
  it('B11-DS-01 the slot is always there; the warning only fades in and out in it (same nodes, no height change)', async () => {
    K.v = 0
    const { App } = await import('../src/App'); const { useApp } = await import('../src/store/store')
    history.replaceState(null, '', '/?demo=school&today=2026-11-04'); useApp.getState().reset(); render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: 'Overview' })); fireEvent.click(screen.getByRole('button', { name: /open KG-A English HW on checklist/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Dates, HW Wed 4 Nov' }))
    const slot = document.querySelector('.sow-ds__slot')!; const warn = slot.querySelector('.sow-ds__clash')!
    expect(slot).toBeTruthy(); expect(warn.className).not.toContain('is-on'); expect(warn.getAttribute('aria-hidden')).toBe('true')
    expect(slot.querySelector('.sow-ds__ghost')!.textContent).toMatch(/already has .*Pick another day\./)
    fireEvent.click(screen.getByRole('button', { name: 'Day Tue' })); fireEvent.click(screen.getByRole('button', { name: 'Day Mon' }))
    expect(document.querySelector('.sow-ds__slot')).toBe(slot); expect(slot.querySelector('.sow-ds__clash')).toBe(warn)
    expect(warn.className).toContain('is-on'); expect(warn.textContent).toBe('HW already has Mon 2 Nov. Pick another day.'); expect(warn.getAttribute('aria-hidden')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /^Day (Tue|Wed)$/ }))
    expect(warn.className).not.toContain('is-on'); expect(warn.textContent).toContain('already has Mon 2 Nov') // the text stays while it fades out
  })
  it('B11-DS-02 the CSS: one grid cell, opacity-only fade on the motion token, a hidden sample sizes it', () => {
    expect(css).toMatch(/\.sow-ds__slot \{ display: grid;/); expect(css).toMatch(/\.sow-ds__slot > \* \{ grid-area: 1 \/ 1; margin: 0; \}/)
    expect(css).toMatch(/\.sow-ds__ghost \{ visibility: hidden;/)
    expect(css).toMatch(/\.sow-ds__slot > \.sow-ds__clash, \.sow-ds__slot > \.sow-ds__note \{ opacity: 0; transition: opacity var\(--dl-dur-quick\)/)
  })
})

describe('beta.11 fix 3: the phone Back goes back one step in the app (t229u)', () => {
  afterEach(() => { history.replaceState(null, '', '/') })
  it('B11-BK-01 each layer adds one entry; Back closes the top one only', () => {
    const a = vi.fn(), b = vi.fn(); const n0 = history.length
    pushLayer(a); pushLayer(b); expect(history.length).toBe(n0 + 2); expect(openLayers()).toBe(2)
    pop(); expect(b).toHaveBeenCalledTimes(1); expect(a).not.toHaveBeenCalled(); expect(openLayers()).toBe(1)
    pop(); expect(a).toHaveBeenCalledTimes(1); expect(openLayers()).toBe(0)
  })
  it('B11-BK-02 a layer closed from the UI gives its entry back (history.back) and the popstate that follows is skipped', () => {
    const back = vi.spyOn(history, 'back').mockImplementation(() => {})
    const a = vi.fn(), b = vi.fn(); pushLayer(a); const rel = pushLayer(b)
    rel(); expect(back).toHaveBeenCalledTimes(1); rel(); expect(back).toHaveBeenCalledTimes(1) // only once
    pop(); expect(a).not.toHaveBeenCalled() // that was our own back
    pop(); expect(a).toHaveBeenCalledTimes(1)
    back.mockRestore()
  })
  it('B11-BK-03 a layer closed by Back does not call history.back again', () => {
    const back = vi.spyOn(history, 'back').mockImplementation(() => {})
    const rel = pushLayer(() => rel()); pop(); expect(back).not.toHaveBeenCalled(); expect(openLayers()).toBe(0); back.mockRestore()
  })
  it('B11-BK-04 Settings: Back from Motion details goes to Animations, then to Settings, then the app has nothing open', async () => {
    K.v = 0; K.v = 0; const back = vi.spyOn(history, 'back').mockImplementation(() => {})
    const { App } = await import('../src/App'); const { useApp } = await import('../src/store/store')
    history.replaceState(null, '', '/?demo=school&today=2026-11-04'); useApp.getState().reset(); render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: 'Settings' })); fireEvent.click(screen.getByRole('button', { name: /^Animations/ }))
    expect(screen.getByRole('heading', { name: 'Animations' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Motion details/ })); expect(screen.getByRole('heading', { name: 'Motion details' })).toBeTruthy()
    pop(); pop() // the remount of the Push gave one entry back; skip it like the browser would
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Animations' })).toBeTruthy())
    expect(openLayers()).toBe(1)
    pop(); await waitFor(() => expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy()); expect(openLayers()).toBe(0)
    back.mockRestore()
  })
  it('B11-BK-05 a sheet: Back closes it (Reschedule), and the ✕ gives its entry back', async () => {
    K.v = 0; K.v = 0; const back = vi.spyOn(history, 'back').mockImplementation(() => {})
    const { App } = await import('../src/App'); const { useApp } = await import('../src/store/store')
    history.replaceState(null, '', '/?demo=school&today=2026-11-04'); useApp.getState().reset(); render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: 'Overview' })); fireEvent.click(screen.getByRole('button', { name: /open KG-A English HW on checklist/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Dates, HW Wed 4 Nov' })); expect(screen.getByRole('dialog', { name: 'Reschedule' })).toBeTruthy()
    const n = openLayers(); pop(); await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Reschedule' })).toBeNull()); expect(openLayers()).toBe(n - 1)
    const calls = back.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Dates, HW Wed 4 Nov' })); fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Reschedule' })).toBeNull()); expect(back.mock.calls.length).toBe(calls + 1); expect(openLayers()).toBe(n - 1)
    back.mockRestore()
  })
  it('B11-BK-06 with the real history: open, close from the UI, open again: Back still closes the top layer and entries do not pile up', async () => {
    const n0 = history.length; const a = vi.fn(); const rel = pushLayer(a); rel(); const b = vi.fn(); pushLayer(b); expect(history.length).toBe(n0 + 1) // b waits for the back
    await new Promise((r) => setTimeout(r, 50)) // let the browser's own back land (it is skipped)
    expect(b).not.toHaveBeenCalled(); expect(history.length).toBeLessThanOrEqual(n0 + 2)
    pop(); expect(b).toHaveBeenCalledTimes(1); expect(a).not.toHaveBeenCalled(); expect(openLayers()).toBe(0)
  })
})
