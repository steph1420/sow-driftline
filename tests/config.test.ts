// D0-CFG-01..03: one config module; namespace separate from /sow/
import { describe, it, expect } from 'vitest'
import { CONFIG, storageKey } from '../src/config'

describe('config', () => {
  it('D0-CFG-01 uses its own namespace, never the old SoW one', () => {
    expect(CONFIG.namespace).toBe('sow-driftline')
    expect(CONFIG.idbName).toBe('sow-driftline')
    expect(storageKey('prefs')).toBe('sow-driftline:prefs:v1')
    expect(storageKey('prefs').startsWith('sow:')).toBe(false)
  })
  it('D0-CFG-02 keeps locked timings', () => {
    expect(CONFIG.timing.pendingGraceMs).toBe(3000)
    expect(CONFIG.timing.panelSettlePx).toBe(24)
    expect(CONFIG.timing.panelSettleMs).toBe(120)
  })
  it('D0-CFG-03 locked layout (r4, R13 A)', () => {
    expect(CONFIG.layout.phoneMaxDateCols).toBe(2)
    expect(CONFIG.layout.phoneNameShare).toBe(0.5)
    expect(CONFIG.layout.headerHeightPx).toBeLessThanOrEqual(56)
  })
})
