import { useEffect, useMemo, useRef, useState } from 'react'
import { CONFIG } from '../config'
import type { SheetState } from '../data/contract'
import { AzRail } from './AzRail'
import { fmtDay, pickAnchor, searchIndex, toChecklist, toGo, visibleCols, type Layout } from '../data/model'

type Props = { state: SheetState; classKey: string; today: string; layout: Layout; jump?: number; onTick?: (sessionId: string, roll: number) => void; railSide?: 'right' | 'left'; railBubble?: boolean; onRailSide?: (s: 'right' | 'left') => void }
const d0 = (iso: string) => { const f = fmtDay(iso); return `${f.dow} ${f.dm}` }
export function Checklist({ state, classKey, today, layout, jump = 0, onTick, railSide = 'right', railBubble = true, onRailSide }: Props) {
  const c = useMemo(() => toChecklist(state, classKey), [state, classKey])
  const anchor = pickAnchor(c.columns.map((x) => x.date), today)
  const [end, setEnd] = useState(anchor.index)
  const [sel, setSel] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const rows = useRef<(HTMLTableRowElement | null)[]>([])
  useEffect(() => { setEnd(anchor.index) }, [anchor.index, classKey, jump])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), CONFIG.timing.nameToastMs); return () => clearTimeout(t) }, [toast])
  if (!c.columns.length) return (
    <div className="dl-card sow-empty"><div className="sow-ico" aria-hidden>＋</div><h2 className="dl-title2">No dates yet</h2>
      <p className="dl-muted">This class has no dates on the sheet yet. Ticks appear here.</p></div>)
  const cols = visibleCols(c.columns.length, end, layout)
  const focus = c.columns[anchor.index]!
  const names = c.pupils.map((p) => p.name)
  const go = (i: number) => { if (i < 0) return; setSel(i); rows.current[i]?.scrollIntoView?.({ block: 'start', behavior: 'auto' }) }
  const dup = new Set(names.filter((n, i) => names.indexOf(n) !== i)) // Q-DUP-1: roll tells twins apart
  const left = toGo(c, focus.sessionId); const done = c.pupils.length - left
  const f = fmtDay(focus.date)
  return (
    <>
      <div className="dl-card">
        <div className="sow-glance">
          <div><div className="dl-eyebrow">{[c.subject, focus.kind, `${f.dow} ${f.dm}`].filter(Boolean).join(' · ')}</div>
            <div className="dl-headline">{anchor.kind === 'today' ? <><span className="dl-num">{done}</span> of {c.pupils.length} done</> : anchor.kind === 'upcoming' ? `Next up ${f.dow} ${f.dm}` : `Last was ${f.dow} ${f.dm}`}</div></div>
          <span className="sow-sp" />
          {left > 0 ? <span className="dl-chip dl-tone--accent">{left} to go</span> : <span className="dl-chip dl-tone--positive">All done</span>}
        </div>
        <div className="sow-prog"><i style={{ width: `${c.pupils.length ? (done / c.pupils.length) * 100 : 0}%` }} /></div>
      </div>
      <label className="sow-search"><span aria-hidden>⌕</span><input value={q} placeholder="Find a name" aria-label="Find a name"
        onChange={(e) => { setQ(e.target.value); go(searchIndex(names, e.target.value)) }} /></label>
      <div className={`sow-grid ${layout}`}>
        {cols[0]! > 0 && <button className="sow-more" onClick={() => setEnd(Math.max(cols.length - 1, end - 1))}>← {cols[0]} earlier date{cols[0] === 1 ? '' : 's'}</button>}
        <table>
          <thead><tr><th className="n">{c.pupils.length} pupils</th>
            {cols.map((i) => { const s = c.columns[i]!; const d = fmtDay(s.date); return <th key={s.sessionId} className={i === anchor.index ? 'today' : ''}>{s.kind ? `${s.kind} · ` : ''}{d.dow}<b>{d.dm}</b></th> })}</tr></thead>
          <tbody>{c.pupils.map((p, r) => (
            <tr key={p.roll} ref={(el) => { rows.current[r] = el }} className={sel === r ? 'sel' : ''}>
              <td className="n" onClick={() => { setSel(r); setToast(dup.has(p.name) ? `${p.name} · roll ${p.roll}` : p.name) }}>{p.name}{dup.has(p.name) && <small className="sow-roll">#{p.roll}</small>}</td>
              {cols.map((i) => { const s = c.columns[i]!; const fut = s.date > today; const on = c.ticked(s.sessionId, p.roll)
                return <td key={s.sessionId} className={i === anchor.index ? 'today' : ''}>{onTick ? <button className={`t ${fut && !on ? 'fut' : on ? 'on' : ''}`} aria-pressed={on} aria-label={`${p.name}${dup.has(p.name) ? ` roll ${p.roll}` : ''}, ${d0(s.date)}, ${on ? 'done' : 'not yet'}`} onClick={() => onTick(s.sessionId, p.roll)}>{on ? '✓' : ''}</button>
                  : <span className={`t ${fut && !on ? 'fut' : on ? 'on' : ''}`} aria-label={on ? 'Done' : 'Not yet'}>{on ? '✓' : ''}</span>}</td> })}
            </tr>))}</tbody>
        </table>
        {end < c.columns.length - 1 && <button className="sow-more" onClick={() => setEnd(end + 1)}>later date →</button>}
      </div>
      <AzRail names={names} onJump={go} side={railSide} bubble={railBubble} onSide={onRailSide} />
      {toast && <div className="dl-toast-region"><div className="dl-toast dl-tone--accent" role="status"><span className="dl-toast__dot" />{toast}</div></div>}
    </>
  )
}
