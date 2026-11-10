// v0.8 Phase 10 break-it: standing UI rules found broken on the live Beta (text >= 13 px, tap targets >= 44 px).
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const shell = readFileSync('src/shell/shell.css', 'utf8')
const tokens = readFileSync('src/vendor/driftline/tokens.css', 'utf8')
const px = (name: string, css: string) => Number(css.match(new RegExp(`--dl-type-${name}-size:\\s*(\\d+)px`))?.[1])

describe('P10 break-it: UI rules', () => {
  it('BK-UI-01 the smallest text token is at least 13 px (caption follows footnote in the app)', () => {
    expect(px('footnote', tokens)).toBeGreaterThanOrEqual(13)
    expect(shell).toMatch(/:root\s*\{[^}]*--dl-type-caption-size:\s*var\(--dl-type-footnote-size\)/)
  })
  // RDs2 changed BK-UI-02: the 1|2 buttons became the shortcut circle (44 px) and the Col2 edge grip (full header height)
  it('BK-UI-02 the 1|2 shortcut and the Col2 edge grip have a 44 px hit area', () => {
    expect(shell).toMatch(/\.sow-sc \{[^}]*width: var\(--sow-sc-size\); height: var\(--sow-sc-size\)/); expect(shell).toMatch(/--sow-sc-size: var\(--dl-hit-min\);/) // sizer: named
    expect(shell).toMatch(/--sow-head-h: max\(var\(--dl-hit-min\)/)
    expect(shell).toMatch(/\.sow-grip \{[^}]*top: 0; bottom: 0/)
  })
})
