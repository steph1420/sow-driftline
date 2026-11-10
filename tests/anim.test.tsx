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
