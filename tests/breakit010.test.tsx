// v0.10.0-beta.1 break-it pass on the new flows (Admin + Review). Demo data, made-up names; nothing leaves the device.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useApp } from '../src/store/store'
import { storageKey } from '../src/config'

const today = '2026-11-04'
const S = () => useApp.getState()
const demo = (q = '') => { localStorage.clear(); history.replaceState(null, '', `/?demo=school&today=${today}${q}`); S().reset() }
const sig = () => JSON.stringify({ s: S().data.sessions.map((x) => [x.sessionId, x.date, x.topic]).sort(), t: S().data.ticks.filter((t) => t.set).map((t) => t.tickId).sort() })
const wait = (ms = 8) => new Promise((r) => setTimeout(r, ms))
const now = () => new Date().toISOString()
const open = () => { const ses = S().data.sessions[0]!; const kids = S().data.roster.filter((p) => p.classKey === ses.classKey); return { ses, kids } }

describe('v0.10 break-it', () => {
  beforeEach(() => demo())
  afterEach(() => { localStorage.clear(); history.replaceState(null, '', '/') })
  it('BK10-01 Rewind to a time in the future changes nothing and keeps no Undo step', () => {
    const a = sig(); const r = S().adminRewindPreview(new Date(Date.now() + 864e5).toISOString()); expect(r.ok).toBe(false); expect(r.words).toMatch(/^Nothing has changed/)
    S().adminRewind(new Date(Date.now() + 864e5).toISOString()); expect(sig()).toBe(a); expect(S().adminUndos).toBe(0)
  })
  it('BK10-02 two Rewinds in a row, then two Undos: back exactly where it started', async () => {
    const { ses, kids } = open(); const a = sig(); const t0 = now(); await wait()
    S().tick(ses.sessionId, kids[1]!.roll); const t1 = now(); await wait(); S().tick(ses.sessionId, kids[2]!.roll); const b = sig()
    S().adminRewind(t1); await wait(); S().adminRewind(t0); expect(sig()).toBe(a); expect(S().adminUndos).toBe(2)
    S().adminUndo(); S().adminUndo(); expect(sig()).toBe(b); S().adminUndo(); expect(sig()).toBe(b)
  })
  it('BK10-03 a Rewind can itself be rewound (it is changes like any other)', async () => {
    const { ses, kids } = open(); const t0 = now(); await wait(); S().tick(ses.sessionId, kids[1]!.roll); const b = sig(); await wait(); const t1 = now(); await wait()
    S().adminRewind(t0); await wait(); S().adminRewind(t1); expect(sig()).toBe(b)
  })
  it('BK10-04 a date moved after the time goes back to its day with its ticks; a date added after the time goes', async () => {
    const { ses, kids } = open(); const a = sig(); const t0 = now(); await wait()
    S().moveSession(ses.sessionId, '2026-12-28'); const moved = S().data.sessions.find((x) => x.date === '2026-12-28')!
    S().tick(moved.sessionId, kids[1]!.roll); const sub = S().data.subjects[0]!; const added = S().addSession(sub.subjectKey, '2026-12-29'); S().tick(added, kids[0]!.roll)
    const was = (sid: string, roll: number) => S().data.ticks.some((t) => t.sessionId === sid && t.roll === roll && t.set)
    expect(S().adminRewindPreview(t0).words).toMatch(was(moved.sessionId, kids[1]!.roll) ? /remove 1 tick.*remove 1 date.*move 1 date back/ : /put back 1 tick.*remove 1 date.*move 1 date back/)
    S().adminRewind(t0); expect(sig()).toBe(a)
  })
  it('BK10-05 Load of a snapshot that matches now does nothing (no Undo step)', () => {
    S().snapshotNow('Backed up'); const at = S().snaps[0]!.at; expect(S().adminLoadPreview(at)).toBe('')
    S().adminLoad(at); expect(S().adminUndos).toBe(0); S().adminLoad('no-such-time'); expect(S().adminUndos).toBe(0)
  })
  it('BK10-06 a second Start new year tap does nothing; Rewind can’t cross into the year put aside', async () => {
    const { ses, kids } = open(); S().tick(ses.sessionId, kids[1]!.roll); const before = now(); await wait()
    S().adminNewYear(); const y = S().yearNow().label; S().adminNewYear(); expect(S().yearNow().label).toBe(y); expect(S().adminUndos).toBe(1)
    const r = S().adminRewindPreview(before); expect(r.ok).toBe(false); expect(r.words).toMatch(/start of this school year/)
  })
  it('BK10-07 pulling the same dates twice adds them once', () => {
    S().adminNewYear(); const y = S().pastYears()[0]!; const k = y.state.subjects[0]!.subjectKey
    S().adminPull(y.id, { dates: k }); const n = S().data.sessions.length; expect(n).toBeGreaterThan(0)
    expect(S().adminPullPreview(y.id, { dates: k }).ok).toBe(false); S().adminPull(y.id, { dates: k }); expect(S().data.sessions.length).toBe(n); expect(S().adminUndos).toBe(2)
  })
  it('BK10-08 a broken change list, Undo list or year record on the phone never stops the app opening, and Undo with nothing to undo is harmless', () => {
    for (const k of ['journal', 'adminUndo', 'years', 'year', 'pupils']) localStorage.setItem(storageKey(`${k}-demo-school`), '{bad json')
    demo(); expect(S().data.sessions.length).toBeGreaterThan(0); expect(S().adminUndos).toBe(0)
    expect(() => S().adminUndo()).not.toThrow(); expect(S().adminRewindPreview(now()).ok).toBe(false); expect(S().pastYears().length).toBeGreaterThan(0)
  })
  it('BK10-09 Review: Change twice then Undo twice puts the kept answer back; Undo with nothing left is harmless', () => {
    demo('&clashes=1'); const c = S().reviewList().find((x) => x.field === 'tick')!; const on = () => S().data.ticks.some((t) => t.sessionId === c.sessionId && t.roll === c.roll && t.set)
    const kept = on(); expect(kept).toBe(true); S().reviewChange(c); S().reviewChange(c); expect(on()).toBe(false)
    S().reviewUndo(); S().reviewUndo(); expect(on()).toBe(true); S().reviewUndo(); expect(on()).toBe(true); expect(S().reviewUndos).toBe(0)
  })
  it('BK10-10 a pulled child keeps a free roll number and never takes another pupil’s place', () => {
    S().adminNewYear(); const y = S().pastYears().find((x) => !x.kept)!; const kid = y.state.roster[0]!
    const cls = S().data.subjects[0]!.classKey; const before = S().data.roster.filter((p) => p.classKey === cls)
    S().adminPull(y.id, { children: [{ classKey: kid.classKey, roll: kid.roll }], into: cls })
    const after = S().data.roster.filter((p) => p.classKey === cls); const added = after.filter((p) => !before.some((b) => b.roll === p.roll))
    expect(before.every((b) => after.some((a) => a.roll === b.roll && a.name === b.name))).toBe(true)
    expect(added.length).toBeLessThanOrEqual(1); if (added.length) expect(added[0]!.name).toBe(kid.name)
    S().adminUndo(); expect(S().data.roster.filter((p) => p.classKey === cls).length).toBe(before.length)
  })
})
