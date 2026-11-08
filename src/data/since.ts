// v0.8 F-CL-11 (Q3-since): how many copies came in since the app opened, this hour or today. Pure; times in IST.
import type { TickRow } from './contract'

export type SinceMode = 'open' | 'hour' | 'today'
export const SINCE_MODES: readonly SinceMode[] = ['open', 'hour', 'today']
export type Clock = { openedAt: number; now: number }

const IST_MS = 330 * 60 * 1000
const floorIst = (ms: number, unit: number) => Math.floor((ms + IST_MS) / unit) * unit - IST_MS
const HOUR = 3600 * 1000

/** Start of the window, in epoch ms. */
export function sinceStart(mode: SinceMode, c: Clock): number {
  return mode === 'open' ? c.openedAt : mode === 'hour' ? floorIst(c.now, HOUR) : floorIst(c.now, 24 * HOUR)
}
/** Set ticks for one date stamped at or after `from`. A tick with no time is never "new". */
export function countSince(ticks: readonly TickRow[], sessionId: string, from: number): number {
  return ticks.filter((t) => t.sessionId === sessionId && t.set && t.updatedAt && Date.parse(t.updatedAt) >= from).length
}
export const SINCE_NAME: Record<SinceMode, string> = { open: 'since open', hour: 'this hour', today: 'today' }
export const nextSince = (m: SinceMode): SinceMode => SINCE_MODES[(SINCE_MODES.indexOf(m) + 1) % SINCE_MODES.length]!
export const istTime = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })
/** The words after "+N": "since 10:40", "this hour" or "today". */
export const sinceWords = (mode: SinceMode, openedAt: number) => (mode === 'open' ? `since ${istTime(openedAt)}` : SINCE_NAME[mode])
export const sinceLabel = (mode: SinceMode, n: number, openedAt: number) => `+${n} ${sinceWords(mode, openedAt)}`
