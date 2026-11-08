// v0.8 Phase 7 (F-TP-01..11): share templates, ported from the old app's shareTemplates.ts (v0.28.0, t164u) with the
// {class} fix (t76u): {class} = class + section, new {subject} {type} {notebook}; 22 chips. Demo names only.
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PENDING_BODY, KNOWN_TOKENS, SEED_TEMPLATES, TOKEN_GROUPS, WA_LONG_WARN, addTemplate, deleteTemplate, duplicateTemplate, fillTemplate,
  fromLegacy, migrateClassToken, moveTemplate, pickInitial, previewLines, renameTemplate, restoreDefaults, seedSet, setDefault, shareLists, tokenKind, unknownTokens,
  type ShareContext,
} from '../src/data/templates'

const pupils = [
  { roll: 1, name: 'Aarav Fenwick', status: 'Active' as const }, { roll: 2, name: 'Zoya Anand', status: 'Active' as const },
  { roll: 3, name: 'Lia Brightwater', status: 'Active' as const }, { roll: 4, name: 'Old Kid', status: 'Left' as const },
]
const lists = shareLists(pupils, (roll) => roll === 1 || roll === 4)
const ctx: ShareContext = { cls: 'KG-A', subject: 'English', type: 'CW', date: '2026-11-04', topic: 'Letters K & L', lists }

describe('TP seeds and chips', () => {
  it('TP-01 Pending is the locked default and first; seeds in the S2 order', () => {
    expect(DEFAULT_PENDING_BODY).toBe('{class} • {date} • not set/found ({count}):\n{names}')
    expect(SEED_TEMPLATES.map((t) => t.name)).toEqual(['Pending', 'Submitted', 'Completed', 'Not submitted'])
    expect(seedSet().defaultId).toBe('pending')
  })
  it('TP-02 22 chips in three groups (19 old + {subject} {type} {notebook}), every chip is a known token', () => {
    expect(TOKEN_GROUPS.map((g) => g.title)).toEqual(['Basics', 'Names', 'Counts'])
    expect(TOKEN_GROUPS[0]!.tokens).toEqual(['{class}', '{subject}', '{type}', '{notebook}', '{date}', '{topic}'])
    const all = TOKEN_GROUPS.flatMap((g) => g.tokens); expect(all).toHaveLength(22); expect(new Set(all).size).toBe(22)
    expect(all.every((t) => KNOWN_TOKENS.includes(t))).toBe(true)
  })
  it('TP-03 token colours: submitted family purple, unknown amber', () => {
    expect(tokenKind('{names.submitted}')).toBe('submitted'); expect(tokenKind('{count.notSubmitted}')).toBe('submitted')
    expect(tokenKind('{class}')).toBe('known'); expect(tokenKind('{teacher}')).toBe('unknown')
  })
})

describe('TP fill', () => {
  it('TP-04 lists: Left pupils only in left; set implies submitted (no manual submitted in Driftline yet)', () => {
    expect(lists.notSet).toEqual(['Zoya Anand', 'Lia Brightwater']); expect(lists.set).toEqual(['Aarav Fenwick'])
    expect(lists.submitted).toEqual(lists.set); expect(lists.notSubmitted).toEqual(lists.notSet)
    expect(lists.active).toHaveLength(3); expect(lists.left).toEqual(['Old Kid'])
  })
  it('TP-05 the default template sends exactly the beta.2 text', () => {
    expect(fillTemplate(DEFAULT_PENDING_BODY, ctx)).toBe('KG-A • Wed 4/11 • not set/found (2):\nZoya Anand\nLia Brightwater')
  })
  it('TP-06 {class} is class + section; {subject} {type} {notebook} are new', () => {
    expect(fillTemplate('{class}|{subject}|{type}|{notebook}|{topic}', ctx)).toBe('KG-A|English|CW|KG-A English CW|Letters K & L')
  })
  it('TP-07 a token is matched whole; aliases; unknown stays literal', () => {
    expect(fillTemplate('{names.set}|{count.submitted}/{count.active}|{names}|{notSet}|{set}|{count}|{teacher}', ctx))
      .toBe('Aarav Fenwick|1/3|Zoya Anand\nLia Brightwater|Zoya Anand\nLia Brightwater|Aarav Fenwick|2|{teacher}')
  })
  it('TP-08 empty list: send keeps it empty, preview can say (none)', () => {
    const all = { ...ctx, lists: shareLists(pupils, () => true) }
    expect(fillTemplate('{names}', all)).toBe(''); expect(fillTemplate('{names}', all, '(none)')).toBe('(none)')
  })
  it('TP-09 unknown tokens, preview truncation to "…N more", long-message threshold', () => {
    expect(unknownTokens('{class} {foo} {names.set} {count.bar}')).toEqual(['{foo}', '{count.bar}'])
    const p = previewLines(['head', ...Array.from({ length: 15 }, (_, i) => `n${i}`)].join('\n')); expect(p.lines).toHaveLength(9); expect(p.more).toBe(7)
    expect(WA_LONG_WARN).toBe(1500)
  })
})

describe('TP CRUD (old rules)', () => {
  it('TP-10 add/rename: unique names ≤24 chars; blank rename refused', () => {
    expect(addTemplate(seedSet(), 'Pending').templates.at(-1)!.name).toBe('Pending 2')
    expect(addTemplate(seedSet(), 'x'.repeat(40)).templates.at(-1)!.name.length).toBeLessThanOrEqual(24)
    const s = seedSet(); expect(renameTemplate(s, 'completed', '  ')).toBe(s); expect(renameTemplate(s, 'completed', 'Pending').templates[2]!.name).toBe('Pending 2')
  })
  it('TP-11 duplicate goes after its source; move; set default', () => {
    expect(duplicateTemplate(seedSet(), 'submitted').templates.map((t) => t.name)).toEqual(['Pending', 'Submitted', 'Submitted 2', 'Completed', 'Not submitted'])
    expect(moveTemplate(seedSet(), 2, 0).templates.map((t) => t.id)).toEqual(['completed', 'pending', 'submitted', 'not-submitted'])
    expect(setDefault(seedSet(), 'completed').defaultId).toBe('completed')
  })
  it('TP-12 delete: the last one stays; the default falls to the first; restore re-adds missing seeds', () => {
    let s = deleteTemplate(seedSet(), 'pending'); expect(s.defaultId).toBe('submitted')
    s = deleteTemplate(deleteTemplate(deleteTemplate(s, 'submitted'), 'completed'), 'not-submitted'); expect(s.templates).toHaveLength(1)
    expect(restoreDefaults(deleteTemplate(seedSet(), 'completed')).templates.map((t) => t.name)).toEqual(['Pending', 'Submitted', 'Not submitted', 'Completed'])
  })
  it('TP-13 preselect: last used, else default, else first', () => {
    expect(pickInitial(seedSet(), 'completed').id).toBe('completed'); expect(pickInitial(seedSet(), 'gone').id).toBe('pending')
  })
})

describe('TP-11 {class} migration (t76u)', () => {
  it('TP-14 prefix off (the default): {class} → {subject} {type}, so the sent text stays the same', () => {
    expect(migrateClassToken('{class} • {date}\n{names}', false)).toBe('{subject} {type} • {date}\n{names}')
  })
  it('TP-15 prefix on: {class} → {notebook}; templates without {class} are untouched', () => {
    expect(migrateClassToken('Hi {class}!', true)).toBe('Hi {notebook}!'); expect(migrateClassToken('{names}', true)).toBe('{names}')
  })
  it('TP-16 old synced prefs (share.templates, share.defaultId, share.includeClassPrefix) become a migrated set', () => {
    const s = fromLegacy({ templates: [{ id: 'pending', name: 'Pending', body: DEFAULT_PENDING_BODY, builtin: true }, { id: 'u1', name: 'Mine', body: 'Hello {class}' }], defaultId: 'u1', includeClassPrefix: false })
    expect(s.defaultId).toBe('u1'); expect(s.templates[1]!.body).toBe('Hello {subject} {type}')
    expect(fromLegacy({ templates: [], defaultId: 'x', includeClassPrefix: false })).toEqual(seedSet())
  })
})
