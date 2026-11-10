// v0.9.0-beta.4: Steve's sizer v2 picks (t160u) are the layout, and UI chrome doesn't select text.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const tokens = readFileSync('src/vendor/driftline/tokens.css', 'utf8')
const shell = readFileSync('src/shell/shell.css', 'utf8')
const tok: Record<string, number> = Object.fromEntries([...tokens.matchAll(/(--dl-(?:space|hit|radius)-[\w-]+):\s*(\d+)px/g)].map((m) => [m[1]!, +m[2]!]))
/** Every --sow-* declared on a :root rule in shell.css (last one wins). */
const decl: Record<string, string> = {}
for (const rule of shell.matchAll(/:root\s*\{([^}]*)\}/g)) for (const m of rule[1]!.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--sow-[\w-]+):\s*([^;]+);/g)) decl[m[1]!] = m[2]!.trim()

/** px at display size 1: kit tokens → px, --sow-k-* → 1, --sow-min-text → 13, then plain arithmetic. */
function px(name: string): number {
  const v = decl[name]; if (v == null) throw new Error(`${name} not declared`)
  const expr = v.replace(/var\((--[\w-]+)\)/g, (_, n: string) => n.startsWith('--sow-k-') ? '1' : n === '--sow-min-text' ? '13' : n in tok ? String(tok[n]) : n.startsWith('--sow-') ? `(${px(n)})` : 'NaN')
    .replace(/calc\(/g, '(').replace(/max\(/g, 'Math.max(').replace(/(\d+(?:\.\d+)?)px/g, '$1')
  return Math.round(Function(`return ${expr}`)() * 100) / 100
}

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
