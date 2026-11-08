// v0.6 (t169u) — written before the code.
import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
afterEach(cleanup)
beforeEach(async () => { localStorage.clear(); const { useApp } = await import('../src/store/store'); useApp.getState().reset(); useApp.getState().setTab('checklist') /* t113u: app now opens on Overview first; these tests start on Checklist */ })

describe('V06 Weeks view toggle', () => {
  it('V06-WK-01 date columns: phone portrait 2; desktop calm 3 with Weeks off; Weeks on = wide (desktop or phone landscape only)', async () => {
    const { dateColsFor } = await import('../src/data/model')
    // v0.7.0 S6 changed V06-WK-01: phone portrait = 1 date (v0.7d single-date list)
    expect(dateColsFor({ layout: 'phone', landscape: false, weeks: true })).toBe(1)
    expect(dateColsFor({ layout: 'phone', landscape: true, weeks: false })).toBe(1)
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
    useApp.getState().reset(); useApp.getState().setTab('checklist') /* t113u: app now opens on Overview first; these tests start on Checklist */; expect(useApp.getState().view.weeks).toBe(true)
  })
})

describe('V06 Overview', () => {
  // v0.8 P4 changed V06-OV-01 (O2g): cards are per class + subject + type with done/total (or a dash) and the topic, no progress bar.
  it('V06-OV-01 one card per class subject with done/total and the topic, no progress bar', async () => {
    const { App } = await import('../src/App'); const { useApp } = await import('../src/store/store')
    render(<App />); fireEvent.click(screen.getByRole('tab', { name: 'Overview' }))
    const cards = screen.getAllByRole('button', { name: /open .* on checklist/i })
    expect(cards.length).toBe(useApp.getState().data.subjects.filter((x) => x.active).length)
    expect(cards[0]!.textContent).toMatch(/\d+\/\d+|—/)
    expect(cards[0]!.querySelector('.sow-prog')).toBeNull()
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
  // t113u changed V06-OV-04: the first open is Overview; after that the app reopens on the last tab used.
  it('V06-OV-04 opens on Overview the first time, then remembers the last tab', async () => {
    const { useApp } = await import('../src/store/store'); localStorage.clear(); useApp.getState().reset()
    const { App } = await import('../src/App'); render(<App />)
    expect(screen.getByRole('tab', { name: 'Overview' }).getAttribute('aria-selected')).toBe('true')
    fireEvent.click(screen.getByRole('tab', { name: 'More' })); cleanup(); useApp.getState().reset(); render(<App />)
    expect(screen.getByRole('tab', { name: 'More' }).getAttribute('aria-selected')).toBe('true')
  })
})

describe('V06 quick overview sheet', () => {
  // v0.8 changed V06-QO-01: Q2e cards carry a share button each (the Share footer went)
  it('V06-QO-01 Shift+O opens the quick overview sheet on Checklist; Esc closes; each card can share', async () => {
    const { App } = await import('../src/App'); render(<App />)
    fireEvent.keyDown(document.body, { key: 'O', shiftKey: true })
    const d = screen.getByRole('dialog', { name: /quick overview/i })
    expect(d.querySelectorAll('.sow-qc').length).toBeGreaterThan(0); expect(screen.getAllByRole('button', { name: /^Share / }).length).toBeGreaterThan(0)
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
