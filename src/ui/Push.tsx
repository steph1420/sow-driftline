// beta.9 (t221u): moment "push": a pushed page (All dates, a Settings page) slides in from the right; a swipe that
// starts at the left edge drags it with the finger and goes back past a third of the screen or on a quick flick.
import type { ReactNode } from 'react'
import { motion, useDragControls } from 'framer-motion'
import { SHIFT } from '../config/motion'
import { useMoment } from './useMotionOn'
import { useBackLayer } from './useBackLayer'

type Props = { className: string; onBack: () => void; children: ReactNode }
export function Push({ className, onBack, children }: Props) {
  const mk = useMoment('push'); const drag = useDragControls()
  useBackLayer(true, onBack) // beta.11 (t229u): the phone's Back goes back one page, like ‹ and the edge swipe
  if (!mk.on) return <div className={className}>{children}</div>
  return <motion.div className={className} initial={{ x: SHIFT.classSwitch * 2, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={mk.spring('settle')}
    drag="x" dragControls={drag} dragListener={false} dragConstraints={{ left: 0, right: 0 }} dragElastic={{ left: 0, right: 1 }}
    onDragEnd={(_, i) => { if (i.offset.x > window.innerWidth / 3 || i.velocity.x > 600) onBack() }}>
    <span className="sow-edge" aria-hidden onPointerDown={(e) => drag.start(e)} />
    {children}
  </motion.div>
}
