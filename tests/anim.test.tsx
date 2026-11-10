// anim/proto (t206u): the motion system stays inert where it must (tests / reduced motion) and its numbers are sane.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { DUR, SPRING, STACK, STAGGER } from '../src/config/motion'
import { RollNumber } from '../src/ui/RollNumber'
import { motionTestEnv } from '../src/ui/useMotionOn'

describe('anim/proto motion system', () => {
  it('ANIM-01 every spring is a real spring and every duration is short', () => {
    for (const s of Object.values(SPRING)) { expect(s.type).toBe('spring'); expect(s.stiffness).toBeGreaterThan(0); expect(s.damping).toBeGreaterThan(0) }
    for (const d of Object.values(DUR)) expect(d).toBeLessThanOrEqual(1)
    expect(STAGGER.rowsMax * STAGGER.rows).toBeLessThan(0.3); expect(STACK.scale).toBeLessThan(1)
  })
  it('ANIM-02 motion is off in the test DOM, so a rolling count is plain text in one run', () => {
    expect(motionTestEnv()).toBe(true)
    const { container, rerender } = render(<b><RollNumber value={22} suffix="/24" /></b>)
    expect(container.textContent).toBe('22/24'); expect(container.querySelector('.sow-rolln')).toBeNull()
    rerender(<b><RollNumber value={23} suffix="/24" /></b>); expect(container.textContent).toBe('23/24')
  })
})

// ---- t210u Animation scale ----
import { fireEvent, screen, cleanup, act } from '@testing-library/react'
import { afterEach } from 'vitest'
import { ANIM_SCALES, SPRING as SP, animScaleLabel, cleanAnimScale, cssDurations, effectiveScale, motionKit, scaleSpring } from '../src/config/motion'
import { useApp } from '../src/store/store'
import { storageKey } from '../src/config'
import { Settings } from '../src/screens/settings/Settings'

/** position of a spring released from 0 toward 1 after t seconds (1/10 ms Euler steps) */
function springAt(s: { stiffness: number; damping: number; mass?: number }, t: number) {
  const m = s.mass ?? 1; let x = 0, v = 0; const dt = 1e-5
  for (let i = 0; i < Math.round(t / dt); i++) { const a = (-s.stiffness * (x - 1) - s.damping * v) / m; v += a * dt; x += v * dt }
  return x
}
describe('t210u animation scale', () => {
  afterEach(() => { cleanup(); localStorage.clear(); useApp.setState({ animScale: 1 }); history.replaceState(null, '', '/') })
  it('ANIM-03 (beta.9: ten options) Off … 5× with 1× the default, and junk reads back as 1×', () => {
    expect(ANIM_SCALES.map(animScaleLabel)).toEqual(['Off', '0.25×', '0.5×', '0.75×', '1×', '1.25×', '1.5×', '2×', '3×', '5×'])
    expect(cleanAnimScale(undefined)).toBe(1); expect(cleanAnimScale('2')).toBe(1); expect(cleanAnimScale(3)).toBe(3); expect(cleanAnimScale(1.5)).toBe(1.5); expect(cleanAnimScale(0)).toBe(0)
  })
  it('ANIM-04 a spring at scale k is stiffness / k², damping / k: same shape, k times slower', () => {
    for (const k of [0.5, 1.5, 2]) for (const name of ['snappy', 'pop', 'sheet', 'settle', 'tide'] as const) {
      const base = SP[name]; const s = scaleSpring(base, k)
      expect(s.stiffness).toBeCloseTo(base.stiffness / (k * k)); expect(s.damping).toBeCloseTo(base.damping / k)
      const zeta = (x: { stiffness: number; damping: number; mass?: number }) => x.damping / (2 * Math.sqrt(x.stiffness * (x.mass ?? 1)))
      expect(zeta(s)).toBeCloseTo(zeta(base), 6) // same overshoot
      for (const t of [0.05, 0.12, 0.3]) expect(springAt(s, t * k)).toBeCloseTo(springAt(base, t), 2) // value at k·t = value at t
    }
    expect(scaleSpring(SP.snappy, 1)).toBe(SP.snappy)
  })
  it('ANIM-05 every duration, delay and stagger is multiplied by k; Off is instant; CSS tokens follow', () => {
    const k2 = motionKit(2)
    expect(k2.tween(0.18, { ease: 'easeOut' }, 0.1)).toEqual({ ease: 'easeOut', duration: 0.36, delay: 0.2 })
    expect(k2.spring('settle', 0.016 * 3)).toMatchObject({ stiffness: 75, damping: 15, delay: 0.096 })
    expect(motionKit(0.5).secs(0.9)).toBe(0.45); expect(motionKit(1).spring('pop')).toMatchObject({ ...SP.pop, delay: 0 })
    const off = motionKit(0); expect(off.on).toBe(false); expect(off.spring('sheet', 0.3)).toEqual({ duration: 0, delay: 0 }); expect(off.tween(0.9)).toEqual({ duration: 0, delay: 0 })
    expect(cssDurations(1)).toBeNull(); expect(cssDurations(2)!['--dl-dur-calm']).toBe('640ms'); expect(cssDurations(0)!['--dl-dur-quick']).toBe('1ms')
  })
  it('ANIM-06 the phone’s reduce-motion forces Off whatever the setting', () => {
    for (const k of ANIM_SCALES) { expect(effectiveScale(k, true)).toBe(0); expect(effectiveScale(k, false)).toBe(k) }
  })
  it('ANIM-07 the choice is saved with the other display prefs and read back on the next start', () => {
    act(() => useApp.getState().setAnimScale(1.5))
    expect(JSON.parse(localStorage.getItem(storageKey('prefs'))!).animScale).toBe(1.5)
    useApp.setState({ animScale: 1 }); useApp.getState().reset(); expect(useApp.getState().animScale).toBe(1.5)
    act(() => useApp.getState().setRailHide(true)); expect(JSON.parse(localStorage.getItem(storageKey('prefs'))!).animScale).toBe(1.5) // other prefs keep it
    localStorage.setItem(storageKey('prefs'), JSON.stringify({ animScale: 'fast' })); useApp.getState().reset(); expect(useApp.getState().animScale).toBe(1)
  })
  it('ANIM-08 Settings › Appearance › Animations shows the scale and sets it', () => {
    render(<Settings />)
    const row = screen.getByRole('button', { name: 'Animations, 1×' }); fireEvent.click(row)
    expect(screen.getByRole('radio', { name: '1×' }).getAttribute('aria-checked')).toBe('true')
    fireEvent.click(screen.getByRole('radio', { name: '2×' })); expect(useApp.getState().animScale).toBe(2)
    fireEvent.click(screen.getByRole('radio', { name: 'Off' })); expect(useApp.getState().animScale).toBe(0)
  })
})
