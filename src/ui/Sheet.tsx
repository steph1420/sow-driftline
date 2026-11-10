// Bottom sheet shell: scrim, dialog and a grab handle. One place for every sheet (Quick overview, dates, share, session).
// beta.6 (t165u): dragging the handle moves the sheet with the finger; it closes past sheetCloseDragPx or on a quick
// downward flick, otherwise it springs back. A tap on the handle still closes.
// anim/proto (t206u): the sheet is a framer-motion element: it springs up on open (from where a pull left it), follows
// the finger 1:1 while dragged or pulled, springs back with the finger's speed, slides away on close (inside an
// AnimatePresence) and shrinks back a step when another sheet stacks over it (`behind`).
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { motion, useIsPresent } from 'framer-motion'
import { useBackLayer } from './useBackLayer'
import { CONFIG } from '../config'
import { DUR, EASE, STACK } from '../config/motion'
import { dragCloses } from '../data/gestures'
import { useMoment, useMotion } from './useMotionOn'

/** `pull`: px a finger has pulled the sheet up so far (it follows the finger); undefined once it is open. */
type Props = { label: string; onClose: () => void; className?: string; scrimLabel?: string; pull?: number; behind?: boolean; children: ReactNode }

/** Handle drag: down-only offset in px while engaged, null otherwise. */
function useDragClose(onClose: () => void) {
  const [drag, setDrag] = useState<number | null>(null)
  const g = useRef<{ y0: number; y: number; t: number; vy: number; on: boolean } | null>(null); const eat = useRef(false)
  const handlers = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => { if (e.button > 0) return; eat.current = false; g.current = { y0: e.clientY, y: e.clientY, t: e.timeStamp, vy: 0, on: false }; e.currentTarget.setPointerCapture?.(e.pointerId) },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const s = g.current; if (!s) return; const dy = e.clientY - s.y0
      if (!s.on) { if (Math.abs(dy) < CONFIG.timing.swipeEngagePx) return; s.on = true }
      const dt = e.timeStamp - s.t; if (dt > 0) s.vy = (e.clientY - s.y) / dt; s.y = e.clientY; s.t = e.timeStamp
      setDrag(Math.max(0, dy))
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      const s = g.current; g.current = null; if (!s?.on) return; eat.current = true
      const vy = e.timeStamp - s.t > CONFIG.timing.flickRestMs ? 0 : s.vy // a finger that rested before letting go is not a flick
      if (dragCloses(e.clientY - s.y0, vy)) onClose(); else setDrag(null)
    },
    onPointerCancel: () => { g.current = null; setDrag(null) },
    onClick: () => { if (eat.current) { eat.current = false; return } onClose() },
  }
  return { drag, handlers }
}

export function Sheet({ label, onClose, className = '', scrimLabel, pull, behind = false, children }: Props) {
  const present = useIsPresent(); useBackLayer(present && pull == null, onClose) // beta.11 (t229u): Back closes the top sheet (not one being pulled up or already leaving)
  const { drag, handlers } = useDragClose(onClose); const mk = useMotion(); const on = mk.on; const ref = useRef<HTMLDivElement>(null); const [h, setH] = useState(0)
  useLayoutEffect(() => { if (ref.current) setH(ref.current.offsetHeight) }, [on])
  const style = pull != null ? { '--sow-pull': `${pull}px` } : drag != null ? { '--sow-drag': `${drag}px` } : undefined
  const state = pull != null ? ' is-pulling' : drag != null ? ' is-dragging' : ''
  if (!on) return (<>
    <button className={`sow-scrim${state}`} aria-label={scrimLabel ?? `Close ${label.toLowerCase()}`} onClick={onClose} />
    <div className={`sow-sheet ${className}${state}`.trim()} role="dialog" aria-label={label} style={style as CSSProperties | undefined}>
      <button className="sow-sheet__handle" aria-label="Close (swipe down)" {...handlers}><span className="sow-sheet__grip" /></button>
      {children}
    </div>
  </>)
  const y = pull != null ? (h ? Math.max(0, h - pull) : '100%') : drag ?? 0; const follow = pull != null || drag != null
  const wt = useMoment('sheets') // beta.9: the backdrop follows the drag (fades as the sheet goes down / rises as it is pulled up)
  const scrim = pull != null ? (wt.on && h ? Math.min(1, pull / h) : 0.5) : drag != null ? (wt.on && h ? Math.max(0.15, 1 - drag / h) : 0.7) : 1
  return (<>
    <motion.button className={`sow-scrim${state}`} aria-label={scrimLabel ?? `Close ${label.toLowerCase()}`} onClick={onClose}
      initial={{ opacity: 0 }} animate={{ opacity: scrim }} exit={{ opacity: 0, transition: mk.tween(DUR.exit) }} transition={pull != null || drag != null ? (wt.on ? { duration: 0 } : mk.tween(DUR.fade)) : mk.tween(DUR.fade)} />
    <motion.div ref={ref} className={`sow-sheet sow-sheet--m ${className}${state}`.trim()} role="dialog" aria-label={label} style={{ ...(style as CSSProperties | undefined), originY: 0 }}
      initial={{ y: '100%' }} animate={{ y, scale: behind ? STACK.scale : 1 }} exit={{ y: '100%', transition: mk.tween(DUR.exit, { ease: EASE.in }) }}
      transition={follow ? { y: { duration: 0 }, scale: mk.spring('sheet') } : mk.spring('sheet')}>
      <button className="sow-sheet__handle" aria-label="Close (swipe down)" {...handlers}><span className="sow-sheet__grip" /></button>
      {children}
    </motion.div>
  </>)
}
