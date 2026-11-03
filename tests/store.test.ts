// D0-STO-01..03: single zustand store; demo data only
import { describe, it, expect, beforeEach } from 'vitest'
import { useApp } from '../src/store/store'

describe('store', () => {
  beforeEach(() => { localStorage.clear(); useApp.getState().reset() })
  it('D0-STO-01 starts on Checklist with the demo class and no dates', () => {
    const s = useApp.getState()
    expect(s.tab).toBe('checklist')
    expect(s.classes[0].label).toBe('KG-A')
    expect(s.sessions).toHaveLength(0)
    expect(s.source).toBe('demo')
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
