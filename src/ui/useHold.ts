// Press-and-hold (and right-click) on an element. The click that ends a hold is swallowed so it does not also tap.
import { useRef } from 'react'
import { CONFIG } from '../config'

export function useHold(onHold: (el: HTMLElement) => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null); const start = useRef<{ x: number; y: number } | null>(null); const fired = useRef(false)
  const cancel = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; start.current = null }
  const fire = (el: HTMLElement) => { cancel(); fired.current = true; onHold(el) }
  return {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => { const el = e.currentTarget; fired.current = false; start.current = { x: e.clientX, y: e.clientY }; timer.current = setTimeout(() => fire(el), CONFIG.timing.holdMs) },
    onPointerMove: (e: React.PointerEvent) => { const p = start.current; if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > CONFIG.timing.swipeEngagePx) cancel() },
    onPointerUp: cancel, onPointerCancel: cancel,
    onContextMenu: (e: React.MouseEvent<HTMLElement>) => { e.preventDefault(); fire(e.currentTarget) },
    onClickCapture: (e: React.MouseEvent) => { if (fired.current) { e.stopPropagation(); e.preventDefault(); fired.current = false } },
  }
}
