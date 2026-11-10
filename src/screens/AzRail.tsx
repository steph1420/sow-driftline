// A–Z index rail (RDs2 t134u–t138u): fixed on the LEFT, floating letters with no pill.
// Letters with no names are dimmed, or hidden when Settings › Hide unavailable letters is on (beta.6, t165u); the
// letter at the top of the list is accent. Tap or drag-scrub: an empty letter latches the next present one.
// beta.6 grab handle: a slim tab beside the current letter; while scrubbing it follows the finger as a small disc
// naming the letter (haptic tick per letter when haptics are on). The big bubble stays a developer option.
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion, useSpring } from 'framer-motion'
import { SPRING, scaleSpring } from '../config/motion'
import { useMotion } from '../ui/useMotionOn'
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
/** The rail's letters: all 26, or only those with names when `hide` is on (never empty). */
export function railLetters(names: string[], hide: boolean): string[] {
  const present = new Set(names.map(letterOf)); const shown = hide ? AZ.filter((L) => present.has(L)) : AZ
  return shown.length ? shown : AZ
}
type Props = { names: string[]; onJump: (row: number) => void; current?: string | null; bubble?: boolean }
export function AzRail({ names, onJump, current = null, bubble = true }: Props) {
  const hideEmpty = useApp((s) => s.railHide)
  const present = new Set(names.map(letterOf)); const letters = railLetters(names, hideEmpty); const ref = useRef<HTMLElement>(null)
  const [hud, setHud] = useState<string | null>(null); const [fingerY, setFingerY] = useState<number | null>(null); const [restY, setRestY] = useState<number | null>(null)
  const last = useRef(''); const hide = useRef<ReturnType<typeof setTimeout>>(undefined)
  const at = (y: number) => {
    const r = ref.current!.getBoundingClientRect(); const L = letterAtY(y, r.top, r.height, letters)
    clearTimeout(hide.current); setHud(L); setFingerY(Math.min(r.height, Math.max(0, y - r.top)))
    if (L !== last.current) { last.current = L; const row = firstRowFor(L, names); if (row >= 0) onJump(row); buzz(useApp.getState().haptics) }
  }
  const end = () => { last.current = ''; setFingerY(null); hide.current = setTimeout(() => setHud(null), CONFIG.timing.railBubbleMs) }
  const lit = hud ?? current
  // the resting handle sits beside the current letter (re-measured when the letter, the letter set or the size changes)
  const key = letters.join('')
  useLayoutEffect(() => {
    const place = () => { const el = ref.current?.querySelector<HTMLElement>(`[data-l="${current}"]`); setRestY(el && el.offsetParent ? el.offsetTop + el.offsetHeight / 2 : null) }
    place(); window.addEventListener('resize', place); return () => window.removeEventListener('resize', place)
  }, [current, key])
  const thumbY = fingerY ?? restY
  // anim/proto: the handle / disc rides a tight spring toward the finger (or the current letter) instead of teleporting
  const mk = useMotion(); const mo = mk.on; const off = useSpring(0, scaleSpring(SPRING.follow, mo ? mk.k : 1)); const prevY = useRef<number | null>(null) // FLIP: CSS keeps top = target, the spring carries the leftover offset to 0
  useLayoutEffect(() => { if (thumbY == null) { prevY.current = null; return } if (mo && prevY.current != null && prevY.current !== thumbY) { off.jump(off.get() + prevY.current - thumbY); off.set(0) } prevY.current = thumbY }, [thumbY, mo]) // eslint-disable-line react-hooks/exhaustive-deps
  const active = fingerY != null
  return (
    <nav ref={ref} className="sow-rail" aria-label="Jump by letter"
      onPointerDown={(e) => { (e.currentTarget as Element).setPointerCapture?.(e.pointerId); at(e.clientY) }}
      onPointerMove={(e) => { if (e.buttons || e.pointerType === 'touch' || last.current) at(e.clientY) }}
      onPointerUp={end} onPointerCancel={end}>
      {letters.map((L) => <span key={L} data-l={L} aria-hidden={!present.has(L) || undefined} className={!present.has(L) ? 'off' : L === lit ? 'on' : undefined}>{L}</span>)}
      {thumbY != null && (mo
        ? <motion.i key={active ? 'disc' : 'rest'} className={`sow-rail__thumb${active ? ' is-active' : ''}`} data-testid="az-thumb" aria-hidden style={{ '--y': `${thumbY}px`, y: off } as never}
            transformTemplate={(_, t) => (t === 'none' || !t ? 'translateY(-50%)' : `translateY(-50%) ${t}`)} initial={active ? { scale: 0.4, opacity: 0 } : { opacity: 0 }} animate={{ scale: 1, opacity: active ? 1 : 0.45 }} transition={mk.spring('snappy')}>
            {active && <AnimatePresence initial={false} mode="popLayout"><motion.span key={hud} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} transition={mk.spring('snappy')}>{hud}</motion.span></AnimatePresence>}</motion.i>
        : <i className={`sow-rail__thumb${fingerY != null ? ' is-active' : ''}`} data-testid="az-thumb" aria-hidden style={{ '--y': `${thumbY}px` } as CSSProperties}>{fingerY != null ? hud : null}</i>)}
      {bubble && hud && <div className="sow-bubble" data-testid="az-bubble" aria-hidden>{hud}</div>}
    </nav>)
}
