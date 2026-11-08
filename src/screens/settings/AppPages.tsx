// Settings › Appearance, Backups and App pages (F-ST-02, F-ST-07..10). Developer options keep all the jargon (R14 A).
import { sheetLabel, useApp, type Contrast } from '../../store/store'
import { APP_VERSION, FLAVOR, FLAVOR_LABEL, channelUrl } from '../../config'
import { Segment } from './rows'

const CONTRASTS: { id: Contrast; label: string; note: string }[] = [
  { id: 'standard', label: 'Standard', note: 'Soft glass and glows' }, { id: 'high', label: 'High', note: 'Solid surfaces and stronger text' }]
export const contrastName = (c: Contrast) => CONTRASTS.find((x) => x.id === c)!.label

export function ContrastPage() {
  const contrast = useApp((s) => s.contrast); const setContrast = useApp((s) => s.setContrast)
  return <div className="dl-list" role="radiogroup" aria-label="Contrast">{CONTRASTS.map((c) =>
    <button key={c.id} role="radio" aria-checked={contrast === c.id} aria-label={c.label} className="dl-row dl-row--btn sow-set__row" onClick={() => setContrast(c.id)}>
      <span className="sow-set__txt"><span>{c.label}</span><small className="dl-muted">{c.note}</small></span><span className="sow-sp" />{contrast === c.id && <span className="sow-set__check" aria-hidden>✓</span>}</button>)}</div>
}

/** "Today, 22:40" / "Wed, 22:40" for a stored ISO time. */
export const whenLabel = (iso: string, now = new Date()) => {
  const d = new Date(iso); const hm = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${d.toDateString() === now.toDateString() ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, ${hm}`
}

export function SnapshotsPage() {
  const snaps = useApp((s) => s.snaps); const restore = useApp((s) => s.restore)
  return (<>
    <p className="dl-muted sow-note">Saved on this device by themselves. Restore puts the ticks back as they were; a snapshot of now is kept first.</p>
    <div className="dl-list">{snaps.length ? snaps.map((x) => <button key={x.at} className="dl-row dl-row--btn sow-set__row" aria-label={`Restore ${whenLabel(x.at)}, ${x.label}`}
      onClick={() => { if (confirm(`Restore ticks from ${whenLabel(x.at)}?`)) restore(x.at) }}>
      <span className="sow-set__txt"><span>{whenLabel(x.at)}</span><small className="dl-muted">{x.label}</small></span><span className="sow-sp" /><span className="sow-set__value">Restore</span></button>)
      : <div className="dl-row dl-muted">None yet.</div>}</div>
  </>)
}

export function UpdatesPage() {
  const { ready, apply, checkedAt } = useApp((s) => s.update)
  return (<div className="dl-card sow-set__card">
    <p className="sow-set__lead">{ready ? 'A new version is ready.' : 'You have the latest version.'}</p>
    <p className="dl-muted sow-note">{ready ? 'It never restarts while you work. It will be used the next time you open the app, or now:' : `Checked each time you come back to the app${checkedAt ? `, last at ${whenLabel(new Date(checkedAt).toISOString())}` : ''}.`}</p>
    {ready && apply && <div className="sow-pair"><button className="dl-btn dl-btn--primary" onClick={apply}>Restart to update</button></div>}
  </div>)
}

export function DeveloperPage() {
  const dev = useApp((s) => s.dev); const setDev = useApp((s) => s.setDev)
  const onOff = [{ id: 'on', label: 'On' }, { id: 'off', label: 'Off' }] as const
  const flag = (v: boolean) => (v ? 'on' : 'off'); const bool = (v: 'on' | 'off') => v === 'on'
  return (<>
    <div className="dl-list">
      <Segment label="A–Z side" options={[{ id: 'left', label: 'Left' }, { id: 'right', label: 'Right' }] as const} value={dev.railSide} onChange={(railSide) => setDev({ railSide })} />
      <Segment label="Swipe to tick" options={onOff} value={flag(dev.swipeTick)} onChange={(v) => setDev({ swipeTick: bool(v) })} />
      <Segment label="Letter bubble" options={onOff} value={flag(dev.railBubble)} onChange={(v) => setDev({ railBubble: bool(v) })} />
    </div>
    <div className="dl-list">
      <div className="dl-row sow-set__row"><span>Release channel</span><span className="sow-sp" />
        {(['stable', 'beta'] as const).map((x) => <a key={x} href={channelUrl(x)} className={`dl-btn ${FLAVOR === x ? 'dl-btn--primary' : 'dl-btn--secondary'}`} aria-current={FLAVOR === x ? 'page' : undefined}>{x === 'stable' ? 'Stable' : 'Beta'}</a>)}</div>
    </div>
  </>)
}

export const aboutValue = () => `${APP_VERSION.split('-')[0]} · ${FLAVOR_LABEL}`
export function AboutPage() {
  const source = useApp((s) => s.source)
  return (<div className="dl-card sow-set__card">
    <p className="sow-set__lead">Driftline · {FLAVOR_LABEL}</p>
    <p className="dl-muted sow-note">Version {APP_VERSION}</p>
    <p className="dl-muted sow-note">{source === 'copy' ? `Data: the ${sheetLabel()}.` : 'Data: a demo class with made-up names, saved on this device.'}</p>
  </div>)
}
