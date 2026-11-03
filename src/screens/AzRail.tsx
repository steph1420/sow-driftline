// A–Z index rail — same logic as /sow/ AzStrip: fixed gutter, 26 absolute slots, present letters active,
// tap or drag-scrub, empty letter latches the next present one, bubble while scrubbing.
import { useRef, useState } from 'react'
import { CONFIG } from '../config'
export const AZ = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']
const letterOf = (n: string) => { const c = n.trim().charAt(0).toUpperCase(); return /[A-Z]/.test(c) ? c : 'A' }
export function letterAtY(y: number, top: number, h: number): string {
  if (h <= 0) return 'A'; return AZ[Math.min(AZ.length - 1, Math.max(0, Math.floor(((y - top) / h) * AZ.length)))]!
}
/** First row whose full name starts with L, or the next present letter after it. */
export function firstRowFor(L: string, names: string[]): number {
  for (let i = AZ.indexOf(L); i >= 0 && i < AZ.length; i++) { const r = names.findIndex((n) => letterOf(n) === AZ[i]); if (r >= 0) return r }
  return -1
}
type Props = { names: string[]; onJump: (row: number) => void; side?: 'right' | 'left'; bubble?: boolean }
export function AzRail({ names, onJump, side = 'right', bubble = true }: Props) {
  const present = new Set(names.map(letterOf)); const ref = useRef<HTMLElement>(null)
  const [hud, setHud] = useState<string | null>(null); const last = useRef(''); const hide = useRef<ReturnType<typeof setTimeout>>(undefined)
  const at = (y: number) => {
    const r = ref.current!.getBoundingClientRect(); const L = letterAtY(y, r.top, r.height)
    clearTimeout(hide.current); setHud(L)
    if (L !== last.current) { last.current = L; const row = firstRowFor(L, names); if (row >= 0) onJump(row); navigator.vibrate?.(4) }
  }
  const end = () => { last.current = ''; hide.current = setTimeout(() => setHud(null), CONFIG.timing.railBubbleMs) }
  return (
    <nav ref={ref} className={`sow-rail ${side}`} aria-label="Jump by letter"
      onPointerDown={(e) => { (e.currentTarget as Element).setPointerCapture?.(e.pointerId); at(e.clientY) }}
      onPointerMove={(e) => { if (e.buttons || e.pointerType === 'touch' || last.current) at(e.clientY) }}
      onPointerUp={end} onPointerCancel={end}>
      {AZ.map((L, i) => <span key={L} data-l={L} aria-disabled={!present.has(L)} className={present.has(L) ? 'on' : ''} style={{ top: `${(i / AZ.length) * 100}%`, height: `${100 / AZ.length}%` }}>{L}</span>)}
      {bubble && hud && <div className="sow-bubble" data-testid="az-bubble" aria-hidden>{hud}</div>}
    </nav>
  )
}
