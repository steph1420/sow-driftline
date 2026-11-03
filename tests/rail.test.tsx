// D1.5 A–Z rail (Steve t146u/t151u 1A): pinned in its own gutter, never scrolls with the list. Old /sow/ logic.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { AZ, letterAtY, firstRowFor } from '../src/screens/AzRail'
afterEach(cleanup)
const names = ['Aarav Rohan Fenwick', 'Mohammed Elias Thornbury', 'Zoya Imran']
describe('A–Z rail', () => {
  it('D15-AZ-01 all 26 letters, only present ones active', async () => {
    const { AzRail } = await import('../src/screens/AzRail')
    render(<AzRail names={names} onJump={() => {}} />)
    const nav = screen.getByRole('navigation', { name: /jump by letter/i })
    expect(nav.querySelectorAll('[data-l]').length).toBe(26)
    expect(nav.querySelector('[data-l="M"]')!.getAttribute('aria-disabled')).toBe('false')
    expect(nav.querySelector('[data-l="B"]')!.getAttribute('aria-disabled')).toBe('true')
  })
  it('D15-AZ-02 rail is fixed (own gutter), not inside the scrolling grid', async () => {
    const { Checklist } = await import('../src/screens/Checklist')
    const { DEMO_STATE } = await import('../src/data/fakeSource')
    render(<Checklist state={DEMO_STATE} classKey="demo" today="2099-01-01" layout="phone" />)
    const nav = screen.getByRole('navigation', { name: /jump by letter/i })
    expect(nav.closest('.sow-grid')).toBeNull()
    expect(nav.classList.contains('sow-rail')).toBe(true)
  })
  it('D15-AZ-03 rail also shows on desktop', async () => {
    const { Checklist } = await import('../src/screens/Checklist')
    const { DEMO_STATE } = await import('../src/data/fakeSource')
    render(<Checklist state={DEMO_STATE} classKey="demo" today="2099-01-01" layout="desktop" />)
    expect(screen.getByRole('navigation', { name: /jump by letter/i })).toBeTruthy()
  })
  it('D15-AZ-04 letterAtY maps finger Y to a slot; empty letter latches next present', () => {
    expect(letterAtY(0, 0, 260)).toBe('A')
    expect(letterAtY(259, 0, 260)).toBe('Z')
    expect(letterAtY(125, 0, 260)).toBe('M')
    expect(firstRowFor('B', names)).toBe(1) // B empty → next present M
    expect(firstRowFor('Z', names)).toBe(2)
    expect(AZ.length).toBe(26)
  })
  it('D15-AZ-05 drag-scrub jumps and shows a bubble', async () => {
    const { AzRail } = await import('../src/screens/AzRail')
    const onJump = vi.fn()
    render(<AzRail names={names} onJump={onJump} />)
    const nav = screen.getByRole('navigation', { name: /jump by letter/i })
    nav.getBoundingClientRect = () => ({ top: 0, height: 260, left: 0, right: 30, bottom: 260, width: 30, x: 0, y: 0, toJSON() {} })
    fireEvent.pointerDown(nav, { clientY: 125, pointerId: 1 })
    fireEvent.pointerMove(nav, { clientY: 255, pointerId: 1 })
    expect(onJump).toHaveBeenCalledWith(1)
    expect(onJump).toHaveBeenLastCalledWith(2)
    expect(screen.getByTestId('az-bubble').textContent).toBe('Z')
  })
})
