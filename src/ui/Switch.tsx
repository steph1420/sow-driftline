// beta.9 (t221u, 3c): an on/off switch in kit tokens. The thumb has mass: it squeezes while pressed, stretches as it
// travels and squashes when it lands (moment "switch"); at rest it is a plain track and thumb.
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMoment } from './useMotionOn'

type Props = { on: boolean; label: string; onChange: (on: boolean) => void }
export function Switch({ on, label, onChange }: Props) {
  const mk = useMoment('switch'); const [down, setDown] = useState(false); const [flips, setFlips] = useState(0)
  const squash = mk.on && flips > 0 ? { scaleX: [1, 1.3, 0.92, 1], scaleY: [1, 0.9, 1.06, 1] } : { scaleX: 1, scaleY: 1 }
  return (
    <button role="switch" aria-checked={on} aria-label={label} className={`sow-sw${on ? ' on' : ''}`}
      onPointerDown={() => setDown(true)} onPointerUp={() => setDown(false)} onPointerLeave={() => setDown(false)} onPointerCancel={() => setDown(false)}
      onClick={() => { setFlips((n) => n + 1); onChange(!on) }}>
      <motion.span className="sow-sw__slot" initial={false} animate={{ x: on ? '100%' : '0%' }} transition={mk.spring('snappy')}>
        <motion.span key={flips} className="sow-sw__thumb" initial={flips ? undefined : false} animate={down && mk.on ? { scaleX: 0.92, scaleY: 0.92 } : squash}
          transition={down ? mk.spring('snappy') : mk.tween(0.32, { times: [0, 0.35, 0.7, 1], ease: 'easeOut' })} />
      </motion.span>
    </button>)
}
