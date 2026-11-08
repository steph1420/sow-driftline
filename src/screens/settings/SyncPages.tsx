// Settings › Sync & pairing (F-ST-03): connection to the test copy (code or setup file), and the paired devices list.
import { useEffect, useState } from 'react'
import { currentBridge, onLive, sheetLabel, useApp } from '../../store/store'
import { devicesClient, type Device } from '../../data/devices'

const failed = (err: unknown) => useApp.setState({ error: err instanceof Error ? err.message : String(err) })

export function SyncPage() {
  const s = useApp(); const [code, setCode] = useState(''); const [busy, setBusy] = useState(false)
  const run = async (job: () => Promise<void>) => { setBusy(true); try { await job() } catch (err) { failed(err) } setBusy(false) }
  return (<div className="dl-card sow-set__card">
    <p className="dl-muted sow-note">{s.source === 'copy' ? `Connected to the ${sheetLabel()}. Ticks save by themselves${s.pulledAt ? ` · checked ${new Date(s.pulledAt).toLocaleTimeString()}` : ''}.` : 'Showing a demo class with made-up names. Ticks stay on this device.'} Your live sheet is never touched.</p>
    {s.error && <p className="sow-note" role="alert">{s.error}</p>}
    {s.source === 'copy' ? (
      <div className="sow-pair"><button className="dl-btn dl-btn--secondary" onClick={() => void s.refresh()}>Refresh</button><button className="dl-btn dl-btn--quiet" onClick={s.unpair}>Back to demo</button></div>
    ) : (<>
      <p className="dl-muted sow-note">On a device already on SoW Beta, open Setup › Pair a device, then type the 6-digit code here.</p>
      <form className="sow-pair" onSubmit={(e) => { e.preventDefault(); void run(() => s.pair(code)); setCode('') }}>
        <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} aria-label="6-digit code" placeholder="000000" />
        <button className="dl-btn dl-btn--primary" disabled={code.length !== 6 || busy}>Connect</button>
      </form>
      <label className="dl-btn dl-btn--quiet sow-file">Or open a setup file
        <input type="file" accept=".json,application/json" hidden aria-label="Setup file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void run(async () => s.importSetup(await f.text())); e.target.value = '' }} />
      </label>
    </>)}
  </div>)
}

type DeviceList = { supported: boolean; devices: Device[] } | null
/** Paired devices on the test copy's bridge (0.50.0-dl.1+). Nothing is asked in demo or on the live sheet. */
export function useDevices() {
  const paired = useApp((s) => s.source === 'copy') && !onLive()
  const [list, setList] = useState<DeviceList>(null); const [err, setErr] = useState<string | null>(null)
  const cli = () => { const b = currentBridge(); return devicesClient(b.url, b.token) }
  const load = () => cli().list().then(setList, (e) => setErr(e instanceof Error ? e.message : String(e)))
  useEffect(() => { if (paired) void load() }, [paired])
  const remove = async (d: Device) => { if (confirm(`Remove ${d.name}? It will need a new pairing code.`)) { await cli().revoke(d.id); void load() } }
  return { paired, list, err, remove }
}
export const devicesValue = ({ paired, list }: ReturnType<typeof useDevices>) =>
  !paired ? 'Not paired' : list?.supported ? `${list.devices.filter((d) => !d.revoked).length} devices` : ''

export function PairPage({ devices: { paired, list, err, remove } }: { devices: ReturnType<typeof useDevices> }) {
  const s = useApp()
  return (<>
    <div className="dl-card sow-set__card">
      <div className="dl-eyebrow">This device</div>
      <div className="sow-pair"><input aria-label="Device name" value={s.deviceName} maxLength={40} onChange={(e) => s.setDeviceName(e.target.value)} /></div>
      <p className="dl-muted sow-note">Shown in the device list when you pair.</p>
    </div>
    {paired && <div className="dl-card sow-set__card"><div className="dl-eyebrow">Devices</div>
      {err ? <p className="dl-muted sow-note">{err}</p> : !list ? <p className="dl-muted sow-note">Checking…</p>
        : !list.supported ? <p className="dl-muted sow-note">The test copy's bridge doesn't list devices yet. It needs the bridge update (Steve deploys it). Everything else works.</p>
        : <div className="sow-snaps">{list.devices.map((d) => <div key={d.id} className="dl-row"><span>{d.name}{d.revoked ? ' · removed' : ''}</span><span className="sow-sp" />
          <span className="dl-muted sow-note">{d.lastSeen ? new Date(d.lastSeen).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
          {!d.revoked && <button className="dl-btn dl-btn--quiet" onClick={() => void remove(d)}>Remove</button>}</div>)}</div>}
    </div>}
  </>)
}
