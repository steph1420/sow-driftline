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
  /** beta.9: the hold menu growing out of the finger (60% → ~104% → 100%) */
  menu: { type: 'spring', stiffness: 560, damping: 24, mass: 0.8 },
  /** beta.9: the undo toast rising from under the dock with a soft ~6 px overshoot */
  toast: { type: 'spring', stiffness: 420, damping: 26 },
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
/** beta.9 timings, seconds: the underline's glide before the Checklist opens, the wheel's coast, the confetti burst */
export const BEAT = { underline: 0.24, wheelCoast: 0.35, burst: 0.9, toastMs: 4000 } as const
/** fixed waits before an entrance, seconds */
export const DELAY = { dock: 0.12 } as const
/** px offsets things travel from */
export const SHIFT = { enter: 10, classSwitch: 32, card: 16, bar: 8, dock: 24 } as const
/** how much the sheet underneath shrinks when another sheet stacks over it (iOS card stack) */
export const STACK = { scale: 0.94 } as const

// ---- t210u Animation scale (Settings › Appearance › Animations); beta.9 (t221u, mockup 1A): the longer list ----
/** Off, 0.25× … 5×, 1× the default. Off = instant (the same as the phone's reduce-motion, which forces it). */
export const ANIM_SCALES = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 5] as const
export type AnimScale = (typeof ANIM_SCALES)[number]
export const ANIM_SCALE_DEFAULT: AnimScale = 1
/** A saved scale read back. Every beta.8 value (0, 0.5, 1, 1.5, 2) is still on the list and keeps its meaning; any
 * other number (a hand-edited or future value) snaps to the nearest choice; anything that is not a number is 1×. */
export function cleanAnimScale(v: unknown): AnimScale {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return ANIM_SCALE_DEFAULT
  if (v === 0) return 0
  return ANIM_SCALES.filter((k) => k > 0).reduce((best, k) => (Math.abs(Math.log(k / v)) < Math.abs(Math.log(best / v)) ? k : best), 1 as AnimScale)
}
export const animScaleLabel = (k: AnimScale) => (k === 0 ? 'Off' : `${k}×`)
export const animScaleNote = (k: AnimScale) => ({ 0: 'No movement', 0.25: 'Much quicker', 0.5: 'Quicker', 0.75: 'A little quicker', 1: 'Default', 1.25: 'A little slower', 1.5: 'Slower', 2: 'Slower', 3: 'Much slower', 5: 'Very slow, to watch the motion' } as const)[k]

// ---- beta.9 (t221u, 3-motion-list): the 20 "weight and life" moments, each with its own switch (Motion details) ----
export const MOMENTS = [
  { id: 'press', label: 'Press', note: 'Cards, rows and chips sink under the finger and spring back' },
  { id: 'hold', label: 'Hold menu', note: 'The menu grows out of the finger; the card lifts' },
  { id: 'cards', label: 'Overview cards settle', note: 'Cards drop in one after another' },
  { id: 'underline', label: 'Date underline slide', note: 'Glides to the tapped date with a stretch' },
  { id: 'count', label: 'Count roll', note: 'Done counts roll like an odometer' },
  { id: 'alldates', label: 'All dates rows stagger', note: 'Rows slide in; the timeline draws down' },
  { id: 'wheel', label: 'Date setter wheel', note: 'Flick to spin; it slows and clicks onto a day' },
  { id: 'switch', label: 'Switch thumb', note: 'Squeezes, stretches as it moves, squashes on landing' },
  { id: 'chips', label: 'Chips', note: 'The selected blob slides between filter chips' },
  { id: 'search', label: 'Search expand', note: 'The field grows out of the icon' },
  { id: 'toast', label: 'Undo toast', note: 'Rises with a soft bounce; flick it away' },
  { id: 'band', label: 'Rubber-band edges', note: 'Pages stretch past the top and bottom, then spring back' },
  { id: 'reflow', label: 'Row reflow', note: 'Rows and cards glide into their new places' },
  { id: 'sheets', label: 'Sheets with weight', note: 'The backdrop fades as you drag a sheet down' },
  { id: 'sharepills', label: 'Share date pills', note: 'Switching date slides the pill and crossfades the message' },
  { id: 'dock', label: 'Dock', note: 'The pill slides with a stretch; the icon hops' },
  { id: 'dot', label: 'Overdue dot', note: 'A slow breathing glow until you open the card' },
  { id: 'push', label: 'Screen push and back', note: 'Pages slide in from the right; swipe from the edge to go back' },
  { id: 'ticks', label: 'Checklist ticks', note: 'The tick pops in with a ring' },
  { id: 'done', label: 'Empty and done states', note: 'Messages float in; a small burst at all done' },
] as const
export type MomentId = (typeof MOMENTS)[number]['id']
export type Moments = Record<MomentId, boolean>
export const MOMENTS_DEFAULT = Object.fromEntries(MOMENTS.map((m) => [m.id, true])) as Moments
/** Saved switches read back: only real booleans count, a missing or unknown moment is on. */
export const cleanMoments = (v: unknown): Moments => {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
  return Object.fromEntries(MOMENTS.map((m) => [m.id, o[m.id] !== false])) as Moments
}
/** The scale one moment runs at: 0 when the phone asks for reduced motion, the global scale is Off, or its switch is off. */
export const momentScale = (k: number, reduce: boolean, moments: Moments, id: MomentId): number => (reduce || !moments[id] ? 0 : k)
/** The moments that are live (for the root's data-motion attribute, which the CSS-only moments key off). */
export const liveMoments = (k: number, moments: Moments): string => (k > 0 ? MOMENTS.filter((m) => moments[m.id]).map((m) => m.id).join(' ') : '')
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
