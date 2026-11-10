// anim/proto: a number that rolls when it changes (up when it grows, down when it shrinks). At rest it is the plain
// number, plain text (no wrapper), so counts look exactly as before; the rolling wrapper only exists mid-roll.
import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { SPRING } from '../config/motion'
import { useMotionOn } from './useMotionOn'

type Roll = { from: number; to: number; dir: number; n: number }
/** `suffix` is drawn in the same text run at rest ("22/24" stays one string, so kerning is unchanged). */
export function RollNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const on = useMotionOn(); const prev = useRef(value); const [roll, setRoll] = useState<Roll | null>(null)
  if (value !== prev.current) { const from = prev.current; prev.current = value
    if (on) setRoll((r) => ({ from: r ? r.to : from, to: value, dir: value > from ? 1 : -1, n: (r?.n ?? 0) + 1 })) }
  if (!on || !roll || roll.to !== value) return <>{`${value}${suffix}`}</>
  const d = roll.dir
  return <><span className="sow-rolln">
    <motion.span key={`o${roll.n}`} className="sow-rolln__v sow-rolln__out" aria-hidden initial={{ y: 0, opacity: 1 }} animate={{ y: `${-d * 0.7}em`, opacity: 0 }} transition={SPRING.snappy}>{roll.from}</motion.span>
    <motion.span key={`i${roll.n}`} className="sow-rolln__v" initial={{ y: `${d * 0.7}em`, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={SPRING.snappy}
      onAnimationComplete={() => setRoll((r) => (r && r.n === roll.n ? null : r))}>{roll.to}</motion.span>
  </span>{suffix}</>
}
