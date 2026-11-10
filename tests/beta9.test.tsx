// beta.9 (t221u): scale list 1A + migration, the three share paths (2A/2B/2C), Motion details switches (persist + gate),
// and the global Off / reduce-motion override. Demo data only.
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { ANIM_SCALES, MOMENTS, MOMENTS_DEFAULT, cleanAnimScale, cleanMoments, liveMoments, momentScale, motionKit } from '../src/config/motion'
import { storageKey } from '../src/config'

const phone = (w = 412) => Object.defineProperty(window, 'innerWidth', { value: w, configurable: true })
const ov = async () => { cleanup(); localStorage.clear(); phone(); const { App } = await import('../src/App'); const { useApp } = await import('../src/store/store')
  history.replaceState(null, '', '/?demo=school&today=2026-11-04'); useApp.getState().reset(); render(<App />); fireEvent.click(screen.getByRole('tab', { name: 'Overview' })); return useApp }
const card = (name: string) => screen.getByRole('button', { name: `Open ${name} on Checklist` }).closest('.sow-oc') as HTMLElement
const prefs = () => JSON.parse(localStorage.getItem(storageKey('prefs')) ?? '{}')

describe('beta.9 scale (1A) and migration', () => {
  afterEach(() => { cleanup(); localStorage.clear(); history.replaceState(null, '', '/'); phone(1024) })
  it('B9-01 every beta.8 value (Off, 0.5×, 1×, 1.5×, 2×) reads back unchanged; other numbers snap to the nearest; junk is 1×', () => {
    for (const k of [0, 0.5, 1, 1.5, 2]) expect(cleanAnimScale(k)).toBe(k)
    expect(cleanAnimScale(0.3)).toBe(0.25); expect(cleanAnimScale(4)).toBe(5); expect(cleanAnimScale(2.4)).toBe(2); expect(cleanAnimScale(9)).toBe(5)
    for (const j of [undefined, null, '1.5', -1, Number.NaN, {}]) expect(cleanAnimScale(j)).toBe(1)
    expect(ANIM_SCALES).toHaveLength(10)
  })
  it('B9-02 Animations page lists the ten choices with notes, saves the pick, and links Motion details', async () => {
    const useApp = await ov(); fireEvent.click(screen.getByRole('tab', { name: 'Settings' })); fireEvent.click(screen.getByRole('button', { name: /^Animations/ }))
    const g = screen.getByRole('radiogroup', { name: 'Animation scale' }); expect(within(g).getAllByRole('radio').map((r) => r.getAttribute('aria-label'))).toEqual(['Off', '0.25×', '0.5×', '0.75×', '1×', '1.25×', '1.5×', '2×', '3×', '5×'])
    fireEvent.click(within(g).getByRole('radio', { name: '0.75×' })); expect(useApp.getState().animScale).toBe(0.75); expect(prefs().animScale).toBe(0.75)
    expect(screen.getByRole('button', { name: 'Motion details, 20 of 20 on' })).toBeTruthy()
  })
})

describe('beta.9 sharing (2A, 2B, 2C)', () => {
  afterEach(() => { cleanup(); localStorage.clear(); history.replaceState(null, '', '/'); phone(1024) })
  it('B9-03 (2A) holding one date opens that date\'s menu: Share, Open, Reschedule, and each acts on that date', async () => {
    const useApp = await ov(); const fri = () => within(card('KG-A English HW')).getByRole('button', { name: 'Open Fri 6 Nov' })
    fireEvent.contextMenu(fri()); const menu = screen.getByRole('menu', { name: /Fri 6 Nov$/ })
    expect(within(menu).getAllByRole('menuitem').map((b) => b.textContent)).toEqual(['Share', 'Open', 'Reschedule'])
    expect(menu.querySelector('.sow-cardmenu__head')?.textContent).toMatch(/^Fri 6 Nov/)
    expect(fri().className).toContain('held'); expect(card('KG-A English HW').className).toContain('held')
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Share' })); expect(screen.getByRole('dialog', { name: /^Share · Fri 6 · KG-A English HW/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Close share' }))
    fireEvent.contextMenu(fri()); fireEvent.click(screen.getByRole('menuitem', { name: 'Reschedule' })); expect(screen.getByRole('dialog', { name: 'Reschedule' })).toBeTruthy()
    expect(screen.getByRole('option', { selected: true }).getAttribute('aria-label')).toMatch(/Fri 6 Nov/)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.contextMenu(fri()); fireEvent.click(screen.getByRole('menuitem', { name: 'Open' })); expect(useApp.getState().focus).toBe('KG-A_ENG_HW|2026-11-06')
  })
  it('B9-04 (2A) holding a date does not open the card menu; holding the card still does', async () => {
    await ov(); fireEvent.contextMenu(within(card('KG-A English HW')).getByRole('button', { name: 'Open Fri 6 Nov' }))
    expect(within(screen.getByRole('menu')).queryByRole('menuitem', { name: 'All dates' })).toBeNull(); fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.contextMenu(card('KG-A English HW')); expect(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'All dates' })).toBeTruthy()
  })
  it('B9-05 (2B) the share sheet has date pills (amber for copies still to come in, All › for the rest) that switch the shared date', async () => {
    await ov(); fireEvent.contextMenu(card('KG-A English HW')); fireEvent.click(screen.getByRole('menuitem', { name: 'Share' }))
    const pills = screen.getByRole('group', { name: 'Date to share' }); const on = () => within(pills).getAllByRole('button', { pressed: true })
    expect(on().map((b) => b.textContent)).toEqual(['Wed 4'])
    expect(within(pills).getByRole('button', { name: /^Share Mon 2 Nov, copies still to come in/ }).className).toContain('open')
    fireEvent.click(within(pills).getByRole('button', { name: /^Share Mon 2 Nov/ }))
    expect(screen.getByRole('dialog', { name: /^Share · Mon 2 · KG-A English HW/ })).toBeTruthy(); expect((screen.getByRole('textbox', { name: 'Message to share' }) as HTMLTextAreaElement).value).toMatch(/Mon 2\/11/)
    const before = within(pills).getAllByRole('button', { name: /^Share / }).length; fireEvent.click(screen.getByRole('button', { name: 'All dates to share' }))
    expect(within(pills).getAllByRole('button', { name: /^Share / }).length).toBeGreaterThan(before)
  })
  it('B9-06 (2C) every All dates row has a share icon that opens the share sheet on that date', async () => {
    await ov(); fireEvent.click(screen.getByRole('button', { name: 'All dates, KG-A English HW' }))
    const rows = document.querySelectorAll('.sow-ad__row'); expect(document.querySelectorAll('.sow-ad__share').length).toBe(rows.length)
    fireEvent.click(screen.getByRole('button', { name: 'Share Mon 2 Nov' })); expect(screen.getByRole('dialog', { name: /^Share · Mon 2 · KG-A English HW/ })).toBeTruthy()
  })
})

describe('beta.9 Motion details: per-moment switches', () => {
  afterEach(() => { cleanup(); localStorage.clear(); history.replaceState(null, '', '/'); phone(1024) })
  it('B9-07 twenty moments, all on by default; saved switches read back, unknown or missing ones are on', () => {
    expect(MOMENTS).toHaveLength(20); expect(new Set(MOMENTS.map((m) => m.id)).size).toBe(20); expect(Object.values(MOMENTS_DEFAULT).every(Boolean)).toBe(true)
    expect(cleanMoments({ press: false, toast: 'no', bogus: false }).press).toBe(false); expect(cleanMoments({ toast: 'no' }).toast).toBe(true); expect(cleanMoments(null)).toEqual(MOMENTS_DEFAULT)
  })
  it('B9-08 the Motion details page has a switch per moment; turning one off saves it on this device', async () => {
    const useApp = await ov(); fireEvent.click(screen.getByRole('tab', { name: 'Settings' })); fireEvent.click(screen.getByRole('button', { name: /^Animations/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Motion details/ })); const g = screen.getByRole('group', { name: 'Motion details' })
    const sw = within(g).getAllByRole('switch'); expect(sw.map((s) => s.getAttribute('aria-label'))).toEqual(MOMENTS.map((m) => m.label)); expect(sw.every((s) => s.getAttribute('aria-checked') === 'true')).toBe(true)
    fireEvent.click(within(g).getByRole('switch', { name: 'Undo toast' }))
    expect(useApp.getState().moments.toast).toBe(false); expect(prefs().moments.toast).toBe(false); expect(within(g).getByRole('switch', { name: 'Undo toast' }).getAttribute('aria-checked')).toBe('false')
    fireEvent.click(screen.getByRole('button', { name: 'Back to Animations' })); expect(screen.getByRole('button', { name: 'Motion details, 19 of 20 on' })).toBeTruthy()
  })
  it('B9-09 a switch gates only its moment: off = instant (scale 0), the others keep the global scale', () => {
    const m = { ...MOMENTS_DEFAULT, underline: false }
    expect(momentScale(2, false, m, 'underline')).toBe(0); expect(momentScale(2, false, m, 'hold')).toBe(2)
    expect(liveMoments(1, m).split(' ')).not.toContain('underline'); expect(liveMoments(1, m).split(' ')).toContain('press')
    expect(motionKit(momentScale(1, false, m, 'underline')).spring('snappy')).toEqual({ duration: 0, delay: 0 })
  })
  it('B9-10 global Off and the phone\'s reduce motion override every switch', () => {
    for (const mm of MOMENTS) { expect(momentScale(0, false, MOMENTS_DEFAULT, mm.id)).toBe(0); expect(momentScale(1, true, MOMENTS_DEFAULT, mm.id)).toBe(0) }
    expect(liveMoments(0, MOMENTS_DEFAULT)).toBe('')
  })
  it('B9-11 the root carries the live moments for the CSS-only ones (none in the test DOM, where motion is off)', async () => {
    await ov(); expect(document.documentElement.dataset.motion).toBe('')
  })
})
