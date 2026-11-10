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
} as const
export const DUR = {
  /** crossfades (tab change, scrim) */ fade: 0.18,
  /** sheet leaving (tween, faster than arriving) */ exit: 0.22,
  /** the glint sweeping across a card when new ticks arrive */ glint: 0.9,
  /** a card's breath when new ticks arrive */ breath: 0.7,
  /** the ring that bursts from a tick */ ring: 0.42,
} as const
export const EASE = { out: [0.2, 0.9, 0.3, 1] as const, in: [0.4, 0, 1, 1] as const }
export const STAGGER = { rows: 0.016, rowsMax: 16, cards: 0.07, cardsDelay: 0.1 } as const
/** px offsets things travel from */
export const SHIFT = { enter: 10, classSwitch: 32, card: 16, bar: 8, dock: 24 } as const
/** how much the sheet underneath shrinks when another sheet stacks over it (iOS card stack) */
export const STACK = { scale: 0.94 } as const
