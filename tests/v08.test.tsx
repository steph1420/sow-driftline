// v0.8.0 (FEATURES_v0.8): Phase 1 checklist chrome (F-SH-01, F-CL-02/03/06). Demo data only.
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within, act } from '@testing-library/react'
import { readFileSync } from 'node:fs'

// G5d is the phone layout (412 px wide)
const phone = (w = 412) => Object.defineProperty(window, 'innerWidth', { value: w, configurable: true })
const open = async () => {
  cleanup(); localStorage.clear(); phone(); const { App } = await import('../src/App'); const { useApp } = await import('../src/store/store')
  history.replaceState(null, '', '/?demo=school&today=2026-11-04'); useApp.getState().reset(); render(<App />)
  fireEvent.click(screen.getByRole('tab', { name: 'Overview' })); fireEvent.click(screen.getByRole('button', { name: /open KG-A English HW on checklist/i }))
  return useApp
}

describe('P1 checklist chrome (G5d)', () => {
  afterEach(() => { cleanup(); localStorage.clear(); history.replaceState(null, '', '/'); phone(1024) })
  it('V08-P1-01 the bar holds the class chip (subject · type and topic), the search magnifier and ⋮ only', async () => {
    await open(); const bar = screen.getByRole('banner')
    const chip = within(bar).getByRole('button', { name: /switch class/i })
    expect(chip.querySelector('.sow-pill__sub')?.textContent).toMatch(/^English · HW/)
    expect(within(bar).getByRole('button', { name: 'Search names' })).toBeTruthy()
    expect(within(bar).getByRole('button', { name: 'More options' })).toBeTruthy()
    expect(within(bar).queryByRole('button', { name: 'Undo' })).toBeNull()
  })
  it('V08-P1-02 the second row is Pending · 1|2 · bare undo/redo', async () => {
    await open(); const row = screen.getByRole('toolbar', { name: 'Checklist controls' })
    expect(within(row).getByRole('button', { name: 'Pending only' })).toBeTruthy()
    expect(within(row).getByRole('group', { name: 'Dates on phone' })).toBeTruthy()
    for (const n of ['Undo', 'Redo']) expect(within(row).getByRole('button', { name: n }).className).toContain('sow-bare')
  })
  it('V08-P1-03 each date column has a glass tab: done/total over a day + date chip; current is blue, past is amber', async () => {
    const useApp = await open()
    const cur = screen.getByRole('button', { name: 'HW Wed 4 Nov, 14 of 24 done' }); expect(cur.textContent).toBe('14/24')
    const chip = screen.getByRole('button', { name: 'Dates, HW Wed 4 Nov' }); expect(chip.textContent).toMatch(/^Wed 4/)
    expect(chip.closest('th')!.className).toContain('sel'); expect(chip.className).not.toContain('old')
    act(() => useApp.getState().pickSession('KG-A_ENG_HW|2026-11-02'))
    expect(screen.getByRole('button', { name: 'Dates, HW Mon 2 Nov' }).className).toContain('old')
  })
  it('V08-P1-04 the old subject heading, calendar button, split counter and search bar are gone', async () => {
    await open()
    expect(screen.queryByRole('heading', { name: 'English' })).toBeNull(); expect(screen.queryByRole('button', { name: 'Pick a date' })).toBeNull()
    expect(document.querySelector('.sow-split, .sow-clhead, .sow-search')).toBeNull()
  })
  it('V08-P1-05 the magnifier shows a thin search row with "n of 24" and ✕', async () => {
    await open(); fireEvent.click(screen.getByRole('button', { name: 'Search names' }))
    const box = screen.getByRole('searchbox', { name: /find a name/i }); fireEvent.change(box, { target: { value: 'zz' } })
    expect(document.querySelector('.sow-find__n')?.textContent).toMatch(/^\d+ of 24$/)
    fireEvent.click(screen.getByRole('button', { name: 'Close search' })); expect(screen.queryByRole('searchbox')).toBeNull()
  })
  it('V08-P1-06 tapping a count opens the still-to-come list for that date', async () => {
    const useApp = await open(); act(() => useApp.getState().setView({ phoneCols: 2 })); fireEvent.click(screen.getByRole('button', { name: /^HW Mon 2 Nov, \d+ of 24 done$/ }))
    expect(useApp.getState().focus).toBe('KG-A_ENG_HW|2026-11-02'); expect(useApp.getState().quick).toBe(true)
  })
  it('V08-P1-07 tick columns are 84 px on the phone and tab targets stay ≥ 44 px (token sums)', () => {
    const tok = Object.fromEntries([...readFileSync('src/vendor/driftline/tokens.css', 'utf8').matchAll(/(--dl-[\w-]+):\s*(\d+)px/g)].map((m) => [m[1], +m[2]!]))
    const css = readFileSync('src/shell/shell.css', 'utf8')
    const px = (v: string) => [...v.matchAll(/var\((--dl-[\w-]+)\)/g)].reduce((a, m) => a + tok[m[1]!]!, 0)
    const col = css.match(/--sow-tick-col:\s*calc\(([^;]+)\);/)!; expect(px(col[1]!)).toBe(84)
    for (const sel of ['.sow-tab__n', '.sow-tab__d']) expect(new RegExp(`\\${sel} \\{[^}]*min-height: var\\(--dl-hit-min\\)`).test(css)).toBe(true)
  })
})

describe('P2 date sheet from the column chip (dial3)', () => {
  afterEach(() => { cleanup(); localStorage.clear(); history.replaceState(null, '', '/'); phone(1024) })
  const chip = () => fireEvent.click(screen.getByRole('button', { name: 'Dates, HW Wed 4 Nov' }))
  it('V08-P2-01 the chip opens Reschedule with the strip, topic line and dials already showing; the action is dim', async () => {
    await open(); chip()
    expect(screen.getByRole('dialog', { name: 'Reschedule' })).toBeTruthy(); expect(screen.getByRole('listbox', { name: 'Existing dates' })).toBeTruthy()
    for (const n of ['Month', 'Date', 'Day']) expect(screen.getByRole('spinbutton', { name: n })).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Move date' }) as HTMLButtonElement).disabled).toBe(true)
  })
  it('V08-P2-02 tapping another date in the strip opens it and changes no data', async () => {
    const useApp = await open(); const before = JSON.stringify(useApp.getState().data); chip()
    fireEvent.click(screen.getByRole('option', { name: 'HW Mon 2 Nov' }))
    expect(screen.queryByRole('dialog')).toBeNull(); expect(useApp.getState().focus).toBe('KG-A_ENG_HW|2026-11-02'); expect(JSON.stringify(useApp.getState().data)).toBe(before)
  })
  it('V08-P2-03 once a dial has moved, the strip stops switching dates', async () => {
    const useApp = await open(); chip(); fireEvent.click(screen.getByRole('button', { name: 'Day Thu' }))
    fireEvent.click(screen.getByRole('option', { name: 'HW Mon 2 Nov' })); expect(screen.getByRole('dialog')).toBeTruthy(); expect(useApp.getState().focus).not.toBe('KG-A_ENG_HW|2026-11-02')
  })
  it('V08-P2-04 ＋ New date at the end of the strip opens New date; Cancel goes back to Reschedule', async () => {
    await open(); chip(); fireEvent.click(screen.getByRole('button', { name: 'New date' }))
    expect(screen.getByRole('dialog', { name: 'New date' })).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('dialog', { name: 'Reschedule' })).toBeTruthy()
  })
  it('V08-P2-05 the year sits centred above the headings', () => {
    const css = readFileSync('src/shell/shell.css', 'utf8')
    expect(/\.sow-wh__top \{[^}]*justify-content: center/.test(css)).toBe(true)
  })
})

describe('P3 quick overview (Q2e + Q3-since) and share stack', () => {
  afterEach(() => { cleanup(); localStorage.clear(); history.replaceState(null, '', '/'); phone(1024) })
  const quick = async (cols: 1 | 2 = 2) => { const useApp = await open(); act(() => useApp.getState().setView({ phoneCols: cols })); fireEvent.click(screen.getByRole('button', { name: /^HW Wed 4 Nov, \d+ of 24 done$/ })); return useApp }
  it('V08-P3-01 one card per visible column: date pill, done/total, "+N since HH:MM" and a share button', async () => {
    await quick(); const d = screen.getByRole('dialog', { name: 'Quick overview' })
    const cards = d.querySelectorAll('.sow-qc'); expect(cards.length).toBe(2)
    expect(within(d).getByText('Mon 2')).toBeTruthy(); expect(within(d).getByText('Wed 4')).toBeTruthy()
    expect(cards[1]!.querySelector('.sow-qc__n')?.textContent).toBe('14/24')
    expect(within(cards[1] as HTMLElement).getByRole('button', { name: /^\+\d+ since \d\d:\d\d/ })).toBeTruthy()
    expect(within(d).getByRole('button', { name: 'Share Wed 4 Nov' })).toBeTruthy()
    expect(cards[0]!.className).toContain('old')
  })
  it('V08-P3-02 tapping "+N since" cycles this hour → today → since open, with three dots', async () => {
    await quick(1); const d = screen.getByRole('dialog', { name: 'Quick overview' })
    const btn = () => within(d).getByRole('button', { name: /^\+\d+ (since|this hour|today)/ })
    expect(btn().querySelectorAll('.sow-qc__dots i').length).toBe(3)
    fireEvent.click(btn()); expect(btn().textContent).toMatch(/this hour/)
    fireEvent.click(btn()); expect(btn().textContent).toMatch(/today/); expect(btn().textContent).toMatch(/^\+14 today/)
    fireEvent.click(btn()); expect(btn().textContent).toMatch(/since \d\d:\d\d/)
  })
  it('V08-P3-03 share opens a stacked sheet with the message, Copy and the device targets; edits can be reset', async () => {
    await quick(1); fireEvent.click(screen.getByRole('button', { name: 'Share Wed 4 Nov' }))
    const s = screen.getByRole('dialog', { name: /^Share · Wed 4 · KG-A English HW/ })
    const box = within(s).getByRole('textbox', { name: 'Message to share' }) as HTMLTextAreaElement
    expect(box.value).toMatch(/^KG-A • Wed 4\/11 • not set\/found \(10\):/)
    expect(within(s).getByRole('button', { name: 'Copy' })).toBeTruthy(); expect(within(s).getByRole('link', { name: /whatsapp/i })).toBeTruthy()
    fireEvent.change(box, { target: { value: 'Hello class' } }); expect((within(s).getByRole('link', { name: /whatsapp/i }) as HTMLAnchorElement).href).toBe('https://wa.me/?text=Hello%20class')
    fireEvent.click(within(s).getByRole('button', { name: 'Reset' })); expect(box.value).toMatch(/not set\/found/)
    fireEvent.click(within(s).getByRole('button', { name: 'Close share' })); expect(screen.queryByRole('dialog', { name: /^Share/ })).toBeNull()
    expect(screen.getByRole('dialog', { name: 'Quick overview' })).toBeTruthy()
  })
})
