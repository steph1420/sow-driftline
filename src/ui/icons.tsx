// v0.7.0 assets step (t105u): every icon in one place. Change a glyph or an SVG here and it changes app-wide.
// Glyph icons are plain text (they inherit font + colour); SVG icons use currentColor.
import type { ReactNode } from 'react'

/** Text glyphs. Swap any value for another character or emoji. */
export const GLYPH = {
  close: '✕', tick: '✓', down: '⌄', up: '⌃', next: '›', go: '→',
  undo: '↶', redo: '↷', menu: '⋮', moreDots: '⋯', edit: '✎', overview: '◎', clock: '◷', up2: '↑',
} as const

const svg = (body: ReactNode) => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">{body}</svg> /* token-ok: svg units */

/** Drawn icons (24×24, currentColor). */
export const SVG = {
  copy: () => svg(<><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 5.5V5a1.5 1.5 0 0 0-1.5-1.5h-9A1.5 1.5 0 0 0 4 5v9a1.5 1.5 0 0 0 1.5 1.5H6" /></>),
  share: () => svg(<><path d="M8 9H6.5A1.5 1.5 0 0 0 5 10.5v8A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 17.5 9H16M12 14V3M8.5 6.5 12 3l3.5 3.5" /></>),
  magnifier: () => svg(<><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5 5" /></>),
  path: () => svg(<><circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="6" r="2.2" /><path d="M8 17.5c4 0 3-5 6-6.5s2-3 2.3-3.4" /></>),
} as const

export type IconName = keyof typeof GLYPH | keyof typeof SVG
/** <Icon name="magnifier" /> — renders the SVG if there is one, else the glyph. */
export function Icon({ name }: { name: IconName }) {
  if (name in SVG) { const C = SVG[name as keyof typeof SVG]; return <C /> }
  return <>{GLYPH[name as keyof typeof GLYPH]}</>
}
