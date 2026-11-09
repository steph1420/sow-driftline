// RDs2 top bar press: tap, a short hold (160 ms; the shortcuts button 100 ms) and a drag, on one element. The pointer is captured so a slide
// that leaves the button still counts. A keyboard click (detail 0) is a tap; the pointer's own click is swallowed.
import { useRef } from 'react'
import { CONFIG } from '../config'

export type PressInfo = { dx: number; dy: number; x: number; y: number; held: boolean; moved: boolean }
/** `holdMs`: how long a still press waits before it counts as a hold (default CONFIG.timing.pressMs). */
type Handlers = { holdMs?: number; onTap: () => void; onHold?: (p: PressInfo) => void; onDrag?: (p: PressInfo) => void; onRelease?: (p: PressInfo) => void; onCancel?: () => void }

export function usePress(h: Handlers) {
  const s = useRef<{ x0: number; y0: number; held: boolean; moved: boolean; timer: ReturnType<typeof setTimeout> | null } | null>(null)
  const ref = useRef(h); ref.current = h
  const info = (e: React.PointerEvent): PressInfo => { const p = s.current!; return { dx: e.clientX - p.x0, dy: e.clientY - p.y0, x: e.clientX, y: e.clientY, held: p.held, moved: p.moved } }
  const stop = () => { const p = s.current; if (p?.timer) clearTimeout(p.timer); s.current = null }
  return {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.button > 0) return
      e.currentTarget.setPointerCapture?.(e.pointerId)
      const x = e.clientX, y = e.clientY
      s.current = { x0: x, y0: y, held: false, moved: false, timer: setTimeout(() => { const p = s.current; if (!p || p.moved) return; p.held = true; ref.current.onHold?.({ dx: 0, dy: 0, x, y, held: true, moved: false }) }, ref.current.holdMs ?? CONFIG.timing.pressMs) }
    },
    onPointerMove: (e: React.PointerEvent) => {
      const p = s.current; if (!p) return
      if (!p.moved && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) >= CONFIG.timing.swipeEngagePx) { p.moved = true; if (p.timer) clearTimeout(p.timer) }
      if (p.moved || p.held) ref.current.onDrag?.(info(e))
    },
    onPointerUp: (e: React.PointerEvent) => {
      const p = s.current; if (!p) return
      const i = info(e); stop()
      if (!i.held && !i.moved) ref.current.onTap(); else ref.current.onRelease?.(i)
    },
    onPointerCancel: () => { if (s.current) { stop(); ref.current.onCancel?.() } },
    onClick: (e: React.MouseEvent) => { if (e.detail === 0) ref.current.onTap() },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  }
}
