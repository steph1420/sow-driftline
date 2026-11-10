// v0.9.0-beta.8 candidate (Steve t201u picked B): the E1 card's top pager bars sat on the card's top edge, inside the
// 28 px corner curve, so the lit bar's glow was cut by the corner and flattened by the top edge. They now sit one glow
// below the top edge and start where the corner curve ends, so the glow stays whole inside the card. Nothing else moves.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { shell } from './cssEval'

const tokens = readFileSync('src/vendor/driftline/tokens.css', 'utf8')
const tok = (n: string) => +tokens.match(new RegExp(`${n}:\\s*(\\d+)px`))![1]!
const rule = (sel: string) => shell.match(new RegExp(`${sel.replace(/[.-]/g, '\\$&')} \\{([^}]*)\\}`))![1]!

describe('BETA8-01 Quick overview E1 top bars: whole glow (t201u, B)', () => {
  it('bars sit below the top edge and outside the corner curve; the glow itself is unchanged', () => {
    const top = rule('.sow-qc__sw--top'); const bar = rule('.sow-qc__sw--top i'); const on = rule('.sow-qc__sw--top i.on')
    expect(top).toContain('top: 0; left: var(--sow-qc-radius); right: var(--sow-qc-radius); height: var(--dl-space-3); padding-top: var(--dl-space-2);')
    expect(bar).toContain('height: calc(var(--dl-space-1) / 2); border-radius: var(--dl-radius-pill);') // a floating bar, rounded at both ends
    expect(on).toBe(' background: var(--sow-qc-tone); box-shadow: 0 0 var(--dl-space-2) var(--sow-qc-tone); ') // glow unchanged
    expect(shell).toMatch(/--sow-qc-radius: var\(--dl-radius-xl\);/)
    const blur = tok('--dl-space-2'), inset = tok('--dl-space-2'), radius = tok('--dl-radius-xl'), h = tok('--dl-space-1') / 2
    expect(inset + h).toBeLessThanOrEqual(tok('--dl-space-3')) // the bar still fits in the 12 px tap strip
    expect(inset).toBeGreaterThanOrEqual(blur) // the glow fades out before it reaches the top edge
    // the lit bar's rounded end plus the bright part of its glow (one sigma = blur / 2) lies inside the card's corner circle
    const cx = radius + h / 2, cy = inset + h / 2
    expect(Math.hypot(radius - cx, radius - cy) + h / 2 + blur / 2).toBeLessThanOrEqual(radius)
  })
  it('only the E1 top bars changed: the fill crest (A), the card ring (C) and the other switchers keep their beta.7 rules', () => {
    expect(rule('.sow-qc__tide')).toContain('border-radius: 40% 60% 0 0 / var(--dl-space-2) var(--dl-space-2) 0 0')
    expect(shell).toContain('box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--sow-qc-tone) 30%, var(--dl-color-hairline)); }') // token-ok
    expect(rule('.sow-qc__sw--edge')).toBe(' position: absolute; left: 0; right: 0; bottom: 0; height: var(--dl-space-2); align-items: flex-end; ')
    expect(rule('.sow-qc__sw--edge i.on')).toBe(' background: var(--sow-qc-tone); box-shadow: 0 0 var(--dl-space-3) var(--sow-qc-tone); ')
  })
})
