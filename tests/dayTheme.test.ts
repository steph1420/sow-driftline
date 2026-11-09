import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const tokens = readFileSync('src/vendor/driftline/tokens.css', 'utf8')
const shell = readFileSync('src/shell/shell.css', 'utf8')

function themeVars(theme: string): Record<string, string> {
  const block = tokens.split(`[data-theme="${theme}"] {`)[1].split('}')[0]
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1].replace(/^dl-/, ""), m[2].trim()]))
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const TEXT = ['text', 'text-muted', 'accent', 'positive', 'warning', 'danger', 'special']

describe('v0.8 Phase 8: Day theme (F-DY-01/02)', () => {
  it.each(['utopian-day', 'contrast-day'])('V08-P8-01 %s text tokens reach 4.5:1 on the page and on cards', (theme) => {
    const v = themeVars(theme)
    for (const bg of ['color-bg', 'color-surface-solid']) {
      for (const t of TEXT) expect(contrast(v[`color-${t}`], v[bg]), `${t} on ${bg}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('V08-P8-02 Day themes run glows at half strength', () => {
    expect(shell).toMatch(/\[data-theme\$="-day"\]\s*\{[^}]*--sow-glow:\s*\.5/)
    expect(shell).toMatch(/:root\s*\{[^}]*--sow-glow:\s*1\b/)
  })

  // RDs2 changed V08-P8-03: the glass column tabs and the header glow are gone (A5 track-list header); any glow left scales with --sow-glow
  it('V08-P8-03 no glass tab or header glow; any accent glow left scales with --sow-glow', () => {
    expect(shell).not.toMatch(/th\.sel \.sow-tab|\.sow-grid tbody \{[^}]*radial-gradient/)
    for (const l of shell.split('\n').filter((x) => /--sow-glow\)/.test(x))) expect(l).not.toMatch(/accent\) \d+%/)
  })
})
