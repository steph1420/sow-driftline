// v0.7.0 — written before the code (failing first). Spec: FEATURES.md (F-LT, F-DT, F-OV).
import { describe, it, expect } from 'vitest'
import { dueEndMs, isLate, pillVisible, modeOnOpen } from '../src/data/late'
import { spinMonth, spinDate, spinDay, setYear } from '../src/data/dial'
import { overviewCards, weekPath, collides, nextClassDay } from '../src/data/overview'
import type { SheetState } from '../src/data/contract'

const IST = (s: string) => Date.parse(s + '+05:30')
describe('v0.7 late rule (F-LT-01/02/05)', () => {
  it('V07-LT-01 due end = midnight IST after the scheduled day', () => expect(dueEndMs('2026-11-04')).toBe(IST('2026-11-05T00:00:00')))
  it('V07-LT-02 marked 23:59 IST on the day is on time; 00:00 next day is late', () => {
    expect(isLate(new Date(IST('2026-11-04T23:59:00')).toISOString(), '2026-11-04')).toBe(false)
    expect(isLate(new Date(IST('2026-11-05T00:00:00')).toISOString(), '2026-11-04')).toBe(true)
  })
  it('V07-LT-03 unknown marked time is never guessed late', () => { expect(isLate('', '2026-11-04')).toBeNull(); expect(isLate(null, '2026-11-04')).toBeNull() })
  it('V07-LT-04 back-dated mark is never late', () => expect(isLate(new Date(IST('2026-11-07T10:00:00')).toISOString(), '2026-11-04', true)).toBe(false))
  it('V07-LT-05 re-evaluated when the date moves later', () => {
    const at = new Date(IST('2026-11-05T09:00:00')).toISOString()
    expect(isLate(at, '2026-11-04')).toBe(true); expect(isLate(at, '2026-11-06')).toBe(false)
  })
  it('V07-LT-06 pill only after due', () => { expect(pillVisible('2026-11-04', IST('2026-11-04T15:00:00'))).toBe(false); expect(pillVisible('2026-11-04', IST('2026-11-05T00:00:01'))).toBe(true) })
  it('V07-LT-07 pill resets to late on opening another date', () => expect(modeOnOpen({ mode: 'back', leftDate: '2026-11-03', leftAtMs: 0, openDate: '2026-11-02', nowMs: 10 * 60e3, keepMs: 60e3 })).toBe('late'))
  it('V07-LT-08 …but not on a quick return to the same date (t79u 2.2)', () => expect(modeOnOpen({ mode: 'back', leftDate: '2026-11-03', leftAtMs: 0, openDate: '2026-11-03', nowMs: 20e3, keepMs: 60e3 })).toBe('back'))
  it('V07-LT-09 slow return still resets', () => expect(modeOnOpen({ mode: 'back', leftDate: '2026-11-03', leftAtMs: 0, openDate: '2026-11-03', nowMs: 5 * 60e3, keepMs: 60e3 })).toBe('late'))
})
describe('v0.7 date wheels (F-DT-02/03)', () => {
  it('V07-DL-01 month spin clamps the date (31 Jan +1 → 28 Feb 2026)', () => expect(spinMonth('2026-01-31', 1)).toBe('2026-02-28'))
  it('V07-DL-02 month spin wraps across the year boundary', () => { expect(spinMonth('2026-12-10', 1)).toBe('2027-01-10'); expect(spinMonth('2026-01-10', -1)).toBe('2025-12-10') })
  it('V07-DL-03 date spin wraps inside the month', () => { expect(spinDate('2026-11-30', 1)).toBe('2026-11-01'); expect(spinDate('2026-11-01', -1)).toBe('2026-11-30') })
  it('V07-DL-04 Day wheel moves to that weekday in the same Mon–Sun week (t75u)', () => {
    expect(spinDay('2026-11-04', 4)).toBe('2026-11-06') // Wed → Fri
    expect(spinDay('2026-11-04', 0)).toBe('2026-11-02') // Wed → Mon
    expect(spinDay('2026-11-08', 0)).toBe('2026-11-02') // Sun → Mon same week
  })
  it('V07-DL-05 Day wheel crosses a month inside the week', () => expect(spinDay('2026-12-01', 0)).toBe('2026-11-30'))
  it('V07-DL-06 year pill keeps day/month and clamps 29 Feb', () => { expect(setYear('2026-11-04', 2027)).toBe('2027-11-04'); expect(setYear('2028-02-29', 2027)).toBe('2027-02-28') })
})
const ss = (id: string, subjectKey: string, classKey: string, date: string, topic = ''): SheetState['sessions'][number] => ({ sessionId: id, subjectKey, classKey, date, topic, status: 'Open', updatedAt: '' })
const st: SheetState = { ok: true, schema: 1,
  subjects: [
    { subjectKey: 'A_ENG_HW', classKey: 'A', subject: 'English', kind: 'HW', active: true },
    { subjectKey: 'B_ENG_CW', classKey: 'B', subject: 'English', kind: 'CW', active: true },
    { subjectKey: 'C_ENG_HW', classKey: 'C', subject: 'English', kind: 'HW', active: true },
    { subjectKey: 'A_PHO_CW', classKey: 'A', subject: 'Phonics', kind: 'CW', active: true },
  ],
  roster: [1, 2, 3].flatMap((r) => ['A', 'B', 'C'].map((c) => ({ classKey: c, roll: r, name: `${c}${r}`, status: 'Active' as const, updatedAt: '' }))),
  sessions: [
    ss('a1', 'A_ENG_HW', 'A', '2026-10-26', 'G & H'), ss('a2', 'A_ENG_HW', 'A', '2026-11-02', 'K & L'), ss('a3', 'A_ENG_HW', 'A', '2026-11-04', 'M & N'), ss('a4', 'A_ENG_HW', 'A', '2026-11-06', 'O & P'),
    ss('b1', 'B_ENG_CW', 'B', '2026-11-04', 'Words'),
    ss('c1', 'C_ENG_HW', 'C', '2026-11-03', 'Little letters'),
    ss('p1', 'A_PHO_CW', 'A', '2026-11-09', 'The m sound'),
  ],
  ticks: [{ tickId: 'a3|1', sessionId: 'a3', subjectKey: 'A_ENG_HW', classKey: 'A', roll: 1, set: true, updatedAt: '' }],
}
describe('v0.7j Overview (F-OV-01/02)', () => {
  const cards = () => overviewCards(st, '2026-11-04')
  it('V07-OV-01 one card per class+subject+type, every class shown', () => expect(cards().map((c) => c.subjectKey).sort()).toEqual(['A_ENG_HW', 'A_PHO_CW', 'B_ENG_CW', 'C_ENG_HW']))
  it('V07-OV-02 current session = today, else earliest future, else latest past', () => {
    const by = Object.fromEntries(cards().map((c) => [c.subjectKey, c.sessionId]))
    expect(by).toEqual({ A_ENG_HW: 'a3', B_ENG_CW: 'b1', C_ENG_HW: 'c1', A_PHO_CW: 'p1' })
  })
  it('V07-OV-03 card carries type, date, topic and to-go only', () => { const a = cards().find((c) => c.subjectKey === 'A_ENG_HW')!; expect([a.kind, a.date, a.topic, a.toGo, a.total]).toEqual(['HW', '2026-11-04', 'M & N', 2, 3]) })
  it('V07-OV-04 today first, then a stable order', () => { const k = cards().map((c) => c.subjectKey); expect(k.slice(0, 2).sort()).toEqual(['A_ENG_HW', 'B_ENG_CW']); expect(overviewCards(st, '2026-11-04').map((c) => c.subjectKey)).toEqual(k) })
  it('V07-OV-05 a class with no dates still appears, with no session', () => { const s2 = { ...st, subjects: [...st.subjects, { subjectKey: 'D_ENG_CW', classKey: 'D', subject: 'English', kind: 'CW', active: true }] }; const d = overviewCards(s2, '2026-11-04').find((c) => c.subjectKey === 'D_ENG_CW')!; expect(d.sessionId).toBeNull() })
})
describe('v0.7j week path (F-OV-04)', () => {
  const w = () => weekPath(st, 'A_ENG_HW', '2026-11-04')
  it('V07-WP-01 only that class+subject', () => expect(w().flatMap((x) => x.stops).every((s) => s.sessionId.startsWith('a'))).toBe(true))
  it('V07-WP-02 newest week first (this week, then older), Mon→Fri inside', () => { expect(w().map((x) => x.start)).toEqual(['2026-11-02', '2026-10-26']); expect(w()[0]!.stops.map((s) => s.date)).toEqual(['2026-11-02', '2026-11-04', '2026-11-06']) })
  it('V07-WP-03 today/past/future marks', () => expect(w()[0]!.stops.map((s) => s.when)).toEqual(['past', 'today', 'future']))
  it('V07-WP-04 week titles: This week · Last week · date range', () => expect(w().map((x) => x.title)).toEqual(['This week · 2–8 Nov', 'Last week · 26 Oct – 1 Nov']))
})
describe('v0.7 dates (F-DT-05, F-OV-05)', () => {
  it('V07-DT-01 same label same day collides; other label does not', () => { expect(collides(st, 'A_ENG_HW', '2026-11-06')).toBe(true); expect(collides(st, 'A_PHO_CW', '2026-11-06')).toBe(false) })
  it('V07-DT-02 moving a session onto its own day is not a collision', () => expect(collides(st, 'A_ENG_HW', '2026-11-06', 'a4')).toBe(false))
  it('V07-DT-03 next class day follows the class weekdays, skips taken days', () => expect(nextClassDay(st, 'A_ENG_HW', '2026-11-04')).toBe('2026-11-09'))
})

// S2 (v0.6.1 lock): no save wording on screen; only the status dot carries it (as its label).
import { render as renderS2, cleanup as cleanupS2 } from '@testing-library/react'
import { App as AppS2 } from '../src/App'
import { useApp as useAppS2 } from '../src/store/store'
describe('V07-S2 quiet save state', () => {
  it('V07-S2-01 footer shows no saved/saving/waiting text', () => {
    cleanupS2(); localStorage.clear(); useAppS2.getState().reset()
    const { container } = renderS2(<AppS2 />)
    const foot = container.querySelector('.sow-foot')!.textContent!
    expect(foot).toMatch(/Driftline/); expect(foot).not.toMatch(/sav|waiting|on this device/i)
  })
  it('V07-S2-02 status dot still has an accessible label', () => {
    cleanupS2(); localStorage.clear(); useAppS2.getState().reset()
    const { container } = renderS2(<AppS2 />)
    expect(container.querySelector('.sow-dot')!.getAttribute('aria-label')).toBeTruthy()
  })
})
