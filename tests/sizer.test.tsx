// Dev sizer build (src/dev/sizer): group data, persistence, values line, Pick lookup, and the CSS vars it drives.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { GROUPS, SIZES, apply, beta3, defaults, groupOf, load, summary } from '../src/dev/sizer/groups'

const store = (o: Record<string, string>) => ({ getItem: (k: string) => o[k] ?? null })

describe('dev sizer', () => {
  it('SZ-01 every size is a --sow-* var declared in shell.css, keys unique, defaults in range', () => {
    const css = readFileSync('src/shell/shell.css', 'utf8')
    for (const s of SIZES) expect(css, s.v).toMatch(new RegExp(`${s.v}:`))
    expect(new Set(SIZES.map((s) => s.key)).size).toBe(SIZES.length)
    for (const s of SIZES) for (const n of [s.beta, s.def ?? s.beta]) { expect(n, s.key).toBeGreaterThanOrEqual(s.min); expect(n, s.key).toBeLessThanOrEqual(s.max) }
    expect(GROUPS.map((x) => x.id)).toEqual(['bar', 'rail', 'head', 'rows', 'cols', 'qo', 'dock', 'sc'])
  })
  it("SZ-02 Steve's t157u values are the defaults; beta.3 stays one tap away", () => {
    expect(summary(defaults())).toBe('Top bar: bar 56 · chip 5 | A–Z rail: rail 7 · railw 12 · gap 6 | Table header: head 46 | Rows: row 47 · roll 20 · ngap 3 | Dates & ticks: col 58 · tick 25 | Dock: reserve 82')
    expect(summary(beta3())).toBe('No changes from beta.3')
  })
  it('SZ-03 load: v2 over v1 over defaults, clamped, junk ignored', () => {
    expect(load(store({}))).toEqual(defaults()); expect(load(store({ 'sow-driftline-sizer:v2': '{bad' }))).toEqual(defaults())
    const v = load(store({ 'sow-driftline-sizer:v1': JSON.stringify({ rail: 999, gap: 3, name: 'x' }), 'sow-driftline-sizer:v2': JSON.stringify({ gap: 4 }) }))
    expect(v.rail).toBe(24); expect(v.gap).toBe(4); expect(v.name).toBe(16); expect(v.row).toBe(47)
  })
  it('SZ-04 apply writes only values that differ from beta.3, with their unit', () => {
    const st = document.createElement('div').style; st.setProperty('--sow-chip-h', '50px')
    apply({ ...beta3(), stripo: 40, stroke: 2.5, roll: 20 }, st)
    expect(st.getPropertyValue('--sow-strip-op')).toBe('40%'); expect(st.getPropertyValue('--sow-tick-stroke')).toBe('2.5')
    expect(st.getPropertyValue('--sow-roll-w')).toBe('20px'); expect(st.getPropertyValue('--sow-chip-h')).toBe('')
  })
  it('SZ-05 Pick maps a tapped element to its group', () => {
    document.body.innerHTML = `<header class="sow-bar"><button id="b"></button></header><div class="sow-grid"><table><thead><tr><th class="r" id="h"></th></tr></thead>
      <tbody><tr><td class="r" id="r"></td><td class="n" id="n"></td><td id="t"><button></button></td></tr></tbody></table></div><nav class="dl-dock"><button id="d"></button></nav>`
    const at = (id: string) => groupOf(document.getElementById(id))?.id
    expect([at('b'), at('h'), at('r'), at('n'), at('t'), at('d')]).toEqual(['bar', 'head', 'rows', 'rows', 'cols', 'dock'])
    expect(groupOf(document.body)).toBeUndefined()
  })
})
