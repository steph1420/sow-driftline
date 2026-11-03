// Quick sync: light polling of the bridge pull. Paused while hidden; pulls at once on focus/visible.
import type { SheetState } from '../data/contract'
type Opts = { pull: () => Promise<SheetState>; everyMs: number; hidden: () => boolean; onPulled: (s: SheetState) => void; onError?: (e: unknown) => void }
export function createPoller(o: Opts) {
  let t: ReturnType<typeof setInterval> | undefined; let n = 0; let busy = false
  const now = async () => { if (busy) return; busy = true; try { n++; o.onPulled(await o.pull()) } catch (e) { o.onError?.(e) } finally { busy = false } }
  const tick = () => { if (!o.hidden()) void now() }
  return { start() { clearInterval(t); t = setInterval(tick, o.everyMs) }, stop() { clearInterval(t) }, now, count: () => n }
}
