// @vitest-environment node
// Op-log bridge 0.60.0-ol.1 (t254u, Q-HARM-10; CRDT_SYNC_PLAN §9 cases 1–9 and §12/§13 locks) on the node harness.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { olEnv, device, SK, D1, D2, S1 } from './olHarness'
const DAY = 864e5
const ticks = (e: ReturnType<typeof olEnv>) => Object.fromEntries(e.post({ action: 'pull' }).ticks.map((t: any) => [t.tickId, t.set]))
const conflicts = (e: ReturnType<typeof olEnv>) => e.c.olRows_(e.ss, 'conflicts') as unknown[][]
describe('op log core is one source', () => {
  it('OL-CORE-00 bridge/Code.js carries src/oplog/core.js exactly (run node scripts/embed-core.mjs)', () => {
    const core = readFileSync(new URL('../../src/oplog/core.js', import.meta.url), 'utf8').replace(/^export /gm, '').trimEnd()
    const code = readFileSync(new URL('../Code.js', import.meta.url), 'utf8'); const a = code.indexOf('// <oplog-core>'), b = code.indexOf('// </oplog-core>') + '// </oplog-core>'.length
    expect(code.slice(a, b)).toBe(core)
  })
})
describe('before Migrate nothing changes', () => {
  it('OL-B-01 ping says caps oplog but not migrated; ops actions refuse; the old push still works', () => {
    const e = olEnv(); const p = e.post({ action: 'ping' })
    expect(p).toMatchObject({ ok: true, version: '0.60.0-ol.1', oplog: false }); expect(p.caps).toContain('oplog')
    expect(e.post({ action: 'opsPull' })).toMatchObject({ ok: false, error: 'not migrated' })
    expect(e.post({ action: 'opsPush', deviceId: 'dabc1234', ops: [] })).toMatchObject({ ok: false, error: 'not migrated' })
    const r = e.post({ action: 'push', ticks: [{ subjectKey: SK, date: D1, roll: 3, set: true, updatedAt: new Date().toISOString() }] })
    expect(r.ok).toBe(true); expect(ticks(e)[`${S1}|3`]).toBe(true); expect(e.ss.getSheetByName('Ops')).toBeNull()
  })
})
describe('Migrate (§9 case 6, Q-CRDT-7)', () => {
  it('OL-M-01 a Drive copy is made first; Base holds every row; the tabs stay identical cell for cell', () => {
    const e = olEnv(); e.c.write_(e.ss, 'Ticks', 8, e.c.read_(e.ss, 'Ticks', 8)); e.tab('Ticks').getRange(3, 10).setValue(true) // a manual Submitted (J)
    const before = ['Sessions', 'Ticks', 'Roster', 'Subjects'].map(e.cells)
    const r = e.migrate()
    expect(e.ss.copies).toHaveLength(1); expect(e.ss.copies[0]!.name).toMatch(/^BACKUP pre-op-log \d{4}-\d\d-\d\d – /); expect(e.ss.copies[0]!.getSheetByName('Ops')).toBeNull() // copied before the log existed
    expect(r.identical).toBe(true); expect(['Sessions', 'Ticks', 'Roster', 'Subjects'].map(e.cells)).toEqual(before)
    const base = e.c.olReadBase_(e.ss) as any[]; const regs = new Set(base.map((b) => b.register))
    for (const t of e.c.ticksRead_(e.ss) as any[]) expect(regs.has(`tick:${t[1]}|${t[4]}`)).toBe(true)
    for (const p of e.c.read_(e.ss, 'Roster', 7) as any[]) expect(regs.has(`left:${p[0]}|${p[1]}`)).toBe(true)
    expect(regs.has(`sub:${S1}|2`)).toBe(true); expect(base.every((b) => b.deviceId === 'base' && b.lamport === 0)).toBe(true)
    for (const n of ['Ops', 'Base', 'Conflicts']) expect(e.tab(n).isHidden).toBe(true)
    expect(e.post({ action: 'ping' }).oplog).toBe(true); expect(() => e.migrate()).toThrow(/already/)
    // the view rebuilt from Base alone is the old tabs
    e.c.olRender_(e.ss, e.c.olLoad_(e.ss)); expect(['Sessions', 'Ticks', 'Roster', 'Subjects'].map(e.cells)).toEqual(before)
  })
  it('OL-M-02 dl.2 marks become Base marks', () => {
    const e = olEnv(); e.post({ action: 'push', marks: [{ subjectKey: SK, date: D1, roll: 1, at: '2026-11-03T05:00:00.000Z', back: true, updatedAt: new Date().toISOString() }] })
    e.migrate(); const base = e.c.olReadBase_(e.ss) as any[]
    expect(base.find((b) => b.register === `mark:${S1}|1`)?.value).toEqual({ at: '2026-11-03T05:00:00.000Z', back: true })
  })
})
describe('§9 cases on the bridge', () => {
  it('OL-9-1 A’s clock +1 day ticks; B un-ticks after seeing it → B wins (no clock decides)', () => {
    const e = olEnv(); e.migrate(); const A = device('daaaaaaa', e.post, DAY), B = device('dbbbbbbb', e.post)
    A.op('tick.set', `${S1}|3`, true); A.push(); B.pull(); B.op('tick.set', `${S1}|3`, false); B.push()
    expect(ticks(e)[`${S1}|3`]).toBe(false); expect(conflicts(e)).toHaveLength(0)
  })
  it('OL-9-2 A’s clock −1 day: its later causal op is applied, never ignored', () => {
    const e = olEnv(); e.migrate(); const A = device('daaaaaaa', e.post, -DAY)
    e.edit('Ticks', 3, 6, true) // the sheet ticks roll 2 by hand (device 'sheet')
    A.pull(); A.op('tick.set', `${S1}|2`, false); const r = A.push()
    expect(r.accepted[0].status).toBe(''); expect(ticks(e)[`${S1}|2`]).toBe(false)
  })
  it('OL-9-3 offline tick vs untick → Set wins and a Conflicts row; tickConflict unset/latest change it', () => {
    for (const [rule, want] of [['set', true], ['unset', false], ['latest', true]] as const) {
      const e = olEnv(); e.migrate(); if (rule !== 'set') e.c.meta_(e.ss, 'tickConflict', rule)
      const A = device('daaaaaaa', e.post), B = device('dbbbbbbb', e.post)
      B.op('tick.set', `${S1}|4`, false); A.op('tick.set', `${S1}|4`, true); B.push(); A.push() // A arrives later
      expect(ticks(e)[`${S1}|4`], rule).toBe(want)
      const cf = conflicts(e); expect(cf).toHaveLength(1); expect(cf[0]![2]).toBe(rule === 'set' ? 'set wins' : rule === 'unset' ? 'unset wins' : 'later receipt')
      A.push(A.mine); expect(conflicts(e)).toHaveLength(1) // logged once
    }
  })
  it('OL-9-4 Left: device vs sheet → sheet wins; device vs device → later receipt wins', () => {
    const e = olEnv(); e.migrate(); const A = device('daaaaaaa', e.post), B = device('dbbbbbbb', e.post)
    A.op('left.set', 'X|7', 'Left') // A made this before seeing the sheet's edit
    e.edit('Roster', 8, 4, 'Active'); A.push()
    const st = () => Object.fromEntries(e.post({ action: 'pull' }).roster.map((p: any) => [p.roll, p.status]))
    expect(st()[7]).toBe('Active'); expect(conflicts(e).at(-1)![2]).toBe('sheet wins')
    A.op('left.set', 'X|5', 'Left'); B.op('left.set', 'X|5', 'Active'); A.push(); B.push()
    expect(st()[5]).toBe('Active'); expect(conflicts(e).at(-1)![2]).toBe('later receipt')
  })
  it('OL-9-5 a retried push is idempotent; a gap in seq asks for a resend', () => {
    const e = olEnv(); e.migrate(); const A = device('daaaaaaa', e.post)
    const o1 = A.op('tick.set', `${S1}|3`, true), o2 = A.op('tick.set', `${S1}|4`, true), o3 = A.op('tick.set', `${S1}|5`, true)
    const r1 = A.push([o1]); expect(r1.accepted).toHaveLength(1)
    const rows = e.cells('Ops'); const again = A.push([o1]); expect(again.dup).toBe(1); expect(e.cells('Ops')).toBe(rows)
    const gap = A.push([o3]); expect(gap.resend).toEqual({ daaaaaaa: 2 }); expect(ticks(e)[`${S1}|5`]).toBeUndefined()
    const fill = A.push([o2, o3]); expect(fill.resend).toBeNull(); expect(ticks(e)).toMatchObject({ [`${S1}|4`]: true, [`${S1}|5`]: true })
    expect(e.post({ action: 'opsPush', deviceId: 'daaaaaaa', ops: [{ ...o1, deviceId: 'sheet', opId: 'sheet:1' }] }).rejected).toHaveLength(1) // a device can't speak for the sheet
  })
  it('OL-9-7 the old app’s push after Migrate gets "update the app" and changes nothing; its pull still reads', () => {
    const e = olEnv(); e.migrate(); const A = device('daaaaaaa', e.post); A.op('tick.set', `${S1}|3`, true); A.push()
    const before = e.cells('Ticks')
    expect(e.post({ action: 'push', ticks: [{ subjectKey: SK, date: D1, roll: 3, set: false, updatedAt: new Date(Date.now() + DAY).toISOString() }] })).toMatchObject({ ok: false, error: 'update the app' })
    expect(e.cells('Ticks')).toBe(before); expect(ticks(e)[`${S1}|3`]).toBe(true)
  })
  it('OL-9-8 compaction folds old ops into Base, keeps the current and previous SoW, and the state is identical', () => {
    const e = olEnv(); e.migrate(); const A = device('daaaaaaa', e.post)
    // an older SoW (Shapes, Sep) on its own dates, then the current runs (Letters 28/10 · 2/11)
    for (const [d, topic] of [['2026-09-01', 'Shapes'], ['2026-09-03', 'Shapes'], ['2026-09-08', 'Colours']] as const) A.op('session.add', `${SK}|${d}`, { subjectKey: SK, classKey: 'X', date: d, topic })
    for (const d of ['2026-09-01', '2026-09-03', '2026-09-08']) for (let r = 1; r <= 5; r++) A.op('tick.set', `${SK}|${d}|${r}`, r % 2 === 1)
    A.op('tick.set', `${S1}|3`, true); A.op('left.set', 'X|4', 'Left'); A.op('left.set', 'X|4', 'Active'); A.push()
    const view = () => JSON.stringify(['Sessions', 'Ticks', 'Roster', 'Subjects'].map(e.cells)); const before = view(), n = e.c.olReadOps_(e.ss).length
    expect(e.c.olCompactNow_(e.ss, Date.now() + 10 * DAY).folded).toBe(0) // nothing is 60 days old yet
    const r = e.c.olCompactNow_(e.ss, Date.now() + 70 * DAY)
    const left = e.c.olReadOps_(e.ss) as any[]
    expect(r.folded).toBeGreaterThan(0); expect(left.length).toBe(n - r.folded)
    // kept: the current SoW (Letters) and the previous one (Colours), and the latest op of the Left target
    expect(left.some((o) => o.target === `${S1}|3`)).toBe(true); expect(left.some((o) => o.target.startsWith(`${SK}|2026-09-08`))).toBe(true)
    expect(left.some((o) => o.target.startsWith(`${SK}|2026-09-01`))).toBe(false); expect(left.filter((o) => o.target === 'X|4')).toHaveLength(1)
    e.c.olRender_(e.ss, e.c.olLoad_(e.ss)); expect(view()).toBe(before)
    expect(e.created.some((b: any) => /^SoW Ops backup/.test(b.name))).toBe(true)
    // after it: a new device gets Base, the old device keeps its seq run, gaps are still caught
    const fresh = e.post({ action: 'opsPull' }); expect(fresh.base.length).toBeGreaterThan(0)
    expect(e.post({ action: 'opsPull', vv: { daaaaaaa: 1 } }).base).toBeDefined() // behind the compaction floor → Base
    const o = A.op('tick.set', `${S1}|4`, true); expect(A.push([o]).accepted[0].status).toBe('')
  })
  it('OL-9-9 a device clock jumping back after a sync never makes the sheet skip an op', () => {
    const e = olEnv(); e.migrate(); const A = device('daaaaaaa', e.post, 0); A.op('tick.set', `${S1}|3`, true); A.push()
    const B = device('daaaaaaa', e.post, -2 * DAY); Object.assign(B.vv, A.vv) // same device, clock now 2 days behind
    const o = { opId: 'daaaaaaa:2', deviceId: 'daaaaaaa', seq: 2, lamport: 2, vv: { ...A.vv }, kind: 'tick.set', target: `${S1}|3`, value: false, wallAt: new Date(Date.now() - 2 * DAY).toISOString() }
    expect(B.push([o]).accepted[0].status).toBe(''); expect(ticks(e)[`${S1}|3`]).toBe(false)
  })
})
describe('dates, sessions, marks, subjects and hand edits on the log', () => {
  it('OL-S-01 session.date moves a session with its ticks; a taken day is refused with the rename text', () => {
    const e = olEnv(); e.migrate(); const A = device('daaaaaaa', e.post)
    A.op('session.date', S1, D2); A.push()
    const p = e.post({ action: 'pull' }); expect(p.sessions.map((s: any) => s.sessionId)).toContain(`${SK}|${D2}`)
    expect(p.ticks.find((t: any) => t.tickId === `${SK}|${D2}|1`)?.set).toBe(true)
    A.op('session.date', S1, '2026-10-28'); const r = A.push()
    expect(r.accepted[0]).toMatchObject({ status: 'refused', message: `2026-10-28 already has a session — ${D2} not moved` })
    expect(e.post({ action: 'pull' }).sessions.map((s: any) => s.date).sort()).toEqual(['2026-10-28', D2])
  })
  it('OL-S-02 two phones add the same day: one session, both sets of ticks; a day taken by a moved session files the add under it', () => {
    const e = olEnv(); e.migrate(); const A = device('daaaaaaa', e.post), B = device('dbbbbbbb', e.post), d = '2026-11-09', sid = `${SK}|${d}`
    A.op('session.add', sid, { subjectKey: SK, classKey: 'X', date: d, topic: 'A' }); A.op('tick.set', `${sid}|1`, true)
    B.op('session.add', sid, { subjectKey: SK, classKey: 'X', date: d, topic: '' }); B.op('tick.set', `${sid}|2`, true); A.push(); B.push()
    let p = e.post({ action: 'pull' }); expect(p.sessions.filter((s: any) => s.date === d)).toHaveLength(1); expect(ticks(e)).toMatchObject({ [`${sid}|1`]: true, [`${sid}|2`]: true })
    A.op('session.date', S1, '2026-11-11'); A.push() // S1 (id …|11-02) now lives on 11 Nov
    const nid = `${SK}|2026-11-11~dbbbbbbb`; B.op('session.add', nid, { subjectKey: SK, classKey: 'X', date: '2026-11-11', topic: '' }); B.op('tick.set', `${nid}|5`, true); const r = B.push()
    expect(r.accepted.find((a: any) => a.opId === B.mine.at(-2).opId).status).toBe(`alias:${S1}`)
    p = e.post({ action: 'pull' }); expect(p.sessions.filter((s: any) => s.date === '2026-11-11')).toHaveLength(1); expect(ticks(e)[`${SK}|2026-11-11|5`]).toBe(true)
  })
  it('OL-S-03 remove and re-add (Undo) of a session; ticks of a removed session are hidden and come back', () => {
    const e = olEnv(); e.migrate(); const A = device('daaaaaaa', e.post)
    A.op('session.remove', S1, null); A.push(); expect(e.post({ action: 'pull' }).ticks.some((t: any) => t.sessionId === S1)).toBe(false)
    A.op('session.add', S1, { subjectKey: SK, classKey: 'X', date: D1 }); A.push(); expect(ticks(e)[`${S1}|1`]).toBe(true)
  })
  it('OL-S-04 marks are an op kind (late / back-dated), cleared with null', () => {
    const e = olEnv(); e.migrate(); const A = device('daaaaaaa', e.post), B = device('dbbbbbbb', e.post)
    A.op('tick.mark', `${S1}|1`, { at: '2026-11-03T05:00:00.000Z', back: true }); A.push()
    const p = B.pull(); const out = e.c.olView(e.c.olFold(p.base, p.ops, p.rules)).marks; expect(out).toHaveLength(1); expect(out[0]).toMatchObject({ roll: 1, back: true })
    B.op('tick.mark', `${S1}|1`, null); B.push(); const q = e.post({ action: 'opsPull' }); expect(e.c.olView(e.c.olFold(q.base, q.ops, q.rules)).marks).toHaveLength(0)
    expect(e.post({ action: 'pull', withMarks: true }).marks).toHaveLength(0)
  })
  it('OL-S-05 subjects: add and Active on the log, shown in Subjects', () => {
    const e = olEnv(); e.migrate(); const A = device('daaaaaaa', e.post)
    A.op('subject.add', 'X_Maths_CW', { classKey: 'X', subject: 'Maths', kind: 'CW', order: 3 }); A.op('subject.active', 'X_Eng_HW', false); A.push()
    const s = Object.fromEntries(e.post({ action: 'pull' }).subjects.map((x: any) => [x.subjectKey, x.active])); expect(s).toEqual({ [SK]: true, X_Eng_HW: false, X_Maths_CW: true })
  })
  it('OL-H-01 hand edits become ops from device sheet (Entry, Ticks, Sessions topic and date); a refused hand date is put back', () => {
    const e = olEnv(); e.migrate()
    e.tab('Entry').getRange(1, 2).setValue(SK); e.tab('Entry').getRange(2, 2).setValue(e.d(D1)); e.c.onEdit({ range: e.tab('Entry').getRange(2, 2), source: e.ss })
    const row = (e.tab('Entry').rows() as unknown[][]).findIndex((r) => r[0] === 3) + 1; e.edit('Entry', row, 3, true)
    e.edit('Sessions', 2, 5, 'Letters & sounds')
    const ops = e.c.olReadOps_(e.ss) as any[]; expect(ops.map((o) => [o.deviceId, o.kind, o.target])).toEqual([['sheet', 'tick.set', `${S1}|3`], ['sheet', 'session.topic', S1]])
    expect(ticks(e)[`${S1}|3`]).toBe(true); expect(e.post({ action: 'pull' }).sessions.find((s: any) => s.sessionId === S1).topic).toBe('Letters & sounds')
    e.edit('Sessions', 2, 4, e.d('2026-10-28')) // that day is taken: refused, the cell goes back
    expect(e.post({ action: 'pull' }).sessions.find((s: any) => s.sessionId === S1)?.date).toBe(D1)
    e.edit('Ticks', 2, 6, false); expect(ticks(e)[`${S1}|1`]).toBe(false)
  })
  it('OL-H-02 menu Migrate asks first; Remove a subject is off after Migrate', () => {
    const e = olEnv(); e.c.menuMigrateOplog(); expect(e.post({ action: 'ping' }).oplog).toBe(true); expect(e.alerts.at(-1)).toMatch(/Backup copy/)
    e.c.menuRemoveSubject(); expect(e.alerts.at(-1)).toMatch(/Not available on the op log/)
  })
})
