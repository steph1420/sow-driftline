import { useApp } from '../store/store'
export function Bar() {
  const cls = useApp((s) => s.classes.find((c) => c.classKey === s.currentClass)!)
  return (
    <header className="sow-bar">
      <button className="sow-pill" aria-label={`Switch class, ${cls.label} ${cls.subject}`}>
        <span className="dl-logo" aria-hidden>{cls.label.slice(-1)}</span>{cls.label} <small>{cls.subject} ⌄</small>
        <span className="sow-dot" aria-label="Demo, not synced" />
      </button>
      <span className="sow-sp" />
      <button className="sow-ib" aria-label="Undo" disabled>↶</button>
      <button className="sow-ib" aria-label="Redo" disabled>↷</button>
      <button className="sow-ib" aria-label="More options">⋮</button>
    </header>
  )
}
