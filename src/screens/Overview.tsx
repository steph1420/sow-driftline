// Overview (r4 M4 + /sow/ v0.47): per-class cards → tap opens that class on Checklist at that date.
import { useState } from 'react'
import { labelOf, useApp } from '../store/store'
import { overviewCards, type Card } from '../data/overview'
import { addDays } from '../data/dial'
import { WeekPath } from './WeekPath'
import { todayIso } from '../data/today'
import { GLYPH, Icon } from '../ui/icons'
import { Hint } from './Hint'
const dayMon = (iso: string) => { const d = new Date(iso + 'T00:00:00'); return { dow: d.toLocaleDateString('en-GB', { weekday: 'short' }), dm: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) } } // Wed, 4 Nov
/** v0.7j Overview: one squircle card per class + subject + type; tap opens Checklist on that session, the corner path opens its week path. */
function ClassCard({ c, today, onPath }: { c: Card; today: string; onPath: () => void }) {
  const open = useApp((s) => s.openSession); const f = c.date ? dayMon(c.date) : null
  const when = !c.date ? 'No dates yet' : c.date === today ? 'Today' : c.date === addDays(today, 1) ? 'Tomorrow' : ''
  return (
    <div className="sow-sq">
      <button className="sow-sq__main" aria-label={`Open ${c.label} ${c.subject} ${c.kind} on Checklist`} disabled={!c.sessionId} onClick={() => c.sessionId && open(c.classKey, c.sessionId)}>
        <span className="sow-sq__top"><b className="sow-sq__cls">{c.label}</b><span className="sow-sq__sub">{c.subject}</span><span className="sow-sq__pill">{c.kind}</span></span>
        <span className="sow-sq__topic">{c.topic || (c.date ? 'No topic yet' : '')}</span>
        <span className="sow-sq__foot"><span className="sow-sq__when">{f ? [when, `${f.dow}, ${f.dm}`].filter(Boolean).join(' · ') : when}</span>
          {c.sessionId && (c.toGo > 0 ? <span className="sow-sq__go">{c.toGo} to go {GLYPH.next}</span> : <span className="sow-sq__in">{GLYPH.tick} All in</span>)}</span>
      </button>
      {c.date && <button className="sow-sq__path" aria-label={`Week path, ${c.label} ${c.subject} ${c.kind}`} onClick={onPath}><Icon name="path" /></button>}
    </div>)
}
export function Overview() {
  const data = useApp((s) => s.data); const today = todayIso(); const [path, setPath] = useState<string | null>(null)
  const cards = overviewCards(data, today).map((c) => ({ ...c, label: labelOf(c.classKey) }))
  return (<div className="sow-ov">
    <div className="dl-muted sow-ov__date">{new Date(today + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
    <h1 className="sow-ov__title">Your classes</h1>
    <p className="dl-muted sow-ov__hint">Tap a class to open its checklist</p>
    <Hint ids={['path']} />
    <div className="sow-sqs">{cards.map((c) => <ClassCard key={c.subjectKey} c={c} today={today} onPath={() => setPath(c.subjectKey)} />)}</div>
    {!cards.length && <p className="dl-muted">No classes yet.</p>}
    {path && <WeekPath subjectKey={path} today={today} onClose={() => setPath(null)} />}
  </div>)
}
