// v0.8 Phase 11 (Steve t81u-t83u): display size. Overall scale plus text / row spacing / tickboxes / date headers /
// navigation, validated and bounded, saved per device, one-tap Compact and Reset. Demo data only.
import { readFileSync } from 'node:fs'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { App } from '../src/App'
import { useApp } from '../src/store/store'
import { storageKey } from '../src/config'
import { SCALE_BOUNDS, SCALE_DEFAULT, SCALE_KEYS, SCALE_PRESETS, cleanScale, clampFactor, presetOf, scaleVars } from '../src/shell/displayScale'

const shell = readFileSync('src/shell/shell.css', 'utf8')
const tokens = readFileSync('src/vendor/driftline/tokens.css', 'utf8')
const PREFS = storageKey('prefs')
const boot = () => { cleanup(); history.replaceState(null, '', '/?demo=school&today=2026-11-04'); useApp.getState().reset(); render(<App />) }
const openDisplay = () => { boot(); fireEvent.click(screen.getByRole('tab', { name: 'Settings' })); fireEvent.click(screen.getByRole('button', { name: /^Display size, / })) }
const root = (v: string) => document.documentElement.style.getPropertyValue(v)

describe('P11 display size', () => {
  afterEach(() => { cleanup(); localStorage.clear(); history.replaceState(null, '', '/') })

  it('V08-P11-01 factors are clamped to their bounds, snapped to 5 % steps, and junk falls back to 100 %', () => {
    expect(clampFactor('overall', 0.1)).toBe(SCALE_BOUNDS.overall[0]); expect(clampFactor('overall', 9)).toBe(SCALE_BOUNDS.overall[1])
    expect(clampFactor('text', 0.93)).toBe(0.95); expect(clampFactor('rows', Number.NaN)).toBe(1); expect(clampFactor('ticks', '0.8')).toBe(1)
    expect(cleanScale({ overall: 0.8, zoom: 3, nav: null })).toEqual({ ...SCALE_DEFAULT, overall: 0.8 })
    expect(cleanScale('nonsense')).toEqual(SCALE_DEFAULT)
    for (const p of Object.values(SCALE_PRESETS)) expect(cleanScale(p)).toEqual(p)
  })
  it('V08-P11-02 each group is overall × its own factor, scaled once; the default is today’s look', () => {
    expect(scaleVars(SCALE_DEFAULT)).toEqual({ '--sow-k-text': '1', '--sow-k-rows': '1', '--sow-k-ticks': '1', '--sow-k-dates': '1', '--sow-k-nav': '1' })
    expect(scaleVars({ ...SCALE_DEFAULT, overall: 0.8, rows: 1.25 })['--sow-k-rows']).toBe('1')
    expect(presetOf(SCALE_DEFAULT)).toBe('standard'); expect(presetOf(SCALE_PRESETS.compact)).toBe('compact'); expect(presetOf({ ...SCALE_DEFAULT, text: 1.1 })).toBeNull()
  })
  it('V08-P11-03 the setting is saved per device, read back validated, and Reset restores the default', () => {
    boot(); act(() => useApp.getState().setScale({ overall: 0.85, rows: 7 }))
    expect(JSON.parse(localStorage.getItem(PREFS)!).scale).toEqual({ ...SCALE_DEFAULT, overall: 0.85, rows: SCALE_BOUNDS.rows[1] })
    expect(root('--sow-k-ticks')).toBe('0.85')
    localStorage.setItem(PREFS, JSON.stringify({ side: 'night', scale: { overall: 0.01, text: 'big' } })); useApp.getState().reset()
    expect(useApp.getState().scale).toEqual({ ...SCALE_DEFAULT, overall: SCALE_BOUNDS.overall[0] }); expect(useApp.getState().side).toBe('night')
    useApp.getState().resetScale(); expect(useApp.getState().scale).toEqual(SCALE_DEFAULT); expect(JSON.parse(localStorage.getItem(PREFS)!).scale).toEqual(SCALE_DEFAULT)
  })
  it('V08-P11-04 Settings › Display size: Standard | Compact, six labelled sliders that apply live, Reset', () => {
    openDisplay(); expect(screen.getByRole('heading', { name: 'Display size' })).toBeTruthy()
    const sliders = screen.getAllByRole('slider'); expect(sliders.map((s) => s.getAttribute('aria-label'))).toEqual(['Overall', 'Text', 'Row spacing', 'Tickboxes', 'Date headers', 'Navigation'])
    fireEvent.click(screen.getByRole('button', { name: 'Compact' })); expect(useApp.getState().scale).toEqual(SCALE_PRESETS.compact)
    expect(screen.getByRole('slider', { name: 'Overall' }).getAttribute('aria-valuetext')).toBe('85%')
    fireEvent.change(screen.getByRole('slider', { name: 'Row spacing' }), { target: { value: '1.3' } })
    expect(useApp.getState().scale.rows).toBe(1.3); expect(root('--sow-k-rows')).toBe('1.105')
    expect(screen.getByRole('group', { name: 'Size' }).querySelector('.is-on')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reset to default' })); expect(useApp.getState().scale).toEqual(SCALE_DEFAULT)
    fireEvent.click(screen.getByRole('button', { name: 'Back to Settings' })); expect(screen.getByRole('button', { name: 'Display size, Standard' })).toBeTruthy()
  })
  it('V08-P11-05 every slider range matches the bounds (no way to save an out-of-range size)', () => {
    openDisplay()
    for (const [i, k] of SCALE_KEYS.entries()) { const s = screen.getAllByRole('slider')[i] as HTMLInputElement
      expect([Number(s.min), Number(s.max), Number(s.step)]).toEqual([...SCALE_BOUNDS[k], 0.05]) }
  })
  it('V08-P11-06 CSS: type sizes are the vendor sizes × text, floored at 13 px; no CSS zoom', () => {
    for (const name of ['callout', 'body', 'headline', 'title3', 'title2', 'title1']) {
      const base = tokens.match(new RegExp(`--dl-type-${name}-size:\\s*(\\d+)px`))![1]
      expect(shell).toMatch(new RegExp(`--dl-type-${name}-size:\\s*max\\(var\\(--sow-min-text\\), calc\\(${base}px \\* var\\(--sow-k-text\\)\\)\\)`))
    }
    expect(shell).not.toMatch(/\bzoom\s*:/)
  })
  it('V08-P11-07 CSS: tickboxes draw smaller but keep a 44 px hit area; rows never drop below 44 px', () => {
    expect(shell).toMatch(/--sow-tick:\s*calc\(var\(--sow-tick-base\) \* var\(--sow-k-ticks\)\)/); expect(shell).toMatch(/--sow-tick-base: var\(--dl-space-6\);/) // RDs2: 24 px box (kit), 44 px button
    expect(shell).toMatch(/\.sow-grid \.t\s*\{[^}]*width:\s*max\(var\(--dl-hit-min\), var\(--sow-tick\)\)/)
    expect(shell).toMatch(/\.sow-grid \.t\s*\{[^}]*border:\s*var\(--sow-tick-gap\) solid transparent/)
    expect(shell).toMatch(/\.sow-grid tbody td\s*\{[^}]*height:\s*max\(var\(--dl-hit-min\), var\(--sow-row-h\)\)/)
  })
  it('V08-P11-08 CSS: navigation (bar, controls, dock) and date headers follow their factors with 44 px floors', () => {
    expect(shell).toMatch(/--sow-bar-height:\s*max\(var\(--dl-hit-min\), calc\(var\(--dl-hit-comfortable\) \* var\(--sow-k-nav\)\)\)/) // RDs2: 48 px bar
    expect(shell).toMatch(/\.dl-dock__tab\s*\{[^}]*min-height:\s*var\(--sow-dock-tab-h\)/); expect(shell).toMatch(/--sow-dock-tab-h: max\(var\(--dl-hit-min\), calc\(var\(--dl-hit-comfortable\) \* var\(--sow-k-nav\)\)\)/)
    expect(shell).toMatch(/--sow-tick-col:\s*calc\(var\(--sow-date-col\) \* var\(--sow-k-dates\)\)/); expect(shell).toMatch(/--sow-date-col: calc\(var\(--dl-space-12\) \+ var\(--dl-space-2\)\);/) // RDs2: 56 px date columns
    expect(shell).toMatch(/--sow-head-h: max\(var\(--dl-hit-min\), calc\(var\(--dl-hit-min\) \* var\(--sow-k-dates\)\)\)/)
  })
})
