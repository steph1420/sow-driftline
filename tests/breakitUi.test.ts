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
  it('BK-UI-02 the 1|2 date buttons have a 44 px hit area', () => {
    expect(shell).toMatch(/\.sow-seg button\s*\{[^}]*position:\s*relative/)
    expect(shell).toMatch(/\.sow-seg button::after\s*\{[^}]*inset:\s*calc\(var\(--dl-space-1\) \* -1\)/)
  })
})
