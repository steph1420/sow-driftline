// A–Z index rail — same logic as /sow/ AzStrip: fixed gutter, 26 absolute slots, present letters active,
// tap or drag-scrub, empty letter latches the next present one, bubble while scrubbing.
import { useRef, useState } from 'react'
import { CONFIG } from '../config'
export const AZ = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']
const letterOf = (n: string) => { const c = n.trim().charAt(0).toUpperCase(); return /[A-Z]/.test(c) ? c : 'A' }
export function letterAtY(y: number, top: number, h: number, letters: readonly string[] = AZ): string {
  if (h <= 0 || !letters.length) return 'A'; return letters[Math.min(letters.length - 1, Math.max(0, Math.floor(((y - top) / h) * letters.length)))]!
}
/** First row whose full name starts with L, or the next present letter after it. */
export function firstRowFor(L: string, names: string[]): number {
  for (let i = AZ.indexOf(L); i >= 0 && i < AZ.length; i++) { const r = names.findIndex((n) => letterOf(n) === AZ[i]); if (r >= 0) return r }
  return -1
}
type Side = 'right' | 'left'
type Props = { names: string[]; onJump: (row: number) => void; side?: Side; bubble?: boolean; onSide?: (s: Side) => void }
export function AzRail({ names, onJump, side = 'right', bubble = true, onSide }: Props) {
  const present = new Set(names.map(letterOf)); const ref = useRef<HTMLElement>(null)
  const letters = AZ.filter((L) => present.has(L)) // t155u: hide unavailable letters, spread the rest
  const [dragX, setDragX] = useState<number | null>(null); const g0 = useRef(0)
  const other: Side = side === 'right' ? 'left' : 'right'
  const [hud, setHud] = useState<string | null>(null); const last = useRef(''); const hide = useRef<ReturnType<typeof setTimeout>>(undefined)
  const at = (y: number) => {
    const r = ref.current!.getBoundingClientRect(); const L = letterAtY(y, r.top, r.height, letters)
    clearTimeout(hide.current); setHud(L)
    if (L !== last.current) { last.current = L; const row = firstRowFor(L, names); if (row >= 0) onJump(row); navigator.vibrate?.(4) }
  }
  const end = () => { last.current = ''; hide.current = setTimeout(() => setHud(null), CONFIG.timing.railBubbleMs) }
  const move = dragX != null ? { transform: `translateX(${dragX}px)` } : undefined
  return (<>
    {/* Grip (old /sow/ v0.46 t19u): tap = other side; drag sideways, on lift snap to the nearest edge */}
    <button type="button" className={`sow-grip ${side}${dragX != null ? ' dragging' : ''}`} style={move} aria-label={`Move the A to Z strip to the ${other} side`}
      onClick={(e) => { if (e.detail === 0) onSide?.(other) }}
      onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture?.(e.pointerId); g0.current = e.clientX; setDragX(0) }}
      onPointerMove={(e) => { if (dragX != null) setDragX(e.clientX - g0.current) }}
      onPointerUp={(e) => { if (dragX == null) return; setDragX(null); if (Math.abs(e.clientX - g0.current) < CONFIG.timing.gripSnapMinPx) { onSide?.(other); return }
        const s: Side = e.clientX < window.innerWidth / 2 ? 'left' : 'right'; if (s !== side) onSide?.(s) }}
      onPointerCancel={() => setDragX(null)}><i /></button>
    <nav ref={ref} style={move} className={`sow-rail ${side}`} aria-label="Jump by letter"
      onPointerDown={(e) => { (e.currentTarget as Element).setPointerCapture?.(e.pointerId); at(e.clientY) }}
      onPointerMove={(e) => { if (e.buttons || e.pointerType === 'touch' || last.current) at(e.clientY) }}
      onPointerUp={end} onPointerCancel={end}>
      {letters.map((L, i) => <span key={L} data-l={L} className={`on${hud === L ? ' hi' : ''}`} style={{ top: `${(i / letters.length) * 100}%`, height: `${100 / letters.length}%` }}>{L}</span>)}
      {bubble && hud && <div className="sow-bubble" data-testid="az-bubble" aria-hidden>{hud}</div>}
    </nav>
  </>)
}
