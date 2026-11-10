// Settings › Appearance, Backups and App pages (F-ST-02, F-ST-07..10). Developer options keep all the jargon (R14 A).
import { sheetLabel, useApp, type Contrast } from '../../store/store'
import { APP_VERSION, FLAVOR, FLAVOR_LABEL, channelUrl } from '../../config'
import { Choices, Segment } from './rows'
import { DATE_FMTS, DATE_SUBS, fmtDate } from '../../data/dateFormat'
import { HAPTICS, buzz } from '../../shell/haptics'
import { QO_STYLES } from '../../data/qoCard'
import { ANIM_SCALES, animScaleLabel, type AnimScale } from '../../config/motion'

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
      <Segment label="Swipe to tick" options={onOff} value={flag(dev.swipeTick)} onChange={(v) => setDev({ swipeTick: bool(v) })} />
      <Segment label="Letter bubble" options={onOff} value={flag(dev.railBubble)} onChange={(v) => setDev({ railBubble: bool(v) })} />
      <Segment label="Past sessions (preview)" options={onOff} value={flag(dev.pastSessions)} onChange={(v) => setDev({ pastSessions: bool(v) })} />
    </div>
    <Choices label="QO card style" options={QO_STYLES} value={dev.qoCard} onChange={(qoCard) => setDev({ qoCard })} />
    <p className="dl-muted sow-note">Dev only (t150u). Press and hold the Quick overview title to step through the styles.</p>
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

const SAMPLE = '2026-11-10'
export const datesValue = (v: ReturnType<typeof useApp.getState>['view']) => `${fmtDate(SAMPLE, v.dateFmt)} · ${DATE_SUBS.find((x) => x.id === v.dateSub)!.label}`
/** RDs2: how the column headers write the date, and what goes under it. */
export function DatesPage() {
  const view = useApp((s) => s.view); const setView = useApp((s) => s.setView)
  return (<>
    <Choices label="Date format" options={DATE_FMTS} value={view.dateFmt} onChange={(dateFmt) => setView({ dateFmt })} />
    <Choices label="Under the date" options={DATE_SUBS.map((x) => ({ ...x, note: x.id === 'count' ? 'Done so far, like 18/24' : "The date's topic" }))} value={view.dateSub} onChange={(dateSub) => setView({ dateSub })} />
  </>)
}

export const hapticsName = (h: ReturnType<typeof useApp.getState>['haptics']) => HAPTICS.find((x) => x.id === h)!.label
/** RDs2: vibration strength for scrubbing the A–Z strip and the top bar's holds. */
export function HapticsPage() {
  const haptics = useApp((s) => s.haptics); const setHaptics = useApp((s) => s.setHaptics)
  return <Choices label="Haptics" options={HAPTICS} value={haptics} onChange={(h) => { setHaptics(h); buzz(h) }} />
}

/** t210u: how fast every animation runs. Off is instant; the phone's reduce-motion setting forces Off. */
const ANIMS = ANIM_SCALES.map((k) => ({ id: String(k) as `${AnimScale}`, label: animScaleLabel(k), note: k === 0 ? 'No movement' : k === 1 ? 'Default' : k < 1 ? 'Quicker' : 'Slower' }))
export const animName = (k: AnimScale) => animScaleLabel(k)
export function AnimationsPage() {
  const k = useApp((s) => s.animScale); const set = useApp((s) => s.setAnimScale)
  return (<>
    <Choices label="Animation scale" options={ANIMS} value={String(k) as `${AnimScale}`} onChange={(v) => set(Number(v) as AnimScale)} />
    <p className="dl-muted sow-note">Stretches or shortens every animation. If your phone is set to reduce motion, animations stay off.</p>
  </>)
}
