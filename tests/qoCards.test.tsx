// v0.9.0-beta.3 (t150u, dev-only): Quick overview card styles D4 / E1 / E2 / E3 / E4. Demo data only.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, within, act } from '@testing-library/react'
import { QO_STYLES, cleanQoStyle, nextQoStyle, qoCard, RECENT } from '../src/data/qoCard'
import { toChecklist } from '../src/data/model'
import { CONFIG } from '../src/config'

const phone = (w = 360) => Object.defineProperty(window, 'innerWidth', { value: w, configurable: true })
const open = async () => {
  cleanup(); localStorage.clear(); phone(); const { App } = await import('../src/App'); const { useApp } = await import('../src/store/store')
  history.replaceState(null, '', '/?demo=school&today=2026-11-04'); useApp.getState().reset(); render(<App />)
  fireEvent.click(screen.getByRole('tab', { name: 'Overview' })); fireEvent.click(screen.getByRole('button', { name: /open KG-A English HW on checklist/i }))
  return useApp
}
const quick = async (style?: string) => { const useApp = await open(); act(() => useApp.getState().setView({ phoneCols: 2 }))
  if (style) act(() => useApp.getState().setDev({ qoCard: cleanQoStyle(style) }))
  fireEvent.click(screen.getByRole('button', { name: 'Quick overview (swipe up)' })); return { useApp, d: screen.getByRole('dialog', { name: 'Quick overview' }) } }

describe('QO card model', () => {
  it('QO-01 one card model: counts, every pupil in roll order, up to five recent dates ending at this one', async () => {
    const { useApp } = await import('../src/store/store'); useApp.getState().reset(); const s = useApp.getState()
    const c = toChecklist(s.data, s.currentClass, s.subject); const last = c.columns.at(-1)!
    const card = qoCard(c, s.data.ticks, last.sessionId, { from: 0, today: '2026-11-04', selId: last.sessionId })
    expect(card.roll.map((r) => r.roll)).toEqual(c.pupils.map((p) => p.roll)); expect(card.done).toBe(card.roll.filter((r) => r.done).length)
    expect(card.pct).toBe(Math.round((card.done / card.total) * 100)); expect(card.since).toBe(card.roll.filter((r) => r.fresh).length)
    expect(card.recent.length).toBe(Math.min(RECENT, c.columns.length)); expect(card.recent.at(-1)).toMatchObject({ sessionId: last.sessionId, current: true })
    const first = qoCard(c, s.data.ticks, c.columns[0]!.sessionId, { from: Date.now() + 1e9, today: '2026-11-04', selId: null })
    expect(first.recent).toHaveLength(1); expect(first.since).toBe(0); expect(first.roll.some((r) => r.fresh)).toBe(false)
  })
  it('QO-02 styles: D4 default, unknown values fall back, cycling wraps', () => {
    expect(QO_STYLES.map((x) => x.id)).toEqual(['d4', 'e1', 'e2', 'e3', 'e4']); expect(cleanQoStyle('zz')).toBe('d4')
    expect(nextQoStyle('d4')).toBe('e1'); expect(nextQoStyle('e4')).toBe('d4')
  })
})

describe('QO card styles', () => {
  afterEach(() => { vi.useRealTimers(); cleanup(); localStorage.clear(); history.replaceState(null, '', '/'); phone(1024) })
  it.each(QO_STYLES.map((x) => x.id))('QO-03 %s renders both cards with count, "+N since", the switcher and share', async (style) => {
    const { d } = await quick(style); const cards = d.querySelectorAll(`.sow-qc--${style}`); expect(cards).toHaveLength(2)
    expect(cards[0]!.className).toContain('old')
    for (const c of cards) { const w = within(c as HTMLElement)
      expect(w.getByRole('button', { name: /^\+\d+ since \d\d:\d\d, tap for this hour$/ })).toBeTruthy(); expect(w.getByRole('button', { name: /^Window: since open \(1 of 3\)/ })).toBeTruthy()
      expect(w.getByRole('button', { name: /^Share / })).toBeTruthy() }
    const cur = cards[1]!
    if (style === 'e1') expect((cur.querySelector('.sow-qc__tide') as HTMLElement)).not.toBeNull()
    if (style === 'e2') { expect(cur.querySelectorAll('.sow-qc__grid i')).toHaveLength(24); expect(cur.querySelectorAll('.sow-qc__grid i.on')).toHaveLength(14) }
    if (style === 'e3') expect(cur.querySelector('.sow-qc__ghost b')?.textContent).toBe('14')
    if (style === 'e4') { const bars = cur.querySelectorAll('.sow-qc__bars i'); expect(bars.length).toBeGreaterThan(0); expect(bars.length).toBeLessThanOrEqual(5); expect(bars[bars.length - 1]!.className).toBe('on') }
    if (style !== 'e3' && style !== 'e2') expect(cur.querySelector('.sow-qc__n')?.textContent).toBe('14/24')
    expect((cur as HTMLElement).style.getPropertyValue('--p')).toBe(String(Math.round(14 / 24 * 100)))
  })
  it('QO-04 the switcher control moves every card to the next window', async () => {
    const { d } = await quick('e3'); fireEvent.click(within(d).getAllByRole('button', { name: /^Window: since open/ })[0]!)
    expect(within(d).getAllByRole('button', { name: /^Window: this hour \(2 of 3\)/ })).toHaveLength(2); expect(within(d).getAllByRole('button', { name: /^\+\d+ this hour/ })).toHaveLength(2)
  })
  it('QO-05 Settings › Developer options › QO card style is saved on the device', async () => {
    const useApp = await open(); fireEvent.click(screen.getByRole('tab', { name: 'Settings' })); fireEvent.click(screen.getByRole('button', { name: /^Developer options/ }))
    const g = screen.getByRole('radiogroup', { name: 'QO card style' }); expect(within(g).getAllByRole('radio').map((r) => r.getAttribute('aria-label'))).toEqual(QO_STYLES.map((x) => x.label))
    expect(within(g).getByRole('radio', { name: 'D4 Edge pager' }).getAttribute('aria-checked')).toBe('true')
    fireEvent.click(within(g).getByRole('radio', { name: 'E2 Roll grid' })); expect(useApp.getState().dev.qoCard).toBe('e2')
    const saved = Object.entries(localStorage).find(([k]) => k.includes(':dev:')); expect(JSON.parse(saved![1]).qoCard).toBe('e2')
  })
  it('QO-06 holding the Quick overview title steps to the next style and names it', async () => {
    const { useApp, d } = await quick(); vi.useFakeTimers(); const title = within(d).getByRole('heading', { name: 'Quick overview' })
    fireEvent.pointerDown(title, { clientX: 50, clientY: 400, pointerId: 1, button: 0 }); act(() => { vi.advanceTimersByTime(CONFIG.timing.devHoldMs) }); fireEvent.pointerUp(title, { clientX: 50, clientY: 400, pointerId: 1 })
    expect(useApp.getState().dev.qoCard).toBe('e1'); expect(within(d).getByRole('status').textContent).toBe('E1 Tide'); expect(d.querySelectorAll('.sow-qc--e1')).toHaveLength(2)
    fireEvent.click(title); expect(useApp.getState().dev.qoCard).toBe('e1')
    act(() => { vi.advanceTimersByTime(CONFIG.timing.nameToastMs) }); expect(within(d).queryByRole('status')).toBeNull()
  })
})
