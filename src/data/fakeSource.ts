// Demo / fake source: made-up names only (never a class list).
import type { RosterSource, SheetState } from './contract'
const KIDS = ['Aarav Rohan Fenwick', 'Zoya Imran', 'Mohammed Elias Thornbury', 'Lia Park', 'Ishaan Dev Okonkwo-Hale', 'Mira Sol', 'Nathaniel Kwabena Ashworth', 'Ruhi Anand', 'Tobias Arjun Wexley', 'Ana', 'Fatima Noor Castellanos', 'Kabir Joon', 'Sienna Priya Maddox', 'Omar Leif Bramwell', 'Yuki Asha', 'Elowen Grace Ndlovu-Pike', 'Dev Rao', 'Haniya Isabel Whitlock', 'Arlo Vik', 'Sara Meher Quintana', 'Rayan Ott', 'Amara Lucia Brightwater', 'Ben Ilyas Corran', 'Noor']
function iso(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
export function demoState(today = new Date()): SheetState {
  const days = [-9, -8, -6, -2, -1, 0].map((o) => { const d = new Date(today); d.setDate(d.getDate() + o); return iso(d) })
  const sessions = days.map((date, i) => ({ sessionId: `d${i}`, subjectKey: 'demo_ENG_CW', classKey: 'demo', date, topic: '', status: 'Open', updatedAt: '' }))
  const ticks = sessions.flatMap((s, di) => KIDS.map((_, i) => ({ tickId: `${s.sessionId}-${i}`, sessionId: s.sessionId, subjectKey: s.subjectKey, classKey: 'demo', roll: i + 1, set: di === days.length - 1 ? i % 4 !== 1 && i % 5 !== 3 : (i * 7 + di) % 9 !== 0, updatedAt: '' })))
  return { ok: true, schema: 1, subjects: [{ subjectKey: 'demo_ENG_CW', classKey: 'demo', subject: 'English', kind: 'CW', active: true }], roster: KIDS.map((name, i) => ({ classKey: 'demo', roll: i + 1, name, status: 'Active', updatedAt: '' })), sessions, ticks }
}
export const DEMO_STATE = demoState()
export function fakeSource(s: SheetState): RosterSource { return { kind: 'demo', pull: async () => structuredClone(s) } }
