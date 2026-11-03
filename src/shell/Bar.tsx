import { useState } from 'react'
import { useApp } from '../store/store'
import { pickAnchor, toChecklist } from '../data/model'
import { todayIso } from '../data/today'
export function Bar() {
  const s = useApp()
  const [open, setOpen] = useState(false)
  const cls = s.classes.find((c) => c.classKey === s.currentClass) ?? { classKey: '', label: '—', subject: '' }
  const a = cls.classKey ? pickAnchor(toChecklist(s.data, cls.classKey).columns.map((c) => c.date), todayIso()).kind : 'none'
  const chip = { today: 'Today', upcoming: 'Upcoming', last: 'Last', none: '' }[a]
  const dot = s.status === 'error' ? 'Could not refresh' : s.source === 'copy' ? { saved: 'All saved to the test copy', saving: 'Saving…', offline: `Offline, ${s.waiting} waiting`, error: `Not saved yet, ${s.waiting} waiting`, demo: '' }[s.save] : 'Demo, saved on this device'
  return (
    <header className="sow-bar">
      <button className="sow-pill" aria-label={`Switch class, ${cls.label} ${cls.subject}`} onClick={() => setOpen(!open)}>
        <span className="dl-logo" aria-hidden>{cls.label.slice(-1)}</span>{cls.label} <small>{cls.subject} ⌄</small>
        <span className={`sow-dot ${s.source === 'copy' ? s.save : ''}`} aria-label={dot} title={dot} />
      </button>
      <span className="sow-sp" />
      {chip && <button className="dl-chip dl-chip--btn dl-tone--accent sow-chip" aria-label={`Jump to ${chip}`} onClick={s.jumpToAnchor}>{chip}</button>}
      <button className="sow-ib" aria-label="Undo" disabled={!s.canUndo} onClick={s.undo}>↶</button>
      <button className="sow-ib" aria-label="Redo" disabled={!s.canRedo} onClick={s.redo}>↷</button>
      <button className="sow-ib" aria-label="More options" onClick={() => s.setTab('more')}>⋮</button>
      {open && s.classes.length > 1 && <div className="dl-card sow-menu" role="menu">{s.classes.map((c) =>
        <button key={c.classKey} role="menuitem" className="dl-row dl-row--btn" onClick={() => { s.setClass(c.classKey); setOpen(false) }}>{c.label} · {c.subject}</button>)}</div>}
    </header>
  )
}
