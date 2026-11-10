// beta.11 (t228u, t231u–t233u): the row highlight after a name tap, an A–Z rail jump or a search hit. One brief flash
// that fades out and then clears itself; nothing re-applies it (not scroll, not a re-render). Only one row at a time.
// The fade runs on the CSS motion token --dl-motion-slow (1.2 s × Animation scale); the state clears on the same clock.
// Animation scale Off (or the phone's reduce-motion): no flash, and the state clears at once.
import { CONFIG } from '../config'

/** `n` counts flashes, so lighting the same row again restarts its fade (the class swaps between two names). */
export type Flash = { row: number; n: number }
/** How long the row stays lit, ms: the fade's length at scale k; 0 when motion is off. */
export const flashMs = (k: number) => (k > 0 ? Math.round(CONFIG.timing.jumpFlashMs * k) : 0)
/** The row's class: `sel` marks the row just picked (no look of its own); `flash` / `flash2` run the fade. */
export function flashClass(f: Flash | null, row: number, k: number): string {
  if (!f || f.row !== row) return ''
  return k > 0 ? `sel ${f.n % 2 ? 'flash' : 'flash2'}` : 'sel'
}
