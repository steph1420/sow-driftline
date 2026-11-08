// v0.8 Phase 7 (S2, F-TP-01..09): Settings › Share templates full-screen maker, and the share sheet using templates.
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { App } from '../src/App'
import { useApp } from '../src/store/store'
import { useTemplates } from '../src/store/templates'

const start = () => { cleanup(); localStorage.clear(); history.replaceState(null, '', '/?demo=school&today=2026-11-04'); useApp.getState().reset(); useTemplates.getState().reload(); render(<App />) }
const maker = () => { start(); fireEvent.click(screen.getByRole('tab', { name: 'Settings' })); fireEvent.click(screen.getByRole('button', { name: 'Share templates, 4 templates' })) }
const pills = () => within(screen.getByRole('group', { name: 'Templates' })).getAllByRole('button')
const names = () => pills().map((p) => p.textContent!.replace('· Default', ''))
const editor = () => screen.getByRole('textbox', { name: 'Template text' }) as HTMLTextAreaElement

describe('P7 template maker (S2)', () => {
  afterEach(() => { cleanup(); localStorage.clear(); history.replaceState(null, '', '/') })
  it('V08-P7-01 Settings › Share templates opens the full-screen maker: back, title, ＋ New, named pills with Default', () => {
    maker(); expect(screen.getByRole('heading', { name: 'Share templates' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Back to Settings' })).toBeTruthy(); expect(screen.getByRole('button', { name: 'New template' })).toBeTruthy()
    expect(pills().map((p) => p.textContent)).toEqual(['Pending· Default', 'Submitted', 'Completed', 'Not submitted'])
    expect(pills()[0]!.getAttribute('aria-pressed')).toBe('true'); expect(editor().value).toBe('{class} • {date} • not set/found ({count}):\n{names}')
  })
  it('V08-P7-02 all 22 chips in Basics / Names / Counts; a chip goes in at the caret', () => {
    maker(); for (const g of ['Basics', 'Names', 'Counts']) expect(screen.getByRole('group', { name: `Tap to add · ${g}` })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /^Add \{/ })).toHaveLength(22)
    editor().setSelectionRange(0, 0); fireEvent.click(screen.getByRole('button', { name: 'Add {subject}' }))
    expect(editor().value.startsWith('{subject}{class}')).toBe(true)
  })
  it('V08-P7-03 tokens are highlighted: submitted family purple, unknown amber', () => {
    maker(); fireEvent.change(editor(), { target: { value: 'Hi {teacher} {names.submitted} {class}' } })
    const marks = document.querySelectorAll('.sow-tpl__mirror .sow-tok')
    expect([...marks].map((m) => `${m.textContent}:${m.className.replace('sow-tok ', '')}`)).toEqual(['{teacher}:unknown', '{names.submitted}:submitted', '{class}:known'])
  })
  it('V08-P7-04 the preview is the text that would be sent for the latest real session, cut to "…N more"', () => {
    maker(); const pv = screen.getByRole('region', { name: /^Preview · KG-A · English HW · Wed 4/ })
    expect(pv.querySelector('.sow-tpl__box')!.textContent).toMatch(/^KG-A • Wed 4\/11 • not set\/found \(10\):/); expect(within(pv).getByText(/^…\d+ more$/)).toBeTruthy()
  })
  it('V08-P7-05 ⋯ menu: Rename, Duplicate, Set default, Delete (two taps), Restore default templates', () => {
    maker(); fireEvent.click(pills()[1]!); const menu = () => { fireEvent.click(screen.getByRole('button', { name: 'Template options' })); return screen.getByRole('menu') }
    fireEvent.click(within(menu()).getByRole('menuitem', { name: 'Set default' })); expect(pills()[1]!.textContent).toBe('Submitted· Default')
    fireEvent.click(within(menu()).getByRole('menuitem', { name: 'Duplicate' })); expect(names()).toContain('Submitted 2')
    fireEvent.click(within(menu()).getByRole('menuitem', { name: 'Rename' })); const name = screen.getByRole('textbox', { name: 'Template name' })
    fireEvent.change(name, { target: { value: 'Copies in' } }); fireEvent.keyDown(name, { key: 'Enter' }); expect(names()).toContain('Copies in')
    const m = menu(); fireEvent.click(within(m).getByRole('menuitem', { name: 'Delete' })); fireEvent.click(within(m).getByRole('menuitem', { name: 'Tap again to delete' }))
    expect(names()).not.toContain('Copies in')
    fireEvent.click(within(menu()).getByRole('menuitem', { name: 'Restore default templates' })); expect(pills()).toHaveLength(5)
  })
  it('V08-P7-06 ＋ New adds a template and selects it; demo shows no sync cloud', () => {
    maker(); fireEvent.click(screen.getByRole('button', { name: 'New template' }))
    expect(pills().at(-1)!.textContent).toBe('New template'); expect(pills().at(-1)!.getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByRole('img', { name: /synced|waiting/i })).toBeNull()
  })
})

describe('P7 share sheet uses templates (F-TP-09)', () => {
  afterEach(() => { cleanup(); localStorage.clear(); history.replaceState(null, '', '/') })
  const share = () => { fireEvent.contextMenu(document.querySelector('.sow-oc')!); fireEvent.click(screen.getByRole('menuitem', { name: 'Share' })); return screen.getByRole('dialog', { name: /^Share/ }) }
  const msg = (d: HTMLElement) => (within(d).getByRole('textbox', { name: 'Message to share' }) as HTMLTextAreaElement).value
  it('V08-P7-07 template pills in the sheet; last used is preselected next time', () => {
    start(); let d = share(); const g = within(d).getByRole('group', { name: 'Template' })
    expect(within(g).getByRole('button', { name: 'Pending' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(within(g).getByRole('button', { name: 'Completed' })); expect(msg(d)).toMatch(/^KG-A • Wed 4\/11 • set \(14\/24\):/)
    fireEvent.click(within(d).getByRole('button', { name: 'Close share' })); d = share()
    expect(within(within(d).getByRole('group', { name: 'Template' })).getByRole('button', { name: 'Completed' }).getAttribute('aria-pressed')).toBe('true')
  })
  it('V08-P7-08 an empty message turns the targets off; a long one warns', () => {
    start(); const d = share(); const box = within(d).getByRole('textbox', { name: 'Message to share' })
    fireEvent.change(box, { target: { value: '' } }); expect((within(d).getByRole('button', { name: 'Copy' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(box, { target: { value: 'x'.repeat(1501) } }); expect(within(d).getByText(/long/i)).toBeTruthy()
  })
  it('V08-P7-09 the preview and the share sheet send the same text', () => {
    start(); const sent = msg(share()); cleanup(); render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: 'Settings' })); fireEvent.click(screen.getByRole('button', { name: /^Share templates/ }))
    const shown = [...screen.getByRole('region', { name: /^Preview/ }).querySelectorAll('.sow-tpl__line')].map((l) => l.textContent).join('\n')
    expect(shown.split('\n').length).toBeGreaterThan(2); expect(sent.startsWith(shown)).toBe(true)
  })
})
