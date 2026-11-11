// v0.10.0 Settings › Admin (t201u–t211u, mocks locked 11 Nov 2026) and Sync › Review (Q-CRDT-4 mockups 1–3, t196u/t197u).
// Plain words only. Every big change asks first, says what it will do, and can be undone from the pop-up Undo at the
// top right, which shows only while there is something to undo (Admin and Review only, t197u/t210u).
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp, type PastYear } from '../../store/store'
import { classLabel } from '../../data/model'
import { Sheet } from '../../ui/Sheet'
import { GLYPH } from '../../ui/icons'
import { useMoment } from '../../ui/useMotionOn'
import type { ReviewItem } from '../../admin/review'
import type { Pick } from '../../admin/core'
import { todayIso } from '../../data/today'

/** "8:15 PM IST" / "Today, 8:15 PM IST" for a stored ISO time, in the phone's own zone. */
export const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' }).replace(/\b(am|pm)\b/, (x) => x.toUpperCase())
export const dayTime = (iso: string, now = new Date()) => {
  const d = new Date(iso); const y = new Date(now); y.setDate(y.getDate() - 1)
  const day = d.toDateString() === now.toDateString() ? 'Today' : d.toDateString() === y.toDateString() ? 'Yesterday' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  return `${day}, ${timeLabel(iso)}`
}
const SNAP_WORDS: Record<string, string> = { Auto: 'Automatic', Opened: 'When the app opened', 'Opened (demo)': 'When the app opened', 'Backed up': 'You backed up', 'Before restore': 'Before you loaded a snapshot' }
const snapWords = (l: string) => SNAP_WORDS[l] ?? (l.startsWith('Before ') ? `Before ${l.slice(7)}` : l)

/** The pop-up Undo: rises in at the top right when there is something to undo, and goes when there isn't. */
export function UndoPill({ show, label, onUndo }: { show: boolean; label: string; onUndo: () => void }) {
  const mk = useMoment('toast')
  return <AnimatePresence>{show && <motion.button key="pill" className="sow-undopill" aria-label={`Undo ${label}`} onClick={onUndo}
    initial={mk.on ? { opacity: 0, scale: 0.8 } : false} animate={{ opacity: 1, scale: 1 }} exit={mk.on ? { opacity: 0, scale: 0.8 } : { opacity: 0, transition: { duration: 0 } }} transition={mk.spring('toast')}>Undo</motion.button>}</AnimatePresence>
}

export type AdminGo = 'load' | 'rewind' | 'newyear' | 'pastyears'
export function AdminPage({ go }: { go: (p: AdminGo) => void }) {
  const y = useApp((s) => s.yearNow)(); useApp((s) => s.adminUndos)
  const card = (id: AdminGo, t: string, d: string) => <button key={id} className="sow-acard" aria-label={`${t}, ${d}`} onClick={() => go(id)}>
    <span className="sow-acard__m"><span className="sow-acard__t">{t}</span><span className="sow-acard__d">{d}</span></span><span className="sow-set__chev" aria-hidden>{GLYPH.next}</span></button>
  return (<>
    <p className="sow-anote">These change every device · you can always undo</p>
    {card('load', 'Load a snapshot', 'Bring the register back to a saved moment')}
    {card('rewind', 'Rewind to a time', 'Go back to any time this school year')}
    {card('newyear', 'Start new year', `Put this year aside as ${y.label}. Every class starts fresh.`)}
    {card('pastyears', 'Past years', 'Open an old year, or pull something in')}
  </>)
}

export function LoadPage({ onDone }: { onDone: () => void }) {
  const snaps = useApp((s) => s.snaps); const s = useApp(); const [pick, setPick] = useState<string | null>(null)
  const words = pick ? s.adminLoadPreview(pick) : ''
  return (<>
    <p className="sow-anote">Pick a snapshot to bring back. This changes every device.</p>
    <div className="dl-list" role="radiogroup" aria-label="Snapshots">{snaps.length ? snaps.map((x) => <button key={x.at} role="radio" aria-checked={pick === x.at} className="dl-row dl-row--btn sow-set__row sow-arow" aria-label={`${dayTime(x.at)}, ${snapWords(x.label)}`} onClick={() => setPick(x.at)}>
      <span className={`sow-radio${pick === x.at ? ' is-on' : ''}`} aria-hidden /><span className="sow-set__txt"><b>{dayTime(x.at)}</b><small className="dl-muted">{snapWords(x.label)}</small></span></button>)
      : <div className="dl-row dl-muted">No snapshots yet. Back up now makes one.</div>}</div>
    {pick && <Sheet label="Load this snapshot?" onClose={() => setPick(null)} className="sow-asheet">
      <div className="sow-sheet__head"><div><h2 className="sow-sheet__title">Load this snapshot?</h2><p className="dl-muted sow-asheet__sub">{dayTime(pick)}</p></div><button className="sow-x" aria-label="Close" onClick={() => setPick(null)}>{GLYPH.close}</button></div>
      <p className="sow-asheet__txt">{words ? `This brings the register back to how it was at ${timeLabel(pick)}: it will ${words}. It changes every device. You can undo it right after.` : 'This snapshot is the same as now. Nothing would change.'}</p>
      <div className="sow-abtns"><button className="dl-btn dl-btn--primary" disabled={!words} onClick={() => { s.adminLoad(pick); setPick(null); onDone() }}>{`Load ${timeLabel(pick).replace(/ [A-Z]+$|\s*GMT.*$/, '')} snapshot`}</button>
        <button className="dl-btn dl-btn--secondary" onClick={() => setPick(null)}>Keep things as they are</button></div>
    </Sheet>}
  </>)
}

const localInput = (iso: string) => { const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}` }
export function RewindPage({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const s = useApp(); useApp((x) => x.data); const { floor, picks } = useMemo(() => s.rewindChoices(), [s])
  const [pick, setPick] = useState<string | null>(picks[0] ?? null); const [other, setOther] = useState(false)
  const pre = pick ? s.adminRewindPreview(pick) : null; const short = pick ? timeLabel(pick).replace(/ [A-Z]+$|\s*GMT.*$/, '') : ''
  return (<>
    <p className="sow-abig">Pick a time to go back to</p>
    <div className="dl-list" role="radiogroup" aria-label="Times">
      {picks.map((t) => <button key={t} role="radio" aria-checked={!other && pick === t} className="dl-row dl-row--btn sow-set__row sow-arow" onClick={() => { setOther(false); setPick(t) }}>
        <span className={`sow-radio${!other && pick === t ? ' is-on' : ''}`} aria-hidden /><span className={!other && pick === t ? 'sow-arow__on' : ''}>{dayTime(t)}</span></button>)}
      <button role="radio" aria-checked={other} className="dl-row dl-row--btn sow-set__row sow-arow" onClick={() => setOther(true)}><span className={`sow-radio${other ? ' is-on' : ''}`} aria-hidden /><span className="sow-set__action">Other time…</span></button>
      {other && <label className="dl-row sow-set__row sow-arow">Go back to<span className="sow-sp" /><input type="datetime-local" aria-label="Time to go back to" min={localInput(floor)} max={localInput(new Date().toISOString())} onChange={(e) => { const v = e.target.value; if (v) setPick(new Date(v).toISOString()) }} /></label>}
    </div>
    {!picks.length && !other && <p className="sow-anote">Nothing has changed on this phone yet this school year.</p>}
    {pre && <p className={`sow-apreview${pre.ok ? '' : ' is-off'}`} role="status">{pre.words}</p>}
    <p className="sow-afoot">You can go back as far as the start of this school year, not into last year.</p>
    {s.source === 'copy' && s.syncPath === 'push' && <p className="sow-afoot">On the test copy this phone can only rewind its own changes for now.</p>}
    <div className="sow-abtns sow-abtns--page"><button className="dl-btn dl-btn--primary" disabled={!pre?.ok} onClick={() => { if (pick) { s.adminRewind(pick); onDone() } }}>{pick ? `Rewind to ${short}` : 'Rewind'}</button>
      <button className="dl-btn dl-btn--secondary" onClick={onCancel}>Don’t rewind</button></div>
  </>)
}

export function NewYearPage({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const s = useApp(); const y = s.yearNow(); const next = `${y.start + 1}–${String((y.start + 2) % 100).padStart(2, '0')}`
  const waits = s.source === 'copy' && s.syncPath === 'push'
  const row = (k: string, v: string) => <div className="sow-asum__row"><span className="dl-muted">{k}</span><b>{v}</b></div>
  return (<>
    <p className="sow-abig">This applies to every class at once.</p>
    <div className="sow-asum">{row('This year is put aside as', y.label)}{row('New year', next)}{row('All classes', 'Start fresh')}{row('Admission numbers', 'Kept as they are')}{row(`${y.label} later`, 'Open in Past years')}</div>
    <p className="sow-afoot">You can look at the old year any time, and pull names or dates into the new one. This changes every device. You can undo it.</p>
    {waits && <p className="sow-afoot" role="note">On the test copy this waits for the new way of saving, so no rows are removed there. Nothing has changed.</p>}
    <div className="sow-abtns sow-abtns--page"><button className="dl-btn dl-btn--primary" disabled={waits} onClick={() => { s.adminNewYear(); onDone() }}>Start new year</button>
      <button className="dl-btn dl-btn--secondary" onClick={onCancel}>Not now</button></div>
  </>)
}

const classesIn = (st: PastYear['state']) => [...new Set(st.subjects.map((x) => x.classKey))]
export function PastYearsPage({ open }: { open: (id: string) => void }) {
  const s = useApp(); useApp((x) => x.adminUndos); const years = s.pastYears(); const now = s.yearNow()
  return (<>
    <p className="sow-abig">{`Open an old year to look at it, or pull something into ${now.label}.`}</p>
    <div className="dl-list">{years.length ? years.map((y, i) => <button key={y.id} className="dl-row dl-row--btn sow-set__row" aria-label={`${y.label}, ${classesIn(y.state).length} classes`} onClick={() => open(y.id)}>
      <span className="sow-set__txt"><b>{y.label}</b><small className="dl-muted">{`${i === 0 && Number(y.id.slice(0, 4)) === now.start - 1 ? 'Last year · ' : ''}${classesIn(y.state).length} classes`}</small></span><span className="sow-sp" /><span className="sow-set__chev" aria-hidden>{GLYPH.next}</span></button>)
      : <div className="dl-row dl-muted">No past years yet. Start new year puts this one here.</div>}</div>
  </>)
}

const day = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
export function PastYearPage({ year, cls, setCls, onPull }: { year: PastYear; cls: string; setCls: (k: string) => void; onPull: () => void }) {
  const st = year.state; const now = useApp((s) => s.yearNow)(); const classes = classesIn(st)
  const subs = st.subjects.filter((x) => x.classKey === cls)
  return (<>
    <p className="sow-abig">{`You can look through this year, or pull some of it into ${now.label}.`}</p>
    <h2 className="dl-eyebrow sow-set__eyebrow">Classes</h2>
    <div className="dl-list" role="radiogroup" aria-label="Classes">{classes.map((k) => { const n = st.roster.filter((p) => p.classKey === k).length; const sb = st.subjects.find((x) => x.classKey === k)
      return <button key={k} role="radio" aria-checked={k === cls} className={`dl-row dl-row--btn sow-set__row sow-arow${k === cls ? ' is-picked' : ''}`} aria-label={`${classLabel(k)}, ${n} pupils`} onClick={() => setCls(k)}>
        <span className="sow-av" aria-hidden>{classLabel(k).slice(-1)}</span><span className="sow-set__txt"><b>{classLabel(k)}</b><small className="dl-muted">{`${sb?.subject ?? ''} · ${n} pupils`}</small></span></button> })}</div>
    {subs.map((sb) => { const ses = st.sessions.filter((x) => x.subjectKey === sb.subjectKey).sort((a, b) => (a.date < b.date ? -1 : 1)); const n = st.roster.filter((p) => p.classKey === sb.classKey && p.status !== 'Left').length
      return <section key={sb.subjectKey}><h2 className="dl-eyebrow sow-set__eyebrow">{`${classLabel(sb.classKey)} · ${sb.subject} ${sb.kind}`}</h2>
        <div className="dl-list">{ses.slice(-6).map((x) => <div key={x.sessionId} className="dl-row sow-set__row"><span>{`${sb.kind} · ${day(x.date)}`}</span><span className="sow-sp" /><span className="sow-set__value">{`${st.ticks.filter((t) => t.sessionId === x.sessionId && t.set).length}/${n}`}</span></div>)}
          {ses.length > 6 && <div className="dl-row dl-muted sow-set__row">{`and ${ses.length - 6} more dates`}</div>}</div></section> })}
    <p className="sow-afoot">Ticks and names can’t be changed here.</p>
    <div className="sow-abtns sow-abtns--page"><button className="dl-btn dl-btn--primary" onClick={onPull}>Pull into this year</button></div>
  </>)
}

export function PullPage({ year, cls, onDone, onCancel }: { year: PastYear; cls: string; onDone: () => void; onCancel: () => void }) {
  const s = useApp(); const st = year.state; const now = s.yearNow(); const curClasses = [...new Set(s.data.subjects.map((x) => x.classKey))]
  const [into, setInto] = useState(curClasses.includes(cls) ? cls : curClasses[0] ?? cls)
  const [list, setList] = useState(false); const [kids, setKids] = useState<number[]>([]); const [showKids, setShowKids] = useState(false); const [dates, setDates] = useState<string[]>([])
  const pupilsOk = s.canPullPupils(); const kidsOf = st.roster.filter((p) => p.classKey === cls && p.status !== 'Left'); const subs = st.subjects.filter((x) => x.classKey === cls)
  const pick: Pick = { into, ...(list ? { classList: cls } : {}), children: kids.map((roll) => ({ classKey: cls, roll })), dates }
  const pre = s.adminPullPreview(year.id, pick)
  const box = (on: boolean) => <span className={`sow-bx${on ? ' is-on' : ''}`} aria-hidden>{on ? '✓' : ''}</span>
  return (<>
    <p className="sow-abig">{`From ${year.label}, into ${now.label}. Tick what you want to add.`}</p>
    <div className="dl-list">
      <label className="dl-row sow-set__row sow-arow"><span>Add to</span><span className="sow-sp" /><select aria-label="Add to class" value={into} onChange={(e) => setInto(e.target.value)}>{curClasses.map((k) => <option key={k} value={k}>{classLabel(k)}</option>)}</select></label>
      <button role="checkbox" aria-checked={list} disabled={!pupilsOk} className="dl-row dl-row--btn sow-set__row sow-arow sow-pick" onClick={() => setList(!list)}>{box(list)}<span className="sow-set__txt"><b>{`Class list · ${classLabel(cls)}`}</b><small className="dl-muted">{pupilsOk ? `${kidsOf.length} names, roll numbers kept where free` : 'Needs the SOW Register (not connected yet)'}</small></span></button>
      <button role="checkbox" aria-checked={kids.length > 0} disabled={!pupilsOk} className="dl-row dl-row--btn sow-set__row sow-arow sow-pick" onClick={() => setShowKids(!showKids)}>{box(kids.length > 0)}<span className="sow-set__txt"><b>{`Children · ${kids.length} selected`}</b>
        {kids.length ? <span className="sow-names">{kids.map((r) => <span key={r}>{`${kidsOf.find((p) => p.roll === r)?.name ?? ''} · ${r}`}</span>)}</span> : <small className="dl-muted">{pupilsOk ? 'Pick children one by one' : 'Needs the SOW Register (not connected yet)'}</small>}</span></button>
      {showKids && pupilsOk && kidsOf.map((p) => <button key={p.roll} role="checkbox" aria-checked={kids.includes(p.roll)} className="dl-row dl-row--btn sow-set__row sow-arow sow-pick sow-pick--in" onClick={() => setKids(kids.includes(p.roll) ? kids.filter((r) => r !== p.roll) : [...kids, p.roll])}>{box(kids.includes(p.roll))}<span>{`${p.name} · ${p.roll}`}</span></button>)}
      {subs.map((sb) => { const n = st.sessions.filter((x) => x.subjectKey === sb.subjectKey).length; const on = dates.includes(sb.subjectKey)
        return <button key={sb.subjectKey} role="checkbox" aria-checked={on} className="dl-row dl-row--btn sow-set__row sow-arow sow-pick" onClick={() => setDates(on ? dates.filter((x) => x !== sb.subjectKey) : [...dates, sb.subjectKey])}>{box(on)}<span className="sow-set__txt"><b>{`Dates and topics · ${classLabel(cls)} ${sb.subject} ${sb.kind}`}</b><small className="dl-muted">{`${n} dates from ${year.label}, on the same weekday`}</small></span></button> })}
    </div>
    <p className="sow-apreview" role="status">{pre.words}</p>
    <p className="sow-afoot">This changes every device. You can undo it.</p>
    <div className="sow-abtns sow-abtns--page"><button className="dl-btn dl-btn--primary" disabled={!pre.ok} onClick={() => { s.adminPull(year.id, pick); onDone() }}>Add to this year</button>
      <button className="dl-btn dl-btn--secondary" onClick={onCancel}>Don’t add</button></div>
  </>)
}

const dayOf = (iso: string, now = new Date(`${todayIso()}T12:00:00`)) => { const d = new Date(iso); const y = new Date(now); y.setDate(y.getDate() - 1); return d.toDateString() === now.toDateString() ? 'Today' : d.toDateString() === y.toDateString() ? 'Yesterday' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) }
const hm = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\b(am|pm)\b/, (x) => x.toUpperCase())
const otherWord = (c: ReviewItem) => c.other.replace(/ \(.*\)$/, ''); const keptWord = (c: ReviewItem) => c.kept.replace(/ \(.*\)$/, '')
export function ReviewPage() {
  const s = useApp(); const [items] = useState(() => s.reviewList()); const [ask, setAsk] = useState<ReviewItem | null>(null)
  const groups = items.reduce<[string, ReviewItem[]][]>((a, c) => { const d = dayOf(c.at); const g = a.find((x) => x[0] === d); if (g) g[1].push(c); else a.push([d, [c]]); return a }, [])
  return (<>
    {!items.length && <p className="sow-anote">Nothing to review. When two phones change the same box before they see each other, it shows up here.</p>}
    {groups.map(([d, l]) => <section key={d}><h2 className="dl-eyebrow sow-set__eyebrow">{d}</h2><div className="sow-rcard">{l.map((c) =>
      <div key={c.key} className="sow-ritem"><div className="sow-ritem__nm"><b>{c.title}</b><span className="dl-muted">{hm(c.at)}</span></div>
        <div className="sow-ritem__meta dl-muted">{c.meta}</div><div className="sow-ritem__kept">{`Kept: ${c.kept} · Other: ${c.other}`}</div>
        <div className="sow-ritem__ops"><span className="sow-chip">{c.rule}</span><button className="sow-chg" aria-label={`Change ${c.title} to ${otherWord(c)}`} onClick={() => setAsk(c)}>Change</button></div></div>)}</div></section>)}
    {items.length > 0 && <p className="sow-afoot">The list itself changes nothing. Change saves the other answer as a new change, so every phone and the sheet follow it.</p>}
    {ask && <Sheet label={`Change to ${otherWord(ask)}?`} onClose={() => setAsk(null)} className="sow-asheet">
      <h2 className="sow-sheet__title">{`Change to ${otherWord(ask)}?`}</h2>
      <p className="sow-asheet__txt">{`${ask.title} · ${ask.meta}. The sheet kept "${keptWord(ask)}" because ${ask.rule.toLowerCase().replace(/^set wins$/, 'set wins')}. Change saves "${otherWord(ask)}" as a new change; Undo brings it back.`}</p>
      <div className="sow-abtns sow-abtns--row"><button className="dl-btn dl-btn--primary" onClick={() => { s.reviewChange(ask); setAsk(null) }}>Change</button><button className="dl-btn dl-btn--secondary" onClick={() => setAsk(null)}>Keep</button></div>
    </Sheet>}
  </>)
}
