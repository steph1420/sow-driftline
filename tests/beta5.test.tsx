// v0.9.0-beta.5 (Steve t164u): the sizer look holds at every Display size, not only at 100 %.
import { describe, it, expect } from 'vitest'
import { px, shell } from './cssEval'

const SIZES = { standard: {}, compact: { nav: 0.808, dates: 0.85, ticks: 0.808, rows: 0.935 }, smallest: { nav: 0.75, dates: 0.75, ticks: 0.75, rows: 0.75 } }

describe('v0.9.0-beta.5', () => {
  it('BETA5-01 the class chip keeps 5.5 px above and below inside the bar at every Display size', () => {
    for (const [name, k] of Object.entries(SIZES)) expect((px('--sow-bar-height', k) - px('--sow-chip-h', k)) / 2, name).toBe(5.5)
    expect(px('--sow-chip-h')).toBe(45)
  })
  it('BETA5-02 the right-most tick box keeps >= 13 px from the screen edge; no extra inset at 100 %', () => {
    expect(px('--sow-edge-r')).toBe(0)
    for (const [name, k] of Object.entries(SIZES)) {
      const visibleGap = px('--sow-edge-r', k) + (px('--sow-tick-col', k) - px('--sow-tick', k)) / 2
      expect(visibleGap, name).toBeGreaterThanOrEqual(13)
    }
    expect(shell).toMatch(/\.sow-grid tr > :last-child:not\(\.n\):not\(\.r\) \{ width: calc\(var\(--sow-tick-col\) \+ var\(--sow-edge-r\)\); padding-right: var\(--sow-edge-r\); \}/)
  })
  it('BETA5-03 a 44 px tick button in a narrower column stays centred (negative inline margins, none at 100 %)', () => {
    expect(shell).toMatch(/\.sow-grid \.t \{ margin-inline: min\(0px, calc\(\(var\(--sow-tick-col\) - var\(--dl-hit-min\)\) \/ 2\)\); \}/)
    expect(px('--sow-tick-col')).toBeGreaterThanOrEqual(44)
  })
})
