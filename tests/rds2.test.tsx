// RDs2 (t140u, v0.9.0-beta.1): the new top bar, Classes panel, Undo way 2, shortcuts, A5 header and Col2 drawer.
// Pure gesture/state logic first, then the UI on demo data (fake names only).
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, within, act } from '@testing-library/react'
import { undoIntent, swipeDir, hitIndex, pullOpens } from '../src/data/gestures'
import { readFileSync } from 'node:fs'
import { stepScope, scopeDots, validPick, scopeSubjects, ALL } from '../src/data/scope'
import { fmtDate } from '../src/data/dateFormat'
import { cleanHaptics } from '../src/shell/haptics'
import { CONFIG } from '../src/config'

describe('RDs2 pure logic', () => {
  it('RD-01 undo intent: down past the slide distance is redo, back up is undo, left past cancel wins over down', () => {
    const { undoSlidePx: s, undoCancelPx: c } = CONFIG.timing
    expect(undoIntent(0, 0)).toBe('undo'); expect(undoIntent(0, s)).toBe('redo'); expect(undoIntent(0, s - 1)).toBe('undo')
    expect(undoIntent(-c, 0)).toBe('cancel'); expect(undoIntent(-c, c + 5)).toBe('redo'); expect(undoIntent(-(c + 10), c)).toBe('cancel')
    expect(undoIntent(c * 2, 0)).toBe('undo')
  })
  it('RD-02 swipe direction needs a mostly sideways move past the threshold; hit index finds the circle under the finger', () => {
    expect(swipeDir(60, 5, 40)).toBe('right'); expect(swipeDir(-60, 5, 40)).toBe('left'); expect(swipeDir(30, 0, 40)).toBeNull(); expect(swipeDir(60, 80, 40)).toBeNull()
    const r = [{ left: 0, right: 44, top: 0, bottom: 44 }, { left: 0, right: 44, top: 56, bottom: 100 }]
    expect(hitIndex(r, 20, 70)).toBe(1); expect(hitIndex(r, 20, 50)).toBe(-1); expect(hitIndex(r, 20, 10)).toBe(0)
  })
  it('RD-03 scope stepping stops at the ends unless loop is on; dots cap at five', () => {
    const k = ['a', 'b', 'c']
    expect(stepScope(k, 'b', 1, false)).toBe('c'); expect(stepScope(k, 'c', 1, false)).toBeNull(); expect(stepScope(k, 'c', 1, true)).toBe('a')
    expect(stepScope(k, 'a', -1, true)).toBe('c'); expect(stepScope(k, 'x', 1, false)).toBe('a'); expect(stepScope([], 'a', 1, true)).toBeNull(); expect(stepScope(['a'], 'a', 1, true)).toBeNull()
    expect(scopeDots(1, 0)).toEqual({ count: 0, on: -1 }); expect(scopeDots(3, 2)).toEqual({ count: 3, on: 2 }); expect(scopeDots(9, 8)).toEqual({ count: 5, on: 4 })
  })
  it('RD-04 date formats: d/m (default), weekday, day month', () => {
    expect(fmtDate('2026-11-10', 'dm')).toBe('10/11'); expect(fmtDate('2026-11-10', 'dow')).toBe('Tue 10'); expect(fmtDate('2026-11-10', 'dmon')).toBe('10 Nov')
    expect(cleanHaptics('strong')).toBe('strong'); expect(cleanHaptics('loud')).toBe('normal')
  })
  it('RD-05 a pick for a class that left the data falls back to All; Fav filters to starred subjects', async () => {
    const { useApp } = await import('../src/store/store'); useApp.getState().reset(); const d = useApp.getState().data
    expect(validPick(d, { kind: 'class', classKey: 'NOPE' })).toEqual(ALL); expect(validPick(d, null)).toEqual(ALL)
    const one = d.subjects.find((x) => x.active)!.subjectKey
    expect(scopeSubjects(d, { kind: 'fav' }, [one]).map((x) => x.subjectKey)).toEqual([one])
  })
})

const phone = (w = 360) => Object.defineProperty(window, 'innerWidth', { value: w, configurable: true })
const open = async () => {
  cleanup(); localStorage.clear(); phone(); const { App } = await import('../src/App'); const { useApp } = await import('../src/store/store')
  history.replaceState(null, '', '/?demo=school&today=2026-11-04'); useApp.getState().reset(); render(<App />)
  fireEvent.click(screen.getByRole('tab', { name: 'Overview' })); fireEvent.click(screen.getByRole('button', { name: /open KG-A English HW on checklist/i }))
  return useApp
}
const ptr = (el: Element, type: 'pointerDown' | 'pointerMove' | 'pointerUp', x: number, y: number) => fireEvent[type](el, { clientX: x, clientY: y, pointerId: 1, button: 0 })

describe('RDs2 UI', () => {
  afterEach(() => { vi.useRealTimers(); cleanup(); localStorage.clear(); history.replaceState(null, '', '/'); phone(1024) })

  it('RD-10 Classes panel: All / Fav / classes / LISTS; collapse hides counts; LISTS has only a disabled New list', async () => {
    await open(); fireEvent.click(screen.getByRole('button', { name: /^Switch class/ }))
    const panel = screen.getByRole('dialog', { name: 'Classes' }); const side = within(panel).getByRole('navigation', { name: 'Pick' })
    expect(within(side).getByRole('button', { name: /^All, \d+ subjects$/ }).getAttribute('aria-pressed')).toBe('true')
    expect(within(side).getByRole('button', { name: /^Fav, 0 subjects$/ })).toBeTruthy()
    expect(side.querySelector('.sow-li__n')).not.toBeNull()
    fireEvent.click(within(panel).getByRole('button', { name: 'Collapse the classes strip' })); expect(side.querySelector('.sow-li__n')).toBeNull()
    fireEvent.click(within(panel).getByRole('button', { name: 'Lists' }))
    const add = within(panel).getByRole('button', { name: 'New list (coming later)' }); expect((add as HTMLButtonElement).disabled).toBe(true)
  })
  it('RD-11 starring a subject fills Fav and survives a reload; picking a subject closes the panel', async () => {
    const useApp = await open(); fireEvent.click(screen.getByRole('button', { name: /^Switch class/ }))
    fireEvent.click(screen.getAllByRole('button', { name: /^Favourite / })[1]!)
    expect(screen.getByRole('button', { name: /^Fav, 1 subjects$/ })).toBeTruthy()
    expect(JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.includes(':favs:'))!)!)).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: /^Fav, / })); expect(useApp.getState().scope).toEqual({ kind: 'fav' })
    const pick = within(screen.getByRole('dialog', { name: 'Classes' })).getAllByRole('button', { name: / of \d+ done$/ }); expect(pick).toHaveLength(1)
    fireEvent.click(pick[0]!); expect(screen.queryByRole('dialog', { name: 'Classes' })).toBeNull()
  })
  it('RD-12 chip swipe steps through the scope; at the end it stops unless loop is on', async () => {
    const useApp = await open(); const st = () => useApp.getState()
    const keys = () => scopeSubjects(st().data, ALL, []).map((x) => x.subjectKey)
    const first = st().subject; act(() => { st().stepSubject(1) }); expect(st().subject).toBe(keys()[keys().indexOf(first) + 1])
    act(() => st().setSubject(keys().at(-1)!)); act(() => { expect(st().stepSubject(1)).toBe(false) }); expect(st().subject).toBe(keys().at(-1))
    act(() => st().setLoop(true)); act(() => { st().stepSubject(1) }); expect(st().subject).toBe(keys()[0])
  })
  it('RD-13 Undo way 2: tap undoes; slide down shows Redo and release redoes; slide left shows Cancel and release does nothing', async () => {
    const useApp = await open(); fireEvent.click(document.querySelector('tbody button.t')!)
    const undo = screen.getByRole('button', { name: 'Undo' }); const ticked = () => useApp.getState().canRedo
    fireEvent.click(undo, { detail: 0 }); expect(ticked()).toBe(true)
    expect(screen.getByText('Hold or swipe down to redo')).toBeTruthy()
    ptr(undo, 'pointerDown', 100, 20); ptr(undo, 'pointerMove', 100, 50)
    expect(document.querySelector('.sow-act b')?.textContent).toBe('Redo'); expect(document.querySelector('.sow-act span')?.textContent).toBe('Slide left to cancel')
    ptr(undo, 'pointerMove', 50, 30); expect(document.querySelector('.sow-act b')?.textContent).toBe('Cancel')
    ptr(undo, 'pointerUp', 50, 30); expect(document.querySelector('.sow-act')).toBeNull(); expect(ticked()).toBe(true)
    ptr(undo, 'pointerDown', 100, 20); ptr(undo, 'pointerMove', 100, 60); ptr(undo, 'pointerUp', 100, 60); expect(ticked()).toBe(false); expect(useApp.getState().canUndo).toBe(true)
  })
  it('RD-14 shortcuts: tap opens Pending / 1/2 / Search straight down; ✕ closes; 1/2 opens the second date', async () => {
    const useApp = await open(); const plus = screen.getByRole('button', { name: 'Shortcuts' })
    fireEvent.click(plus, { detail: 0 }); expect(plus.getAttribute('aria-expanded')).toBe('true')
    const g = screen.getByRole('group', { name: 'Shortcuts' }); expect(within(g).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Pending only', 'Switch to 2 columns', 'Search names'])
    expect(g.querySelector('.sow-sc__badge')?.textContent).toBe('1')
    fireEvent.click(within(g).getByRole('button', { name: 'Switch to 2 columns' })); expect(useApp.getState().view.phoneCols).toBe(2)
    expect(document.querySelectorAll('thead th.d')).toHaveLength(2); expect(document.querySelector('thead th.d.c2')).not.toBeNull()
    if (!screen.queryByRole('group', { name: 'Shortcuts' })) fireEvent.click(plus, { detail: 0 })
    fireEvent.click(plus, { detail: 0 }); expect(screen.queryByRole('group', { name: 'Shortcuts' })).toBeNull()
  })
  it('RD-15 the edge grip opens and closes Col2', async () => {
    const useApp = await open(); fireEvent.click(screen.getByRole('button', { name: 'Open a second date' })); expect(useApp.getState().view.phoneCols).toBe(2)
    expect(document.querySelector('.sow-grip.is-open')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Close the second date' })); expect(useApp.getState().view.phoneCols).toBe(1)
  })
  it('RD-16 Settings › Column dates changes the header format and subtext; Haptics has four levels', async () => {
    const useApp = await open(); fireEvent.click(screen.getByRole('tab', { name: 'Settings' }))
    fireEvent.click(screen.getByRole('button', { name: /^Column dates/ }))
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Date format' })).getByRole('radio', { name: '10 Nov' }))
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Under the date' })).getByRole('radio', { name: 'Topic' }))
    expect(useApp.getState().view).toMatchObject({ dateFmt: 'dmon', dateSub: 'topic' })
    fireEvent.click(screen.getByRole('tab', { name: 'Checklist' }))
    const h = screen.getByRole('button', { name: 'Dates, HW Wed 4 Nov' }); expect(h.querySelector('b')?.textContent).toBe('4 Nov'); expect(h.querySelector('small.topic')).not.toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Settings' })); fireEvent.click(screen.getByRole('button', { name: /^Back/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Haptics/ }))
    expect(within(screen.getByRole('radiogroup', { name: 'Haptics' })).getAllByRole('radio').map((r) => r.getAttribute('aria-label'))).toEqual(['Off', 'Light', 'Normal', 'Strong'])
  })
  it('RD-17 the A–Z rail sits left with every letter; absent letters are hidden from screen readers', async () => {
    await open(); const rail = document.querySelector('.sow-rail')!; expect(rail).not.toBeNull()
    expect(rail.querySelectorAll('[data-l]')).toHaveLength(26)
    expect(rail.querySelector('.off[aria-hidden]')).not.toBeNull()
  })

  // v0.9.0-beta.2 (t145u)
  it('RD-18 the primary date is the rightmost column; the second (earlier) date opens to its left', async () => {
    const useApp = await open(); act(() => useApp.getState().setView({ phoneCols: 2 }))
    const ths = [...document.querySelectorAll('thead th.d')]; expect(ths).toHaveLength(2)
    expect(ths[0]!.className).toContain('c2'); expect(ths[1]!.className).toContain('sel')
    expect(ths.map((t) => t.querySelector('button')!.getAttribute('aria-label'))).toEqual(['Dates, HW Mon 2 Nov', 'Dates, HW Wed 4 Nov'])
    const row = document.querySelector('tbody tr')!.querySelectorAll('td:not(.n):not(.r)'); expect(row[0]!.className).toContain('c2'); expect(row[1]!.className).not.toContain('c2')
    expect(ths[1]!.querySelector('.sow-grip.is-open')).not.toBeNull()
  })
  it('RD-19 swipe left on a date header opens the second date, swipe right closes it', async () => {
    const useApp = await open(); const h = () => screen.getByRole('button', { name: 'Dates, HW Wed 4 Nov' })
    ptr(h(), 'pointerDown', 300, 100); ptr(h(), 'pointerUp', 200, 104); expect(useApp.getState().view.phoneCols).toBe(2)
    ptr(h(), 'pointerDown', 200, 100); ptr(h(), 'pointerUp', 300, 104); expect(useApp.getState().view.phoneCols).toBe(1)
    expect(screen.queryByRole('dialog', { name: /date/i })).toBeNull()
  })
  it('RD-20 a swipe up from the Checklist dock tab pulls Quick overview up; short pulls snap back; a tap is a tab tap', async () => {
    const { quickOpenPx: o, quickFlickPxMs: f, swipeEngagePx: e } = CONFIG.timing
    expect(pullOpens(-o, 0)).toBe(true); expect(pullOpens(-(o - 1), 0)).toBe(false); expect(pullOpens(-e, -f)).toBe(true); expect(pullOpens(-(e - 1), -f * 4)).toBe(false); expect(pullOpens(-40, -f / 2)).toBe(false)
    const useApp = await open(); const tab = screen.getByRole('tab', { name: 'Checklist' })
    // jsdom ignores a timeStamp passed to fireEvent, so pin it: the flick test must not depend on how fast CI runs
    let now = 0; const ts = vi.spyOn(Event.prototype, 'timeStamp', 'get').mockImplementation(() => now)
    const p = (type: 'pointerDown' | 'pointerMove' | 'pointerUp', y: number, t: number) => { now = t; fireEvent[type](tab, { clientX: 180, clientY: y, pointerId: 1, button: 0 }) }
    p('pointerDown', 600, 100); p('pointerMove', 560, 500); expect(useApp.getState().quickPull).toBe(40)
    const sheet = screen.getByRole('dialog', { name: 'Quick overview' }); expect(sheet.className).toContain('is-pulling'); expect(sheet.style.getPropertyValue('--sow-pull')).toBe('40px')
    p('pointerUp', 560, 800); fireEvent.click(tab); expect(useApp.getState().quick).toBe(false); expect(screen.queryByRole('dialog', { name: 'Quick overview' })).toBeNull()
    expect(useApp.getState().tab).toBe('checklist')
    p('pointerDown', 600, 1000); p('pointerMove', 560, 1100); p('pointerMove', 600 - o - 10, 1300); p('pointerUp', 600 - o - 10, 1400); fireEvent.click(tab)
    expect(useApp.getState().quick).toBe(true); expect(screen.getByRole('dialog', { name: 'Quick overview' }).className).not.toContain('is-pulling')
    ts.mockRestore()
    act(() => useApp.getState().setQuick(false)); fireEvent.click(screen.getByRole('tab', { name: 'Overview' })); fireEvent.click(tab); expect(useApp.getState().tab).toBe('checklist'); expect(useApp.getState().quick).toBe(false)
  })
  it('RD-21 the shortcuts hold is 100 ms; the chip and Undo keep 160 ms', async () => {
    expect(CONFIG.timing.shortcutHoldMs).toBe(100); expect(CONFIG.timing.pressMs).toBe(160)
    await open(); vi.useFakeTimers(); const plus = screen.getByRole('button', { name: 'Shortcuts' })
    ptr(plus, 'pointerDown', 340, 20); act(() => { vi.advanceTimersByTime(99) }); expect(screen.queryByRole('group', { name: 'Shortcuts' })).toBeNull()
    act(() => { vi.advanceTimersByTime(1) }); expect(screen.getByRole('group', { name: 'Shortcuts' })).toBeTruthy()
    ptr(plus, 'pointerUp', 340, 20)
  })
  it('RD-22 the undo overlay is solid, hides the chip under it and says "Nothing to redo" cleanly', async () => {
    await open(); fireEvent.click(document.querySelector('tbody button.t')!); const undo = screen.getByRole('button', { name: 'Undo' })
    ptr(undo, 'pointerDown', 300, 20); ptr(undo, 'pointerMove', 300, 50)
    const o = document.querySelector('.sow-act')!; expect(o.className).toContain('is-off'); expect(o.querySelector('b')?.textContent).toBe('Redo'); expect(o.querySelector('span')?.textContent).toBe('Nothing to redo')
    expect(screen.getByRole('banner').className).toContain('is-acting'); ptr(undo, 'pointerUp', 300, 50); expect(screen.getByRole('banner').className).not.toContain('is-acting')
    const css = readFileSync('src/shell/shell.css', 'utf8')
    expect(css).toMatch(/\.sow-act\.is-off \{[^}]*background: var\(--dl-color-surface-raised\)/); expect(css).not.toMatch(/\.sow-act[^{]*\{[^}]*opacity/)
    expect(css).toMatch(/\.sow-bar\.is-acting \.sow-cs \{ visibility: hidden; \}/); expect(css).toMatch(/\.sow-act span \{[^}]*min-width: 0; text-align: right;[^}]*text-overflow: ellipsis/)
  })
  it('RD-23 a done tick is one round-capped stroke in the filled box; the bar and table sit closer to the left edge', async () => {
    await open(); fireEvent.click(document.querySelector('tbody button.t')!)
    const svg = document.querySelector('tbody button.t.on svg')!; expect(svg.querySelectorAll('path')).toHaveLength(1)
    expect(svg.getAttribute('stroke-linecap')).toBe('round'); expect(svg.getAttribute('stroke-linejoin')).toBe('round'); expect(document.querySelector('tbody button.t.on')!.textContent).toBe('')
    const css = readFileSync('src/shell/shell.css', 'utf8')
    expect(css).toMatch(/\.sow-bar \{[^}]*padding: 0 var\(--sow-bar-pad-r\) 0 var\(--sow-chip-x\)/); expect(css).toMatch(/--sow-bar-pad-r: var\(--dl-space-2\);/)
    expect(css).toMatch(/--sow-gutter: calc\(var\(--sow-rail-x\) \+ var\(--sow-rail-w\) \+ var\(--sow-rail-gap\)\)/)
    expect(css).toMatch(/\.sow-grid \.r \{ width: var\(--sow-roll-w\)/) // sizes: BETA4-01
  })
})
