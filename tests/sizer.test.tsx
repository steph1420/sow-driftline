// Dev sizer build (src/dev/sizer): pure helpers + every slider maps to a real named var in shell.css.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { SIZES, apply, defaults, load, summary } from '../src/dev/sizer/sizes'

describe('dev sizer', () => {
  it('SZ-01 every size is a --sow-* var declared in shell.css', () => {
    const css = readFileSync('src/shell/shell.css', 'utf8')
    for (const s of SIZES) expect(css, s.v).toMatch(new RegExp(`${s.v}:`))
    for (const s of SIZES) { expect(s.def).toBeGreaterThanOrEqual(s.min); expect(s.def).toBeLessThanOrEqual(s.max) }
  })
  it('SZ-02 load clamps and ignores junk', () => {
    expect(load(null)).toEqual(defaults()); expect(load('{bad')).toEqual(defaults())
    const v = load(JSON.stringify({ rail: 999, gap: 3.4, name: 'x' }))
    expect(v.rail).toBe(24); expect(v.gap).toBe(3); expect(v.name).toBe(16)
  })
  it('SZ-03 apply writes only changed values; summary marks them', () => {
    const st = document.createElement('div').style; st.setProperty('--sow-rail-x', '20px')
    const v = { ...defaults(), gap: 4 }; apply(v, st)
    expect(st.getPropertyValue('--sow-rail-gap')).toBe('4px'); expect(st.getPropertyValue('--sow-rail-x')).toBe('')
    expect(summary(v)).toContain('gap 4*'); expect(summary(v)).toContain('rail 8 ·')
  })
})
