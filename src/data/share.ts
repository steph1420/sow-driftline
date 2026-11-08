// What a share message is about: one class + subject + type on one date (Share sheet, template preview).
import type { SheetState } from './contract'
import { classLabel, toChecklist } from './model'
import { shareLists, type ShareContext } from './templates'

export type ShareTopic = { ctx: ShareContext; what: string }
export function shareContext(s: SheetState, sessionId: string): ShareTopic | null {
  const se = s.sessions.find((x) => x.sessionId === sessionId); const sub = s.subjects.find((x) => x.subjectKey === se?.subjectKey)
  if (!se || !sub) return null
  const c = toChecklist(s, sub.classKey, sub.subjectKey); const cls = classLabel(sub.classKey)
  return { ctx: { cls, subject: sub.subject, type: sub.kind, date: se.date, topic: se.topic, lists: shareLists(s.roster.filter((p) => p.classKey === sub.classKey), (roll) => c.ticked(sessionId, roll)) },
    what: [cls, sub.subject, sub.kind].filter(Boolean).join(' ') }
}
