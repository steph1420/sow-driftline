// v0.10.0 Admin (t209u–t212u, locked 11 Nov 2026): Load a snapshot, Rewind to a time, Start new year, Past years + pull in.
// Pure. Every big action is a Plan: the changes that take the data from how it is now to how it should be. A plan only
// ever ADDS changes (ticks set/unset, dates added/hidden/moved, topics), so nothing is erased and every plan can be undone
// by the plan back to the state kept just before it.
import { olFold, olView, type BaseEntry, type LogOp, type Rules } from '../oplog/core'
import { toSheetState, type LogData } from '../oplog/log'
import { cellKey, type Op } from '../sync/ops'
import { inverseEdit, applyEdits, type SessionEdit } from '../data/edits'
import { addDays } from '../data/dial'
import { yearFrom, yearOf, type SchoolYear } from '../data/schoolYear'
import type { Pupil, SessionRow, SheetState } from '../data/contract'

export type Cell = { sessionId: string; subjectKey: string; classKey: string; date: string; roll: number }
export type Plan = { ticksOn: Cell[]; ticksOff: Cell[]; addSessions: SessionRow[]; removeSessions: SessionRow[]
  moves: { session: SessionRow; date: string }[]; topics: { session: SessionRow; topic: string }[]; left: { classKey: string; roll: number; status: 'Active' | 'Left' }[] }
export const emptyPlan = (): Plan => ({ ticksOn: [], ticksOff: [], addSessions: [], removeSessions: [], moves: [], topics: [], left: [] })
export const planSize = (p: Plan) => p.ticksOn.length + p.ticksOff.length + p.addSessions.length + p.removeSessions.length + p.moves.length + p.topics.length + p.left.length

/** The changes that turn `cur` into `target`, matched by session id. `keepDates` (Load): a date that moved since stays
 *  on its new day (beta.17 rule), only its ticks and topic come back. Ticks of a date being hidden are left alone. */
export function diffPlan(cur: SheetState, target: SheetState, opts: { keepDates?: boolean } = {}): Plan {
  const p = emptyPlan(); const curS = new Map(cur.sessions.map((s) => [s.sessionId, s])); const tgtS = new Map(target.sessions.map((s) => [s.sessionId, s]))
  for (const [id, t] of tgtS) {
    const c = curS.get(id)
    if (!c) { p.addSessions.push(t); continue }
    if (!opts.keepDates && c.date !== t.date) p.moves.push({ session: c, date: t.date })
    if ((c.topic ?? '') !== (t.topic ?? '')) p.topics.push({ session: c, topic: t.topic ?? '' })
  }
  for (const [id, c] of curS) if (!tgtS.has(id)) p.removeSessions.push(c)
  const on = (s: SheetState) => new Set(s.ticks.filter((t) => t.set).map(cellKey))
  const a = on(cur), b = on(target); const gone = new Set(p.removeSessions.map((s) => s.sessionId))
  const cellOf = (sid: string, roll: number, src: SheetState): Cell | null => { const s = curS.get(sid) ?? tgtS.get(sid) ?? src.sessions.find((x) => x.sessionId === sid); return s ? { sessionId: sid, subjectKey: s.subjectKey, classKey: s.classKey, date: (tgtS.get(sid) ?? s).date, roll } : null }
  for (const t of target.ticks) if (t.set && !a.has(cellKey(t)) && tgtS.has(t.sessionId)) { const c = cellOf(t.sessionId, t.roll, target); if (c) p.ticksOn.push(c) }
  for (const t of cur.ticks) if (t.set && !b.has(cellKey(t)) && !gone.has(t.sessionId)) { const c = cellOf(t.sessionId, t.roll, cur); if (c) p.ticksOff.push(c) }
  const lt = new Map(target.roster.map((x) => [`${x.classKey}|${x.roll}`, x.status]))
  for (const x of cur.roster) { const w = lt.get(`${x.classKey}|${x.roll}`); if (w && w !== x.status) p.left.push({ classKey: x.classKey, roll: x.roll, status: w }) }
  return p
}

const n = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`
const join = (l: string[]) => (l.length < 2 ? l.join('') : `${l.slice(0, -1).join(', ')} and ${l[l.length - 1]}`)
/** Plain words for a plan ("remove 12 ticks and 1 date"), or '' when it changes nothing. */
export function planWords(p: Plan): string {
  const parts: string[] = []
  if (p.ticksOff.length) parts.push(`remove ${n(p.ticksOff.length, 'tick')}`)
  if (p.ticksOn.length) parts.push(`put back ${n(p.ticksOn.length, 'tick')}`)
  if (p.removeSessions.length) parts.push(`remove ${n(p.removeSessions.length, 'date')}`)
  if (p.addSessions.length) parts.push(`bring back ${n(p.addSessions.length, 'date')}`)
  if (p.moves.length) parts.push(`move ${n(p.moves.length, 'date')} back`)
  if (p.topics.length) parts.push(`change ${n(p.topics.length, 'topic')} back`)
  if (p.left.length) parts.push(`change ${n(p.left.length, 'Left mark')} back`)
  return join(parts)
}

// ───── Rewind: the state at a time, from the history of changes ─────
/** Op log (Q-HARM-10): fold the base and every op made at or before `at` (by the time it was made on its device). */
export function stateAtFromLog(base: BaseEntry[], ops: LogOp[], rules: Rules, roster: LogData['roster'], at: string): SheetState {
  return toSheetState(olView(olFold(base, ops.filter((o) => String(o.wallAt) <= at), rules)), roster)
}

/** This device's change list on the old save path (demo, or the test copy before the op log): one entry per change, in order. */
export type JournalEntry = { at: string; tick?: { op: Op; before: boolean }; edit?: SessionEdit }
/** Undo every entry after `at`, newest first: a tick goes back to its value before, a date edit to its inverse. */
export function stateAtFromJournal(cur: SheetState, journal: JournalEntry[], at: string): SheetState {
  let s = cur
  for (const e of journal.slice().reverse()) {
    if (e.at <= at) break
    if (e.tick) { const { op, before } = e.tick; const id = `${op.sessionId}|${op.roll}`; const has = s.ticks.some((t) => t.tickId === id)
      s = { ...s, ticks: has ? s.ticks.map((t) => (t.tickId === id ? { ...t, set: before } : t)) : [...s.ticks, { tickId: id, sessionId: op.sessionId, subjectKey: op.subjectKey, classKey: op.classKey, roll: op.roll, set: before, updatedAt: e.at }] } }
    else if (e.edit) { const inv = inverseEdit(s, e.edit); if (inv) s = applyEdits(s, [{ ...inv, id: `rw-${e.at}`, at: e.at }]) }
  }
  return s
}

// ───── School year line ─────
/** The start of a school year: 1 April, 00:00 IST. */
export const yearStartIso = (y: SchoolYear) => new Date(Date.parse(`${y.start}-04-01T00:00:00+05:30`)).toISOString()
/** Rewind can't go back before this: the start of this school year, or the last Start new year if that is later. */
export function rewindFloor(today: string, newYearAt: string | null): string {
  const a = yearStartIso(yearOf(today)); return newYearAt && newYearAt > a ? newYearAt : a
}
/** The year shown as "this year": the calendar's, or the one a Start new year moved to. */
export const currentYear = (today: string, started: string | null): SchoolYear => {
  const cal = yearOf(today); if (!started) return cal; const y = Number(started.slice(0, 4)); return y > cal.start ? yearFrom(y) : cal }

/** Quick picks for Rewind: the moment just before each burst of changes (a gap of `gapMs` starts a new burst), newest first. */
export function rewindPicks(times: string[], floor: string, gapMs = 30 * 60e3, max = 4): string[] {
  const l = [...new Set(times)].filter((t) => t > floor).sort(); const out: string[] = []
  for (let i = l.length - 1; i >= 0 && out.length < max; i--) {
    const prev = l[i - 1]; if (prev && Date.parse(l[i]!) - Date.parse(prev) < gapMs) continue
    out.push(new Date(Date.parse(l[i]!) - 1).toISOString())
  }
  return out
}

// ───── Start new year ─────
/** Every class starts fresh: every date of this year is hidden (kept in the year put aside, and in the history). */
export function newYearPlan(cur: SheetState): Plan { return { ...emptyPlan(), removeSessions: cur.sessions.slice() } }

// ───── Pull from a past year ─────
export type Pick = { classList?: string; children?: { classKey: string; roll: number }[]; dates?: string | string[]; into?: string }
export type PullResult = { plan: Plan; pupils: Pupil[]; skipped: number; words: string }
/** A past year's date on the same weekday this year (52 weeks on per year), so a weekly timetable lines up. */
export function shiftDate(date: string, years: number) { return addDays(date, 364 * years) }
/** What a pull adds. Never replaces: a name already in the class, or a day the subject already has, is skipped. */
export function pullPlan(past: SheetState, cur: SheetState, pick: Pick, years: number, at: string, yearLabel = 'this year'): PullResult {
  const plan = emptyPlan(); const pupils: Pupil[] = []; let skipped = 0
  const into = (k: string) => pick.into ?? (cur.subjects.some((x) => x.classKey === k) ? k : cur.subjects[0]?.classKey ?? k)
  const want: Pupil[] = []
  if (pick.classList) want.push(...past.roster.filter((p) => p.classKey === pick.classList && p.status !== 'Left'))
  for (const c of pick.children ?? []) { const p = past.roster.find((x) => x.classKey === c.classKey && x.roll === c.roll); if (p && !want.includes(p)) want.push(p) }
  const used = new Map<string, Set<number>>(); const names = new Map<string, Set<string>>()
  for (const p of cur.roster) { (used.get(p.classKey) ?? used.set(p.classKey, new Set()).get(p.classKey)!).add(p.roll); (names.get(p.classKey) ?? names.set(p.classKey, new Set()).get(p.classKey)!).add(p.name) }
  for (const p of want) {
    const k = into(p.classKey); const nm = names.get(k) ?? names.set(k, new Set()).get(k)!; const u = used.get(k) ?? used.set(k, new Set()).get(k)!
    if (nm.has(p.name)) { skipped++; continue }
    let roll = p.roll; if (u.has(roll)) { roll = 1; while (u.has(roll)) roll++ }
    u.add(roll); nm.add(p.name); pupils.push({ classKey: k, roll, name: p.name, status: 'Active', updatedAt: at })
  }
  let dates = 0
  for (const key of typeof pick.dates === 'string' ? [pick.dates] : pick.dates ?? []) {
    const sub = past.subjects.find((x) => x.subjectKey === key)
    const target = sub && (cur.subjects.find((x) => x.subjectKey === sub.subjectKey && (!pick.into || x.classKey === pick.into)) ?? cur.subjects.find((x) => x.classKey === into(sub.classKey) && x.kind === sub.kind && x.subject === sub.subject))
    const have = new Set(cur.sessions.filter((s) => s.subjectKey === target?.subjectKey).map((s) => s.date))
    for (const s of past.sessions.filter((x) => x.subjectKey === key)) {
      if (!target) { skipped++; continue }
      const date = shiftDate(s.date, years); if (have.has(date)) { skipped++; continue }
      have.add(date); dates++
      plan.addSessions.push({ sessionId: `${target.subjectKey}|${date}`, subjectKey: target.subjectKey, classKey: target.classKey, date, topic: s.topic, status: 'Open', updatedAt: at })
    }
  }
  const cls = pupils[0]?.classKey ?? ''; const sub = plan.addSessions[0] ? cur.subjects.find((x) => x.subjectKey === plan.addSessions[0]!.subjectKey) : undefined
  const parts = [pupils.length ? `${n(pupils.length, 'child', 'children')} to ${cls}` : '', dates ? `${n(dates, `${sub?.subject ?? ''} date`.trim())}` : ''].filter(Boolean)
  const words = parts.length ? `This will add ${parts.join(', and ')}, in ${yearLabel}. Work already in this year is left as it is.${skipped ? ` ${n(skipped, 'item')} already there will be skipped.` : ''}` : 'Nothing new to add.'
  return { plan, pupils, skipped, words }
}
