// v0.8 F-TP (S2): share templates, pure logic. Ported from the old app's shareTemplates.ts (v0.28.0, locked t164u).
// t76u {class} fix: {class} = class + section ("KG-A"); new {subject}, {type}, {notebook} ("KG-A English CW").
import type { Pupil } from './contract'
import { fmtDay } from './model'

export type ShareTemplate = { id: string; name: string; body: string; builtin?: boolean }
/** Synced across devices. The last-used template is per device and lives outside this set. */
export type TemplateSet = { templates: ShareTemplate[]; defaultId: string }

/** Locked default (Steve 27 Oct). */
export const DEFAULT_PENDING_BODY = '{class} • {date} • not set/found ({count}):\n{names}'
export const SEED_TEMPLATES: readonly ShareTemplate[] = [
  { id: 'pending', name: 'Pending', body: DEFAULT_PENDING_BODY, builtin: true },
  { id: 'submitted', name: 'Submitted', body: '{class} • {date} • submitted ({count.submitted}/{count.active}):\n{names.submitted}', builtin: true },
  { id: 'completed', name: 'Completed', body: '{class} • {date} • set ({count.set}/{count.active}):\n{names.set}', builtin: true },
  { id: 'not-submitted', name: 'Not submitted', body: '{class} • {date} • not submitted ({count.notSubmitted}):\n{names.notSubmitted}', builtin: true },
]
export const seedSet = (): TemplateSet => ({ templates: SEED_TEMPLATES.map((t) => ({ ...t })), defaultId: 'pending' })
const NAME_MAX = 24
/** wa.me links past ~2000 characters get cut on some Android builds: warn earlier. */
export const WA_LONG_WARN = 1500
const PREVIEW_MAX_LINES = 9
const NEW_TEMPLATE_BODY = '{class} • {date}\n{names}'

export type ShareLists = { notSet: string[]; set: string[]; notSubmitted: string[]; submitted: string[]; active: string[]; left: string[] }
type Bucket = keyof ShareLists
const BUCKETS: Bucket[] = ['notSet', 'set', 'submitted', 'notSubmitted', 'active', 'left'] // S2 chip order

/** "Tap to add" chips (S2), all shown, grouped. Every one is a known token. */
export const TOKEN_GROUPS: readonly { title: 'Basics' | 'Names' | 'Counts'; tokens: readonly string[] }[] = [
  { title: 'Basics', tokens: ['{class}', '{subject}', '{type}', '{notebook}', '{date}', '{topic}'] },
  { title: 'Names', tokens: ['{names}', '{notSet}', '{set}', ...BUCKETS.map((b) => `{names.${b}}`)] },
  { title: 'Counts', tokens: ['{count}', ...BUCKETS.map((b) => `{count.${b}}`)] },
]
export const KNOWN_TOKENS: readonly string[] = TOKEN_GROUPS.flatMap((g) => g.tokens)
const TOKEN_RE = /\{[^{}\s]+\}/g
/** Editor colour: submitted family purple, unknown amber. */
export const tokenKind = (t: string): 'known' | 'submitted' | 'unknown' => (!KNOWN_TOKENS.includes(t) ? 'unknown' : /submitted/i.test(t) ? 'submitted' : 'known')
export const unknownTokens = (body: string) => [...new Set([...body.matchAll(TOKEN_RE)].map((m) => m[0]).filter((t) => !KNOWN_TOKENS.includes(t)))]

/** Name lists in roll order. Driftline has no manual "submitted" yet, so submitted follows set (old rule t5u). */
export function shareLists(pupils: Pick<Pupil, 'roll' | 'name' | 'status'>[], isSet: (roll: number) => boolean): ShareLists {
  const out: ShareLists = { notSet: [], set: [], notSubmitted: [], submitted: [], active: [], left: [] }
  for (const p of [...pupils].sort((a, b) => a.roll - b.roll)) {
    const name = p.name.trim(); if (!name) continue
    if (p.status === 'Left') { out.left.push(name); continue }
    const set = isSet(p.roll); out.active.push(name); (set ? out.set : out.notSet).push(name); (set ? out.submitted : out.notSubmitted).push(name)
  }
  return out
}

export type ShareContext = { cls: string; subject: string; type: string; date: string; topic: string; lists: ShareLists }
function values(c: ShareContext, emptyNames: string): Record<string, string> {
  const names = (a: string[]) => (a.length ? a.join('\n') : emptyNames); const d = fmtDay(c.date)
  const v: Record<string, string> = {
    '{class}': c.cls, '{subject}': c.subject, '{type}': c.type, '{notebook}': [c.cls, c.subject, c.type].filter(Boolean).join(' '),
    '{date}': `${d.dow} ${d.dm}`, '{topic}': c.topic.trim(),
    '{count}': String(c.lists.notSet.length), '{names}': names(c.lists.notSet), '{notSet}': names(c.lists.notSet), '{set}': names(c.lists.set),
  }
  for (const b of BUCKETS) { v[`{count.${b}}`] = String(c.lists[b].length); v[`{names.${b}}`] = names(c.lists[b]) }
  return v
}
/** One pass, whole tokens only ({names} never eats {names.notSet}); unknown tokens stay as typed. */
export function fillTemplate(body: string, c: ShareContext, emptyNames = ''): string {
  const v = values(c, emptyNames); return body.replace(TOKEN_RE, (t) => v[t] ?? t)
}
export function previewLines(text: string, max = PREVIEW_MAX_LINES): { lines: string[]; more: number } {
  const all = text.split('\n'); return all.length <= max + 1 ? { lines: all, more: 0 } : { lines: all.slice(0, max), more: all.length - max }
}

// ── Edits ────────────────────────────────────────────────────────────────
const clip = (s: string) => s.trim().replace(/\s+/g, ' ').slice(0, NAME_MAX).trim()
/** Unique, ≤24 characters ("Pending" → "Pending 2"). */
function uniqueName(templates: ShareTemplate[], wanted: string, selfId?: string): string {
  const base = clip(wanted) || 'Template'; const taken = new Set(templates.filter((t) => t.id !== selfId).map((t) => t.name.toLowerCase()))
  if (!taken.has(base.toLowerCase())) return base
  for (let n = 2; ; n++) { const suf = ` ${n}`; const cand = base.slice(0, NAME_MAX - suf.length).trimEnd() + suf; if (!taken.has(cand.toLowerCase())) return cand }
}
let seq = 0
const newId = () => `t${Date.now().toString(36)}${(++seq).toString(36)}`
const withTemplates = (s: TemplateSet, templates: ShareTemplate[]): TemplateSet => ({ ...s, templates })

export const addTemplate = (s: TemplateSet, name = 'New template', body = NEW_TEMPLATE_BODY) => withTemplates(s, [...s.templates, { id: newId(), name: uniqueName(s.templates, name), body }])
export const renameTemplate = (s: TemplateSet, id: string, name: string) => (!clip(name) ? s : withTemplates(s, s.templates.map((t) => (t.id === id ? { ...t, name: uniqueName(s.templates, name, id) } : t))))
export const setBody = (s: TemplateSet, id: string, body: string) => withTemplates(s, s.templates.map((t) => (t.id === id ? { ...t, body } : t)))
export const setDefault = (s: TemplateSet, id: string): TemplateSet => (s.templates.some((t) => t.id === id) ? { ...s, defaultId: id } : s)
export function duplicateTemplate(s: TemplateSet, id: string): TemplateSet {
  const i = s.templates.findIndex((t) => t.id === id); if (i < 0) return s
  const src = s.templates[i]!; const templates = [...s.templates]; templates.splice(i + 1, 0, { id: newId(), name: uniqueName(s.templates, src.name), body: src.body }); return withTemplates(s, templates)
}
export function moveTemplate(s: TemplateSet, from: number, to: number): TemplateSet {
  if (from === to || from < 0 || from >= s.templates.length) return s
  const templates = [...s.templates]; const [t] = templates.splice(from, 1); templates.splice(Math.max(0, Math.min(to, templates.length)), 0, t!); return withTemplates(s, templates)
}
/** The last template can't be deleted; a deleted default falls to the first. */
export function deleteTemplate(s: TemplateSet, id: string): TemplateSet {
  if (s.templates.length <= 1 || !s.templates.some((t) => t.id === id)) return s
  const templates = s.templates.filter((t) => t.id !== id); return { templates, defaultId: templates.some((t) => t.id === s.defaultId) ? s.defaultId : templates[0]!.id }
}
export function restoreDefaults(s: TemplateSet): TemplateSet {
  const have = new Set(s.templates.map((t) => t.id)); const add = SEED_TEMPLATES.filter((t) => !have.has(t.id)).map((t) => ({ ...t, name: uniqueName(s.templates, t.name) }))
  return add.length ? withTemplates(s, [...s.templates, ...add]) : s
}
/** Preselect: last used on this device → default → first. */
export const pickInitial = (s: TemplateSet, lastUsedId: string) => s.templates.find((t) => t.id === lastUsedId) ?? s.templates.find((t) => t.id === s.defaultId) ?? s.templates[0]!

// ── t76u migration ───────────────────────────────────────────────────────
/** Old {class} with the prefix off (the default) sent only subject + type; with it on, the whole notebook label. */
export const migrateClassToken = (body: string, includeClassPrefix: boolean) => body.replaceAll('{class}', includeClassPrefix ? '{notebook}' : '{subject} {type}')
export type LegacyShare = { templates: ShareTemplate[]; defaultId: string; includeClassPrefix: boolean }
/** The old app's synced share prefs → a Driftline set (empty → seeds). */
export function fromLegacy(l: LegacyShare): TemplateSet {
  if (!l.templates.length) return seedSet()
  const templates = l.templates.map((t) => ({ ...t, body: migrateClassToken(t.body, l.includeClassPrefix) }))
  return { templates, defaultId: templates.some((t) => t.id === l.defaultId) ? l.defaultId : templates[0]!.id }
}

// ── Editor helpers ───────────────────────────────────────────────────────
/** Text and tokens in order, for the highlighted mirror under the editor. */
export function splitTokens(body: string): { text: string; kind?: ReturnType<typeof tokenKind> }[] {
  const out: { text: string; kind?: ReturnType<typeof tokenKind> }[] = []; let at = 0
  for (const m of body.matchAll(TOKEN_RE)) { if (m.index > at) out.push({ text: body.slice(at, m.index) }); out.push({ text: m[0], kind: tokenKind(m[0]) }); at = m.index + m[0].length }
  if (at < body.length) out.push({ text: body.slice(at) })
  return out
}
/** Put a chip's token in at the caret (replacing a selection); returns the new caret position. */
export const insertAt = (body: string, start: number, end: number, token: string) => ({ body: body.slice(0, start) + token + body.slice(end), caret: start + token.length })
