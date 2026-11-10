// v0.9.0-beta.3 (t150u): one model for every Quick overview day card, whatever its style. Pure.
import type { TickRow } from './contract'
import { dateLabel, dayLabel, toGo, type Checklist } from './model'
import { countSince } from './since'

/** Dev-only card styles (Steve could not pick one): D4 Edge pager, E1 Tide, E2 Roll grid, E3 Ghost numeral, E4 Recent days. */
export type QoStyle = 'd4' | 'e1' | 'e2' | 'e3' | 'e4'
export const QO_STYLES: readonly { id: QoStyle; label: string }[] = [
  { id: 'd4', label: 'D4 Edge pager' }, { id: 'e1', label: 'E1 Tide' }, { id: 'e2', label: 'E2 Roll grid' }, { id: 'e3', label: 'E3 Ghost numeral' }, { id: 'e4', label: 'E4 Recent days' },
]
export const cleanQoStyle = (v: unknown): QoStyle => (QO_STYLES.some((s) => s.id === v) ? (v as QoStyle) : 'd4')
export const nextQoStyle = (s: QoStyle): QoStyle => QO_STYLES[(QO_STYLES.findIndex((x) => x.id === s) + 1) % QO_STYLES.length]!.id
export const qoStyleName = (s: QoStyle) => QO_STYLES.find((x) => x.id === s)!.label

export type RollCell = { roll: number; name: string; done: boolean; fresh: boolean }
export type RecentDay = { sessionId: string; day: string; done: number; total: number; current: boolean }
export type QoCard = {
  sessionId: string; day: string; label: string; done: number; total: number; pct: number; since: number; past: boolean; sel: boolean
  /** every pupil in roll order; `fresh` = ticked inside the since window (E2) */
  roll: RollCell[]
  /** up to the last `RECENT` dates of this subject ending at this one, oldest first (E4); fewer when the subject is new */
  recent: RecentDay[]
}
export const RECENT = 5

const freshRolls = (ticks: readonly TickRow[], sessionId: string, from: number) =>
  new Set(ticks.filter((t) => t.sessionId === sessionId && t.set && t.updatedAt && Date.parse(t.updatedAt) >= from).map((t) => t.roll))

/** The card for one date column. `from` is the start of the since window (see since.ts). */
export function qoCard(c: Checklist, ticks: readonly TickRow[], sessionId: string, opts: { from: number; today: string; selId: string | null }): QoCard {
  const i = c.columns.findIndex((x) => x.sessionId === sessionId); const s = c.columns[i]!; const total = c.pupils.length
  const done = total - toGo(c, sessionId); const fresh = freshRolls(ticks, sessionId, opts.from)
  const roll = c.pupils.map((p) => { const d = c.ticked(sessionId, p.roll); return { roll: p.roll, name: p.name, done: d, fresh: d && fresh.has(p.roll) } })
  const recent = c.columns.slice(Math.max(0, i - RECENT + 1), i + 1).map((x) => ({ sessionId: x.sessionId, day: dayLabel(x.date), done: total - toGo(c, x.sessionId), total, current: x.sessionId === sessionId }))
  return { sessionId, day: dayLabel(s.date), label: dateLabel(s.date), done, total, pct: total ? Math.round((done / total) * 100) : 0, since: countSince(ticks, sessionId, opts.from), past: s.date < opts.today, sel: sessionId === opts.selId, roll, recent }
}
