// v0.7j Overview: all classes list + per-class week path (Steve t82u–t87u). Pure. Spec: FEATURES.md F-OV-*.
import type { SheetState } from './contract'
const NI = (): never => { throw new Error('not implemented (v0.7.0)') }
export type Card = { subjectKey: string; classKey: string; label: string; subject: string; kind: string; sessionId: string | null; date: string | null; topic: string; toGo: number; total: number; today: boolean }
export function overviewCards(_s: SheetState, _today: string): Card[] { return NI() }
export type Stop = { sessionId: string; date: string; kind: string; topic: string; toGo: number; when: 'past' | 'today' | 'future' }
export type Week = { start: string; end: string; title: string; stops: Stop[] }
export function weekPath(_s: SheetState, _subjectKey: string, _today: string): Week[] { return NI() }
/** Same label (subjectKey) already on that day? */
export function collides(_s: SheetState, _subjectKey: string, _date: string, _ignoreSessionId?: string): boolean { return NI() }
/** Next class day for + New date: first day after max(today-1, latest session) on a weekday this class usually meets (from its past sessions; Mon–Fri if none), skipping any day that already has this label. */
export function nextClassDay(_s: SheetState, _subjectKey: string, _today: string): string { return NI() }
