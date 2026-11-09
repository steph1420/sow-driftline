// Display size (v0.8 P11, Steve t81u-t83u): one overall scale plus relative scales for text, row spacing,
// tickboxes, date headers and navigation. Pure and typed; App writes the result as --sow-k-* CSS variables
// and shell.css multiplies the existing Driftline sizes by them (no CSS zoom, each size scaled once).

export type ScaleKey = 'overall' | 'text' | 'rows' | 'ticks' | 'dates' | 'nav'
export type DisplayScale = Record<ScaleKey, number>
export type ScalePreset = 'standard' | 'compact'

export const SCALE_STEP = 0.05
export const SCALE_BOUNDS: Record<ScaleKey, readonly [number, number]> = {
  overall: [0.75, 1.15], text: [0.85, 1.2], rows: [0.5, 1.5], ticks: [0.75, 1.15], dates: [0.8, 1.15], nav: [0.8, 1.15],
}
export const SCALE_KEYS = Object.keys(SCALE_BOUNDS) as ScaleKey[]

/** Today's look: every factor 1. */
export const SCALE_DEFAULT: DisplayScale = { overall: 1, text: 1, rows: 1, ticks: 1, dates: 1, nav: 1 }
/** Old-view density: smaller boxes, header and dock, but rows keep their gap so nothing looks congested. */
export const SCALE_PRESETS: Record<ScalePreset, DisplayScale> = {
  standard: SCALE_DEFAULT,
  compact: { overall: 0.85, text: 1, rows: 1.1, ticks: 0.95, dates: 1, nav: 0.95 },
}

const snap = (n: number) => Math.round(n / SCALE_STEP) * SCALE_STEP
const round = (n: number) => Math.round(n * 1000) / 1000

/** One factor clamped to its bounds and snapped to the slider step; anything that is not a finite number falls back to 1. */
export function clampFactor(key: ScaleKey, raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return SCALE_DEFAULT[key]
  const [lo, hi] = SCALE_BOUNDS[key]
  return round(Math.min(hi, Math.max(lo, snap(raw))))
}

/** A whole stored preference, validated: unknown keys dropped, missing ones default. */
export function cleanScale(raw: unknown): DisplayScale {
  const o = raw && typeof raw === 'object' ? (raw as Partial<Record<ScaleKey, unknown>>) : {}
  return Object.fromEntries(SCALE_KEYS.map((k) => [k, clampFactor(k, o[k])])) as DisplayScale
}

export const presetOf = (s: DisplayScale): ScalePreset | null =>
  (Object.keys(SCALE_PRESETS) as ScalePreset[]).find((p) => SCALE_KEYS.every((k) => SCALE_PRESETS[p][k] === s[k])) ?? null

export const percent = (n: number) => `${Math.round(n * 100)}%`

/** CSS variables for each group: overall × its own factor, so every size is scaled exactly once. */
export function scaleVars(s: DisplayScale): Record<string, string> {
  const groups: Exclude<ScaleKey, 'overall'>[] = ['text', 'rows', 'ticks', 'dates', 'nav']
  return Object.fromEntries(groups.map((g) => [`--sow-k-${g}`, String(round(s.overall * s[g]))]))
}
