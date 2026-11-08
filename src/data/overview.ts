// Overview data: per-class cards (O2g) and All dates (O2e). Pure. Spec: FEATURES.md F-OV-*.
import type { SheetState } from './contract'
import { addDays, dowOf } from './dial'
import { classLabel } from './model'
function pupilsOf(s: SheetState, classKey: string) { return s.roster.filter((p) => p.classKey === classKey && p.status === 'Active') }
function onSet(s: SheetState) { return new Set(s.ticks.filter((t) => t.set).map((t) => `${t.sessionId}|${t.roll}`)) }
const sessionsOf = (s: SheetState, subjectKey: string) => s.sessions.filter((x) => x.subjectKey === subjectKey && x.date).sort((a, b) => a.date.localeCompare(b.date))
export type When = 'past' | 'today' | 'future'
/** One date of one class + subject + type, with how many copies are in. */
export type OvDate = { sessionId: string; date: string; topic: string; done: number; left: number; when: When }
/** v0.8 O2g card: the dates shown are today and the ones still to come this week (else the next one); `pastOpen` = an older date still has copies to come in. */
export type Card = { subjectKey: string; classKey: string; label: string; subject: string; kind: string; total: number; dates: OvDate[]; open: string | null; pastOpen: boolean }
const MAX_CARD_DATES = 3
function datesOf(s: SheetState, subjectKey: string, classKey: string, today: string): OvDate[] {
  const on = onSet(s); const pupils = pupilsOf(s, classKey)
  return sessionsOf(s, subjectKey).map((x) => { const done = pupils.filter((p) => on.has(`${x.sessionId}|${p.roll}`)).length
    return { sessionId: x.sessionId, date: x.date, topic: x.topic, done, left: pupils.length - done, when: x.date < today ? 'past' : x.date === today ? 'today' : 'future' } })
}
type PickDates = (all: OvDate[]) => OvDate[]
function cardsWith(s: SheetState, today: string, pick: PickDates): Card[] {
  const cards = s.subjects.filter((x) => x.active).map((sub, order) => {
    const all = datesOf(s, sub.subjectKey, sub.classKey, today); const dates = pick(all).slice(0, MAX_CARD_DATES)
    const open = dates[0]?.sessionId ?? all[all.length - 1]?.sessionId ?? null
    return { order, card: { subjectKey: sub.subjectKey, classKey: sub.classKey, label: classLabel(sub.classKey), subject: sub.subject, kind: sub.kind, total: pupilsOf(s, sub.classKey).length, dates, open, pastOpen: all.some((d) => d.when === 'past' && d.left > 0) } }
  })
  const isToday = (c: Card) => Number(c.dates[0]?.when === 'today')
  return cards.sort((a, b) => isToday(b.card) - isToday(a.card) || a.order - b.order).map((x) => x.card)
}
export function overviewCards(s: SheetState, today: string): Card[] {
  const sunday = addDays(today, 6 - dowOf(today))
  return cardsWith(s, today, (all) => { const ahead = all.filter((d) => d.when !== 'past'); const week = ahead.filter((d) => d.date <= sunday); return week.length ? week : ahead.slice(0, 1) })
}
/** v0.8 F-SH-09 (O3-session-past2): a past year's cards show its last week (Mon–Sun of its latest date); nothing is open any more. */
export function pastYearCards(s: SheetState, today: string): Card[] {
  const last = s.sessions.reduce((m, x) => (x.date > m ? x.date : m), ''); const monday = last && addDays(last, -dowOf(last))
  return cardsWith(s, today, (all) => all.filter((d) => d.date >= monday)).map((c) => ({ ...c, pastOpen: false }))
}
export type DateWeek = { start: string; title: string; rows: OvDate[] }
export type DateMonth = { key: string; title: string; weeks: DateWeek[] }
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const dm = (iso: string) => ({ d: Number(iso.slice(8, 10)), m: MON[Number(iso.slice(5, 7)) - 1]! })
function weekRange(start: string, end: string) { const a = dm(start), b = dm(end); return a.m === b.m ? `${a.d}–${b.d} ${b.m}` : `${a.d} ${a.m} – ${b.d} ${b.m}` }
/** v0.8 O2e All dates: newest first, grouped by month (of the week's Monday), then by Mon–Sun week. */
export function allDates(s: SheetState, subjectKey: string, today: string): DateMonth[] {
  const sub = s.subjects.find((x) => x.subjectKey === subjectKey); if (!sub) return []
  const thisMon = addDays(today, -dowOf(today)); const months: DateMonth[] = []
  for (const d of datesOf(s, subjectKey, sub.classKey, today).reverse()) {
    const start = addDays(d.date, -dowOf(d.date)); const key = start.slice(0, 7)
    let m = months[months.length - 1]; if (m?.key !== key) { m = { key, title: `${MONTH_LONG[Number(key.slice(5)) - 1]} ${key.slice(0, 4)}`, weeks: [] }; months.push(m) }
    let w = m.weeks[m.weeks.length - 1]; if (w?.start !== start) { const r = weekRange(start, addDays(start, 6)); w = { start, title: start === thisMon ? `This week · ${r}` : r, rows: [] }; m.weeks.push(w) }
    w.rows.push(d)
  }
  return months
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
