// beta.9 (t221u): moment "done": empty messages float in gently; a small burst when a date reaches all done.
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { BEAT, SHIFT } from '../config/motion'
import { useMoment } from './useMotionOn'

export function FloatIn({ className = 'dl-muted', children }: { className?: string; children: ReactNode }) {
  const mk = useMoment('done')
  return <motion.p className={className} initial={mk.on ? { opacity: 0, y: SHIFT.enter } : false} animate={{ opacity: 1, y: 0 }} transition={mk.spring('settle', 0.15)}>{children}</motion.p>
}
const BITS = 14
/** Confetti from the middle of the screen: 14 bits fly out on a ring, fall a little and fade. */
export function Burst({ onDone }: { onDone: () => void }) {
  const mk = useMoment('done')
  if (!mk.on) return null
  return <div className="sow-burst" aria-hidden>{Array.from({ length: BITS }, (_, i) => { const a = (i / BITS) * Math.PI * 2; const r = 60 + (i % 3) * 22
    return <motion.i key={i} className={`sow-burst__bit t${i % 3}`} initial={{ x: 0, y: 0, scale: 0.4, opacity: 1, rotate: 0 }}
      animate={{ x: Math.cos(a) * r, y: Math.sin(a) * r + 30, scale: 1, opacity: 0, rotate: 180 + i * 25 }} transition={mk.tween(BEAT.burst, { ease: [0.2, 0.7, 0.4, 1] })}
      onAnimationComplete={i === 0 ? onDone : undefined} /> })}</div>
}
