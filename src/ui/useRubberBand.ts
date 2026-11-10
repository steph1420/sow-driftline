// beta.9 (t221u): moment "band": a page pulled past its top or bottom edge stretches with growing resistance and
// springs back when let go. Window touch listeners (passive, so native scrolling is untouched); the returned value is
// the page's translateY. Touches that start on sheets, the dock, the A–Z rail, ticks, wheels or fields are left alone.
import { useEffect } from 'react'
import { animate, useMotionValue, type MotionValue } from 'framer-motion'
import { useMoment } from './useMotionOn'

/** Pulled `d` px past the edge → shown px: about half at first, never more than `max`. */
export const rubber = (d: number, max: number) => Math.sign(d) * (1 - 1 / ((Math.abs(d) * 0.55) / max + 1)) * max
const SKIP = '[role="dialog"], .sow-sheet, .sow-scrim, .dl-dock, .sow-rail, .sow-wh, .sow-grid button, .sow-edge, input, textarea, [data-no-band]'
export function useRubberBand(): MotionValue<number> {
  const y = useMotionValue(0); const mk = useMoment('band')
  useEffect(() => {
    if (!mk.on || typeof window === 'undefined') { y.set(0); return }
    let last: number | null = null; let over = 0; let stop: (() => void) | null = null
    const atTop = () => window.scrollY <= 0; const atEnd = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1
    const down = (e: TouchEvent) => { const t = e.target; last = e.touches.length === 1 && !(t instanceof Element && t.closest(SKIP)) ? e.touches[0]!.clientY : null; over = 0; stop?.() }
    const move = (e: TouchEvent) => {
      if (last == null) return; const cy = e.touches[0]!.clientY; const dy = cy - last; last = cy
      if (over === 0 && !((dy > 0 && atTop()) || (dy < 0 && atEnd()))) return
      over = over > 0 ? Math.max(0, over + dy) : over < 0 ? Math.min(0, over + dy) : dy
      y.set(rubber(over, window.innerHeight * 0.2))
    }
    const up = () => { last = null; over = 0; if (y.get() !== 0) { const a = animate(y, 0, mk.spring('sheet')); stop = () => a.stop() } }
    window.addEventListener('touchstart', down, { passive: true }); window.addEventListener('touchmove', move, { passive: true })
    window.addEventListener('touchend', up); window.addEventListener('touchcancel', up)
    return () => { window.removeEventListener('touchstart', down); window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up); window.removeEventListener('touchcancel', up); y.set(0) }
  }, [mk.on, mk.k]) // eslint-disable-line react-hooks/exhaustive-deps
  return y
}
