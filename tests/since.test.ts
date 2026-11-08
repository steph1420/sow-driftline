// v0.8 F-CL-11 (Q3-since): "+N since" counts and the open → this hour → today cycle. Times in IST.
import { describe, it, expect } from 'vitest'
import { countSince, nextSince, sinceLabel, sinceStart } from '../src/data/since'
import type { TickRow } from '../src/data/contract'

const at = (hhmm: string) => `2026-11-04T${hhmm}:00+05:30`
const t = (roll: number, when: string, set = true): TickRow => ({ tickId: `s|${roll}`, sessionId: 's', subjectKey: 'K', classKey: 'A', roll, set, updatedAt: new Date(at(when)).toISOString() })
const ticks = [t(1, '08:05'), t(2, '10:41'), t(3, '11:02'), t(4, '11:30'), t(5, '11:40', false), { ...t(6, '09:00'), sessionId: 'other' }]
const clock = { openedAt: Date.parse(at('10:40')), now: Date.parse(at('11:45')) }

describe('since cycle (F-CL-11)', () => {
  it('SN-01 since open counts set ticks for that date from the time the app opened', () => expect(countSince(ticks, 's', sinceStart('open', clock))).toBe(3))
  it('SN-02 this hour counts from the top of the current IST hour', () => expect(countSince(ticks, 's', sinceStart('hour', clock))).toBe(2))
  it('SN-03 today counts from IST midnight', () => expect(countSince(ticks, 's', sinceStart('today', clock))).toBe(4))
  it('SN-04 the cycle goes open → this hour → today → open', () => expect([nextSince('open'), nextSince('hour'), nextSince('today')]).toEqual(['hour', 'today', 'open']))
  it('SN-05 labels', () => {
    expect(sinceLabel('open', 6, clock.openedAt)).toBe('+6 since 10:40'); expect(sinceLabel('hour', 4, clock.openedAt)).toBe('+4 this hour'); expect(sinceLabel('today', 15, clock.openedAt)).toBe('+15 today')
  })
  it('SN-06 ticks with no time are never counted as new', () => expect(countSince([{ ...t(1, '10:00'), updatedAt: '' }], 's', 0)).toBe(0))
})
