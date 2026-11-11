// v0.10.0-beta.1 (t209u–t212u, locked 11 Nov 2026 IST): Admin (Load a snapshot, Rewind to a time, Start new year, Past
// years + pull in) and Sync › Review with the pop-up Undo. Demo data and made-up names only; the live sheet is never used.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react'
import { App } from '../src/App'
import { useApp } from '../src/store/store'
import { diffPlan, planWords, stateAtFromJournal, stateAtFromLog, rewindFloor, rewindPicks, pullPlan, newYearPlan, currentYear, shiftDate, type JournalEntry } from '../src/admin/core'
import { OpLog } from '../src/oplog/log'
import { schoolState, pastSchoolState } from '../src/data/demoSchool'
import { yearFrom } from '../src/data/schoolYear'
import type { SheetState } from '../src/data/contract'

const today = '2026-11-04'
const S = () => schoolState(today)
const on = (s: SheetState) => s.ticks.filter((t) => t.set).length
const demo = () => { localStorage.clear(); history.replaceState(null, '', `/?demo=school&today=${today}`); useApp.getState().reset() }
const firstOpen = () => { const s = useApp.getState(); const ses = s.data.sessions[0]!; const r = s.data.roster.find((p) => p.classKey === ses.classKey)!; return { ses, roll: r.roll } }
const isOn = (sid: string, roll: number) => useApp.getState().data.ticks.some((t) => t.sessionId === sid && t.roll === roll && t.set)

describe('v0.10 admin core (pure)', () => {
  it('V10-C-01 diffPlan finds ticks on/off, dates added/removed/moved and topics; the plan of a state to itself is empty', () => {
    const a = S(); expect(planWords(diffPlan(a, a))).toBe('')
    const t = a.ticks.find((x) => x.set)!; const b: SheetState = { ...a, ticks: a.ticks.map((x) => (x === t ? { ...x, set: false } : x)), sessions: a.sessions.slice(1).map((x, i) => (i === 0 ? { ...x, topic: 'New topic' } : x)) }
    const p = diffPlan(a, b)
    expect(p.ticksOff.length).toBe(t.sessionId === a.sessions[0]!.sessionId ? 0 : 1); expect(p.removeSessions.map((x) => x.sessionId)).toEqual([a.sessions[0]!.sessionId]); expect(p.topics.length).toBe(1)
    expect(diffPlan(b, a).addSessions.length).toBe(1)
    const moved: SheetState = { ...a, sessions: a.sessions.map((x, i) => (i === 2 ? { ...x, date: '2026-11-30' } : x)) }
    expect(diffPlan(a, moved).moves.length).toBe(1); expect(diffPlan(a, moved, { keepDates: true }).moves.length).toBe(0)
  })
  it('V10-C-02 planWords says it plainly', () => {
    const a = S(); const b: SheetState = { ...a, ticks: a.ticks.map((x) => ({ ...x, set: false })), sessions: a.sessions.slice(1) }
    expect(planWords(diffPlan(a, b))).toMatch(/^remove \d+ ticks and remove 1 date$/)
  })
  it('V10-C-03 Rewind from this device’s change list: every change after the time goes back, older ones stay', () => {
    const a = S(); const ses = a.sessions[0]!; const roll = a.roster.find((p) => p.classKey === ses.classKey)!.roll
    const op = (set: boolean, at: string) => ({ sessionId: ses.sessionId, subjectKey: ses.subjectKey, classKey: ses.classKey, date: ses.date, roll, set, updatedAt: at })
    const was = a.ticks.some((t) => t.sessionId === ses.sessionId && t.roll === roll && t.set)
    const j: JournalEntry[] = [{ at: '2026-11-04T09:00:00.000Z', tick: { op: op(!was, '2026-11-04T09:00:00.000Z'), before: was } }, { at: '2026-11-04T10:00:00.000Z', tick: { op: op(was, '2026-11-04T10:00:00.000Z'), before: !was } }]
    const cur = { ...a, ticks: a.ticks.map((t) => (t.sessionId === ses.sessionId && t.roll === roll ? { ...t, set: was } : t)) }
    const at930 = stateAtFromJournal(cur, j, '2026-11-04T09:30:00.000Z')
    expect(at930.ticks.some((t) => t.sessionId === ses.sessionId && t.roll === roll && t.set)).toBe(!was)
    expect(stateAtFromJournal(cur, j, '2026-11-04T08:00:00.000Z').ticks.some((t) => t.sessionId === ses.sessionId && t.roll === roll && t.set)).toBe(was)
  })
  it('V10-C-04 Rewind on the op log: fold only what was made by then (two devices)', () => {
    let n = 0; const a = new OpLog('dA', () => ++n); const b = new OpLog('dB', () => 1)
    a.local('subject.add', 'K', { classKey: 'KG-A', subject: 'English', kind: 'CW', order: 1 }, '2026-11-04T08:00:00.000Z')
    a.local('session.add', 'K|2026-11-02', { subjectKey: 'K', classKey: 'KG-A', date: '2026-11-02' }, '2026-11-04T08:01:00.000Z')
    a.local('tick.set', 'K|2026-11-02|1', true, '2026-11-04T09:00:00.000Z')
    b.receive(a.ops()); b.local('tick.set', 'K|2026-11-02|2', true, '2026-11-04T11:00:00.000Z'); a.receive(b.ops())
    const roster = [{ classKey: 'KG-A', roll: 1, name: 'Asha Demo' }, { classKey: 'KG-A', roll: 2, name: 'Ravi Sample' }]
    expect(on(stateAtFromLog(a.base, a.ops(), a.rules, roster, '2026-11-04T10:00:00.000Z'))).toBe(1)
    expect(on(stateAtFromLog(a.base, a.ops(), a.rules, roster, '2026-11-04T12:00:00.000Z'))).toBe(2)
    expect(stateAtFromLog(a.base, a.ops(), a.rules, roster, '2026-11-04T08:00:30.000Z').sessions.length).toBe(0)
  })
  it('V10-C-05 Rewind can’t cross the start of the school year (1 April IST) or the last Start new year', () => {
    expect(rewindFloor('2026-11-04', null)).toBe('2026-03-31T18:30:00.000Z')
    expect(rewindFloor('2026-11-04', '2026-11-01T10:00:00.000Z')).toBe('2026-11-01T10:00:00.000Z')
    expect(rewindFloor('2027-02-04', null)).toBe('2026-03-31T18:30:00.000Z')
    expect(rewindPicks(['2026-03-01T00:00:00.000Z', '2026-11-04T09:00:00.000Z', '2026-11-04T09:10:00.000Z', '2026-11-04T12:00:00.000Z'], rewindFloor('2026-11-04', null))).toEqual(['2026-11-04T11:59:59.999Z', '2026-11-04T08:59:59.999Z'])
  })
  it('V10-C-06 Start new year hides every date of every class; the year moves on', () => {
    const a = S(); const p = newYearPlan(a); expect(p.removeSessions.length).toBe(a.sessions.length); expect(p.ticksOff.length).toBe(0)
    expect(currentYear(today, null).label).toBe('2026–27'); expect(currentYear(today, '2027-28').label).toBe('2027–28'); expect(currentYear(today, '2025-26').label).toBe('2026–27')
  })
  it('V10-C-07 Pull from a past year adds alongside, never replaces; dates land on the same weekday this year', () => {
    const past = pastSchoolState(yearFrom(2025), yearFrom(2026)); const cur = S()
    expect(shiftDate('2025-11-10', 1)).toBe('2026-11-09')
    const kids = past.roster.filter((p) => p.classKey === past.roster[0]!.classKey).slice(0, 2)
    const r = pullPlan(past, cur, { children: kids.map((k) => ({ classKey: k.classKey, roll: k.roll })), into: 'KG-A' }, 1, '2026-11-04T10:00:00.000Z', '2026–27')
    // the demo's pupils are the same children a year older: their names are already in KG-A, so nothing is replaced
    expect(r.pupils.length + r.skipped).toBe(2)
    const fresh = { ...cur, roster: cur.roster.filter((p) => p.classKey !== 'KG-A') }
    const r2 = pullPlan(past, fresh, { children: kids.map((k) => ({ classKey: k.classKey, roll: k.roll })), into: 'KG-A' }, 1, 'x', '2026–27')
    expect(r2.pupils.map((p) => p.name)).toEqual(kids.map((k) => k.name)); expect(r2.words).toMatch(/^This will add 2 children to KG-A, in 2026–27\./)
    const sub = cur.subjects.find((x) => x.classKey === 'KG-A')!; const pastSub = { ...past, subjects: [{ ...sub }], sessions: past.sessions.filter((s) => s.subjectKey === past.subjects[0]!.subjectKey).map((s) => ({ ...s, subjectKey: sub.subjectKey, sessionId: `${sub.subjectKey}|${s.date}` })) }
    const d = pullPlan(pastSub, cur, { dates: sub.subjectKey }, 1, 'x')
    const have = new Set(cur.sessions.filter((s) => s.subjectKey === sub.subjectKey).map((s) => s.date))
    expect(d.plan.addSessions.length).toBeGreaterThan(0); expect(d.plan.addSessions.every((s) => !have.has(s.date))).toBe(true)
    expect(d.plan.removeSessions.length + d.plan.ticksOff.length + d.plan.topics.length).toBe(0)
  })
})

describe('v0.10 admin store (demo)', () => {
  beforeEach(demo)
  afterEach(() => { localStorage.clear(); history.replaceState(null, '', '/') })
  it('V10-S-01 Rewind puts back every change after the time as new changes; Undo brings them back', async () => {
    const { ses, roll } = firstOpen(); const was = isOn(ses.sessionId, roll)
    const t0 = new Date(Date.now() - 5).toISOString(); await new Promise((r) => setTimeout(r, 10))
    useApp.getState().tick(ses.sessionId, roll); expect(isOn(ses.sessionId, roll)).toBe(!was)
    const pre = useApp.getState().adminRewindPreview(t0); expect(pre.ok).toBe(true); expect(pre.words).toMatch(/1 tick/)
    useApp.getState().adminRewind(t0); expect(isOn(ses.sessionId, roll)).toBe(was); expect(useApp.getState().adminUndos).toBe(1)
    useApp.getState().adminUndo(); expect(isOn(ses.sessionId, roll)).toBe(!was); expect(useApp.getState().adminUndos).toBe(0)
  })
  it('V10-S-02 Rewind refuses a time before the start of the school year', () => {
    const r = useApp.getState().adminRewindPreview('2026-01-01T00:00:00.000Z'); expect(r.ok).toBe(false); expect(r.words).toMatch(/start of this school year/)
    const before = JSON.stringify(useApp.getState().data); useApp.getState().adminRewind('2026-01-01T00:00:00.000Z'); expect(JSON.stringify(useApp.getState().data)).toBe(before)
  })
  it('V10-S-03 Load a snapshot brings ticks and dates back; Undo goes back to before the Load', () => {
    const { ses, roll } = firstOpen(); const was = isOn(ses.sessionId, roll)
    useApp.getState().snapshotNow('Backed up'); const at = useApp.getState().snaps[0]!.at
    useApp.getState().tick(ses.sessionId, roll); const n = useApp.getState().data.sessions.length
    const sub = useApp.getState().data.subjects[0]!; useApp.getState().addSession(sub.subjectKey, '2026-12-30')
    expect(useApp.getState().data.sessions.length).toBe(n + 1)
    expect(useApp.getState().adminLoadPreview(at)).toMatch(/1 tick/)
    useApp.getState().adminLoad(at); expect(isOn(ses.sessionId, roll)).toBe(was); expect(useApp.getState().data.sessions.length).toBe(n)
    useApp.getState().adminUndo(); expect(isOn(ses.sessionId, roll)).toBe(!was); expect(useApp.getState().data.sessions.length).toBe(n + 1)
  })
  it('V10-S-04 Start new year: every class starts fresh, the year is put aside and opens in Past years; Undo brings it all back', () => {
    const n = useApp.getState().data.sessions.length; const ticks = on(useApp.getState().data)
    expect(useApp.getState().yearNow().label).toBe('2026–27')
    useApp.getState().adminNewYear()
    expect(useApp.getState().data.sessions.length).toBe(0); expect(useApp.getState().yearNow().label).toBe('2027–28')
    const py = useApp.getState().pastYears(); expect(py[0]!.label).toBe('2026–27'); expect(py[0]!.state.sessions.length).toBe(n)
    useApp.getState().adminUndo(); expect(useApp.getState().data.sessions.length).toBe(n); expect(on(useApp.getState().data)).toBe(ticks)
    expect(useApp.getState().yearNow().label).toBe('2026–27'); expect(useApp.getState().pastYears()[0]!.label).not.toBe('2026–27')
  })
  it('V10-S-05 Pull dates and children from a past year: added next to this year’s work, nothing replaced; Undo takes them out', () => {
    useApp.getState().adminNewYear() // 2026–27 put aside: now pull from it into 2027–28
    const past = useApp.getState().pastYears()[0]!; const sub = past.state.subjects[0]!
    const kid = past.state.roster.find((p) => p.classKey === sub.classKey)!
    const r = useApp.getState().adminPullPreview(past.id, { dates: sub.subjectKey, children: [{ classKey: kid.classKey, roll: kid.roll }] })
    expect(r.words).toMatch(/This will add .*date/)
    const before = useApp.getState().data.roster.length
    useApp.getState().adminPull(past.id, { dates: sub.subjectKey, children: [{ classKey: kid.classKey, roll: kid.roll }] })
    const got = useApp.getState().data.sessions.filter((s) => s.subjectKey === sub.subjectKey)
    expect(got.length).toBe(past.state.sessions.filter((s) => s.subjectKey === sub.subjectKey).length)
    expect(got.every((s) => s.date > '2027-01-01')).toBe(true)
    expect(useApp.getState().data.roster.length).toBe(before) // the same child is already in the class: kept once
    useApp.getState().adminUndo(); expect(useApp.getState().data.sessions.length).toBe(0)
  })
  it('V10-S-06 Review: Change saves the other answer as a new change; Undo puts the kept one back', () => {
    history.replaceState(null, '', `/?demo=school&today=${today}&clashes=1`); useApp.getState().reset()
    const c = useApp.getState().reviewList(); expect(c.length).toBeGreaterThan(0)
    const tick = c.find((x) => x.field === 'tick')!; const before = isOn(tick.sessionId!, tick.roll!)
    useApp.getState().reviewChange(tick); expect(isOn(tick.sessionId!, tick.roll!)).toBe(!before); expect(useApp.getState().reviewUndos).toBe(1)
    useApp.getState().reviewUndo(); expect(isOn(tick.sessionId!, tick.roll!)).toBe(before); expect(useApp.getState().reviewUndos).toBe(0)
  })
  it('V10-S-07 nothing big happens while a past year is shown', () => {
    useApp.getState().setDev({ pastSessions: true }); useApp.getState().viewYear('2025-26'); const n = useApp.getState().data.sessions.length
    useApp.getState().adminNewYear(); expect(useApp.getState().data.sessions.length).toBe(n); expect(useApp.getState().adminUndos).toBe(0)
  })
})

describe('v0.10 admin screens', () => {
  const open = (q = '') => { cleanup(); localStorage.clear(); history.replaceState(null, '', `/?demo=school&today=${today}${q}`); useApp.getState().reset(); render(<App />); fireEvent.click(screen.getByRole('tab', { name: 'Settings' })) }
  afterEach(() => { cleanup(); localStorage.clear(); history.replaceState(null, '', '/') })
  it('V10-U-01 Settings › Admin opens the four cards; the Undo pill shows only when there is something to undo', async () => {
    open(); fireEvent.click(screen.getByRole('button', { name: /^Admin/ }))
    for (const t of ['Load a snapshot', 'Rewind to a time', 'Start new year', 'Past years']) expect(screen.getByRole('button', { name: new RegExp(`^${t}`) })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Undo/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /^Start new year/ })); fireEvent.click(screen.getByRole('button', { name: 'Start new year' }))
    const pill = screen.getByRole('button', { name: /^Undo/ }); expect(pill).toBeTruthy()
    act(() => { fireEvent.click(pill) }); await waitFor(() => expect(screen.queryByRole('button', { name: /^Undo/ })).toBeNull())
  })
  it('V10-U-02 Sync › Review lists clashes; Change asks first; the Undo pill appears after, and not on other Settings pages', async () => {
    open('&clashes=1'); fireEvent.click(screen.getByRole('button', { name: /^Sync/ })); fireEvent.click(screen.getByRole('button', { name: /^Review/ }))
    expect(screen.queryByRole('button', { name: /^Undo/ })).toBeNull()
    fireEvent.click(screen.getAllByRole('button', { name: /^Change/ })[0]!)
    expect(screen.getByRole('dialog')).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: 'Change' }))
    expect(screen.getByRole('button', { name: /^Undo/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Back to Sync/ })); await waitFor(() => expect(screen.queryByRole('button', { name: /^Undo/ })).toBeNull())
  })
})
