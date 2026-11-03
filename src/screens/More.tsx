import { useState } from 'react'
import { useApp } from '../store/store'
export function More() {
  const s = useApp(); const [code, setCode] = useState(''); const [busy, setBusy] = useState(false)
  return (
    <>
      <div className="dl-card">
        <h2 className="dl-card__title">More</h2>
        <div className="dl-eyebrow">Data</div>
        <p className="dl-muted sow-note">{s.source === 'copy' ? `Connected to the test copy. Ticks save by themselves${s.pulledAt ? ` · checked ${new Date(s.pulledAt).toLocaleTimeString()}` : ''}.` : 'Showing a demo class with made-up names. Ticks stay on this device.'} Your live sheet is never touched.</p>
        {s.error && <p className="sow-note" role="alert">{s.error}</p>}
        {s.source === 'copy' ? (
          <div className="sow-pair"><button className="dl-btn dl-btn--secondary" onClick={() => void s.refresh()}>Refresh</button><button className="dl-btn dl-btn--quiet" onClick={s.unpair}>Back to demo</button></div>
        ) : (
          <>
            <p className="dl-muted sow-note">To read the test copy: on a phone already on SoW Beta, open Setup › Pair a device, then type the 6-digit code here.</p>
            <form className="sow-pair" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { await s.pair(code) } catch (err) { useApp.setState({ error: err instanceof Error ? err.message : String(err) }) } setBusy(false); setCode('') }}>
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
      <div className="dl-card">
        <div className="dl-eyebrow">Snapshots</div>
        <p className="dl-muted sow-note">Saved on this device by themselves. Restore puts the ticks back as they were; a snapshot of now is kept first.</p>
        <div className="sow-snaps">{s.snaps.length ? s.snaps.map((x) => <button key={x.at} className="dl-row dl-row--btn" onClick={() => { if (confirm(`Restore ticks from ${new Date(x.at).toLocaleString()}?`)) s.restore(x.at) }}>
          {new Date(x.at).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })} · {x.label} <span className="sow-sp" /> Restore</button>) : <span className="dl-muted sow-note">None yet.</span>}</div>
      </div>
      <div className="dl-card">
        <div className="dl-eyebrow">Developer options</div>
        <div className="sow-pair"><span className="sow-note">A–Z side</span>{(['left', 'right'] as const).map((x) => <button key={x} className={`dl-btn ${s.dev.railSide === x ? 'dl-btn--primary' : 'dl-btn--secondary'}`} onClick={() => s.setDev({ railSide: x })}>{x[0]!.toUpperCase() + x.slice(1)}</button>)}</div>
        <div className="sow-pair"><span className="sow-note">Letter bubble</span>{([true, false] as const).map((x) => <button key={String(x)} className={`dl-btn ${s.dev.railBubble === x ? 'dl-btn--primary' : 'dl-btn--secondary'}`} onClick={() => s.setDev({ railBubble: x })}>{x ? 'On' : 'Off'}</button>)}</div>
      </div>
      <div className="dl-card">
        <div className="dl-eyebrow">Look</div>
        <div className="sow-pair">{(['night', 'day', 'system'] as const).map((x) => <button key={x} className={`dl-btn ${s.side === x ? 'dl-btn--primary' : 'dl-btn--secondary'}`} onClick={() => s.setSide(x)}>{x[0]!.toUpperCase() + x.slice(1)}</button>)}</div>
      </div>
    </>
  )
}
