// beta.12 fixes (t240u): All dates rows use the date hold menu (no row share icon), the date hold menu's rows are one
// compact size, and the Reschedule pill strip never shrinks or shows a scrollbar. Demo data only.
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { openLayers, resetLayers } from '../src/ui/useBackLayer'

const css = readFileSync('src/shell/shell.css', 'utf8')
const rule = (sel: string) => { const i = css.indexOf(`\n${sel} {`); expect(i, sel).toBeGreaterThan(-1); return css.slice(i, css.indexOf('}', i)) }
const phone = (w = 412) => Object.defineProperty(window, 'innerWidth', { value: w, configurable: true })
const ov = async () => { cleanup(); localStorage.clear(); phone(); const { App } = await import('../src/App'); const { useApp } = await import('../src/store/store')
  history.replaceState(null, '', '/?demo=school&today=2026-11-04'); useApp.getState().reset(); render(<App />); fireEvent.click(screen.getByRole('tab', { name: 'Overview' })); return useApp }
const allDates = async () => { const useApp = await ov(); fireEvent.click(screen.getByRole('button', { name: 'All dates, KG-A English HW' })); return useApp }
const row = () => screen.getByRole('button', { name: /^Mon 2 Nov,/ })
afterEach(() => { cleanup(); localStorage.clear(); history.replaceState(null, '', '/'); phone(1024); resetLayers() })

describe('beta.12 fix 1: All dates rows hold for the date menu', () => {
  it('B12-AD-01 no row has a share icon; the page header Share stays', async () => {
    await allDates(); expect(document.querySelectorAll('.sow-ad__row').length).toBeGreaterThan(1)
    expect(document.querySelectorAll('.sow-ad__share, .sow-ad__item [aria-label^="Share "]').length).toBe(0)
    expect(screen.getByRole('button', { name: 'Share' })).toBeTruthy(); expect(css).not.toMatch(/\.sow-ad__share/)
  })
  it('B12-AD-02 hold opens the same date menu as an Overview pill: heading, Share · Open · Reschedule, near the row', async () => {
    await allDates(); fireEvent.contextMenu(row())
    const m = screen.getByRole('menu'); expect(m.className).toContain('sow-cardmenu--date')
    expect(within(m).getAllByRole('menuitem').map((b) => b.textContent)).toEqual(['Share', 'Open', 'Reschedule'])
    expect(m.querySelector('.sow-cardmenu__head')?.textContent).toMatch(/^Mon 2 Nov/); expect(row().className).toContain('held')
    expect(m.style.top !== '' || m.style.bottom !== '').toBe(true)
  })
  it('B12-AD-03 Open opens that date on Checklist; Reschedule opens the Reschedule sheet on it', async () => {
    const useApp = await allDates(); fireEvent.contextMenu(row()); fireEvent.click(screen.getByRole('menuitem', { name: 'Open' }))
    expect(useApp.getState().focus).toBe('KG-A_ENG_HW|2026-11-02')
    await allDates(); fireEvent.contextMenu(row()); fireEvent.click(screen.getByRole('menuitem', { name: 'Reschedule' }))
    expect(screen.getByRole('dialog', { name: 'Reschedule' })).toBeTruthy(); expect(screen.queryByRole('menu')).toBeNull()
  })
  it('B12-AD-04 a tap still opens the date (no menu); the menu holds one Back layer and Back closes only it', async () => {
    const useApp = await allDates(); const base = openLayers(); fireEvent.contextMenu(row()); expect(openLayers()).toBe(base + 1)
    fireEvent.keyDown(document, { key: 'Escape' }); expect(screen.queryByRole('menu')).toBeNull(); expect(openLayers()).toBe(base)
    fireEvent.pointerDown(row()); fireEvent.pointerUp(row()); fireEvent.click(row()); expect(screen.queryByRole('menu')).toBeNull(); expect(useApp.getState().focus).toBe('KG-A_ENG_HW|2026-11-02')
  })
})

describe('beta.12 fix 2: date hold menu proportions', () => {
  it('B12-HM-01 every menu row is one compact height and every icon one small size (Open check included)', () => {
    expect(css).toMatch(/--sow-menu-row: calc\(var\(--dl-hit-min\) \+ var\(--dl-space-1\)\);/) // 44 + 4 = 48
    expect(css).toMatch(/--sow-menu-icon: var\(--dl-space-5\);/) // 20
    expect(rule('.sow-cardmenu .dl-row')).toMatch(/min-height: var\(--sow-menu-row\); flex: none;/)
    const svg = rule('.sow-cardmenu .dl-row svg'); for (const k of ['width: var(--sow-menu-icon)', 'height: var(--sow-menu-icon)', 'flex: none']) expect(svg).toContain(k)
  })
  it('B12-HM-02 the Overview pill menu renders three rows, each with one icon', async () => {
    await ov(); fireEvent.contextMenu(within(screen.getByRole('button', { name: 'Open KG-A English HW on Checklist' }).closest('.sow-oc') as HTMLElement).getByRole('button', { name: 'Open Fri 6 Nov' }))
    const items = within(screen.getByRole('menu')).getAllByRole('menuitem'); expect(items).toHaveLength(3); for (const b of items) expect(b.querySelectorAll('svg')).toHaveLength(1)
  })
})

describe('beta.12 fix 3: Reschedule pills never squish', () => {
  it('B12-DS-01 the strip does not shrink, keeps pill height + ring room, scrolls sideways with no scrollbar', () => {
    const s = rule('.sow-ds__strip'); for (const k of ['flex-shrink: 0', 'min-height: calc(var(--sow-ds-pill-h) + var(--dl-space-1) + var(--dl-space-3))', 'overflow-x: auto', 'overflow-y: hidden', 'scrollbar-width: none']) expect(s).toContain(k)
    expect(css).toMatch(/\.sow-ds__strip::-webkit-scrollbar \{ display: none; \}/)
    const c = rule('.sow-ds__chip'); expect(c).toContain('min-height: var(--sow-ds-pill-h)'); expect(c).toContain('flex-shrink: 0')
    expect(css).toMatch(/--sow-ds-pill-h: calc\(var\(--dl-space-2\) \* 2 \+ var\(--dl-space-1\) \+ var\(--dl-type-caption-line\) \+ var\(--dl-type-callout-line\)\);/)
  })
  it('B12-DS-02 the Reschedule sheet still shows the date pills and ＋ New in the strip', async () => {
    await allDates(); fireEvent.contextMenu(row()); fireEvent.click(screen.getByRole('menuitem', { name: 'Reschedule' }))
    const strip = document.querySelector('.sow-ds__strip') as HTMLElement; expect(within(strip).getByRole('listbox', { name: 'Existing dates' })).toBeTruthy()
    expect(within(strip).getByRole('button', { name: 'New date' })).toBeTruthy()
  })
})
