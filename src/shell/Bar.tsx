import { useMemo, useState } from 'react'
import { labelOf, sheetLabel, useApp } from '../store/store'
import { focusColumn, toChecklist } from '../data/model'
import { todayIso } from '../data/today'
import { GLYPH, Icon } from '../ui/icons'
export function Bar() {
  const s = useApp()
  const [open, setOpen] = useState(false); const [menu, setMenu] = useState(false)
  const cls = s.classes.find((c) => c.classKey === s.currentClass) ?? { classKey: '', label: '—', subject: '' }
  const sub = s.data.subjects.find((x) => x.subjectKey === s.subject); const cards = s.data.subjects.filter((x) => x.active)
  const c = useMemo(() => toChecklist(s.data, s.currentClass, s.subject), [s.data, s.currentClass, s.subject]); const topic = c.columns[focusColumn(c, todayIso(), s.focus).index]?.topic
  const line = [sub?.subject ?? cls.subject, sub?.kind].filter(Boolean).join(' · ')
  const dot = s.status === 'error' ? 'Could not refresh' : s.source === 'copy' ? { saved: `All saved to the ${sheetLabel()}`, saving: 'Saving…', offline: `Offline, ${s.waiting} waiting`, error: `Not saved yet, ${s.waiting} waiting`, demo: '' }[s.save] : 'Demo, saved on this device'
  return (
    <header className="sow-bar">
      <button className="sow-pill" aria-label={`Switch class, ${cls.label} ${sub?.subject ?? cls.subject} ${sub?.kind ?? ''}`.trim()} onClick={() => setOpen(!open)}>
        <span className="dl-logo" aria-hidden>{cls.label.slice(-1)}</span>
        <span className="sow-pill__txt"><span className="sow-pill__top">{cls.label} <small className="sow-pill__sub">{line}</small></span>{topic && <small className="sow-pill__topic">{topic}</small>}</span>
        <span className="sow-sp" /><i className="sow-pill__caret" aria-hidden>{GLYPH.down}</i>
        <span className={`sow-dot ${s.source === 'copy' ? s.save : ''}`} aria-label={dot} title={dot} />
      </button>
      {s.tab === 'checklist' && <button className="sow-ib" aria-label="Search names" aria-expanded={s.find != null} onClick={() => s.setFind(s.find == null ? '' : null)}><Icon name="magnifier" /></button>}
      <button className="sow-ib" aria-label="More options" aria-expanded={menu} onClick={() => setMenu(!menu)}>{GLYPH.menu}</button>
      {menu && <div className="dl-card sow-menu sow-menu--end" role="menu">
        <button role="switch" aria-checked={s.view.weeks} className="dl-row dl-row--btn" onClick={() => s.setView({ weeks: !s.view.weeks })}>
          <span>Weeks<small className="sow-note dl-muted"> · many dates, desktop &amp; phone sideways</small></span><span className="sow-sp" /><span className={`sow-switch${s.view.weeks ? ' on' : ''}`} aria-hidden /></button>
        <button role="menuitem" className="dl-row dl-row--btn" onClick={() => { setMenu(false); s.setTab('checklist'); s.setQuick(true) }}>Quick overview <span className="sow-sp" /><kbd className="sow-kbd">⇧O</kbd></button>
        <button role="menuitem" className="dl-row dl-row--btn" onClick={() => { setMenu(false); s.setTab('more') }}>More…</button>
      </div>}
      {open && cards.length > 1 && <div className="dl-card sow-menu" role="menu">{cards.map((x) =>
        <button key={x.subjectKey} role="menuitem" aria-current={x.subjectKey === s.subject} className="dl-row dl-row--btn" onClick={() => { s.setSubject(x.subjectKey); setOpen(false) }}>{labelOf(x.classKey)} · {x.subject} {x.kind}</button>)}</div>}
    </header>
  )
}
