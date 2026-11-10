// v0.8 F-TP-01..07 (S2): Settings › Share templates. Named pills (Default marked), the editor with highlighted tokens,
// "Tap to add" chips that go in at the caret, ⋯ menu, and a live preview of what would be sent for the class in hand.
import { useRef, useState } from 'react'
import { useApp } from '../../store/store'
import { useTemplates } from '../../store/templates'
import {
  TOKEN_GROUPS, addTemplate, deleteTemplate, duplicateTemplate, fillTemplate, insertAt, moveTemplate, previewLines, renameTemplate, restoreDefaults, setBody, setDefault,
} from '../../data/templates'
import { shareContext } from '../../data/share'
import { dayLabel, focusColumn, toChecklist } from '../../data/model'
import { todayIso } from '../../data/today'
import { GLYPH, Icon } from '../../ui/icons'
import { PageHead } from '../../ui/PageHead'
import { useBackLayer } from '../../ui/useBackLayer'
import { TemplateMenu } from './TemplateMenu'
import { TokenEditor } from './TokenEditor'

export function TemplateMaker({ onBack }: { onBack: () => void }) {
  const { set, sync, edit } = useTemplates(); const paired = useApp((s) => s.source === 'copy')
  const [selId, setSel] = useState(set.defaultId); const [renaming, setRenaming] = useState(false)
  const input = useRef<HTMLTextAreaElement>(null)
  useBackLayer(true, onBack) // beta.11 (t229u): Back returns to Settings
  const i = Math.max(0, set.templates.findIndex((t) => t.id === selId)); const tpl = set.templates[i]!
  const add = (token: string) => { const el = input.current; const at = insertAt(tpl.body, el?.selectionStart ?? tpl.body.length, el?.selectionEnd ?? tpl.body.length, token)
    edit((s) => setBody(s, tpl.id, at.body)); requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(at.caret, at.caret) }) }
  const rename = (name: string) => { edit((s) => renameTemplate(s, tpl.id, name)); setRenaming(false) }
  const create = () => { edit((s) => addTemplate(s)); setSel(useTemplates.getState().set.templates.at(-1)!.id) }
  const menu = {
    rename: () => setRenaming(true), duplicate: () => edit((s) => duplicateTemplate(s, tpl.id)), setDefault: () => edit((s) => setDefault(s, tpl.id)),
    left: () => edit((s) => moveTemplate(s, i, i - 1)), right: () => edit((s) => moveTemplate(s, i, i + 1)),
    remove: () => { edit((s) => deleteTemplate(s, tpl.id)); setSel(useTemplates.getState().set.defaultId) }, restore: () => edit(restoreDefaults),
  }
  return (<div className="sow-tpl">
    <PageHead title="Share templates" backLabel="Back to Settings" onBack={onBack}>
      {paired && sync !== 'local' && <span className={`sow-tpl__cloud ${sync}`} role="img" aria-label={sync === 'synced' ? 'Templates synced' : 'Templates waiting to sync'}><Icon name="cloud" /></span>}
      <button className="sow-page__action" aria-label="Add a template" onClick={create}>{GLYPH.plus} New</button>
    </PageHead>
    <div className="sow-tpl__pills" role="group" aria-label="Templates">{set.templates.map((t) =>
      <button key={t.id} className={`sow-fchip${t.id === tpl.id ? ' on' : ''}`} aria-pressed={t.id === tpl.id} onClick={() => { setSel(t.id); setRenaming(false) }}>
        {t.name}{t.id === set.defaultId && <small>· Default</small>}</button>)}</div>
    <div className="sow-tpl__head">
      {renaming ? <input className="sow-tpl__rename" aria-label="Template name" autoFocus defaultValue={tpl.name} maxLength={40}
          onKeyDown={(e) => { if (e.key === 'Enter') rename(e.currentTarget.value); if (e.key === 'Escape') setRenaming(false) }} onBlur={(e) => rename(e.currentTarget.value)} />
        : <h2 className="dl-eyebrow sow-tpl__name">{tpl.name}</h2>}
      <span className="sow-sp" />
      <TemplateMenu canDelete={set.templates.length > 1} isDefault={tpl.id === set.defaultId} first={i === 0} last={i === set.templates.length - 1} on={menu} />
    </div>
    <TokenEditor value={tpl.body} inputRef={input} onChange={(b) => edit((s) => setBody(s, tpl.id, b))} />
    {TOKEN_GROUPS.map((g, gi) => <div key={g.title} className="sow-tpl__chips" role="group" aria-label={`Tap to add · ${g.title}`}>
      <span className="sow-tpl__chipsTitle">{gi === 0 ? `Tap to add · ${g.title}` : g.title}</span>
      {g.tokens.map((t) => <button key={t} className={`sow-tok sow-tok--chip ${/submitted/i.test(t) ? 'submitted' : 'known'}`} aria-label={`Add ${t}`} onClick={() => add(t)}>{t}</button>)}</div>)}
    <Preview body={tpl.body} />
  </div>)
}

/** F-TP-06: the text that would be sent for the class in hand on its current date, cut to "…N more". */
function Preview({ body }: { body: string }) {
  const s = useApp(); const c = toChecklist(s.data, s.currentClass, s.subject); const col = c.columns[focusColumn(c, todayIso(), s.focus).index]
  const topic = col ? shareContext(s.data, col.sessionId) : null
  if (!topic) return null
  const { lines, more } = previewLines(fillTemplate(body, topic.ctx, '(none)'))
  const { cls, subject, type, date } = topic.ctx; const title = `Preview · ${cls} · ${subject} ${type} · ${dayLabel(date)}`
  return (<section className="sow-tpl__preview" role="region" aria-label={title}>
    <h2 className="dl-eyebrow sow-tpl__eyebrow">{title}</h2>
    <div className="dl-card sow-tpl__box">{lines.map((l, k) => <div key={k} className="sow-tpl__line">{l}</div>)}{more > 0 && <div className="sow-tpl__more">…{more} more</div>}</div>
  </section>)
}
