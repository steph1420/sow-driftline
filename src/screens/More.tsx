import { useEffect, useState } from 'react'
import { currentBridge, onLive, sheetLabel, useApp } from '../store/store'
import { devicesClient, type Device } from '../data/devices'
import { FLAVOR } from '../config'
export const channelUrl = (ch: 'stable' | 'beta', origin = location.origin) => `${origin}/${ch === 'beta' ? 'sow-driftline-beta' : 'sow-driftline'}/`
function Devices() {
  const [st, setSt] = useState<{ supported: boolean; devices: Device[] } | null>(null); const [err, setErr] = useState<string | null>(null)
  const cli = () => { const b = currentBridge(); return devicesClient(b.url, b.token) }
  const load = () => cli().list().then(setSt, (e) => setErr(e instanceof Error ? e.message : String(e)))
  useEffect(() => { void load() }, [])
  if (err) return <p className="dl-muted sow-note">{err}</p>
  if (!st) return <p className="dl-muted sow-note">Checking…</p>
  if (!st.supported) return <p className="dl-muted sow-note">The test copy's bridge doesn't list devices yet. It needs the bridge update (Steve deploys it). Everything else works.</p>
  return <div className="sow-snaps">{st.devices.map((d) => <div key={d.id} className="dl-row"><span>{d.name}{d.revoked ? ' · removed' : ''}</span><span className="sow-sp" />
    <span className="dl-muted sow-note">{d.lastSeen ? new Date(d.lastSeen).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
    {!d.revoked && <button className="dl-btn dl-btn--quiet" onClick={async () => { if (confirm(`Remove ${d.name}? It will need a new pairing code.`)) { await cli().revoke(d.id); void load() } }}>Remove</button>}</div>)}</div>
}
export function More() {
  const s = useApp(); const [code, setCode] = useState(''); const [busy, setBusy] = useState(false); const [target, setTarget] = useState<'live' | 'copy'>(FLAVOR === 'stable' ? 'live' : 'copy')
  return (
    <>
      <div className="dl-card">
        <h2 className="dl-card__title">More</h2>
        <div className="dl-eyebrow">Data</div>
        <p className="dl-muted sow-note">{s.source === 'copy' ? `Connected to the ${sheetLabel()}. Ticks save by themselves${s.pulledAt ? ` · checked ${new Date(s.pulledAt).toLocaleTimeString()}` : ''}.` : 'Showing a demo class with made-up names. Ticks stay on this device.'} {FLAVOR === 'beta' ? 'Beta never touches your live sheet.' : 'Only the boxes you tick are saved.'}</p>
        {s.error && <p className="sow-note" role="alert">{s.error}</p>}
        {s.source === 'copy' ? (
          <div className="sow-pair"><button className="dl-btn dl-btn--secondary" onClick={() => void s.refresh()}>Refresh</button><button className="dl-btn dl-btn--quiet" onClick={s.unpair}>Back to demo</button></div>
        ) : (
          <>
            {FLAVOR === 'stable' && <div className="sow-pair">{(['live', 'copy'] as const).map((x) => <button key={x} className={`dl-btn ${target === x ? 'dl-btn--primary' : 'dl-btn--secondary'}`} onClick={() => setTarget(x)}>{x === 'live' ? 'Live sheet' : 'Test copy'}</button>)}</div>}
            <p className="dl-muted sow-note">{target === 'live' ? 'In the old SoW app (/sow/) open Setup › Pair a device, then type the 6-digit code here.' : 'On a device already on SoW Beta, open Setup › Pair a device, then type the 6-digit code here.'}</p>
            <form className="sow-pair" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { await s.pair(code, target) } catch (err) { useApp.setState({ error: err instanceof Error ? err.message : String(err) }) } setBusy(false); setCode('') }}>
              <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} aria-label="6-digit code" placeholder="000000" />
              <button className="dl-btn dl-btn--primary" disabled={code.length !== 6 || busy}>Connect</button>
            </form>
            <label className="dl-btn dl-btn--quiet sow-file">Or open a setup file
              <input type="file" accept=".json,application/json" hidden aria-label="Setup file" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; setBusy(true)
                try { await s.importSetup(await f.text()) } catch (err) { useApp.setState({ error: err instanceof Error ? err.message : String(err) }) } setBusy(false); e.target.value = '' }} />
            </label>
          </>
        )}
      </div>
      {s.source === 'copy' && !onLive() && <div className="dl-card"><div className="dl-eyebrow">Devices</div><Devices /></div>}
      <div className="dl-card">
        <div className="dl-eyebrow">This device</div>
        <div className="sow-pair"><input aria-label="Device name" value={s.deviceName} maxLength={40} onChange={(e) => s.setDeviceName(e.target.value)} /></div>
        <p className="dl-muted sow-note">Shown in the device list when you pair.</p>
        <div className="dl-eyebrow">Release channel</div>
        <div className="sow-pair">{(['stable', 'beta'] as const).map((x) => <a key={x} href={channelUrl(x)} className={`dl-btn ${FLAVOR === x ? 'dl-btn--primary' : 'dl-btn--secondary'}`} aria-current={FLAVOR === x ? 'page' : undefined}>{x === 'stable' ? 'Stable' : 'Beta'}</a>)}</div>
      </div>
      <div className="dl-card">
        <div className="dl-eyebrow">Snapshots</div>
        <p className="dl-muted sow-note">Saved on this device by themselves. Restore puts the ticks back as they were; a snapshot of now is kept first.</p>
        <div className="sow-snaps">{s.snaps.length ? s.snaps.map((x) => <button key={x.at} className="dl-row dl-row--btn" onClick={() => { if (confirm(`Restore ticks from ${new Date(x.at).toLocaleString()}?`)) s.restore(x.at) }}>
          {new Date(x.at).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })} · {x.label} <span className="sow-sp" /> Restore</button>) : <span className="dl-muted sow-note">None yet.</span>}</div>
      </div>
      <div className="dl-card">
        <div className="dl-eyebrow">Developer options</div>
        <div className="sow-pair"><span className="sow-note">A–Z side</span>{(['left', 'right'] as const).map((x) => <button key={x} className={`dl-btn ${s.dev.railSide === x ? 'dl-btn--primary' : 'dl-btn--secondary'}`} onClick={() => s.setDev({ railSide: x })}>{x[0]!.toUpperCase() + x.slice(1)}</button>)}</div>
        <div className="sow-pair"><span className="sow-note">Swipe to tick</span>{([true, false] as const).map((x) => <button key={String(x)} className={`dl-btn ${s.dev.swipeTick === x ? 'dl-btn--primary' : 'dl-btn--secondary'}`} onClick={() => s.setDev({ swipeTick: x })}>{x ? 'On' : 'Off'}</button>)}</div>
        <div className="sow-pair"><span className="sow-note">Letter bubble</span>{([true, false] as const).map((x) => <button key={String(x)} className={`dl-btn ${s.dev.railBubble === x ? 'dl-btn--primary' : 'dl-btn--secondary'}`} onClick={() => s.setDev({ railBubble: x })}>{x ? 'On' : 'Off'}</button>)}</div>
      </div>
      <div className="dl-card">
        <div className="dl-eyebrow">Look</div>
        <div className="sow-pair">{(['night', 'day', 'system'] as const).map((x) => <button key={x} className={`dl-btn ${s.side === x ? 'dl-btn--primary' : 'dl-btn--secondary'}`} onClick={() => s.setSide(x)}>{x[0]!.toUpperCase() + x.slice(1)}</button>)}</div>
      </div>
    </>
  )
}
