// v0.7j Overview: all classes list + per-class week path (Steve t82u–t87u). Pure. Spec: FEATURES.md F-OV-*.
import type { SheetState } from './contract'
import { pickAnchor } from './model'
import { addDays, dowOf } from './dial'
export type Card = { subjectKey: string; classKey: string; label: string; subject: string; kind: string; sessionId: string | null; date: string | null; topic: string; toGo: number; total: number; today: boolean }
export const classLabel = (k: string) => (k === 'demo' ? 'KG-A' : /^KG/i.test(k) ? k.replace(/^KG[-_ ]?([A-Z])\b.*/i, 'KG-$1') : k)
function pupilsOf(s: SheetState, classKey: string) { return s.roster.filter((p) => p.classKey === classKey && p.status === 'Active') }
function onSet(s: SheetState) { return new Set(s.ticks.filter((t) => t.set).map((t) => `${t.sessionId}|${t.roll}`)) }
const sessionsOf = (s: SheetState, subjectKey: string) => s.sessions.filter((x) => x.subjectKey === subjectKey && x.date).sort((a, b) => a.date.localeCompare(b.date))
export function overviewCards(s: SheetState, today: string): Card[] {
  const on = onSet(s)
  const cards = s.subjects.filter((x) => x.active).map((sub, order) => {
    const ses = sessionsOf(s, sub.subjectKey); const a = pickAnchor(ses.map((x) => x.date), today); const cur = a.index >= 0 ? ses[a.index]! : null
    const pupils = pupilsOf(s, sub.classKey)
    const toGo = cur ? pupils.filter((p) => !on.has(`${cur.sessionId}|${p.roll}`)).length : 0
    return { order, card: { subjectKey: sub.subjectKey, classKey: sub.classKey, label: classLabel(sub.classKey), subject: sub.subject, kind: sub.kind, sessionId: cur?.sessionId ?? null, date: cur?.date ?? null, topic: cur?.topic ?? '', toGo, total: pupils.length, today: cur?.date === today } }
  })
  return cards.sort((a, b) => Number(b.card.today) - Number(a.card.today) || a.order - b.order).map((x) => x.card)
}
export type Stop = { sessionId: string; date: string; kind: string; topic: string; toGo: number; when: 'past' | 'today' | 'future' }
export type Week = { start: string; end: string; title: string; stops: Stop[] }
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const dm = (iso: string) => ({ d: Number(iso.slice(8, 10)), m: MON[Number(iso.slice(5, 7)) - 1]! })
export function weekRange(start: string, end: string) { const a = dm(start), b = dm(end); return a.m === b.m ? `${a.d}–${b.d} ${b.m}` : `${a.d} ${a.m} – ${b.d} ${b.m}` }
export function weekPath(s: SheetState, subjectKey: string, today: string): Week[] {
  const sub = s.subjects.find((x) => x.subjectKey === subjectKey); if (!sub) return []
  const on = onSet(s); const pupils = pupilsOf(s, sub.classKey)
  const thisMon = addDays(today, -dowOf(today)); const weeks = new Map<string, Stop[]>()
  for (const x of sessionsOf(s, subjectKey)) {
    const st = addDays(x.date, -dowOf(x.date))
    const stop: Stop = { sessionId: x.sessionId, date: x.date, kind: sub.kind, topic: x.topic, toGo: pupils.filter((p) => !on.has(`${x.sessionId}|${p.roll}`)).length, when: x.date < today ? 'past' : x.date === today ? 'today' : 'future' }
    weeks.set(st, [...(weeks.get(st) ?? []), stop])
  }
  return [...weeks].sort((a, b) => b[0].localeCompare(a[0])).map(([start, stops]) => {
    const end = addDays(start, 6); const r = weekRange(start, end)
    const title = start === thisMon ? `This week · ${r}` : start === addDays(thisMon, -7) ? `Last week · ${r}` : start === addDays(thisMon, 7) ? `Next week · ${r}` : r
    return { start, end, title, stops }
  })
}
/** Same label (subjectKey) already on that day? */
export const collides = (s: SheetState, subjectKey: string, date: string, ignoreSessionId?: string) => s.sessions.some((x) => x.subjectKey === subjectKey && x.date === date && x.sessionId !== ignoreSessionId)
/** Next class day for + New date: first day after max(today-1, latest session) on a weekday this class usually meets (from its past sessions; Mon–Fri if none), skipping any day that already has this label. */
export function nextClassDay(s: SheetState, subjectKey: string, today: string): string {
  const ses = sessionsOf(s, subjectKey); const days = new Set(ses.map((x) => dowOf(x.date))); if (!days.size) [0, 1, 2, 3, 4].forEach((d) => days.add(d))
  const last = ses.length ? ses[ses.length - 1]!.date : today
  let d = addDays(last > addDays(today, -1) ? last : addDays(today, -1), 1)
  for (let i = 0; i < 366; i++, d = addDays(d, 1)) if (days.has(dowOf(d)) && !collides(s, subjectKey, d)) return d
  return addDays(today, 1)
}
