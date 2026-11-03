// Pure checklist model (no I/O). Spec IDs in tests/d1.test.tsx.
import { CONFIG } from '../config'
import type { Pupil, SessionRow, SheetState } from './contract'
export type AnchorKind = 'today' | 'upcoming' | 'last' | 'none'
export function pickAnchor(dates: string[], today: string): { kind: AnchorKind; index: number } {
  if (!dates.length) return { kind: 'none', index: -1 }
  const t = dates.indexOf(today); if (t >= 0) return { kind: 'today', index: t }
  const u = dates.findIndex((d) => d > today); if (u >= 0) return { kind: 'upcoming', index: u }
  return { kind: 'last', index: dates.length - 1 }
}
export type Layout = 'phone' | 'desktop'
export function visibleCols(total: number, end: number, layout: Layout): number[] {
  const n = layout === 'phone' ? CONFIG.layout.phoneMaxDateCols : CONFIG.layout.desktopDateCols
  const hi = Math.max(0, Math.min(end, total - 1)); const lo = Math.max(0, hi - n + 1)
  return total ? Array.from({ length: hi - lo + 1 }, (_, i) => lo + i) : []
}
export type Checklist = { classKey: string; subject: string; pupils: Pupil[]; columns: (SessionRow & { kind: string })[]; ticked: (sessionId: string, roll: number) => boolean }
export function classesOf(s: SheetState): { classKey: string; subject: string }[] {
  const seen = new Map<string, string>()
  for (const x of s.subjects) if (x.active && !seen.has(x.classKey)) seen.set(x.classKey, x.subject)
  for (const p of s.roster) if (!seen.has(p.classKey)) seen.set(p.classKey, '')
  return [...seen].map(([classKey, subject]) => ({ classKey, subject }))
}
export function toChecklist(s: SheetState, classKey: string): Checklist {
  const kind = new Map(s.subjects.map((x) => [x.subjectKey, x.kind]))
  const pupils = s.roster.filter((p) => p.classKey === classKey && p.status === 'Active').sort((a, b) => a.roll - b.roll)
  const columns = s.sessions.filter((x) => x.classKey === classKey && x.date).map((x) => ({ ...x, kind: kind.get(x.subjectKey) ?? '' }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.subjectKey.localeCompare(b.subjectKey))
  const on = new Set(s.ticks.filter((t) => t.classKey === classKey && t.set).map((t) => `${t.sessionId}|${t.roll}`))
  return { classKey, subject: s.subjects.find((x) => x.classKey === classKey)?.subject ?? '', pupils, columns, ticked: (id, r) => on.has(`${id}|${r}`) }
}
export const toGo = (c: Checklist, sessionId: string) => c.pupils.filter((p) => !c.ticked(sessionId, p.roll)).length
export const letterIndex = (names: string[], L: string) => names.findIndex((n) => n.trim().toUpperCase().startsWith(L.toUpperCase()))
export function searchIndex(names: string[], q: string) { const s = q.trim().toLowerCase(); return s ? names.findIndex((n) => n.toLowerCase().includes(s)) : -1 }
export function fmtDay(iso: string) { const d = new Date(iso + 'T00:00:00'); return { dow: d.toLocaleDateString('en-GB', { weekday: 'short' }), dm: `${d.getDate()}/${d.getMonth() + 1}` } }
