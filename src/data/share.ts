// What a share message is about: one class + subject + type on one date (Share sheet, template preview).
import type { SheetState } from './contract'
import { classLabel, toChecklist } from './model'
import { shareLists, type ShareContext } from './templates'
import { allDates } from './overview'

export type ShareTopic = { ctx: ShareContext; what: string }
export function shareContext(s: SheetState, sessionId: string): ShareTopic | null {
  const se = s.sessions.find((x) => x.sessionId === sessionId); const sub = s.subjects.find((x) => x.subjectKey === se?.subjectKey)
  if (!se || !sub) return null
  const c = toChecklist(s, sub.classKey, sub.subjectKey); const cls = classLabel(sub.classKey)
  return { ctx: { cls, subject: sub.subject, type: sub.kind, date: se.date, topic: se.topic, lists: shareLists(s.roster.filter((p) => p.classKey === sub.classKey), (roll) => c.ticked(sessionId, roll)) },
    what: [cls, sub.subject, sub.kind].filter(Boolean).join(' ') }
}

/** beta.9 (t221u, 2B): every date of a shared date's class + subject + type, oldest first, for the share sheet's date
 * pills. `open` = an older date with copies still to come in (the amber dot). */
export type ShareDate = { sessionId: string; date: string; open: boolean }
export function shareDates(s: SheetState, sessionId: string, today: string): ShareDate[] {
  const se = s.sessions.find((x) => x.sessionId === sessionId); if (!se) return []
  return allDates(s, se.subjectKey, today).flatMap((m) => m.weeks.flatMap((w) => w.rows)).reverse()
    .map((d) => ({ sessionId: d.sessionId, date: d.date, open: d.when === 'past' && d.left > 0 }))
}
/** The pills shown before "All ›": two dates before the shared one and one after (2B). */
export const sharePillWindow = (all: ShareDate[], sessionId: string): ShareDate[] => {
  const i = Math.max(0, all.findIndex((x) => x.sessionId === sessionId)); return all.slice(Math.max(0, i - 2), i + 2)
}
