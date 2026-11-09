// RDs2 (t140u) gesture rules for the top bar, kept pure so they can be tested without a DOM.
import { CONFIG } from '../config'

export type UndoIntent = 'undo' | 'redo' | 'cancel'
/** Undo way 2: slide left past the cancel distance = Cancel; otherwise below the slide distance = Redo, else Undo. Follows the finger both ways. */
export function undoIntent(dx: number, dy: number): UndoIntent {
  if (dx <= -CONFIG.timing.undoCancelPx && -dx > dy) return 'cancel'
  return dy >= CONFIG.timing.undoSlidePx ? 'redo' : 'undo'
}

/** Index of the rect under (x, y), or -1. The rects are hit areas (circles are tested as their 44 px boxes). */
export function hitIndex(rects: readonly { left: number; right: number; top: number; bottom: number }[], x: number, y: number): number {
  return rects.findIndex((r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)
}

export type SwipeDir = 'left' | 'right' | null
/** A sideways swipe: far enough and more sideways than up/down. */
export function swipeDir(dx: number, dy: number, min: number = CONFIG.timing.swipeExtendPx): SwipeDir {
  if (Math.abs(dx) < min || Math.abs(dx) <= Math.abs(dy)) return null
  return dx > 0 ? 'right' : 'left'
}
