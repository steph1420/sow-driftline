// beta.13 (t230u): how Checklist orders its names. A–Z (first name), Roll, or Pending (leftover ticks across the dates
// on screen; ties by roll), each ascending or descending. Each option keeps its own direction, so switching back
// remembers it. Default Roll ↑ (the sheet's order). Kept on this device only.
export type SortBy = 'az' | 'roll' | 'pending'
export type SortDir = 'asc' | 'desc'
export type NameSort = { by: SortBy; dirs: Record<SortBy, SortDir> }
export const SORTS: readonly { id: SortBy; label: string; note: string }[] = [
  { id: 'az', label: 'A–Z', note: 'First name, A to Z' },
  { id: 'roll', label: 'Roll', note: 'Class roll number' },
  { id: 'pending', label: 'Pending', note: 'How many ticks are still left' },
]
export const SORT_DEFAULT: NameSort = { by: 'roll', dirs: { az: 'asc', roll: 'asc', pending: 'desc' } }
const isBy = (v: unknown): v is SortBy => v === 'az' || v === 'roll' || v === 'pending'
const isDir = (v: unknown): v is SortDir => v === 'asc' || v === 'desc'
/** Anything stored (or nothing) → a valid sort. */
export function cleanSort(v: unknown): NameSort {
  const o = (v && typeof v === 'object' ? v : {}) as { by?: unknown; dirs?: Record<string, unknown> }; const d = o.dirs && typeof o.dirs === 'object' ? o.dirs : {}
  return { by: isBy(o.by) ? o.by : SORT_DEFAULT.by, dirs: { az: isDir(d.az) ? d.az : SORT_DEFAULT.dirs.az, roll: isDir(d.roll) ? d.roll : SORT_DEFAULT.dirs.roll, pending: isDir(d.pending) ? d.pending : SORT_DEFAULT.dirs.pending } }
}
export const sortDir = (s: NameSort): SortDir => s.dirs[s.by]
export const isDefaultSort = (s: NameSort) => s.by === 'roll' && s.dirs.roll === 'asc'
export const ARROW: Record<SortDir, string> = { asc: '↑', desc: '↓' }
export const sortName = (by: SortBy) => SORTS.find((x) => x.id === by)!.label
/** "Roll ↑", "Pending ↓" … */
export const sortLabel = (s: NameSort) => `${sortName(s.by)} ${ARROW[sortDir(s)]}`
/** Pick an option (its remembered direction), or an option with a direction. */
export const pickSort = (s: NameSort, by: SortBy, dir?: SortDir): NameSort => ({ by, dirs: dir ? { ...s.dirs, [by]: dir } : s.dirs })

type Pupil = { roll: number; name: string }
const byName = (a: string, b: string) => a.localeCompare(b, 'en', { sensitivity: 'base' })
/** A new array in the chosen order. `pending(roll)` = leftover ticks for that pupil (only read for Pending). Ties by roll ↑. */
export function sortPupils<P extends Pupil>(pupils: readonly P[], s: NameSort, pending: (roll: number) => number = () => 0): P[] {
  const sign = sortDir(s) === 'asc' ? 1 : -1
  const key = s.by === 'pending' ? new Map(pupils.map((p) => [p.roll, pending(p.roll)])) : null
  return [...pupils].sort((a, b) => {
    const k = s.by === 'az' ? byName(a.name, b.name) : s.by === 'pending' ? key!.get(a.roll)! - key!.get(b.roll)! : a.roll - b.roll
    if (s.by === 'roll') return sign * k
    return k ? sign * k : a.roll - b.roll
  })
}
