// beta.13 (t230u, t234u/t235u): name sorting (Settings page + hold menu A on the table header) and Export setup file.
// Demo data and fake connection values only; the token is never printed.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, within, act } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { openLayers, resetLayers } from '../src/ui/useBackLayer'
import { SORT_DEFAULT, cleanSort, isDefaultSort, pickSort, sortLabel, sortPupils } from '../src/data/sortNames'
import { SETUP_FILENAME, exportSetup, parseSetup } from '../src/data/setup'
import { storageKey } from '../src/config'

const FAKE = { bridgeUrl: 'https://script.google.com/macros/s/FAKE_bridge-id_123/exec', token: 'fake-token-not-real-0000' }
const css = readFileSync('src/shell/shell.css', 'utf8')
const boot = async (url = '/?demo=school&today=2026-11-04', tab = 'Checklist') => { cleanup(); localStorage.clear(); const { App } = await import('../src/App'); const { useApp } = await import('../src/store/store')
  history.replaceState(null, '', url); useApp.getState().reset(); render(<App />); fireEvent.click(screen.getByRole('tab', { name: tab })); return useApp }
const names = () => Array.from(document.querySelectorAll('.sow-grid tbody tr td.n')).map((td) => td.firstChild?.textContent ?? '')
const rolls = () => Array.from(document.querySelectorAll('.sow-grid tbody tr td.r')).map((td) => +(td.textContent ?? ''))
afterEach(() => { cleanup(); localStorage.clear(); history.replaceState(null, '', '/'); resetLayers(); vi.restoreAllMocks(); vi.useRealTimers() })

describe('beta.13 sortNames (pure)', () => {
  const P = [{ roll: 3, name: 'cara' }, { roll: 1, name: 'Bo' }, { roll: 2, name: 'Ali' }, { roll: 4, name: 'Bo' }]
  it('B13-S-01 default is Roll ↑; junk cleans to it; each option keeps its own direction', () => {
    expect(cleanSort(null)).toEqual(SORT_DEFAULT); expect(cleanSort({ by: 'x', dirs: { az: 'up' } })).toEqual(SORT_DEFAULT)
    expect(isDefaultSort(SORT_DEFAULT)).toBe(true); expect(sortLabel(SORT_DEFAULT)).toBe('Roll ↑')
    const s = pickSort(pickSort(SORT_DEFAULT, 'az', 'desc'), 'roll'); expect(s.by).toBe('roll'); expect(s.dirs.az).toBe('desc'); expect(sortLabel(pickSort(s, 'az'))).toBe('A–Z ↓')
    expect(sortLabel(pickSort(s, 'pending'))).toBe('Pending ↓')
  })
  it('B13-S-02 A–Z ignores case, ties by roll; ↓ reverses names but ties stay roll ↑', () => {
    expect(sortPupils(P, pickSort(SORT_DEFAULT, 'az', 'asc')).map((p) => p.roll)).toEqual([2, 1, 4, 3])
    expect(sortPupils(P, pickSort(SORT_DEFAULT, 'az', 'desc')).map((p) => p.roll)).toEqual([3, 1, 4, 2])
  })
  it('B13-S-03 Roll ↑ / ↓ and Pending most / fewest first (ties by roll); the input is not changed', () => {
    expect(sortPupils(P, SORT_DEFAULT).map((p) => p.roll)).toEqual([1, 2, 3, 4]); expect(sortPupils(P, pickSort(SORT_DEFAULT, 'roll', 'desc')).map((p) => p.roll)).toEqual([4, 3, 2, 1])
    const left = (r: number) => ({ 1: 0, 2: 2, 3: 1, 4: 2 })[r] ?? 0
    expect(sortPupils(P, pickSort(SORT_DEFAULT, 'pending', 'desc'), left).map((p) => p.roll)).toEqual([2, 4, 3, 1])
    expect(sortPupils(P, pickSort(SORT_DEFAULT, 'pending', 'asc'), left).map((p) => p.roll)).toEqual([1, 3, 2, 4])
    expect(P.map((p) => p.roll)).toEqual([3, 1, 2, 4])
  })
})

describe('beta.13 name sorting in the app', () => {
  it('B13-UI-01 by default the list is in roll order and the header says Names (no arrow)', async () => {
    await boot(); const r = rolls(); expect(r.length).toBeGreaterThan(3); expect(r).toEqual([...r].sort((a, b) => a - b))
    expect(screen.getByRole('button', { name: 'Search names' }).textContent).toBe('Names'); expect(document.querySelector('.sow-th__arrow')).toBeNull()
  })
  it('B13-UI-02 holding Names opens menu A (A–Z, Roll, Pending; Roll ticked, ↑ lit) with one Back layer', async () => {
    const useApp = await boot(); const base = openLayers(); fireEvent.contextMenu(screen.getByRole('button', { name: 'Search names' }))
    const m = screen.getByRole('menu', { name: 'Sort names' }); expect(m.className).toContain('sow-cardmenu--sort'); expect(openLayers()).toBe(base + 1)
    expect(m.querySelector('.sow-cardmenu__head')?.textContent).toBe('Sort names')
    expect(Array.from(m.querySelectorAll('.sow-sortm__pick')).map((b) => b.textContent)).toEqual(['A–Z', 'Roll', 'Pending'])
    expect(within(m).getByRole('menuitemradio', { name: 'Roll' }).getAttribute('aria-checked')).toBe('true')
    expect(within(m).getByRole('menuitemradio', { name: 'Roll ascending' }).className).toContain('is-on')
    expect(useApp.getState().find).toBeNull() // the hold did not open search
    fireEvent.keyDown(document, { key: 'Escape' }); expect(screen.queryByRole('menu')).toBeNull(); expect(openLayers()).toBe(base)
  })
  it('B13-UI-03 holding # picks A–Z ↓: rows reorder, header shows "A–Z ↓", it is saved on this device', async () => {
    const useApp = await boot(); fireEvent.contextMenu(screen.getByRole('columnheader', { name: 'Roll' }))
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'A–Z descending' })); expect(screen.queryByRole('menu')).toBeNull()
    const n = names(); expect(n).toEqual([...n].sort((a, b) => b.localeCompare(a, 'en', { sensitivity: 'base' }) || 0))
    expect(screen.getByRole('button', { name: 'Search names' }).textContent).toBe('A–Z↓')
    expect(JSON.parse(localStorage.getItem(storageKey('nameSort'))!)).toMatchObject({ by: 'az', dirs: { az: 'desc' } })
    expect(useApp.getState().nameSort.by).toBe('az')
  })
  it('B13-UI-04 Pending ↓ puts the names with most ticks left on screen first, and a tick does not move rows until the sort is picked again', async () => {
    const useApp = await boot(); act(() => useApp.getState().setNameSort(pickSort(useApp.getState().nameSort, 'pending', 'desc')))
    const cells = () => Array.from(document.querySelectorAll('.sow-grid tbody tr')).map((tr) => tr.querySelectorAll('button.t:not([aria-pressed="true"])').length)
    const left = cells(); expect(left).toEqual([...left].sort((a, b) => b - a)); expect(screen.getByRole('button', { name: 'Search names' }).textContent).toBe('Pending↓')
    const before = rolls(); const open = document.querySelector<HTMLButtonElement>('.sow-grid tbody tr button.t:not([aria-pressed="true"])')
    if (open) { fireEvent.click(open); expect(rolls()).toEqual(before) }
  })
  it('B13-UI-05 Settings: "Sort names · Roll ↑" in Session & names opens the page; arrows and rows set the sort; Back returns', async () => {
    const useApp = await boot(undefined, 'Settings'); const g = screen.getByRole('group', { name: 'Session & names' })
    fireEvent.click(within(g).getByRole('button', { name: 'Sort names, Roll ↑' })); expect(screen.getByRole('heading', { name: 'Sort names' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: /^Roll,/ }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('button', { name: 'Pending descending' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Pending ascending' })); expect(sortLabel(useApp.getState().nameSort)).toBe('Pending ↑')
    fireEvent.click(screen.getByRole('radio', { name: /^A–Z,/ })); expect(sortLabel(useApp.getState().nameSort)).toBe('A–Z ↑')
    fireEvent.click(screen.getByRole('button', { name: 'Back to Settings' })); expect(screen.getByRole('button', { name: 'Sort names, A–Z ↑' })).toBeTruthy()
  })
  it('B13-UI-06 the sort survives a restart (per device)', async () => {
    const useApp = await boot(); act(() => useApp.getState().setNameSort(pickSort(SORT_DEFAULT, 'roll', 'desc')))
    const saved = localStorage.getItem(storageKey('nameSort')); localStorage.removeItem(storageKey('nameSort')); useApp.getState().reset(); expect(useApp.getState().nameSort).toEqual(SORT_DEFAULT)
    localStorage.setItem(storageKey('nameSort'), saved!); useApp.getState().reset(); expect(sortLabel(useApp.getState().nameSort)).toBe('Roll ↓')
  })
  it('B13-UI-07 CSS: tokens only for the new rules; rows reflow under moment "reflow", the menu under "hold"', () => {
    for (const sel of ['.sow-th__arrow', '.sow-sortm__dir', '.sow-export__warn', '.sow-export__btns']) expect(css).toContain(`\n${sel} {`)
    const src = readFileSync('src/screens/Checklist.tsx', 'utf8'); expect(src).toMatch(/layout=\{rf\.on \? 'position' : false\}/)
    expect(readFileSync('src/screens/SortMenu.tsx', 'utf8')).toMatch(/MenuShell/); expect(readFileSync('src/screens/CardMenu.tsx', 'utf8')).toMatch(/useMoment\('hold'\)/)
  })
})

describe('beta.13 Export setup file', () => {
  it('B13-EX-01 the file is exactly what importSetup reads (round trip), named sow-driftline-setup.json', () => {
    const text = exportSetup(FAKE); expect(JSON.parse(text)).toEqual({ kind: 'sow-driftline-setup', ...FAKE }); expect(parseSetup(text)).toEqual(FAKE)
    expect(SETUP_FILENAME).toBe('sow-driftline-setup.json')
  })
  it('B13-EX-02 round trip through the store: setupFileText → importSetup stores the same connection', async () => {
    const sheet = await import('../src/data/sheetSource'); vi.spyOn(sheet, 'verifyCopy').mockResolvedValue(undefined as never)
    const { useApp, setupFileText } = await import('../src/store/store'); history.replaceState(null, '', '/'); localStorage.clear(); useApp.getState().reset()
    expect(setupFileText()).toBeNull() // demo: nothing to export
    localStorage.setItem(storageKey('copyBridge'), FAKE.bridgeUrl); localStorage.setItem(storageKey('copyToken'), FAKE.token)
    const text = setupFileText()!; expect(parseSetup(text)).toEqual(FAKE)
    localStorage.clear(); const real = useApp.getState().refresh; useApp.setState({ refresh: async () => {} })
    try { await useApp.getState().importSetup(text) } finally { useApp.setState({ refresh: real }) }
    expect(localStorage.getItem(storageKey('copyBridge'))).toBe(FAKE.bridgeUrl); expect(localStorage.getItem(storageKey('copyToken')) === FAKE.token).toBe(true)
  })
  it('B13-EX-03 demo mode: the row in Sync & pairing is disabled with a short note', async () => {
    await boot(undefined, 'Settings'); const b = within(screen.getByRole('group', { name: 'Sync & pairing' })).getByRole('button', { name: /^Export setup file/ })
    expect((b as HTMLButtonElement).disabled).toBe(true); expect(b.textContent).toContain('Connect with Sync first')
  })
  const paired = async () => { const useApp = await boot('/', 'Settings'); localStorage.setItem(storageKey('copyBridge'), FAKE.bridgeUrl); localStorage.setItem(storageKey('copyToken'), FAKE.token)
    act(() => useApp.setState({ source: 'copy' })); return useApp }
  it('B13-EX-04 paired: the sheet explains, warns, names the file; Save file downloads that JSON and shows "Setup file saved"', async () => {
    await paired(); let blob: Blob | null = null
    const create = vi.fn((b: Blob) => { blob = b; return 'blob:fake' }); Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { expect(this.download).toBe(SETUP_FILENAME) })
    const log = vi.spyOn(console, 'log'); const base = openLayers()
    fireEvent.click(screen.getByRole('button', { name: 'Export setup file' }))
    const d = screen.getByRole('dialog', { name: 'Export setup file' }); expect(openLayers()).toBe(base + 1)
    expect(d.textContent).toContain('Keep it private. Anyone with this file can connect to your sheet.'); expect(d.textContent).toContain(SETUP_FILENAME); expect(d.textContent).not.toContain(FAKE.token)
    fireEvent.click(within(d).getByRole('button', { name: 'Save file' })); expect(click).toHaveBeenCalledOnce(); expect(create).toHaveBeenCalledOnce()
    expect(parseSetup(await blob!.text())).toEqual(FAKE); expect(screen.queryByRole('dialog', { name: 'Export setup file' })).toBeNull()
    expect(screen.getByRole('status').textContent).toContain('Setup file saved'); expect(log.mock.calls.flat().join(' ')).not.toContain(FAKE.token)
  })
  it('B13-EX-05 Share uses the share sheet with the file when it takes files, else falls back to a download', async () => {
    const { shareSetup } = await import('../src/screens/settings/ExportSetup'); const text = exportSetup(FAKE)
    const share = vi.fn(async (_: ShareData) => {}); Object.assign(navigator, { share, canShare: () => true })
    expect(await shareSetup(text)).toBe('shared'); const f = (share.mock.calls[0]![0].files as File[])[0]!; expect(f.name).toBe(SETUP_FILENAME); expect(parseSetup(await f.text())).toEqual(FAKE)
    Object.assign(navigator, { share: vi.fn(async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }) }) }); expect(await shareSetup(text)).toBe('cancelled')
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:fake'), revokeObjectURL: vi.fn() }); const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    Object.assign(navigator, { canShare: () => false }); expect(await shareSetup(text)).toBe('saved'); expect(click).toHaveBeenCalledOnce()
    Object.assign(navigator, { share: undefined, canShare: undefined })
  })
})
