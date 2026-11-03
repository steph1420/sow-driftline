// D0-SHL-01..04: slim bar, dock, empty state (locked r4)
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { App } from '../src/App'
import { useApp } from '../src/store/store'

describe('shell', () => {
  beforeEach(() => { cleanup(); localStorage.clear(); useApp.getState().reset() })
  it('D0-SHL-01 slim bar has class pill, Undo, Redo and More', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /switch class/i }).textContent).toContain('KG-A')
    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'More options' })).toBeTruthy()
  })
  it('D0-SHL-02 dock has exactly Checklist, Overview, More', () => {
    render(<App />)
    const tabs = screen.getAllByRole('tab').map((t) => t.getAttribute('aria-label'))
    expect(tabs).toEqual(['Checklist', 'Overview', 'More'])
  })
  it('D0-SHL-03 Checklist shows the calm empty state', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'No dates yet' })).toBeTruthy()
  })
  it('D0-SHL-04 tapping a dock tab switches screen', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: 'More' }))
    expect(screen.getByRole('heading', { name: 'More' })).toBeTruthy()
  })
})
