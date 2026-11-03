// D0-TOK-01: app code uses --dl-* tokens only (AGENT_BRIEF B8). Vendor folder excluded.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

function files(d: string): string[] {
  return readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? (f === 'vendor' ? [] : files(p)) : [p] })
}
describe('token purity', () => {
  it('D0-TOK-01 no hex colours or px literals in app CSS/TSX', () => {
    const bad = files('src').filter((f) => /\.(css|tsx)$/.test(f)).flatMap((f) =>
      readFileSync(f, 'utf8').split('\n').map((l, i) => ({ f, i, l })).filter(({ l }) => /#[0-9a-fA-F]{3,8}\b|\b\d+px\b/.test(l) && !l.includes('token-ok')))
    expect(bad.map((b) => `${b.f}:${b.i + 1}`)).toEqual([])
  })
})
