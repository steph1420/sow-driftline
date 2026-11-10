// v0.9.0-beta.4: Steve's sizer v2 picks (t160u) are the layout, and UI chrome doesn't select text.
import { describe, it, expect } from 'vitest'
import { decl, px, shell } from './cssEval'

describe('v0.9.0-beta.4', () => {
  it("BETA4-01 layout = Steve's sizer v2 values (t160u); the rest stay at beta.3", () => {
    const want: Record<string, number> = {
      '--sow-bar-height': 56, '--sow-chip-x': 5, '--sow-chip-h': 45,
      '--sow-rail-x': 7, '--sow-rail-w': 12, '--sow-rail-font': 18, '--sow-rail-pad': 0, '--sow-rail-gap': 6,
      '--sow-head-h': 46, '--sow-row-base': 47, '--sow-roll-w': 20, '--sow-name-pad': 3,
      '--sow-date-col': 52, '--sow-tick-base': 25, '--sow-tick-radius': 6, '--sow-qc-pill-h': 32, '--sow-dock-reserve': 82,
      // unchanged from beta.3
      '--sow-dock-tab-h': 48, '--sow-bar-btn': 44, '--sow-bar-pad-r': 8, '--sow-sc-size': 44, '--sow-qc-pad': 12, '--sow-strip-w': 48,
    }
    expect(Object.fromEntries(Object.keys(want).map((k) => [k, px(k)]))).toEqual(want)
    expect(decl['--sow-name-size']).toBe('var(--dl-type-body-size)') // 16
    expect(px('--sow-gutter')).toBe(7 + 12 + 6)
  })
  it('BETA4-02 chrome blocks selection, tap flash and callout; names and fields stay selectable', () => {
    const body = shell.match(/(?:^|\n)body \{([^}]*)\}/)![1]!
    for (const d of ['-webkit-user-select: none', 'user-select: none', '-webkit-touch-callout: none', '-webkit-tap-highlight-color: transparent']) expect(body).toContain(d)
    const text = shell.match(/\n([^\n{]*\.sow-grid td\.n[^\n{]*)\{([^}]*)\}/)!
    for (const sel of ['input', 'textarea', '[contenteditable="true"]', '.sow-grid td.n']) expect(text[1]).toContain(sel)
    expect(text[2]).toContain('user-select: text'); expect(text[2]).toContain('-webkit-user-select: text')
  })
})
