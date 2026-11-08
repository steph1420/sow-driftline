// v0.8 Phase 6 (S1, F-ST-01..10, F-SH-06): Settings replaces More; update-ready dot; never reload mid-work. Demo data only.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, within, act } from '@testing-library/react'
import { App } from '../src/App'
import { useApp } from '../src/store/store'
import { startUpdates } from '../src/sync/updates'

const settings = () => { cleanup(); localStorage.clear(); history.replaceState(null, '', '/?demo=school&today=2026-11-04'); useApp.getState().reset(); render(<App />); fireEvent.click(screen.getByRole('tab', { name: 'Settings' })) }
const row = (name: RegExp | string) => screen.getByRole('button', { name })

describe('P6 Settings (S1)', () => {
  afterEach(() => { cleanup(); localStorage.clear(); history.replaceState(null, '', '/') })
  it('V08-P6-01 the dock is Overview · Checklist · Settings; Settings shows the S1 groups', () => {
    settings()
    expect(screen.getAllByRole('tab').map((t) => t.getAttribute('aria-label'))).toEqual(['Overview', 'Checklist', 'Settings'])
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy()
    for (const g of ['Appearance', 'Sync & pairing', 'Backups', 'App']) expect(screen.getByRole('group', { name: g })).toBeTruthy()
  })
  it('V08-P6-02 Theme Night | Day | Auto, and Contrast Standard | High set the Driftline theme', () => {
    settings(); const theme = screen.getByRole('group', { name: 'Theme' })
    fireEvent.click(within(theme).getByRole('button', { name: 'Day' }))
    expect(useApp.getState().side).toBe('day'); expect(document.documentElement.dataset.theme).toBe('utopian-day')
    fireEvent.click(row(/^Contrast, Standard/)); fireEvent.click(screen.getByRole('radio', { name: 'High' }))
    expect(document.documentElement.dataset.theme).toBe('contrast-day')
    fireEvent.click(screen.getByRole('button', { name: 'Back to Settings' })); expect(row(/^Contrast, High/)).toBeTruthy()
  })
  it('V08-P6-03 Sync shows the status dot only and opens the connection page (code, setup file, demo note)', () => {
    settings(); const sync = row(/^Sync, /)
    expect(sync.getAttribute('aria-label')).toBe('Sync, Demo, saved on this device'); expect(sync.querySelector('.sow-dot')).toBeTruthy()
    fireEvent.click(sync); expect(screen.getByRole('heading', { name: 'Sync' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: '6-digit code' })).toBeTruthy(); expect(screen.getByLabelText('Setup file')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Back to Settings' })); fireEvent.click(row('Pair a device, Not paired'))
    expect(screen.getByRole('textbox', { name: 'Device name' })).toBeTruthy()
  })
  it('V08-P6-04 Back up now adds a snapshot and the Snapshots row shows its time; the page lists Restore rows', () => {
    settings(); const before = useApp.getState().snaps.length
    fireEvent.click(row('Back up now')); expect(useApp.getState().snaps.length).toBe(before + 1)
    expect(row(/^Snapshots, Today, \d{2}:\d{2}/)).toBeTruthy()
    fireEvent.click(row(/^Snapshots/)); expect(screen.getAllByRole('button', { name: /^Restore / }).length).toBeGreaterThan(0)
  })
  it('V08-P6-05 Developer options hold the jargon: A–Z side, swipe to tick, letter bubble, release channel', () => {
    settings(); fireEvent.click(row('Developer options'))
    for (const g of ['A–Z side', 'Swipe to tick', 'Letter bubble']) expect(screen.getByRole('group', { name: g })).toBeTruthy()
    fireEvent.click(within(screen.getByRole('group', { name: 'A–Z side' })).getByRole('button', { name: 'Left' })); expect(useApp.getState().dev.railSide).toBe('left')
    expect(screen.getByRole('link', { name: 'Beta' }).getAttribute('href')).toMatch(/sow-driftline-beta\/$/)
  })
  it('V08-P6-06 About shows the version with the Stable/Beta label', () => {
    settings(); const about = row(/^About, /); expect(about.getAttribute('aria-label')).toMatch(/^About, (test|\d+\.\d+\.\d+) · (Stable|Beta)$/)
    fireEvent.click(about); expect(screen.getByText(/^Version /)).toBeTruthy()
  })
  it('V08-P6-07 Updates: no dot until an update is ready; then a quiet dot and a Restart button that applies it', () => {
    settings(); expect(row('Updates').querySelector('.sow-dot')).toBeNull()
    const apply = vi.fn(); act(() => useApp.getState().setUpdate({ ready: true, apply }))
    expect(row(/^Updates, update ready/).querySelector('.sow-dot')).toBeTruthy()
    fireEvent.click(row(/^Updates/)); fireEvent.click(screen.getByRole('button', { name: 'Restart to update' })); expect(apply).toHaveBeenCalled()
  })
  it('V08-P6-08 the ⋮ menu opens Settings; a remembered "more" tab opens Settings', () => {
    cleanup(); localStorage.clear(); localStorage.setItem('sow-driftline:lastTab:v1', 'more'); useApp.getState().reset()
    expect(useApp.getState().tab).toBe('settings')
  })
})

describe('P6 updates (F-SH-06): check on return, never reload mid-work', () => {
  type Hooks = { onNeedRefresh?: () => void; onRegisteredSW?: (url: string, r: { update: () => Promise<void> } | undefined) => void }
  const fake = () => { let hooks: Hooks = {}; const update = vi.fn(async () => {}); const reload = vi.fn(async () => {})
    return { register: (h: Hooks) => { hooks = h; h.onRegisteredSW?.('sw.js', { update }); return reload }, fire: () => hooks.onNeedRefresh?.(), update, reload } }
  it('V08-P6-09 an update found before any tap applies straight away (next open)', () => {
    const f = fake(); const onReady = vi.fn(); startUpdates({ register: f.register, onReady, target: new EventTarget(), visible: () => true })
    f.fire(); expect(f.reload).toHaveBeenCalledWith(true); expect(onReady).not.toHaveBeenCalled()
  })
  it('V08-P6-10 after the teacher has started work, an update only shows the dot; apply() is the only reload', () => {
    const f = fake(); const t = new EventTarget(); const onReady = vi.fn(); const u = startUpdates({ register: f.register, onReady, target: t, visible: () => true })
    t.dispatchEvent(new Event('pointerdown')); f.fire()
    expect(f.reload).not.toHaveBeenCalled(); expect(onReady).toHaveBeenCalledTimes(1)
    u.apply(); expect(f.reload).toHaveBeenCalledWith(true)
  })
  it('V08-P6-11 checks once each time the app comes back into view', () => {
    const f = fake(); const t = new EventTarget(); let vis = false; startUpdates({ register: f.register, onReady: () => {}, target: t, visible: () => vis })
    t.dispatchEvent(new Event('visibilitychange')); expect(f.update).not.toHaveBeenCalled()
    vis = true; t.dispatchEvent(new Event('visibilitychange')); expect(f.update).toHaveBeenCalledTimes(1)
  })
})
