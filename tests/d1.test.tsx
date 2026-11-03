// D1 read-only checklist — written before the code (failing first).
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
afterEach(cleanup)
import { pickAnchor, visibleCols, toChecklist, toGo, letterIndex, searchIndex } from '../src/data/model'
import { sheetBridgeSource, COPY_SHEET_ID, LIVE_SHEET_ID, READ_ACTIONS } from '../src/data/sheetSource'
import { fakeSource, DEMO_STATE } from '../src/data/fakeSource'
import type { SheetState } from '../src/data/contract'

const st: SheetState = {
  ok: true, schema: 1,
  subjects: [{ subjectKey: 'A_ENG_CW', classKey: 'A', subject: 'English', kind: 'CW', active: true }],
  roster: [
    { classKey: 'A', roll: 2, name: 'Zoya Imran', status: 'Active', updatedAt: '' },
    { classKey: 'A', roll: 1, name: 'Aarav Rohan Fenwick', status: 'Active', updatedAt: '' },
    { classKey: 'A', roll: 3, name: 'Left Kid', status: 'Left', updatedAt: '' },
    { classKey: 'B', roll: 1, name: 'Other Class', status: 'Active', updatedAt: '' },
  ],
  sessions: [
    { sessionId: 's2', subjectKey: 'A_ENG_CW', classKey: 'A', date: '2026-11-03', topic: '', status: 'Open', updatedAt: '' },
    { sessionId: 's1', subjectKey: 'A_ENG_CW', classKey: 'A', date: '2026-11-02', topic: '', status: 'Open', updatedAt: '' },
  ],
  ticks: [{ tickId: 't', sessionId: 's1', subjectKey: 'A_ENG_CW', classKey: 'A', roll: 1, set: true, updatedAt: '' }],
}

describe('D1 model', () => {
  it('D1-CHIP-01 Today when today has a column', () => expect(pickAnchor(['2026-11-02', '2026-11-04'], '2026-11-04')).toEqual({ kind: 'today', index: 1 }))
  it('D1-CHIP-02 Upcoming when today has no column but a later one exists', () => expect(pickAnchor(['2026-11-02', '2026-11-05'], '2026-11-04')).toEqual({ kind: 'upcoming', index: 1 }))
  it('D1-CHIP-03 Last when all dates are past', () => expect(pickAnchor(['2026-11-01', '2026-11-02'], '2026-11-04')).toEqual({ kind: 'last', index: 1 }))
  it('D1-CHIP-04 none when no dates', () => expect(pickAnchor([], '2026-11-04')).toEqual({ kind: 'none', index: -1 }))
  it('D1-COL-01 phone portrait shows max 2 columns ending at the anchor', () => {
    expect(visibleCols(5, 3, 'phone')).toEqual([2, 3])
    expect(visibleCols(1, 0, 'phone')).toEqual([0])
    expect(visibleCols(12, 11, 'desktop').length).toBe(9)
  })
  it('D1-MODEL-01 active pupils of the class, roll order, ticks by session', () => {
    const c = toChecklist(st, 'A')
    expect(c.pupils.map((p) => p.roll)).toEqual([1, 2])
    expect(c.columns.map((x) => x.date)).toEqual(['2026-11-02', '2026-11-03'])
    expect(c.ticked('s1', 1)).toBe(true)
    expect(c.ticked('s2', 1)).toBe(false)
  })
  it('D1-TOGO-01 N to go counts unticked active pupils', () => expect(toGo(toChecklist(st, 'A'), 's1')).toBe(1))
  it('D1-AZ-01 A–Z and search match the full name', () => {
    const names = ['Aarav Rohan Fenwick', 'Mohammed Elias Thornbury', 'Zoya Imran']
    expect(letterIndex(names, 'M')).toBe(1)
    expect(searchIndex(names, 'thornb')).toBe(1)
    expect(searchIndex(names, 'xyz')).toBe(-1)
  })
})

describe('D1 sheet adapter (read-only, COPY only)', () => {
  it('D1-RO-01 only read actions are ever sent', async () => {
    const calls: string[] = []
    const fetcher = vi.fn(async (_u: string, init: { body: string }) => {
      const b = JSON.parse(init.body); calls.push(b.action)
      return { ok: true, json: async () => (b.action === 'ping' ? { ok: true, schema: 1, sheetId: COPY_SHEET_ID } : st) } as Response
    })
    const src = sheetBridgeSource('https://x/exec', () => 'tok', fetcher as never)
    await src.pull()
    expect(calls.every((a) => READ_ACTIONS.includes(a))).toBe(true)
    expect(READ_ACTIONS).not.toContain('push')
  })
  it('D1-RO-02 refuses any sheet that is not the COPY (never LIVE)', async () => {
    const fetcher = async () => ({ ok: true, json: async () => ({ ok: true, schema: 1, sheetId: LIVE_SHEET_ID }) }) as Response
    await expect(sheetBridgeSource('https://x/exec', () => 'tok', fetcher as never).pull()).rejects.toThrow(/not the test copy/i)
  })
  it('D1-FAKE-01 demo source uses made-up names only', async () => {
    const s = await fakeSource(DEMO_STATE).pull()
    expect(s.roster.length).toBeGreaterThan(10)
  })
})

describe('D1 checklist UI', () => {
  it('D1-UI-01 tapping a name shows the full name toast', async () => {
    const { Checklist } = await import('../src/screens/Checklist')
    render(<Checklist state={st} classKey="A" today="2026-11-03" layout="phone" />)
    fireEvent.click(screen.getByText('Aarav Rohan Fenwick'))
    expect(screen.getByRole('status').textContent).toContain('Aarav Rohan Fenwick')
  })
  // D2 changed D1-UI-02: ticks are buttons only when onTick is given (writes)
  it('D1-UI-02 soft "N to go" and read-only ticks without onTick', async () => {
    const { Checklist } = await import('../src/screens/Checklist')
    render(<Checklist state={st} classKey="A" today="2026-11-03" layout="phone" />)
    expect(screen.getByText(/2 to go/)).toBeTruthy()
    expect(document.querySelectorAll('button.t').length).toBe(0)
  })
  it('D1-UI-03 a class with no dates shows the calm empty state', async () => {
    const { Checklist } = await import('../src/screens/Checklist')
    render(<Checklist state={{ ...st, sessions: [] }} classKey="A" today="2026-11-03" layout="phone" />)
    expect(screen.getByRole('heading', { name: 'No dates yet' })).toBeTruthy()
  })
})
