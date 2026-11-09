// v0.8 Phase 9 (O3-session, O3-session-past2, G5d-past; F-SH-08/09, F-DT-08): session switch behind a flag, past years view-only. Demo data only.
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within, act } from '@testing-library/react'
import { App } from '../src/App'
import { useApp } from '../src/store/store'
import { recentYears, yearOf } from '../src/data/schoolYear'

const start = (flag: boolean) => {
  cleanup(); localStorage.clear(); history.replaceState(null, '', '/?demo=school&today=2026-11-04'); useApp.getState().reset()
  if (flag) useApp.getState().setDev({ pastSessions: true })
  render(<App />)
}
const openPast = () => { fireEvent.click(screen.getByRole('button', { name: 'Session, 2026–27' })); fireEvent.click(within(screen.getByRole('dialog', { name: 'Session' })).getByRole('button', { name: /^2025–26/ })) }
const storage = () => JSON.stringify(Object.entries(localStorage).sort())

describe('P9 school years', () => {
  it('V08-P9-01 a school year runs April to March', () => {
    expect(yearOf('2026-11-04').label).toBe('2026–27'); expect(yearOf('2026-03-27').label).toBe('2025–26'); expect(yearOf('2026-04-01').id).toBe('2026-27')
    expect(recentYears('2026-11-04').map((y) => y.label)).toEqual(['2026–27', '2025–26', '2024–25'])
  })
})

describe('P9 session switch (flag) and past view', () => {
  afterEach(() => { cleanup(); localStorage.clear(); history.replaceState(null, '', '/') })
  it('V08-P9-02 the flag is off by default: no session control on Overview; Developer options can turn it on', () => {
    start(false)
    expect(useApp.getState().dev.pastSessions).toBe(false)
    expect(screen.queryByRole('button', { name: /^Session, / })).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Settings' })); fireEvent.click(screen.getByRole('button', { name: /^Developer options/ }))
    fireEvent.click(within(screen.getByRole('group', { name: 'Past sessions (preview)' })).getByRole('button', { name: 'On' })); expect(useApp.getState().dev.pastSessions).toBe(true)
  })
  it('V08-P9-03 the Session sheet lists this year (ticked) and two past years, view-only', () => {
    start(true); fireEvent.click(screen.getByRole('button', { name: 'Session, 2026–27' }))
    const sheet = screen.getByRole('dialog', { name: 'Session' })
    expect(within(sheet).getAllByRole('button', { name: /^20/ }).map((b) => b.getAttribute('aria-label'))).toEqual(['2026–27, This year', '2025–26', '2024–25'])
    expect(within(sheet).getByRole('button', { name: '2026–27, This year' }).getAttribute('aria-current')).toBe('true')
    expect(within(sheet).getByText('Past years are view-only')).toBeTruthy()
  })
  it('V08-P9-04 a past year shows its classes and last week in amber, no ＋, and the Viewing pill', () => {
    start(true); openPast()
    expect(useApp.getState().viewing).toBe('2025-26')
    expect(screen.getByRole('button', { name: 'Session, 2025–26' }).className).toContain('past')
    expect(screen.getAllByRole('button', { name: /^Open NUR-[AB] / }).length).toBe(4)
    expect(screen.queryByRole('button', { name: /^Add date/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Open Mon 23 Mar' }).textContent).toBe('Mon 23 Mar')
    const pill = screen.getByRole('status', { name: 'Viewing 2025–26' }); expect(within(pill).getByRole('button', { name: 'Back to now' })).toBeTruthy()
  })
  it('V08-P9-05 no writes are possible in a past year (ticks, dates, topics, undo/redo, restore, snapshots)', () => {
    start(true); openPast()
    const s = useApp.getState(); const data = s.data; const saved = storage(); const sid = data.sessions[0]!.sessionId
    act(() => { s.tick(sid, 1); s.tickMany(sid, [2, 3], true); s.moveSession(sid, '2026-03-30'); s.setTopic(sid, 'x'); s.undo(); s.redo(); s.snapshotNow('x'); s.restore(s.snaps[0]?.at ?? '') })
    expect(s.addSession(data.subjects[0]!.subjectKey, '2026-03-31')).toBe('')
    expect(useApp.getState().data).toBe(data); expect(storage()).toBe(saved)
  })
  it('V08-P9-06 Checklist in a past year: ticks read-only, no undo/redo, the date sheet only flips dates', () => {
    start(true); openPast(); fireEvent.click(screen.getByRole('tab', { name: 'Checklist' }))
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull(); expect(screen.queryByRole('button', { name: 'Redo' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Shortcuts' })); expect(screen.getByRole('button', { name: 'Pending only' })).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: 'Shortcuts' }))
    expect(document.querySelectorAll('button.t').length).toBe(0)
    expect(screen.getByText('2025–26')).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: /^Dates, / })[0]!)
    const sheet = screen.getByRole('dialog', { name: 'Dates' })
    expect(within(sheet).queryByRole('button', { name: 'New date' })).toBeNull(); expect(within(sheet).queryByRole('button', { name: /^Move|^Save/ })).toBeNull()
    expect(within(sheet).getAllByRole('option').length).toBeGreaterThan(1)
    expect(screen.getByRole('status', { name: 'Viewing 2025–26' })).toBeTruthy()
  })
  it('V08-P9-07 Back to now restores this year and ticking works again', async () => {
    start(true); const now = useApp.getState().data; openPast()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Back to now' })) })
    const s = useApp.getState(); expect(s.viewing).toBeNull(); expect(s.data.subjects.map((x) => x.subjectKey)).toEqual(now.subjects.map((x) => x.subjectKey))
    expect(s.classes.some((c) => c.classKey === 'KG-A')).toBe(true); expect(screen.queryByRole('status', { name: /^Viewing/ })).toBeNull()
    const sid = s.data.sessions.find((x) => x.date === '2026-11-04')!.sessionId; const before = s.data.ticks.length
    act(() => s.tick(sid, 2)); expect(useApp.getState().data.ticks.length).not.toBe(before)
  })
  it('V08-P9-09 with the flag on, Settings › Session & names has a Session row that opens the same sheet', () => {
    start(false); fireEvent.click(screen.getByRole('tab', { name: 'Settings' })); expect(screen.queryByRole('button', { name: /^Session, / })).toBeNull()
    act(() => useApp.getState().setDev({ pastSessions: true }))
    fireEvent.click(screen.getByRole('button', { name: 'Session, 2026–27' })); expect(screen.getByRole('dialog', { name: 'Session' })).toBeTruthy()
  })
  it('V08-P9-08 turning the flag off while viewing a past year goes back to now', async () => {
    start(true); openPast()
    await act(async () => { useApp.getState().setDev({ pastSessions: false }) })
    expect(useApp.getState().viewing).toBeNull(); expect(useApp.getState().classes.some((c) => c.classKey === 'KG-A')).toBe(true)
  })
})
