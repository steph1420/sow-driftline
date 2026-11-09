// D1.5 A–Z rail (Steve t146u/t151u 1A): pinned in its own gutter, never scrolls with the list. Old /sow/ logic.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { AZ, letterAtY, firstRowFor } from '../src/screens/AzRail'
afterEach(cleanup)
const names = ['Aarav Rohan Fenwick', 'Mohammed Elias Thornbury', 'Zoya Imran']
describe('A–Z rail', () => {
  // RDs2 (t134u–t138u) changed D15-AZ-01: all 26 letters keep their place; letters with no names are dimmed; the current letter is accent.
  // The grip and the side switch are gone (D4P-GRIP-01 removed): the rail is always on the left.
  it('D15-AZ-01 all 26 letters, absent ones dimmed, the current one lit; no grip', async () => {
    const { AzRail } = await import('../src/screens/AzRail')
    render(<AzRail names={names} onJump={() => {}} current="M" />)
    const nav = screen.getByRole('navigation', { name: /jump by letter/i })
    expect(nav.querySelectorAll('[data-l]').length).toBe(26)
    expect([...nav.querySelectorAll('[data-l]:not(.off)')].map((x) => x.getAttribute('data-l'))).toEqual(['A', 'M', 'Z'])
    expect(nav.querySelector('[data-l="B"]')!.getAttribute('aria-hidden')).toBe('true')
    expect(nav.querySelector('.on')!.getAttribute('data-l')).toBe('M')
    expect(screen.queryByRole('button', { name: /A to Z strip/i })).toBeNull()
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
    expect(letterAtY(130, 0, 260, ['A', 'M', 'Z'])).toBe('M')
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
    fireEvent.pointerDown(nav, { clientY: 125, pointerId: 1 }) // slot 12 of 26 = M
    fireEvent.pointerMove(nav, { clientY: 255, pointerId: 1 })
    expect(onJump).toHaveBeenCalledWith(1)
    expect(onJump).toHaveBeenLastCalledWith(2)
    expect(screen.getByTestId('az-bubble').textContent).toBe('Z')
  })
})

describe('D4P desktop header', () => {
  it('D4P-HDR-01 date header sticks below the bar (never tucks under it after a jump)', async () => {
    const css = (await import('node:fs')).readFileSync('src/shell/shell.css', 'utf8')
    expect(css).toMatch(/\.sow-grid thead th \{[^}]*position: sticky; top: var\(--sow-bar-height\)/)
    expect(css).toMatch(/\.sow-grid \{[^}]*overflow: clip/)
  })
})
