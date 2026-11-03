import { useApp } from '../store/store'
export function ChecklistEmpty() {
  const cls = useApp((s) => s.classes.find((c) => c.classKey === s.currentClass)!)
  return (
    <div className="dl-card sow-empty">
      <div className="sow-ico" aria-hidden>＋</div>
      <h2 className="dl-title2">No dates yet</h2>
      <p className="dl-muted">Add the first day you set work for {cls.label}. Ticks appear here.</p>
      <button className="dl-btn dl-btn--primary dl-btn--lg" disabled>Add a date</button>
      <button className="dl-btn dl-btn--quiet" disabled>Sync roster now</button>
    </div>
  )
}
export function Placeholder({ title }: { title: string }) {
  return (
    <div className="dl-card">
      <div className="dl-eyebrow">Coming soon</div>
      <h2 className="dl-card__title">{title}</h2>
      <p className="dl-muted">This is the new Driftline shell with demo data. Your current app is still at /sow/.</p>
    </div>
  )
}
