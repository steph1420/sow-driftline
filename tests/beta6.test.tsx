// v0.9.0-beta.6 (Steve t165u): rail hide toggle + grab handle, header to the left edge, sheet drag-to-close,
// no E1 crest/edge glow, and a textured sheet surface. Fake names only.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { AzRail, AZ, railLetters } from '../src/screens/AzRail'
import { Sheet } from '../src/ui/Sheet'
import { Settings } from '../src/screens/settings/Settings'
import { useApp } from '../src/store/store'
import { dragCloses } from '../src/data/gestures'
import { CONFIG, storageKey } from '../src/config'
import { shell } from './cssEval'

const NAMES = ['Asha Vale', 'Bina Rook', 'Kiran Moss', 'Kavi Lune']
afterEach(() => { cleanup(); vi.restoreAllMocks(); useApp.setState({ railHide: false }) })

/** jsdom ignores a passed timeStamp, so pin it (as RD-20 does). */
function pinTime() { let now = 0; vi.spyOn(Event.prototype, 'timeStamp', 'get').mockImplementation(() => now); return (t: number) => { now = t } }
const spans = () => [...document.querySelectorAll('.sow-rail span')].map((s) => s.textContent)

describe('v0.9.0-beta.6', () => {
  it('BETA6-01 Hide unavailable letters: off shows all 26, on shows only letters with names; saved with the prefs', () => {
    expect(railLetters(NAMES, false)).toEqual(AZ); expect(railLetters(NAMES, true)).toEqual(['A', 'B', 'K']); expect(railLetters([], true)).toEqual(AZ)
    render(<AzRail names={NAMES} onJump={() => {}} />); expect(spans()).toHaveLength(26)
    useApp.getState().setRailHide(true); cleanup(); render(<AzRail names={NAMES} onJump={() => {}} />); expect(spans()).toEqual(['A', 'B', 'K'])
    expect(JSON.parse(localStorage.getItem(storageKey('prefs'))!).railHide).toBe(true)
  })
  it('BETA6-02 the toggle lives in Settings › Appearance and is off by default', () => {
    useApp.setState({ railHide: false }); render(<Settings />)
    const seg = screen.getByRole('group', { name: 'Hide unavailable letters' })
    expect(within(seg).getByRole('button', { name: 'Off' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(within(seg).getByRole('button', { name: 'On' })); expect(useApp.getState().railHide).toBe(true)
  })
  it('BETA6-03 grab handle: rests beside the rail, follows the finger while scrubbing, names the letter, jumps and ticks per letter', () => {
    const vib = vi.fn(); Object.defineProperty(navigator, 'vibrate', { value: vib, configurable: true }); useApp.setState({ haptics: 'normal' })
    const jump = vi.fn(); render(<AzRail names={NAMES} onJump={jump} current="A" bubble={false} />)
    const rail = screen.getByRole('navigation', { name: 'Jump by letter' })
    vi.spyOn(rail, 'getBoundingClientRect').mockReturnValue({ top: 0, height: 260, left: 0, width: 12, right: 12, bottom: 260, x: 0, y: 0, toJSON: () => ({}) })
    fireEvent.pointerDown(rail, { clientY: 105, pointerId: 1 }) // 105/260 of 26 → K
    const thumb = screen.getByTestId('az-thumb'); expect(thumb.className).toContain('is-active'); expect(thumb.textContent).toBe('K'); expect(thumb.style.getPropertyValue('--y')).toBe('105px')
    expect(jump).toHaveBeenLastCalledWith(2); expect(vib).toHaveBeenCalledTimes(1)
    fireEvent.pointerMove(rail, { clientY: 5, pointerId: 1, buttons: 1 }); expect(screen.getByTestId('az-thumb').textContent).toBe('A'); expect(vib).toHaveBeenCalledTimes(2)
    fireEvent.pointerMove(rail, { clientY: 8, pointerId: 1, buttons: 1 }); expect(vib).toHaveBeenCalledTimes(2) // same letter: no extra tick
    fireEvent.pointerUp(rail, { clientY: 8, pointerId: 1 }); expect(screen.queryByTestId('az-thumb')?.className ?? '').not.toContain('is-active')
    expect(shell).toMatch(/\.sow-rail::before \{[^}]*inset: 0 calc\(\(var\(--dl-hit-min\) - var\(--sow-rail-w\)\) \/ -2\)/) // 44 px touch strip
  })
  it('BETA6-04 the header tint and divider reach the left screen edge without moving anything', () => {
    const rule = shell.match(/body:has\(\.sow-grid thead\) \.sow-bar::after \{([^}]*)\}/)![1]!
    for (const d of ['position: absolute', 'left: 0', 'top: 100%', 'width: var(--sow-gutter)', 'height: var(--sow-head-h)', 'background: var(--dl-header-bg)', 'inset 0 -1px 0 var(--dl-color-hairline)', 'pointer-events: none']) expect(rule).toContain(d)
    expect(shell).toMatch(/\.sow-main--list \{ padding-top: 0; padding-right: 0; padding-left: var\(--sow-gutter\);/) // columns unchanged
  })
  it('BETA6-05 sheet handle: follows a drag, springs back when let go short, closes past the distance, on a flick, or on a tap', () => {
    expect(dragCloses(CONFIG.timing.sheetCloseDragPx, 0)).toBe(true); expect(dragCloses(40, 0.1)).toBe(false); expect(dragCloses(30, 2)).toBe(true); expect(dragCloses(4, 5)).toBe(false)
    const at = pinTime(); const close = vi.fn(); render(<Sheet label="Test" onClose={close}><p>body</p></Sheet>)
    const h = screen.getByRole('button', { name: 'Close (swipe down)' }); const dlg = () => screen.getByRole('dialog', { name: 'Test' })
    const ev = (type: 'pointerDown' | 'pointerMove' | 'pointerUp', y: number, t: number) => { at(t); fireEvent[type](h, { clientY: y, pointerId: 1, button: 0 }) }
    ev('pointerDown', 500, 0); ev('pointerMove', 540, 400)
    expect(dlg().className).toContain('is-dragging'); expect(dlg().style.getPropertyValue('--sow-drag')).toBe('40px')
    ev('pointerMove', 470, 600); expect(dlg().style.getPropertyValue('--sow-drag')).toBe('0px') // never above its place
    ev('pointerMove', 540, 900); ev('pointerUp', 540, 1300); fireEvent.click(h)
    expect(close).not.toHaveBeenCalled(); expect(dlg().className).not.toContain('is-dragging') // sprang back; the click was the drag's
    ev('pointerDown', 500, 2000); ev('pointerMove', 560, 2400); ev('pointerMove', 620, 2800); ev('pointerUp', 620, 3200); expect(close).toHaveBeenCalledTimes(1) // 120 px
    ev('pointerDown', 500, 4000); ev('pointerMove', 515, 4010); ev('pointerMove', 530, 4020); ev('pointerUp', 530, 4030); expect(close).toHaveBeenCalledTimes(2) // flick
    ev('pointerDown', 500, 4500); ev('pointerMove', 515, 4510); ev('pointerMove', 560, 4520); ev('pointerUp', 560, 4900); expect(close).toHaveBeenCalledTimes(2) // fast drag, then rested: springs back
    ev('pointerDown', 500, 5000); ev('pointerUp', 500, 5080); fireEvent.click(h); expect(close).toHaveBeenCalledTimes(3) // tap
    expect(shell).toMatch(/\.sow-sheet\.is-dragging \{ transform: translateY\(var\(--sow-drag\)\); transition: none; \}/)
    expect(shell).toMatch(/\.sow-sheet \{ transition: transform var\(--dl-dur-quick\) var\(--dl-ease-settle\); \}/)
  })
  it('BETA7-01 sheets: static accent gradient, no grain; Quick overview E1 fill and top bars are the beta.5 look', () => {
    const rule = shell.match(/\.sow-sheet \{ background-color: var\(--dl-color-bg\);([^}]*)\}/)![1]!
    expect(rule).toContain('radial-gradient('); expect(rule).not.toMatch(/animation|url\(/); expect(shell).not.toMatch(/--sow-grain|feTurbulence/)
    const tide = shell.match(/\.sow-qc__tide \{([^}]*)\}/)![1]!
    expect(tide).toContain('border-radius: 40% 60% 0 0 / var(--dl-space-2) var(--dl-space-2) 0 0')
    expect(tide).toContain('box-shadow: inset 0 1px 0 color-mix(in srgb, var(--sow-qc-tone) 70%, transparent)')
    expect(tide).toContain('color-mix(in srgb, var(--sow-qc-tone) 34%, transparent), color-mix(in srgb, var(--sow-qc-tone) 14%, transparent)')
    expect(shell).toMatch(/\.sow-qc__sw--top \{ position: absolute; top: 0; left: var\(--sow-qc-radius\); right: var\(--sow-qc-radius\);/) // inset in beta.8 (BETA8-01, t201u B)
  })
})
