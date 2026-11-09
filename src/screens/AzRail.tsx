// A–Z index rail (RDs2 t134u–t138u): fixed on the LEFT, 8 px from the edge, floating letters with no pill.
// All 26 letters keep their place; letters with no names are dimmed, the letter at the top of the list is accent.
// Tap or drag-scrub (old /sow/ logic): an empty letter latches the next present one; a bubble shows while scrubbing.
import { useRef, useState } from 'react'
import { CONFIG } from '../config'
import { useApp } from '../store/store'
import { buzz } from '../shell/haptics'
export const AZ = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']
export const letterOf = (n: string) => { const c = n.trim().charAt(0).toUpperCase(); return /[A-Z]/.test(c) ? c : 'A' }
export function letterAtY(y: number, top: number, h: number, letters: readonly string[] = AZ): string {
  if (h <= 0 || !letters.length) return 'A'; return letters[Math.min(letters.length - 1, Math.max(0, Math.floor(((y - top) / h) * letters.length)))]!
}
/** First row whose full name starts with L, or the next present letter after it. */
export function firstRowFor(L: string, names: string[]): number {
  for (let i = AZ.indexOf(L); i >= 0 && i < AZ.length; i++) { const r = names.findIndex((n) => letterOf(n) === AZ[i]); if (r >= 0) return r }
  return -1
}
type Props = { names: string[]; onJump: (row: number) => void; current?: string | null; bubble?: boolean }
export function AzRail({ names, onJump, current = null, bubble = true }: Props) {
  const present = new Set(names.map(letterOf)); const ref = useRef<HTMLElement>(null)
  const [hud, setHud] = useState<string | null>(null); const last = useRef(''); const hide = useRef<ReturnType<typeof setTimeout>>(undefined)
  const at = (y: number) => {
    const r = ref.current!.getBoundingClientRect(); const L = letterAtY(y, r.top, r.height)
    clearTimeout(hide.current); setHud(L)
    if (L !== last.current) { last.current = L; const row = firstRowFor(L, names); if (row >= 0) onJump(row); buzz(useApp.getState().haptics) }
  }
  const end = () => { last.current = ''; hide.current = setTimeout(() => setHud(null), CONFIG.timing.railBubbleMs) }
  const lit = hud ?? current
  return (
    <nav ref={ref} className="sow-rail" aria-label="Jump by letter"
      onPointerDown={(e) => { (e.currentTarget as Element).setPointerCapture?.(e.pointerId); at(e.clientY) }}
      onPointerMove={(e) => { if (e.buttons || e.pointerType === 'touch' || last.current) at(e.clientY) }}
      onPointerUp={end} onPointerCancel={end}>
      {AZ.map((L) => <span key={L} data-l={L} aria-hidden={!present.has(L) || undefined} className={!present.has(L) ? 'off' : L === lit ? 'on' : undefined}>{L}</span>)}
      {bubble && hud && <div className="sow-bubble" data-testid="az-bubble" aria-hidden>{hud}</div>}
    </nav>)
}
