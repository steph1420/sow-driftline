// v0.6 (t169u) — written before the code.
import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
afterEach(cleanup)
beforeEach(async () => { localStorage.clear(); const { useApp } = await import('../src/store/store'); useApp.getState().reset() })

describe('V06 Weeks view toggle', () => {
  it('V06-WK-01 date columns: phone portrait 2; desktop calm 3 with Weeks off; Weeks on = wide (desktop or phone landscape only)', async () => {
    const { dateColsFor } = await import('../src/data/model')
    expect(dateColsFor({ layout: 'phone', landscape: false, weeks: true })).toBe(2)
    expect(dateColsFor({ layout: 'phone', landscape: true, weeks: false })).toBe(2)
    expect(dateColsFor({ layout: 'phone', landscape: true, weeks: true })).toBe(9)
    expect(dateColsFor({ layout: 'desktop', landscape: true, weeks: false })).toBe(3)
    expect(dateColsFor({ layout: 'desktop', landscape: true, weeks: true })).toBe(9)
  })
  it('V06-WK-02 Weeks is OFF by default, lives in the ⋮ view menu, remembered on this device', async () => {
    const { App } = await import('../src/App'); const { useApp } = await import('../src/store/store')
    expect(useApp.getState().view.weeks).toBe(false)
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'More options' }))
    const sw = screen.getByRole('switch', { name: /weeks/i }); expect(sw.getAttribute('aria-checked')).toBe('false')
    fireEvent.click(sw); expect(useApp.getState().view.weeks).toBe(true)
    useApp.getState().reset(); expect(useApp.getState().view.weeks).toBe(true)
  })
})

describe('V06 Overview', () => {
  it('V06-OV-01 one card per class with the dynamic date chip, soft "N to go" and progress', async () => {
    const { App } = await import('../src/App'); const { useApp } = await import('../src/store/store')
    render(<App />); fireEvent.click(screen.getByRole('tab', { name: 'Overview' }))
    const cards = screen.getAllByRole('button', { name: /open .* on checklist/i })
    expect(cards.length).toBe(useApp.getState().classes.length)
    expect(cards[0]!.textContent).toMatch(/Today|Upcoming|Last/); expect(cards[0]!.textContent).toMatch(/\d+ to go|All done/)
    expect(cards[0]!.querySelector('.sow-prog')).toBeTruthy()
  })
  it('V06-OV-02 tapping a class card opens that class on Checklist at that date', async () => {
    const { App } = await import('../src/App'); const { useApp } = await import('../src/store/store')
    render(<App />); fireEvent.click(screen.getByRole('tab', { name: 'Overview' }))
    const j = useApp.getState().jump
    fireEvent.click(screen.getAllByRole('button', { name: /open .* on checklist/i })[0]!)
    expect(useApp.getState().tab).toBe('checklist'); expect(useApp.getState().jump).toBe(j + 1)
  })
  it('V06-OV-03 share text matches the v0.47 Pending template', async () => {
    const { shareText } = await import('../src/data/share')
    expect(shareText({ label: 'KG-A', date: '2026-11-03', names: ['Lia Park', 'Ana'] })).toBe('KG-A • Tue 3/11 • not set/found (2):\nLia Park\nAna')
  })
  it('V06-OV-04 Checklist stays the first page', async () => {
    const { App } = await import('../src/App'); render(<App />)
    expect(screen.getAllByRole('tab')[0]!.getAttribute('aria-label')).toBe('Checklist'); expect(screen.getByRole('table')).toBeTruthy()
  })
})

describe('V06 quick overview sheet', () => {
  it('V06-QO-01 Shift+O opens the quick overview sheet on Checklist; Esc closes; it has the Share footer', async () => {
    const { App } = await import('../src/App'); render(<App />)
    fireEvent.keyDown(document.body, { key: 'O', shiftKey: true })
    const d = screen.getByRole('dialog', { name: /quick overview/i })
    expect(d.textContent).toMatch(/to go|All done/i); expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy()
    fireEvent.keyDown(document.body, { key: 'Escape' }); expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('V06-QO-02 swipe up on the grabber opens it', async () => {
    const { App } = await import('../src/App'); render(<App />)
    const g = screen.getByRole('button', { name: /quick overview/i })
    fireEvent.pointerDown(g, { clientY: 800, pointerId: 1 }); fireEvent.pointerMove(g, { clientY: 700, pointerId: 1 }); fireEvent.pointerUp(g, { clientY: 700, pointerId: 1 })
    expect(screen.getByRole('dialog', { name: /quick overview/i })).toBeTruthy()
  })
})
describe('V06 break-it fixes', () => {
  // Break-it run 1: swipe-up left the 24px grabber, so moves stopped arriving → sheet never opened in a real browser.
  it('V06-QO-03 the grabber and the sheet handle capture the pointer so a swipe keeps tracking off the element', async () => {
    const { App } = await import('../src/App'); render(<App />)
    const g = screen.getByRole('button', { name: /quick overview/i }); let captured = 0
    ;(g as HTMLElement & { setPointerCapture: (id: number) => void }).setPointerCapture = () => { captured++ }
    fireEvent.pointerDown(g, { clientY: 800, pointerId: 7 }); expect(captured).toBe(1)
  })
})
