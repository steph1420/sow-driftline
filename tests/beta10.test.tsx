// beta.10 (t224u "Space wars!"): the share sheet's date pills and template chips get their own space (no squeeze, no
// clipping, 6 px sizer gap, each row scrolls sideways), and Keep is gone from the share targets. Demo data only.
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { shareTargets } from '../src/data/shareTargets'

const css = readFileSync('src/shell/shell.css', 'utf8')
const rule = (sel: string) => css.split('\n').find((l) => l.startsWith(sel + ' {')) ?? ''
const phone = (w = 411) => Object.defineProperty(window, 'innerWidth', { value: w, configurable: true })
const share = async () => { cleanup(); localStorage.clear(); phone(); const { App } = await import('../src/App'); const { useApp } = await import('../src/store/store')
  history.replaceState(null, '', '/?demo=school&today=2026-11-04'); useApp.getState().reset(); render(<App />); fireEvent.click(screen.getByRole('tab', { name: 'Overview' }))
  fireEvent.contextMenu(screen.getByRole('button', { name: 'Open KG-A English HW on Checklist' }).closest('.sow-oc')!); fireEvent.click(screen.getByRole('menuitem', { name: 'Share' }))
  return screen.getByRole('dialog', { name: /^Share · / }) }

describe('beta.10 share sheet spacing and targets', () => {
  afterEach(() => { cleanup(); localStorage.clear(); history.replaceState(null, '', '/'); phone(1024) })
  it('B10-01 the sheet never shrinks its rows (it scrolls instead), so no row clips another', () => {
    expect(rule('.sow-share > *')).toMatch(/flex-shrink: 0/)
    expect(rule('.sow-share__rows > .sow-share__dates, .sow-share__rows > .sow-share__tpls')).toMatch(/flex: none;.*min-height: var\(--dl-hit-min\);.*overflow-x: auto;.*overflow-y: hidden/)
    expect(rule('.sow-share__rows .sow-fchip')).toMatch(/flex: none/)
  })
  it('B10-02 the pill row and the chip row sit in one block with the sizer gap 6 between and inside them', () => {
    expect(css).toMatch(/--sow-share-gap: calc\(var\(--dl-space-1\) \* 1\.5\); \} \/\* 6 \*\//)
    expect(rule('.sow-share__rows')).toMatch(/flex-direction: column; gap: var\(--sow-share-gap\)/)
    expect(rule('.sow-share__rows > .sow-share__dates, .sow-share__rows > .sow-share__tpls')).toMatch(/gap: var\(--sow-share-gap\)/)
  })
  it('B10-03 in the sheet the date pills come first, then the template chips, both inside the rows block; pills are plain buttons', async () => {
    const s = await share(); const rows = s.querySelector('.sow-share__rows')!
    expect([...rows.children].map((c) => c.getAttribute('aria-label'))).toEqual(['Date to share', 'Template'])
    const pills = within(screen.getByRole('group', { name: 'Date to share' })).getAllByRole('button')
    expect(pills.every((b) => !/[()|]/.test(b.textContent ?? ''))).toBe(true)
  })
  it('B10-04 Keep is gone: phones get WhatsApp, Messages, More (with Copy that is 4, one row); computers WhatsApp (+ More)', async () => {
    expect(shareTargets({ phone: true, canShare: true })).toEqual(['whatsapp', 'sms', 'more']); expect(shareTargets({ phone: true, canShare: false })).toEqual(['whatsapp', 'sms'])
    expect(shareTargets({ phone: false, canShare: true })).toEqual(['whatsapp', 'more']); expect(shareTargets({ phone: false, canShare: false })).toEqual(['whatsapp'])
    const s = await share(); expect(within(s).queryByRole('button', { name: /keep/i })).toBeNull(); expect(css).not.toMatch(/\.sow-blob\.keep/)
  })
})
