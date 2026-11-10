// Bottom sheet shell: scrim, dialog and a grab handle. One place for every sheet (Quick overview, dates, share, session).
// beta.6 (t165u): dragging the handle moves the sheet with the finger; it closes past sheetCloseDragPx or on a quick
// downward flick, otherwise it springs back. A tap on the handle still closes.
import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { CONFIG } from '../config'
import { dragCloses } from '../data/gestures'

/** `pull`: px a finger has pulled the sheet up so far (it follows the finger); undefined once it is open. */
type Props = { label: string; onClose: () => void; className?: string; scrimLabel?: string; pull?: number; children: ReactNode }

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

export function Sheet({ label, onClose, className = '', scrimLabel, pull, children }: Props) {
  const { drag, handlers } = useDragClose(onClose)
  const style = pull != null ? { '--sow-pull': `${pull}px` } : drag != null ? { '--sow-drag': `${drag}px` } : undefined
  const state = pull != null ? ' is-pulling' : drag != null ? ' is-dragging' : ''
  return (<>
    <button className={`sow-scrim${state}`} aria-label={scrimLabel ?? `Close ${label.toLowerCase()}`} onClick={onClose} />
    <div className={`sow-sheet ${className}${state}`.trim()} role="dialog" aria-label={label} style={style as CSSProperties | undefined}>
      <button className="sow-sheet__handle" aria-label="Close (swipe down)" {...handlers}><span className="sow-sheet__grip" /></button>
      {children}
    </div>
  </>)
}
