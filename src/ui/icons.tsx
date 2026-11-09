// v0.7.0 assets step (t105u): every icon in one place. Change a glyph or an SVG here and it changes app-wide.
// Glyph icons are plain text (they inherit font + colour); SVG icons use currentColor.
import type { ReactNode } from 'react'

/** Text glyphs. Swap any value for another character or emoji. */
export const GLYPH = {
  close: '✕', tick: '✓', down: '⌄', up: '⌃', next: '›', back: '‹', go: '→', plus: '+',
  moreDots: '⋯', settings: '⚙\uFE0E', edit: '✎', overview: '◎', clock: '◷', up2: '↑',
} as const

const svg = (body: ReactNode) => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">{body}</svg> /* token-ok: svg units */

/** Drawn icons (24×24, currentColor). */
export const SVG = {
  copy: () => svg(<><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 5.5V5a1.5 1.5 0 0 0-1.5-1.5h-9A1.5 1.5 0 0 0 4 5v9a1.5 1.5 0 0 0 1.5 1.5H6" /></>),
  share: () => svg(<><path d="M8 9H6.5A1.5 1.5 0 0 0 5 10.5v8A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 17.5 9H16M12 14V3M8.5 6.5 12 3l3.5 3.5" /></>),
  magnifier: () => svg(<><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5 5" /></>),
  cloud: () => svg(<><path d="M7 18.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 9.2 4.7 4.7 0 0 0 7 18.5z" /><path d="M9.5 13.8l1.8 1.8 3.4-3.6" /></>),
  list: () => svg(<><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></>),
  calendarPlus: () => svg(<><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4M12 12.5v5M9.5 15h5" /></>),
  reschedule: () => svg(<><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" /><path d="M19.5 4.5v4h-4" /></>),
  // RDs2 top bar (mockups v7, undo-v2, menu-v1, shortcut icon 3)
  lines: () => svg(<path d="M4 7h16M4 12h16M4 17h16" />),
  undo: () => svg(<><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></>),
  redo: () => svg(<><path d="m15 14 5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" /></>),
  plus: () => svg(<path d="M12 5v14M5 12h14" />),
  pending: () => svg(<><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></>),
  cols: () => svg(<><rect x="4" y="4.5" width="16" height="15" rx="3" /><path d="M12 4.5v15" /></>),
  col1: () => svg(<rect x="6" y="4.5" width="12" height="15" rx="3" />),
  loop: () => svg(<><path d="M17 3.5 20 6.5l-3 3" /><path d="M20 6.5H8a4 4 0 0 0-4 4v1" /><path d="M7 20.5 4 17.5l3-3" /><path d="M4 17.5h12a4 4 0 0 0 4-4v-1" /></>),
  sidebar: () => svg(<><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><path d="M9.5 4.5v15" /></>),
  star: () => svg(<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z" strokeLinejoin="round" />),
  starOn: () => svg(<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z" fill="currentColor" strokeLinejoin="round" />),
} as const

export type IconName = keyof typeof GLYPH | keyof typeof SVG
/** <Icon name="magnifier" /> — renders the SVG if there is one, else the glyph. */
export function Icon({ name }: { name: IconName }) {
  if (name in SVG) { const C = SVG[name as keyof typeof SVG]; return <C /> }
  return <>{GLYPH[name as keyof typeof GLYPH]}</>
}
