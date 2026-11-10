// anim/proto: one switch for "may this animate, and how slowly?". Animation scale (Settings, t210u) sets the clock;
// the phone's reduced-motion setting forces Off, and so does the unit-test DOM (jsdom has no layout or frames).
import { useReducedMotion } from 'framer-motion'
import { useApp } from '../store/store'
import { effectiveScale, motionKit, type MotionKit } from '../config/motion'
export const motionTestEnv = () => typeof window === 'undefined' || typeof window.matchMedia !== 'function' || import.meta.env.MODE === 'test'
/** The scale actually in force: 0 when reduce-motion is on (or in tests), else the user's Animation scale. */
export function useAnimScale(): number {
  const reduce = useReducedMotion(); const k = useApp((s) => s.animScale)
  return effectiveScale(k, !!reduce || motionTestEnv())
}
export function useMotion(): MotionKit { return motionKit(useAnimScale()) }
export function useMotionOn(): boolean { return useAnimScale() > 0 }
