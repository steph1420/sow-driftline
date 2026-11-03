import { useState } from 'react'
import { useApp } from '../store/store'
export function More() {
  const s = useApp(); const [code, setCode] = useState(''); const [busy, setBusy] = useState(false)
  return (
    <>
      <div className="dl-card">
        <h2 className="dl-card__title">More</h2>
        <div className="dl-eyebrow">Data</div>
        <p className="dl-muted sow-note">{s.source === 'copy' ? `Reading the test copy, read only${s.pulledAt ? ` · ${new Date(s.pulledAt).toLocaleTimeString()}` : ''}.` : 'Showing a demo class with made-up names.'} Nothing here changes your sheet.</p>
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
          </>
        )}
      </div>
      <div className="dl-card">
        <div className="dl-eyebrow">Look</div>
        <div className="sow-pair">{(['night', 'day', 'system'] as const).map((x) => <button key={x} className={`dl-btn ${s.side === x ? 'dl-btn--primary' : 'dl-btn--secondary'}`} onClick={() => s.setSide(x)}>{x[0]!.toUpperCase() + x.slice(1)}</button>)}</div>
      </div>
    </>
  )
}
