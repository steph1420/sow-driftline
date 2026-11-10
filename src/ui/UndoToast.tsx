// beta.9 (t221u, 3d): a toast with Undo after a change (reschedule, new date, topic). Moment "toast": it rises from
// under the dock with a soft overshoot, its timer bar drains, and it sinks away on time out or a sideways flick.
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BEAT, DUR, SHIFT } from '../config/motion'
import { useMoment } from './useMotionOn'

export type ToastMsg = { id: number; text: string; undo?: () => void }
type Props = { msg: ToastMsg | null; onDone: () => void }
export function UndoToast({ msg, onDone }: Props) {
  const mk = useMoment('toast')
  useEffect(() => { if (!msg) return; const t = setTimeout(onDone, BEAT.toastMs); return () => clearTimeout(t) }, [msg, onDone])
  return <div className="dl-toast-region sow-utoast-region"><AnimatePresence>{msg && (
    <motion.div key={msg.id} className="dl-toast dl-tone--accent sow-utoast" role="status"
      initial={mk.on ? { y: SHIFT.dock * 3, opacity: 0 } : false} animate={{ y: 0, x: 0, opacity: 1 }} exit={mk.on ? { y: SHIFT.dock * 2, opacity: 0, transition: mk.tween(DUR.exit) } : { opacity: 0, transition: { duration: 0 } }}
      transition={mk.spring('toast')} drag={mk.on ? 'x' : false} dragSnapToOrigin onDragEnd={(_, i) => { if (Math.abs(i.offset.x) > SHIFT.dock * 3 || Math.abs(i.velocity.x) > 500) onDone() }}>
      <span className="dl-toast__dot" /><span className="sow-utoast__txt">{msg.text}</span>
      {msg.undo && <button className="sow-utoast__undo" aria-label={`Undo: ${msg.text}`} onClick={() => { msg.undo?.(); onDone() }}>Undo</button>}
      <motion.i className="sow-utoast__bar" aria-hidden initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: BEAT.toastMs / 1000, ease: 'linear' }} />
    </motion.div>)}</AnimatePresence></div>
}
