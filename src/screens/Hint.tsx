// v0.7.0 S10 (F-CL-12): one-time gesture hints. One at a time; each shows once per device and its ✕ is remembered (storageKey('hints')).
import { useApp } from '../store/store'
import { GLYPH } from '../ui/icons'
export const HINTS: Record<string, string> = {
  swipe: 'Swipe sideways on a box to tick it',
  grip: 'Hold the A–Z strip and slide to jump to a name',
  quick: 'Swipe up from the bottom for a quick look',
  hold: 'Press and hold a class for Share, All dates and more',
}
export function Hint({ ids }: { ids: string[] }) {
  const seen = useApp((s) => s.hints); const id = ids.find((x) => !seen.includes(x)); if (!id) return null
  return <div className="sow-hint" role="note"><span>{HINTS[id]}</span><button className="sow-hint__x" aria-label="Got it, hide this hint" onClick={() => useApp.getState().dismissHint(id)}>{GLYPH.close}</button></div>
}
