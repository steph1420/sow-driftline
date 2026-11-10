// anim/proto (t206u): the one motion system. Every spring / duration / stagger the app animates with lives here.
// Rules: animate transform + opacity only (GPU, no layout); springs for anything a finger moves or that should feel
// physical, short tweens only for fades; everything is instant when the OS asks for reduced motion (MotionConfig
// reducedMotion="user" in App + useMotionOn below). Static looks are untouched: every animation ends at the rest style.
export const SPRING = {
  /** taps: dock pill, tick check, chips, shortcuts (same family as the existing dock/undo springs) */
  snappy: { type: 'spring', stiffness: 520, damping: 34 },
  /** the tick's check mark: quick overshoot, settles in ~250 ms */
  pop: { type: 'spring', stiffness: 700, damping: 17, mass: 0.7 },
  /** sheets rising, springing back after a short drag */
  sheet: { type: 'spring', stiffness: 380, damping: 36, mass: 0.9 },
  /** rows / columns / cards arriving */
  settle: { type: 'spring', stiffness: 300, damping: 30 },
  /** the A–Z disc chasing the finger: tight, no wobble */
  follow: { type: 'spring', stiffness: 900, damping: 55, mass: 0.5 },
  /** the E1 tide rising to its share: slow, liquid, a hint of overshoot */
  tide: { type: 'spring', stiffness: 70, damping: 14, mass: 1 },
  /** the Undo icon flip and the shortcuts ＋ turn (pre-anim/proto values, now scaled with the rest) */
  undo: { type: 'spring', stiffness: 520, damping: 32 },
  plus: { type: 'spring', stiffness: 520, damping: 30 },
} as const
export type SpringName = keyof typeof SPRING
export const DUR = {
  /** crossfades (tab change, scrim) */ fade: 0.18,
  /** sheet leaving (tween, faster than arriving) */ exit: 0.22,
  /** the glint sweeping across a card when new ticks arrive */ glint: 0.9,
  /** a card's breath when new ticks arrive */ breath: 0.7,
  /** the ring that bursts from a tick */ ring: 0.42,
} as const
export const EASE = { out: [0.2, 0.9, 0.3, 1] as const, in: [0.4, 0, 1, 1] as const }
export const STAGGER = { rows: 0.016, rowsMax: 16, cards: 0.07, cardsDelay: 0.1, shortcuts: 0.03 } as const
/** fixed waits before an entrance, seconds */
export const DELAY = { dock: 0.12 } as const
/** px offsets things travel from */
export const SHIFT = { enter: 10, classSwitch: 32, card: 16, bar: 8, dock: 24 } as const
/** how much the sheet underneath shrinks when another sheet stacks over it (iOS card stack) */
export const STACK = { scale: 0.94 } as const

// ---- t210u Animation scale (Settings › Appearance › Animations) ----
/** Off, 0.5×, 1× (default), 1.5×, 2×. Off = instant (the same as the phone's reduce-motion, which forces it). */
export const ANIM_SCALES = [0, 0.5, 1, 1.5, 2] as const
export type AnimScale = (typeof ANIM_SCALES)[number]
export const ANIM_SCALE_DEFAULT: AnimScale = 1
export const cleanAnimScale = (v: unknown): AnimScale => (ANIM_SCALES as readonly unknown[]).includes(v) ? (v as AnimScale) : ANIM_SCALE_DEFAULT
export const animScaleLabel = (k: AnimScale) => (k === 0 ? 'Off' : `${k}×`)
/** The scale in force: the phone's reduce-motion forces Off (0), otherwise the user's choice. */
export const effectiveScale = (k: AnimScale, reduce: boolean): number => (reduce ? 0 : k)
type Spring = { type: 'spring'; stiffness: number; damping: number; mass?: number }
/** Stretch a spring's clock by k: stiffness / k², damping / k, mass kept. The curve keeps its exact shape (same damping
 * ratio, same overshoot) and every moment of it happens k times later. */
export function scaleSpring<S extends Spring>(s: S, k: number): S {
  return k === 1 ? s : { ...s, stiffness: s.stiffness / (k * k), damping: s.damping / k }
}
/** What every animation asks for its timing. k = 0 gives instant transitions. */
export type MotionKit = {
  k: number; on: boolean
  spring: (name: SpringName, delay?: number) => Record<string, unknown>
  tween: (secs: number, rest?: Record<string, unknown>, delay?: number) => Record<string, unknown>
  secs: (s: number) => number
}
export const INSTANT = { duration: 0, delay: 0 } as const
export function motionKit(k: number): MotionKit {
  const on = k > 0
  return {
    k, on,
    spring: (name, delay = 0) => (on ? { ...scaleSpring(SPRING[name] as Spring, k), delay: delay * k } : { ...INSTANT }),
    tween: (secs, rest = {}, delay = 0) => (on ? { ...rest, duration: secs * k, delay: delay * k } : { ...INSTANT }),
    secs: (s) => s * k,
  }
}
/** CSS motion tokens (tokens.css) at scale k; k = 1 sets nothing so the stylesheet values stay as they are. */
export const CSS_DURATIONS_MS = { '--dl-dur-instant': 120, '--dl-dur-quick': 200, '--dl-dur-calm': 320, '--dl-dur-deliberate': 550, '--dl-motion-slow': 1200 } as const
export function cssDurations(k: number): Record<string, string> | null {
  if (k === 1) return null
  return Object.fromEntries(Object.entries(CSS_DURATIONS_MS).map(([n, ms]) => [n, `${Math.max(1, Math.round(ms * k))}ms`]))
}
