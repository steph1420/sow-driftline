// ?demo=school: a fuller made-up school (fake names only) so Overview / week path can be seen with several classes.
// Dates are relative to today (honours ?today=). Never used unless the URL asks for it.
import type { SheetState, SessionRow, TickRow, Subject, Pupil } from './contract'
import { addDays, dowOf } from './dial'
import type { SchoolYear } from './schoolYear'
const FIRST = ['Aarav', 'Zoya', 'Mohammed', 'Lia', 'Ishaan', 'Mira', 'Nathaniel', 'Ruhi', 'Tobias', 'Ana', 'Fatima', 'Kabir', 'Sienna', 'Omar', 'Yuki', 'Elowen', 'Dev', 'Haniya', 'Arlo', 'Sara', 'Rayan', 'Amara', 'Ben', 'Noor']
const LAST = ['Fenwick', 'Imran', 'Thornbury', 'Park', 'Okonkwo', 'Sol', 'Ashworth', 'Anand', 'Wexley', 'Moreno', 'Castellanos', 'Joon', 'Maddox', 'Bramwell', 'Asha', 'Ndlovu', 'Rao', 'Whitlock', 'Vik', 'Quintana', 'Ott', 'Brightwater', 'Corran', 'Pike']
type DemoClass = { classKey: string; size: number; shift: number }
type DemoSubject = Subject & { days: number[]; topics: string[] } // days: 0 = Mon … 4 = Fri
type DemoSchool = { classes: DemoClass[]; subjects: DemoSubject[] }
const SCHOOL: DemoSchool = {
  classes: [{ classKey: 'KG-A', size: 24, shift: 0 }, { classKey: 'KG-B', size: 20, shift: 5 }, { classKey: 'KG-C', size: 22, shift: 11 }, { classKey: 'UKG-A', size: 24, shift: 17 }],
  subjects: [
    { subjectKey: 'KG-A_ENG_HW', classKey: 'KG-A', subject: 'English', kind: 'HW', active: true, days: [0, 2, 4], topics: ['Letters K & L', 'Rhyming pairs', 'Letters M & N', 'Story time: The Ant', 'Letters O & P'] },
    { subjectKey: 'KG-B_ENG_CW', classKey: 'KG-B', subject: 'English', kind: 'CW', active: true, days: [0, 2, 4], topics: ['Big and small', 'My family', 'Words around us', 'Colours we see', 'Animal sounds'] },
    { subjectKey: 'KG-A_PHO_CW', classKey: 'KG-A', subject: 'Phonics', kind: 'CW', active: true, days: [2], topics: ['The /s/ sound', 'The /a/ sound', 'The /m/ sound', 'The /t/ sound'] },
    { subjectKey: 'KG-C_ENG_HW', classKey: 'KG-C', subject: 'English', kind: 'HW', active: true, days: [1, 3], topics: ['Capital letters', 'Trace and say', 'Little letters, big sounds', 'Word families'] },
    { subjectKey: 'UKG-A_PHO_CW', classKey: 'UKG-A', subject: 'Phonics', kind: 'CW', active: true, days: [3], topics: ['Blends: bl, cl', 'Digraph sh', 'Sound families', 'Digraph ch'] },
    { subjectKey: 'KG-C_PHO_TEST', classKey: 'KG-C', subject: 'Phonics', kind: 'Test', active: true, days: [4], topics: ['Sound check 1', 'Listen & match', 'Sound check 2'] },
  ],
}
/** Four weeks of a made-up school up to the week holding `today`, plus `weeksAhead`. Today's ticks are stamped over the three hours before `now`. */
function buildSchool(school: DemoSchool, today: string, now: number, weeksAhead: number): SheetState {
  const roster: Pupil[] = school.classes.flatMap((c) => Array.from({ length: c.size }, (_, i) => ({ classKey: c.classKey, roll: i + 1, name: `${FIRST[(i + c.shift) % 24]} ${LAST[(i * 7 + c.shift) % 24]}`, status: 'Active', updatedAt: '' })))
  const mon = addDays(today, -dowOf(today)); const sessions: SessionRow[] = []; const ticks: TickRow[] = []
  for (const s of school.subjects) {
    let n = 0
    for (let w = -3; w <= weeksAhead; w++) for (const d of s.days) {
      const date = addDays(mon, w * 7 + d); const sessionId = `${s.subjectKey}|${date}`; const topic = s.topics[n++ % s.topics.length]!
      sessions.push({ sessionId, subjectKey: s.subjectKey, classKey: s.classKey, date, topic, status: 'Open', updatedAt: '' })
      if (date > today) continue
      const size = school.classes.find((c) => c.classKey === s.classKey)!.size; const isToday = date === today
      for (let r = 1; r <= size; r++) {
        const set = isToday ? (s.subjectKey === 'KG-A_PHO_CW' ? true : (r * 5 + n) % 12 < 7) : (r * 7 + n) % 11 !== 0
        const at = isToday ? new Date(now - ((r * 37 + n * 11) % 180) * 60000).toISOString() : ''
        if (set) ticks.push({ tickId: `${sessionId}|${r}`, sessionId, subjectKey: s.subjectKey, classKey: s.classKey, roll: r, set: true, updatedAt: at })
      }
    }
  }
  return { ok: true, schema: 1, subjects: school.subjects.map(({ days: _d, topics: _t, ...x }) => x), roster, sessions, ticks }
}
/** `now` stamps today's demo ticks over the three hours before it, so "+N since" has something to count. Older ticks stay unstamped. */
export const schoolState = (today: string, now = Date.parse(`${today}T12:00:00+05:30`)): SheetState => buildSchool(SCHOOL, today, now, 1)

/** v0.8 F-SH-09: a past school year, made up (fake names). The same pupils one class younger per year back: KG → NUR → PG. Ends on the last Friday of March. */
const YOUNGER = ['KG', 'NUR', 'PG']
export function pastSchoolState(year: SchoolYear, thisYear: SchoolYear): SheetState {
  const p = YOUNGER[Math.min(thisYear.start - year.start, YOUNGER.length - 1)]!
  const sub = (cls: string, kind: string, days: number[], topics: string[]): DemoSubject => ({ subjectKey: `${p}-${cls}_ENG_${kind}`, classKey: `${p}-${cls}`, subject: 'English', kind, active: true, days, topics })
  const school: DemoSchool = {
    classes: [{ classKey: `${p}-A`, size: 24, shift: 0 }, { classKey: `${p}-B`, size: 24, shift: 5 }],
    subjects: [ // the last topic in each list is the year's last session (four weeks of sessions, topics in turn)
      sub('A', 'CW', [0, 2], ['Letters U & V', 'Letters W & X', 'Story time: The Owl', 'Letters Y & Z']),
      sub('B', 'CW', [2], ['Shapes around us', 'Big and small', 'Animal sounds', 'Colours and shapes']),
      sub('A', 'HW', [3], ['Draw a circle', 'Join the dots', 'Colour the fruit', 'Trace the letters']),
      sub('B', 'HW', [4], ['My toys', 'My home', 'My friends', 'My family']),
    ],
  }
  const march31 = `${year.start + 1}-03-31`; const lastFriday = addDays(march31, -((dowOf(march31) + 3) % 7))
  return buildSchool(school, lastFriday, Date.parse(`${lastFriday}T12:00:00+05:30`), 0)
}
export const wantsSchool = () => typeof location !== 'undefined' && new URLSearchParams(location.search).get('demo') === 'school'
