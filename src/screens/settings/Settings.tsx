// v0.8 Settings (S1, F-ST-01): replaces More. Quiet grouped rows with chevrons; each opens a full page with ‹ back.
// Sync and Updates show a status dot only. Rows for later phases appear with them (names: Phase 5); Session only with its flag (F-ST-04).
import { useCallback, useEffect, useState } from 'react'
import { setupFileText, useApp, type Side } from '../../store/store'
import { sortLabel } from '../../data/sortNames'
import { SortPage } from './SortPage'
import { ExportSetupSheet } from './ExportSetup'
import { UndoToast, type ToastMsg } from '../../ui/UndoToast'
import { saveLabel, saveTone } from '../../shell/saveState'
import { PageHead } from '../../ui/PageHead'
import { Push } from '../../ui/Push'
import { Group, NavRow, Segment } from './rows'
import { PairPage, SyncPage, devicesValue, useDevices } from './SyncPages'
import { useTemplates } from '../../store/templates'
import { TemplateMaker } from '../templates/TemplateMaker'
import { SessionSheet } from '../SessionSheet'
import { shownYear } from '../../data/schoolYear'
import { todayIso } from '../../data/today'
import { DisplayPage, displayName } from './DisplayPage'
import { AdminPage, LoadPage, NewYearPage, PastYearPage, PastYearsPage, PullPage, ReviewPage, RewindPage, UndoPill } from './AdminPages'
import { AboutPage, AnimationsPage, MotionDetailsPage, animName, ContrastPage, DatesPage, DeveloperPage, HapticsPage, SnapshotsPage, UpdatesPage, aboutValue, contrastName, datesValue, hapticsName, whenLabel } from './AppPages'

type Page = 'admin' | 'load' | 'rewind' | 'newyear' | 'pastyears' | 'pastyear' | 'pull' | 'review' | 'sort' | 'animations' | 'motion' | 'contrast' | 'display' | 'dates' | 'haptics' | 'sync' | 'pair' | 'snapshots' | 'updates' | 'developer' | 'about'
const TITLES: Record<Page, string> = { admin: 'Admin', load: 'Load a snapshot', rewind: 'Rewind to a time', newyear: 'Start new year', pastyears: 'Past years', pastyear: 'Past year', pull: 'Pull into this year', review: 'Review', sort: 'Sort names', animations: 'Animations', motion: 'Motion details', contrast: 'Contrast', display: 'Display size', dates: 'Column dates', haptics: 'Haptics', sync: 'Sync', pair: 'Pair a device', snapshots: 'Snapshots', updates: 'Updates', developer: 'Developer options', about: 'About' }
/** v0.10: where ‹ goes from each page (the rest go back to Settings). */
const PARENT: Partial<Record<Page, Page>> = { motion: 'animations', load: 'admin', rewind: 'admin', newyear: 'admin', pastyears: 'admin', pastyear: 'pastyears', pull: 'pastyear', review: 'sync' }
const ONOFF = [{ id: 'on', label: 'On' }, { id: 'off', label: 'Off' }] as const
const THEMES = [{ id: 'night', label: 'Night' }, { id: 'day', label: 'Day' }, { id: 'system', label: 'Auto' }] as const

export function Settings() {
  const s = useApp(); const [page, setPage] = useState<Page | 'templates' | null>(null); const devices = useDevices(); const templates = useTemplates((t) => t.set.templates.length)
  const [session, setSession] = useState(false); const [yearId, setYearId] = useState<string | null>(null); const [cls, setCls] = useState('')
  const [exp, setExp] = useState<string | null>(null); const [toast, setToast] = useState<ToastMsg | null>(null); const doneToast = useCallback(() => setToast(null), []) // beta.13 export
  const notice = useApp((s) => s.notice); useEffect(() => { if (notice) { setToast(notice); useApp.setState({ notice: null }) } }, [notice]) // beta.17 (t250u): a move the sheet refused
  const paired = s.source === 'copy' && s.viewing === null
  if (page === 'templates') return <TemplateMaker onBack={() => setPage(null)} />
  const back = (from: Page) => setPage(PARENT[from] ?? null)
  if (page) { const up = PARENT[page]; const year = yearId ? s.pastYears().find((y) => y.id === yearId) : undefined
    const title = page === 'pastyear' ? year?.label ?? TITLES.pastyear : TITLES[page]
    const upTitle = up === 'pastyear' ? year?.label ?? TITLES.pastyear : up ? TITLES[up] : 'Settings'
    return (<Push key={page} className="sow-set" onBack={() => back(page)}>
    <PageHead title={title} backLabel={`Back to ${upTitle}`} onBack={() => back(page)}>
      {page === 'admin' && <UndoPill show={s.adminUndos > 0} label="the last big change" onUndo={s.adminUndo} />}
      {page === 'review' && <UndoPill show={s.reviewUndos > 0} label="the last change" onUndo={s.reviewUndo} />}
      {page === 'pastyear' && <span className="sow-badge">Look only</span>}
    </PageHead>
    {{ admin: <AdminPage go={setPage} />, load: <LoadPage onDone={() => setPage('admin')} />, rewind: <RewindPage onDone={() => setPage('admin')} onCancel={() => setPage('admin')} />,
      newyear: <NewYearPage onDone={() => setPage('admin')} onCancel={() => setPage('admin')} />, pastyears: <PastYearsPage open={(id) => { setYearId(id); const y = s.pastYears().find((x) => x.id === id); setCls(y?.state.subjects[0]?.classKey ?? ''); setPage('pastyear') }} />,
      pastyear: year ? <PastYearPage year={year} cls={cls} setCls={setCls} onPull={() => setPage('pull')} /> : null,
      pull: year ? <PullPage year={year} cls={cls} onDone={() => setPage('admin')} onCancel={() => setPage('pastyear')} /> : null, review: <ReviewPage />,
      sort: <SortPage />, animations: <AnimationsPage onDetails={() => setPage('motion')} />, motion: <MotionDetailsPage />, contrast: <ContrastPage />, display: <DisplayPage />, dates: <DatesPage />, haptics: <HapticsPage />, sync: <SyncPage onReview={() => setPage('review')} />, pair: <PairPage devices={devices} />, snapshots: <SnapshotsPage />, updates: <UpdatesPage />, developer: <DeveloperPage />, about: <AboutPage /> }[page]}
  </Push>) }
  const latest = s.snaps[0]
  return (<div className="sow-set">
    <h1 className="sow-set__title">Settings</h1>
    <Group title="Appearance">
      <Segment label="Theme" options={THEMES} value={s.side} onChange={(v: Side) => s.setSide(v)} />
      <NavRow label="Contrast" value={contrastName(s.contrast)} onClick={() => setPage('contrast')} />
      <NavRow label="Display size" value={displayName(s.scale)} onClick={() => setPage('display')} />
      <NavRow label="Column dates" value={datesValue(s.view)} onClick={() => setPage('dates')} />
      <Segment label="Week groups" options={ONOFF} value={s.view.weeks ? 'on' : 'off'} onChange={(v) => s.setView({ weeks: v === 'on' })} />
      <Segment label="Hide unavailable letters" options={ONOFF} value={s.railHide ? 'on' : 'off'} onChange={(v) => s.setRailHide(v === 'on')} />
      <NavRow label="Animations" value={animName(s.animScale)} onClick={() => setPage('animations')} />
      <NavRow label="Haptics" value={hapticsName(s.haptics)} onClick={() => setPage('haptics')} />
    </Group>
    <Group title="Sync & pairing">
      <NavRow label="Sync" dot={{ tone: saveTone(s), label: saveLabel(s) }} onClick={() => setPage('sync')} />
      <NavRow label="Pair a device" value={devicesValue(devices)} onClick={() => setPage('pair')} />
      <button className="dl-row dl-row--btn sow-set__row" disabled={!paired} aria-label={paired ? 'Export setup file' : 'Export setup file, connect with Sync first'} onClick={() => setExp(setupFileText())}>
        <span>Export setup file</span><span className="sow-sp" />{!paired && <span className="sow-set__value">Connect with Sync first</span>}</button>
    </Group>
    <Group title="Session & names">
      {s.dev.pastSessions && <NavRow label="Session" value={shownYear(s.viewing, todayIso()).label} onClick={() => setSession(true)} />}
      <NavRow label="Sort names" value={sortLabel(s.nameSort)} onClick={() => setPage('sort')} />
      <NavRow label="Share templates" value={`${templates} templates`} onClick={() => setPage('templates')} />
    </Group>
    <Group title="Backups">
      <NavRow label="Snapshots" value={latest ? whenLabel(latest.at) : 'None yet'} onClick={() => setPage('snapshots')} />
      <button className="dl-row dl-row--btn sow-set__row sow-set__action" onClick={() => s.snapshotNow('Backed up')}>Back up now</button>
    </Group>
    <section className="sow-set__group" aria-label="Admin"><div className="dl-list"><NavRow label="Admin" bold onClick={() => setPage('admin')} /></div></section>
    <Group title="App">
      <NavRow label="Updates" dot={s.update.ready ? { tone: 'ready', label: 'update ready' } : undefined} onClick={() => setPage('updates')} />
      <NavRow label="Developer options" onClick={() => setPage('developer')} />
      <NavRow label="About" value={aboutValue()} onClick={() => setPage('about')} />
    </Group>
    {session && <SessionSheet onClose={() => setSession(false)} />}
    {exp && <ExportSetupSheet text={exp} onClose={() => setExp(null)} onDone={() => setToast({ id: Date.now(), text: 'Setup file saved' })} />}
    <UndoToast msg={toast} onDone={doneToast} />
  </div>)
}
