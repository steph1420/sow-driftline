// D0-STO-01..03: single zustand store; demo data only
import { describe, it, expect, beforeEach } from 'vitest'
import { useApp } from '../src/store/store'

describe('store', () => {
  beforeEach(() => { localStorage.clear(); useApp.getState().reset() })
  // D1 changed D0-STO-01: demo now carries made-up dates so the checklist has something to show.
  it('D0-STO-01/D1-STO-01 starts on Checklist with the demo class and demo dates, not paired', () => {
    const s = useApp.getState()
    expect(s.tab).toBe('checklist')
    expect(s.classes[0].label).toBe('KG-A')
    expect(s.data.sessions.length).toBeGreaterThan(0)
    expect(s.source).toBe('demo')
  })
  it('D1-STO-02 the pairing token lives only under the sow-driftline namespace and unpair clears it', () => {
    useApp.getState().setToken('t-test')
    expect(localStorage.getItem('sow-driftline:copyToken:v1')).toBe('t-test')
    useApp.getState().unpair()
    expect(localStorage.getItem('sow-driftline:copyToken:v1')).toBeNull()
    expect(useApp.getState().source).toBe('demo')
  })
  it('D0-STO-02 switches tabs', () => {
    useApp.getState().setTab('more')
    expect(useApp.getState().tab).toBe('more')
  })
  it('D0-STO-03 saves prefs only under the sow-driftline namespace', () => {
    useApp.getState().setSide('day')
    expect(localStorage.getItem('sow-driftline:prefs:v1')).toContain('day')
    expect(Object.keys(localStorage).every((k) => k.startsWith('sow-driftline:'))).toBe(true)
  })
})
