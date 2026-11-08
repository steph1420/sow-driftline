// v0.8 Settings (S1, F-ST-01): replaces More. Quiet grouped rows with chevrons; each opens a full page with ‹ back.
// Sync and Updates show a status dot only. Rows for later phases appear with them (names: Phase 5).
import { useState } from 'react'
import { useApp, type Side } from '../../store/store'
import { saveLabel, saveTone } from '../../shell/saveState'
import { PageHead } from '../../ui/PageHead'
import { Group, NavRow, Segment } from './rows'
import { PairPage, SyncPage, devicesValue, useDevices } from './SyncPages'
import { AboutPage, ContrastPage, DeveloperPage, SnapshotsPage, UpdatesPage, aboutValue, contrastName, whenLabel } from './AppPages'

type Page = 'contrast' | 'sync' | 'pair' | 'snapshots' | 'updates' | 'developer' | 'about'
const TITLES: Record<Page, string> = { contrast: 'Contrast', sync: 'Sync', pair: 'Pair a device', snapshots: 'Snapshots', updates: 'Updates', developer: 'Developer options', about: 'About' }
const THEMES = [{ id: 'night', label: 'Night' }, { id: 'day', label: 'Day' }, { id: 'system', label: 'Auto' }] as const

export function Settings() {
  const s = useApp(); const [page, setPage] = useState<Page | null>(null); const devices = useDevices()
  if (page) return (<div className="sow-set">
    <PageHead title={TITLES[page]} backLabel="Back to Settings" onBack={() => setPage(null)} />
    {{ contrast: <ContrastPage />, sync: <SyncPage />, pair: <PairPage devices={devices} />, snapshots: <SnapshotsPage />, updates: <UpdatesPage />, developer: <DeveloperPage />, about: <AboutPage /> }[page]}
  </div>)
  const latest = s.snaps[0]
  return (<div className="sow-set">
    <h1 className="sow-set__title">Settings</h1>
    <Group title="Appearance">
      <Segment label="Theme" options={THEMES} value={s.side} onChange={(v: Side) => s.setSide(v)} />
      <NavRow label="Contrast" value={contrastName(s.contrast)} onClick={() => setPage('contrast')} />
    </Group>
    <Group title="Sync & pairing">
      <NavRow label="Sync" dot={{ tone: saveTone(s), label: saveLabel(s) }} onClick={() => setPage('sync')} />
      <NavRow label="Pair a device" value={devicesValue(devices)} onClick={() => setPage('pair')} />
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
  </div>)
}
