// Ported unchanged from /sow/ src/lib/quickSearch.test.ts (made-up names)
import { describe, expect, it } from 'vitest'
import { damerau, rankMatches } from '../src/data/quickSearch'

const rows = [
  { roll: 1, name: 'Aarav Sharma' },
  { roll: 2, name: 'Rohan Kapoor' },
  { roll: 3, name: 'Saanvi Reddy' },
  { roll: 4, name: 'Riya Khanna' },
  { roll: 5, name: 'Shaurya Iyer' },
  { roll: 6, name: 'Kabir Mehta' },
  { roll: 7, name: 'Ananya Rao' },
]
const top = (q: string) => rankMatches(q, rows).map((m) => m.roll)

describe('quickSearch', () => {
  it('damerau handles transposition as 1', () => {
    expect(damerau('kabir', 'kaibr')).toBe(1)
    expect(damerau('rohan', 'rohn')).toBe(1)
    expect(damerau('abc', 'xyz')).toBe(3)
  })
  it('single letter → first-name initial first, in roll order (strip jump preserved)', () => {
    expect(top('s')[0]).toBe(3)
    expect(top('s').slice(0, 2)).toEqual([3, 5])
  })
  it('first-name prefix beats last-name prefix', () => {
    expect(top('ka')[0]).toBe(6) // Kabir before Kapoor / Khanna
    expect(top('ka')).toContain(2)
  })
  it('last-name prefix', () => { expect(top('redd')[0]).toBe(3) })
  it('initials rk → R… K…', () => { expect(top('rk').slice(0, 2)).toEqual([2, 4]) })
  it('substring', () => { expect(top('aury')[0]).toBe(5) })
  it('subsequence', () => { expect(top('kbr')[0]).toBe(6) })
  it('typo tolerance (1 edit, len>=4)', () => {
    expect(top('kaibr')[0]).toBe(6)
    expect(top('saanvy')[0]).toBe(3)
    expect(top('rhan')).toContain(2)
  })
  it('no typo tolerance below 4 letters', () => { expect(top('zzx')).toEqual([]) })
  it('multi-word prefix', () => { expect(top('riya kh')[0]).toBe(4) })
  it('roll number', () => { expect(top('6')[0]).toBe(6) })
  it('does not filter: returns only matches but never mutates rows', () => {
    rankMatches('a', rows); expect(rows.length).toBe(7)
  })
})
