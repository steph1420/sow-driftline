// D0-SHL-01..04: slim bar, dock, empty state (locked r4)
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { App } from '../src/App'
import { useApp } from '../src/store/store'

describe('shell', () => {
  beforeEach(() => { cleanup(); localStorage.clear(); useApp.getState().reset(); useApp.getState().setTab('checklist') /* t113u: app now opens on Overview first; these tests start on Checklist */ })
  it('D0-SHL-01 slim bar has class pill, Undo, Redo and More', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /switch class/i }).textContent).toContain('KG-A')
    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'More options' })).toBeTruthy()
  })
  // v0.7.0 S4 changed D0-SHL-02: v0.7j puts Overview first in the dock (the app still lands on Checklist).
  it('D0-SHL-02 dock has exactly Overview, Checklist, More', () => {
    render(<App />)
    const tabs = screen.getAllByRole('tab').map((t) => t.getAttribute('aria-label'))
    expect(tabs).toEqual(['Overview', 'Checklist', 'More'])
  })
  // D1 changed D0-SHL-03: demo has dates, so the checklist grid shows; the empty state is covered in D1-UI-03.
  // v0.7.0 S4b changed D0-SHL-03: Steve (t101u) swapped the Today/Upcoming/Last chip for a "Pending only" pill.
  it('D0-SHL-03/D1-SHL-03 Checklist shows the grid with a Pending only pill', () => {
    render(<App />)
    expect(screen.getByRole('table')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pending only' }).getAttribute('aria-pressed')).toBe('false')
  })
  it('D0-SHL-04 tapping a dock tab switches screen', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: 'More' }))
    expect(screen.getByRole('heading', { name: 'More' })).toBeTruthy()
  })
})
