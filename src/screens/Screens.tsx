export function Placeholder({ title }: { title: string }) {
  return (
    <div className="dl-card">
      <div className="dl-eyebrow">Coming soon</div>
      <h2 className="dl-card__title">{title}</h2>
      <p className="dl-muted">This is the new Driftline shell with demo data. Your current app is still at /sow/.</p>
    </div>
  )
}
