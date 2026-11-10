// anim/proto: one switch for "may this animate?". Off when the OS asks for reduced motion, and in the unit-test DOM
// (jsdom has no layout or frames, so tests see the static app). Driftline has no in-app motion setting yet; when one
// lands, read it here and every animation follows.
import { useReducedMotion } from 'framer-motion'
export const motionTestEnv = () => typeof window === 'undefined' || typeof window.matchMedia !== 'function' || import.meta.env.MODE === 'test'
export function useMotionOn(): boolean {
  const reduce = useReducedMotion()
  return !reduce && !motionTestEnv()
}
