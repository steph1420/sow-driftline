// Dev sizer build only (VITE_DL_SIZER=1). Every tunable size, grouped the way Pick mode finds them on the page.
// Each `v` is a named --sow-* var in shell.css whose CSS default is the beta.3 look (`beta`, px at display size 1).
// `def` is the sizer's starting value (Steve's picks, t157u); anything that differs from `beta` is written on :root.
export type Unit = 'px' | '%' | ''
export type Size = { key: string; label: string; v: string; beta: number; def?: number; min: number; max: number; step?: number; unit?: Unit }
export type Group = { id: string; label: string; pick: string; outline: string; sizes: Size[] }

const g = (id: string, label: string, pick: string, sizes: Size[], outline = pick): Group => ({ id, label, pick, outline, sizes })

export const GROUPS: Group[] = [
  g('bar', 'Top bar', '.sow-bar', [
    { key: 'bar', label: 'Bar height', v: '--sow-bar-height', beta: 48, def: 56, min: 40, max: 72 },
    { key: 'barpad', label: 'Right padding', v: '--sow-bar-pad-r', beta: 8, min: 0, max: 24 },
    { key: 'chip', label: 'Chip inset', v: '--sow-chip-x', beta: 8, def: 5, min: 0, max: 24 },
    { key: 'chiph', label: 'Chip height', v: '--sow-chip-h', beta: 36, min: 28, max: 52 },
    { key: 'chipf', label: 'Chip font', v: '--sow-chip-font', beta: 15, min: 12, max: 20 },
    { key: 'chipr', label: 'Chip radius', v: '--sow-chip-radius', beta: 18, min: 0, max: 28 },
    { key: 'btn', label: 'Undo/shortcut size', v: '--sow-bar-btn', beta: 44, min: 32, max: 56 },
    { key: 'btngap', label: 'Button gap', v: '--sow-bar-gap', beta: 4, min: 0, max: 16 },
  ]),
  g('rail', 'A–Z rail', '.sow-rail', [
    { key: 'rail', label: 'Rail inset', v: '--sow-rail-x', beta: 8, def: 7, min: 0, max: 24 },
    { key: 'railw', label: 'Rail width', v: '--sow-rail-w', beta: 16, def: 12, min: 8, max: 32 },
    { key: 'railf', label: 'Letter size', v: '--sow-rail-font', beta: 13, min: 9, max: 18 },
    { key: 'railpad', label: 'Letter spread (end pad)', v: '--sow-rail-pad', beta: 8, min: 0, max: 64 },
    { key: 'gap', label: 'Gap to table', v: '--sow-rail-gap', beta: 8, def: 6, min: 0, max: 24 },
  ]),
  g('head', 'Table header', '.sow-grid thead', [
    { key: 'head', label: 'Header height', v: '--sow-head-h', beta: 44, def: 46, min: 32, max: 72 },
    { key: 'thf', label: '# / Names font', v: '--sow-th-font', beta: 13, min: 10, max: 18 },
    { key: 'throll', label: '# nudge', v: '--sow-th-roll-nudge', beta: 0, min: -12, max: 12 },
    { key: 'thname', label: 'Names nudge', v: '--sow-th-name-nudge', beta: 0, min: -12, max: 12 },
    { key: 'thdate', label: 'Date label font', v: '--sow-th-date-font', beta: 13, min: 10, max: 20 },
    { key: 'thsub', label: 'Subtext font', v: '--sow-th-sub-font', beta: 13, min: 9, max: 16 },
  ]),
  g('rows', 'Rows', '.sow-grid tbody td.n, .sow-grid tbody td.r', [
    { key: 'row', label: 'Row height', v: '--sow-row-base', beta: 48, def: 47, min: 36, max: 64 },
    { key: 'roll', label: '# width', v: '--sow-roll-w', beta: 36, def: 20, min: 16, max: 56 },
    { key: 'rollf', label: '# font', v: '--sow-roll-font', beta: 13, min: 10, max: 18 },
    { key: 'ngap', label: '# → Names', v: '--sow-name-pad', beta: 12, def: 3, min: 0, max: 24 },
    { key: 'name', label: 'Name font', v: '--sow-name-size', beta: 16, min: 13, max: 22 },
    { key: 'namew', label: 'Name weight', v: '--sow-name-weight', beta: 400, min: 300, max: 700, step: 100, unit: '' },
    { key: 'line', label: 'Divider opacity', v: '--sow-row-line', beta: 100, min: 0, max: 100, step: 5, unit: '%' },
  ]),
  g('cols', 'Dates & ticks', '.sow-grid tbody td:not(.n):not(.r)', [
    { key: 'col', label: 'Column width', v: '--sow-date-col', beta: 56, def: 58, min: 40, max: 80 },
    { key: 'tick', label: 'Tick box', v: '--sow-tick-base', beta: 24, def: 25, min: 16, max: 36 },
    { key: 'stroke', label: 'Tick stroke', v: '--sow-tick-stroke', beta: 3, min: 1, max: 5, step: 0.25, unit: '' },
    { key: 'tickr', label: 'Tick radius', v: '--sow-tick-radius', beta: 10, min: 0, max: 18 },
    { key: 'colgap', label: 'Column gap', v: '--sow-col-gap', beta: 0, min: 0, max: 16 },
  ]),
  g('qo', 'Quick overview', '.sow-qc', [
    { key: 'qpad', label: 'Card padding', v: '--sow-qc-pad', beta: 12, min: 4, max: 24 },
    { key: 'qrad', label: 'Card radius', v: '--sow-qc-radius', beta: 28, min: 0, max: 40 },
    { key: 'qnum', label: 'Count font', v: '--sow-qc-num', beta: 30, min: 20, max: 48 },
    { key: 'qpill', label: 'Date pill height', v: '--sow-qc-pill-h', beta: 44, min: 28, max: 56 },
    { key: 'qpillf', label: 'Date pill font', v: '--sow-qc-pill-font', beta: 15, min: 12, max: 20 },
    { key: 'qdot', label: 'Switcher dot', v: '--sow-qc-dot', beta: 4, min: 2, max: 8 },
  ]),
  g('dock', 'Dock', '.dl-dock, .sow-grabber', [
    { key: 'dock', label: 'Tab height', v: '--sow-dock-tab-h', beta: 48, min: 40, max: 64 },
    { key: 'dicon', label: 'Icon size', v: '--sow-dock-icon', beta: 17, min: 12, max: 24 },
    { key: 'dfont', label: 'Label font', v: '--sow-dock-font', beta: 13, min: 10, max: 16 },
    { key: 'dpad', label: 'Tab side padding', v: '--sow-dock-tab-px', beta: 10, min: 0, max: 20 },
    { key: 'stripw', label: 'Strip width', v: '--sow-strip-w', beta: 48, min: 16, max: 96 },
    { key: 'striph', label: 'Strip thickness', v: '--sow-strip-h', beta: 5, min: 2, max: 10 },
    { key: 'stripo', label: 'Strip opacity', v: '--sow-strip-op', beta: 70, min: 10, max: 100, step: 5, unit: '%' },
    { key: 'reserve', label: 'Space above dock', v: '--sow-dock-reserve', beta: 88, def: 82, min: 56, max: 128 },
  ]),
  g('sc', 'Shortcuts', '.sow-scs', [
    { key: 'scsize', label: 'Circle size', v: '--sow-sc-size', beta: 44, min: 32, max: 64 },
    { key: 'scgap', label: 'Spacing', v: '--sow-sc-gap', beta: 12, min: 0, max: 32 },
    { key: 'sctop', label: 'Distance from button', v: '--sow-sc-top', beta: 8, min: 0, max: 40 },
  ]),
]

export const SIZES: Size[] = GROUPS.flatMap((x) => x.sizes)
export type Values = Record<string, number>
export const KEY = 'sow-driftline-sizer:v2'
const OLD_KEY = 'sow-driftline-sizer:v1'

const pick = (f: (s: Size) => number): Values => Object.fromEntries(SIZES.map((s) => [s.key, f(s)]))
export const defaults = () => pick((s) => s.def ?? s.beta)
export const beta3 = () => pick((s) => s.beta)
const fmt = (s: Size, n: number) => `${n}${s.unit ?? 'px'}`
export const readout = (s: Size, n: number) => fmt(s, n)

/** Saved values over the defaults, clamped to each range; v1 saves (first sizer) still load. */
export function load(store: Pick<Storage, 'getItem'>): Values {
  const out = defaults()
  for (const raw of [store.getItem(OLD_KEY), store.getItem(KEY)]) {
    let saved: unknown = null
    try { saved = raw ? JSON.parse(raw) : null } catch { saved = null }
    if (saved && typeof saved === 'object') for (const s of SIZES) {
      const n = (saved as Record<string, unknown>)[s.key]
      if (typeof n === 'number' && Number.isFinite(n)) out[s.key] = Math.min(s.max, Math.max(s.min, n))
    }
  }
  return out
}

/** Writes only values that differ from beta.3, so untouched sizes keep following display size (--sow-k-*). */
export function apply(vals: Values, style: CSSStyleDeclaration) {
  for (const s of SIZES) { if (vals[s.key] === s.beta) style.removeProperty(s.v); else style.setProperty(s.v, fmt(s, vals[s.key]!)) }
}

/** Every value that differs from beta.3, grouped: 'Rows: row 47 · roll 20 | Dock: reserve 82'. */
export function summary(vals: Values) {
  const parts = GROUPS.map((x) => [x.label, x.sizes.filter((s) => vals[s.key] !== s.beta).map((s) => `${s.key} ${vals[s.key]}`)] as const)
    .filter(([, l]) => l.length).map(([label, l]) => `${label}: ${l.join(' · ')}`)
  return parts.length ? parts.join(' | ') : 'No changes from beta.3'
}

/** Which group a tapped element belongs to (Pick mode). */
export function groupOf(el: Element | null): Group | undefined {
  return el ? GROUPS.find((x) => el.closest(x.pick)) : undefined
}
