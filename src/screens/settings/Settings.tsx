// v0.8 Settings (S1, F-ST-01): replaces More. Quiet grouped rows with chevrons; each opens a full page with ‹ back.
// Sync and Updates show a status dot only. Rows for later phases appear with them (names: Phase 5); Session only with its flag (F-ST-04).
import { useState } from 'react'
import { useApp, type Side } from '../../store/store'
import { saveLabel, saveTone } from '../../shell/saveState'
import { PageHead } from '../../ui/PageHead'
import { Group, NavRow, Segment } from './rows'
import { PairPage, SyncPage, devicesValue, useDevices } from './SyncPages'
import { useTemplates } from '../../store/templates'
import { TemplateMaker } from '../templates/TemplateMaker'
import { SessionSheet } from '../SessionSheet'
import { shownYear } from '../../data/schoolYear'
import { todayIso } from '../../data/today'
import { DisplayPage, displayName } from './DisplayPage'
import { AboutPage, ContrastPage, DatesPage, DeveloperPage, HapticsPage, SnapshotsPage, UpdatesPage, aboutValue, contrastName, datesValue, hapticsName, whenLabel } from './AppPages'

type Page = 'contrast' | 'display' | 'dates' | 'haptics' | 'sync' | 'pair' | 'snapshots' | 'updates' | 'developer' | 'about'
const TITLES: Record<Page, string> = { contrast: 'Contrast', display: 'Display size', dates: 'Column dates', haptics: 'Haptics', sync: 'Sync', pair: 'Pair a device', snapshots: 'Snapshots', updates: 'Updates', developer: 'Developer options', about: 'About' }
const ONOFF = [{ id: 'on', label: 'On' }, { id: 'off', label: 'Off' }] as const
const THEMES = [{ id: 'night', label: 'Night' }, { id: 'day', label: 'Day' }, { id: 'system', label: 'Auto' }] as const

export function Settings() {
  const s = useApp(); const [page, setPage] = useState<Page | 'templates' | null>(null); const devices = useDevices(); const templates = useTemplates((t) => t.set.templates.length)
  const [session, setSession] = useState(false)
  if (page === 'templates') return <TemplateMaker onBack={() => setPage(null)} />
  if (page) return (<div className="sow-set">
    <PageHead title={TITLES[page]} backLabel="Back to Settings" onBack={() => setPage(null)} />
    {{ contrast: <ContrastPage />, display: <DisplayPage />, dates: <DatesPage />, haptics: <HapticsPage />, sync: <SyncPage />, pair: <PairPage devices={devices} />, snapshots: <SnapshotsPage />, updates: <UpdatesPage />, developer: <DeveloperPage />, about: <AboutPage /> }[page]}
  </div>)
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
      <NavRow label="Haptics" value={hapticsName(s.haptics)} onClick={() => setPage('haptics')} />
    </Group>
    <Group title="Sync & pairing">
      <NavRow label="Sync" dot={{ tone: saveTone(s), label: saveLabel(s) }} onClick={() => setPage('sync')} />
      <NavRow label="Pair a device" value={devicesValue(devices)} onClick={() => setPage('pair')} />
    </Group>
    <Group title="Session & names">
      {s.dev.pastSessions && <NavRow label="Session" value={shownYear(s.viewing, todayIso()).label} onClick={() => setSession(true)} />}
      <NavRow label="Share templates" value={`${templates} templates`} onClick={() => setPage('templates')} />
    </Group>
    <Group title="Backups">
      <NavRow label="Snapshots" value={latest ? whenLabel(latest.at) : 'None yet'} onClick={() => setPage('snapshots')} />
      <button className="dl-row dl-row--btn sow-set__row sow-set__action" onClick={() => s.snapshotNow('Backed up')}>Back up now</button>
    </Group>
    <Group title="App">
      <NavRow label="Updates" dot={s.update.ready ? { tone: 'ready', label: 'update ready' } : undefined} onClick={() => setPage('updates')} />
      <NavRow label="Developer options" onClick={() => setPage('developer')} />
      <NavRow label="About" value={aboutValue()} onClick={() => setPage('about')} />
    </Group>
    {session && <SessionSheet onClose={() => setSession(false)} />}
  </div>)
}
