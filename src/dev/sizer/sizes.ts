// Dev sizer build only (VITE_DL_SIZER=1). The layout sizes the sizer can tune: each is a named --sow-* var in shell.css.
// `def` is today's px value at display size 1, so an untouched slider writes nothing and the app looks exactly like Beta.
export type Size = { key: string; label: string; v: string; def: number; min: number; max: number; step?: number; group: string }

export const SIZES: Size[] = [
  { group: 'Table', key: 'rail', label: 'Rail inset', v: '--sow-rail-x', def: 8, min: 0, max: 24 },
  { group: 'Table', key: 'railw', label: 'Rail width', v: '--sow-rail-w', def: 16, min: 8, max: 32 },
  { group: 'Table', key: 'gap', label: 'Rail → #', v: '--sow-rail-gap', def: 8, min: 0, max: 24 },
  { group: 'Table', key: 'roll', label: '# column', v: '--sow-roll-w', def: 36, min: 20, max: 56 },
  { group: 'Table', key: 'ngap', label: '# → Names', v: '--sow-name-pad', def: 12, min: 0, max: 24 },
  { group: 'Table', key: 'name', label: 'Name font', v: '--sow-name-size', def: 16, min: 13, max: 22 },
  { group: 'Table', key: 'row', label: 'Row height', v: '--sow-row-base', def: 48, min: 36, max: 64 },
  { group: 'Table', key: 'col', label: 'Date column', v: '--sow-date-col', def: 56, min: 40, max: 80 },
  { group: 'Table', key: 'tick', label: 'Tick box', v: '--sow-tick-base', def: 24, min: 16, max: 36 },
  { group: 'Table', key: 'head', label: 'Header height', v: '--sow-head-h', def: 44, min: 32, max: 72 },
  { group: 'Chrome', key: 'bar', label: 'Top bar height', v: '--sow-bar-height', def: 48, min: 40, max: 72 },
  { group: 'Chrome', key: 'chip', label: 'Class chip inset', v: '--sow-chip-x', def: 8, min: 0, max: 24 },
  { group: 'Chrome', key: 'dock', label: 'Dock tab height', v: '--sow-dock-tab-h', def: 48, min: 40, max: 64 },
  { group: 'Chrome', key: 'reserve', label: 'Space above dock', v: '--sow-dock-reserve', def: 88, min: 56, max: 128 },
]

export type Values = Record<string, number>
export const KEY = 'sow-driftline-sizer:v1'

export function defaults(): Values { return Object.fromEntries(SIZES.map((s) => [s.key, s.def])) }

/** Saved values, clamped to each slider's range; unknown or broken entries fall back to the default. */
export function load(raw: string | null): Values {
  const out = defaults(); let saved: unknown = null
  try { saved = raw ? JSON.parse(raw) : null } catch { saved = null }
  if (saved && typeof saved === 'object') for (const s of SIZES) {
    const n = (saved as Record<string, unknown>)[s.key]
    if (typeof n === 'number' && Number.isFinite(n)) out[s.key] = Math.min(s.max, Math.max(s.min, Math.round(n)))
  }
  return out
}

/** Only values that differ from today's are written, so display size (--sow-k-*) still scales everything untouched. */
export function apply(vals: Values, style: CSSStyleDeclaration) {
  for (const s of SIZES) { if (vals[s.key] === s.def) style.removeProperty(s.v); else style.setProperty(s.v, `${vals[s.key]}px`) }
}

/** 'rail 8 · railw 16 · …' — every value, changed ones marked with *. */
export function summary(vals: Values) {
  return SIZES.map((s) => `${s.key} ${vals[s.key]}${vals[s.key] === s.def ? '' : '*'}`).join(' · ')
}
