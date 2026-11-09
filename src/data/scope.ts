// RDs2 (t140u) class scope: what the Classes panel's left strip picks, and what the chip swipe walks through. Pure.
import type { SheetState, Subject } from './contract'
import { classesOf } from './model'

/** The left strip pick: every subject, the starred ones, or one class. Smart lists have no data yet (LISTS shows none). */
export type ScopePick = { kind: 'all' } | { kind: 'fav' } | { kind: 'class'; classKey: string }
export const ALL: ScopePick = { kind: 'all' }

export const samePick = (a: ScopePick, b: ScopePick) => a.kind === b.kind && (a.kind !== 'class' || (b.kind === 'class' && a.classKey === b.classKey))

/** Active subjects in that pick, in class order then sheet order. */
export function scopeSubjects(data: SheetState, pick: ScopePick, favs: readonly string[]): Subject[] {
  const order = classesOf(data).map((c) => c.classKey)
  const live = data.subjects.filter((x) => x.active).sort((a, b) => order.indexOf(a.classKey) - order.indexOf(b.classKey))
  if (pick.kind === 'fav') return live.filter((x) => favs.includes(x.subjectKey))
  if (pick.kind === 'class') return live.filter((x) => x.classKey === pick.classKey)
  return live
}

/** The next (dir 1) or previous (dir -1) subject in the scope; null at either end unless `loop`. */
export function stepScope(keys: readonly string[], current: string, dir: 1 | -1, loop: boolean): string | null {
  if (!keys.length) return null
  const i = keys.indexOf(current); if (i < 0) return keys[dir === 1 ? 0 : keys.length - 1]!
  const j = i + dir; if (j >= 0 && j < keys.length) return keys[j]!
  return loop && keys.length > 1 ? keys[(j + keys.length) % keys.length]! : null
}

/** Position dots for the chip: at most `max`; a long scope maps its position onto them. */
export function scopeDots(count: number, index: number, max = 5): { count: number; on: number } {
  if (count <= 1) return { count: 0, on: -1 }
  const n = Math.min(count, max); if (index < 0) return { count: n, on: -1 }
  return { count: n, on: count <= max ? index : Math.round((index / (count - 1)) * (n - 1)) }
}

/** A pick that still exists in the data (a class can disappear after a refresh); otherwise All. */
export function validPick(data: SheetState, pick: ScopePick | null | undefined): ScopePick {
  if (!pick || typeof pick !== 'object') return ALL
  if (pick.kind === 'fav' || pick.kind === 'all') return pick
  return pick.kind === 'class' && classesOf(data).some((c) => c.classKey === pick.classKey) ? pick : ALL
}
