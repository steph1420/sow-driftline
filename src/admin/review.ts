// v0.10.0 Sync › Review (Q-CRDT-4 mockups 1–3, t195u–t197u; pop-up Undo t197u/t210u): the clashes the op log settled by
// the rules, in plain words. The list changes nothing; Change saves the other answer as a new change (so every phone and
// the sheet follow it) and the page's Undo saves the kept answer again.
import type { Cand, Conflict } from '../oplog/core'
import type { SheetState } from '../data/contract'
import { classLabel } from '../data/model'

export type ReviewItem = { key: string; field: string; target: string; sessionId?: string; roll?: number; classKey?: string
  title: string; meta: string; kept: string; other: string; keptValue: unknown; otherValue: unknown; rule: string; at: string }
const RULES: Record<string, string> = { 'set wins': 'Set wins', 'unset wins': 'Not ticked wins', 'keep wins': 'Keep wins', 'sheet wins': 'Sheet wins', 'later receipt': 'Saved later wins', latest: 'Saved later wins', after: 'Saved later wins' }
const who = (c: Cand, me: string) => (c.deviceId === me ? 'this phone' : c.deviceId === 'sheet' ? 'the sheet' : c.by || 'another phone')
const word = (field: string, v: unknown) => field === 'tick' ? (v === true ? 'ticked' : 'not ticked') : field === 'left' ? String(v) : field === 'alive' ? (v === true ? 'kept' : 'removed') : String(v ?? '')
const day = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

export function reviewItems(conflicts: Conflict[], data: SheetState, me: string): ReviewItem[] {
  const ses = new Map(data.sessions.map((s) => [s.sessionId, s])); const subj = new Map(data.subjects.map((s) => [s.subjectKey, s]))
  return conflicts.map((c) => {
    const i = c.register.indexOf(':'); const field = c.register.slice(0, i); const target = c.register.slice(i + 1)
    const at = [c.win.wallAt ?? '', c.lose.wallAt ?? ''].sort().pop() ?? ''
    const base = { key: `${c.register}#${c.lose.opId ?? c.lose.deviceId}`, field, target, kept: `${word(field, c.win.value)} (${who(c.win, me)})`, other: `${word(field, c.lose.value)} (${who(c.lose, me)})`,
      keptValue: c.win.value, otherValue: c.lose.value, rule: RULES[c.rule] ?? 'Sorted by the rules', at }
    if (field === 'tick' || field === 'mark' || field === 'sub') {
      const k = target.lastIndexOf('|'); const sid = target.slice(0, k); const roll = Number(target.slice(k + 1)); const s = ses.get(sid); const sb = s ? subj.get(s.subjectKey) : undefined
      const name = s ? data.roster.find((p) => p.classKey === s.classKey && p.roll === roll)?.name : undefined
      return { ...base, sessionId: sid, roll, classKey: s?.classKey, title: `Roll ${roll}${name ? ` · ${name}` : ''}`, meta: s ? `${classLabel(s.classKey)} ${sb?.subject ?? ''} ${sb?.kind ?? ''} · ${day(s.date)}`.replace(/\s+/g, ' ') : 'A date that was removed' }
    }
    if (field === 'left') { const [classKey, r] = [target.slice(0, target.lastIndexOf('|')), Number(target.slice(target.lastIndexOf('|') + 1))]; const name = data.roster.find((p) => p.classKey === classKey && p.roll === r)?.name
      return { ...base, classKey, roll: r, title: `Roll ${r}${name ? ` · ${name}` : ''}`, meta: `${classLabel(classKey)} · Left` } }
    const s = ses.get(target); const sb = s ? subj.get(s.subjectKey) : undefined
    return { ...base, sessionId: target, title: s ? `${sb?.subject ?? ''} ${sb?.kind ?? ''} · ${day(s.date)}`.trim() : 'A date', meta: s ? `${classLabel(s.classKey)} · ${field === 'topic' ? 'Topic' : field === 'date' ? 'Date' : 'Date kept or removed'}` : '' }
  })
}

/** Demo only (?clashes=1 with demo data): three made-up clashes on the demo class, for screenshots and tests. */
export function demoClashes(data: SheetState, me: string, todayIso: string): Conflict[] {
  const s = data.sessions.find((x) => data.roster.filter((p) => p.classKey === x.classKey).length > 12); if (!s) return []
  const kids = data.roster.filter((p) => p.classKey === s.classKey)
  const has = (roll: number) => data.ticks.some((t) => t.sessionId === s.sessionId && t.roll === roll && t.set)
  const when = (d: number, hm: string) => { const t = new Date(Date.parse(`${todayIso}T${hm}:00+05:30`) - d * 864e5); return t.toISOString() }
  const cand = (deviceId: string, value: unknown, wallAt: string, by?: string): Cand => ({ value, deviceId, seq: 1, lamport: 1, vv: {}, recvAt: wallAt, wallAt, opId: `${deviceId}:${wallAt}`, by })
  const tick = (roll: number, mine: boolean) => { const v = has(roll); return { register: `tick:${s.sessionId}|${roll}`, rule: 'set wins', win: cand(mine ? me : 'dDemoAndroid', v, when(0, '10:42'), mine ? undefined : 'Android phone'), lose: cand(mine ? 'dDemoAndroid' : me, !v, when(0, '10:41'), mine ? 'Android phone' : undefined) } }
  const k = kids[11] ?? kids[kids.length - 1]!; const on = kids.filter((p) => has(p.roll)) // Set wins: the kept answer is the tick
  if (on.length < 2) return []
  return [tick(on[0]!.roll, true), tick(on[Math.min(4, on.length - 1)]!.roll, false),
    { register: `left:${k.classKey}|${k.roll}`, rule: 'sheet wins', win: cand('sheet', 'Active', when(1, '15:10')), lose: cand(me, 'Left', when(1, '15:09')) }]
}
