// v0.8 Overview (O2g, L-OVERVIEW): header with today's date, filter chips (All · classes · types), one card per class +
// subject + type. Tap a card or date → Checklist there; ＋ → New date; All › → All dates; press and hold → card menu.
import { useCallback, useState } from 'react'
import { useApp } from '../store/store'
import { overviewCards, pastYearCards, type Card, type OvDate } from '../data/overview'
import { shownYear } from '../data/schoolYear'
import { dateLabel, toChecklist } from '../data/model'
import { todayIso } from '../data/today'
import { AllDates } from './AllDates'
import { CardMenu, DateMenu, type CardAction, type DateAction } from './CardMenu'
import { DateSheet } from './DateSheet'
import { Hint } from './Hint'
import { OverviewCard, cardName } from './OverviewCard'
import { SessionSheet } from './SessionSheet'
import { GLYPH } from '../ui/icons'
import { ShareSheet } from './ShareSheet'
import { UndoToast, type ToastMsg } from '../ui/UndoToast'
import { Chip, ChipGroup } from '../ui/Chips'
import { FloatIn } from '../ui/Life'
import { Push } from '../ui/Push'

type Filter = { classKey: string | null; kind: string | null }
/** `sid`: the date the sheet acts on (a held date, an All dates row), else the card's own date. */
type Open = { kind: 'new' | 'edit' | 'share'; card: Card; sid?: string } | null
const uniq = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b))
/** The date the menu, share and reschedule act on: the card's current date, else the latest one. */
const focusOf = (c: Card) => c.dates[0]?.sessionId ?? c.open

export function Overview() {
  const data = useApp((s) => s.data); const openSession = useApp((s) => s.openSession); const today = todayIso()
  const viewing = useApp((s) => s.viewing); const yearSwitch = useApp((s) => s.dev.pastSessions)
  const cards = viewing ? pastYearCards(data, today) : overviewCards(data, today)
  const [session, setSession] = useState(false); const year = shownYear(viewing, today)
  const [filter, setFilter] = useState<Filter>({ classKey: null, kind: null })
  const [menu, setMenu] = useState<{ card: Card; at: DOMRect } | null>(null)
  const [dmenu, setDmenu] = useState<{ card: Card; d: OvDate; at: DOMRect; box: DOMRect } | null>(null) // 2A: one date held
  const [toast, setToast] = useState<ToastMsg | null>(null); const doneToast = useCallback(() => setToast(null), [])
  const said = (text: string) => setToast({ id: Date.now(), text, undo: /^(Moved|Added|Topic)/.test(text) ? () => useApp.getState().undo() : undefined })
  const [sheet, setSheet] = useState<Open>(null); const [all, setAll] = useState<string | null>(null)
  const classes = uniq(cards.map((c) => c.classKey)); const kinds = uniq(cards.map((c) => c.kind))
  const shown = cards.filter((c) => (!filter.classKey || c.classKey === filter.classKey) && (!filter.kind || c.kind === filter.kind))
  const allCard = cards.find((c) => c.subjectKey === all)
  const act = (card: Card, a: CardAction) => { setMenu(null); if (a === 'all') setAll(card.subjectKey); else setSheet({ kind: a === 'add' ? 'new' : a === 'reschedule' ? 'edit' : 'share', card }) }
  const dact = (m: NonNullable<typeof dmenu>, a: DateAction) => { setDmenu(null); if (a === 'open') openSession(m.card.classKey, m.d.sessionId); else setSheet({ kind: a === 'share' ? 'share' : 'edit', card: m.card, sid: m.d.sessionId }) }
  const chip = (label: string, on: boolean, next: Filter) => <Chip key={label} label={label} on={on} onClick={() => setFilter(next)} />
  return (<div className="sow-ov">
    {allCard ? <Push className="sow-push" onBack={() => setAll(null)}><AllDates card={allCard} today={today} onBack={() => setAll(null)} onOpen={(sid) => openSession(allCard.classKey, sid)} onAdd={() => setSheet({ kind: 'new', card: allCard })} onShare={(sid) => setSheet({ kind: 'share', card: allCard, sid })} /></Push>
      : <>
        <header className="sow-ovh"><h1 className="sow-ovh__title">Overview</h1>
          <span className="sow-ovh__date">{dateLabel(today)}{yearSwitch && <> · <button className={`sow-ovh__year${viewing ? ' past' : ''}`} aria-label={`Session, ${year.label}`} onClick={() => setSession(true)}>{year.label} <i aria-hidden>{GLYPH.down}</i></button></>}</span></header>
        <div className="sow-filters" role="group" aria-label="Filter classes">
          <ChipGroup id="ov-class">{chip('All', !filter.classKey && !filter.kind, { classKey: null, kind: null })}
          {classes.map((k) => chip(cards.find((c) => c.classKey === k)!.label, filter.classKey === k, { ...filter, classKey: filter.classKey === k ? null : k }))}</ChipGroup>
          <span className="sow-filters__div" aria-hidden />
          <ChipGroup id="ov-kind">{kinds.map((k) => chip(k, filter.kind === k, { ...filter, kind: filter.kind === k ? null : k }))}</ChipGroup>
        </div>
        <Hint ids={['hold']} />
        <div className="sow-ocs">{shown.map((c, i) => <OverviewCard key={c.subjectKey} index={i} card={c} viewOnly={!!viewing} held={menu?.card.subjectKey === c.subjectKey || dmenu?.card.subjectKey === c.subjectKey}
          heldDate={dmenu?.card.subjectKey === c.subjectKey ? dmenu.d.sessionId : null} onOpen={(sid) => openSession(c.classKey, sid)}
          onAdd={() => setSheet({ kind: 'new', card: c })} onAll={() => setAll(c.subjectKey)} onHold={(el) => setMenu({ card: c, at: el.getBoundingClientRect() })}
          onDateHold={(d, el) => setDmenu({ card: c, d, at: el.getBoundingClientRect(), box: (el.closest('.sow-oc') ?? el).getBoundingClientRect() })} />)}</div>
        {!cards.length && <FloatIn>No classes yet.</FloatIn>}
      </>}
    {menu && <CardMenu name={cardName(menu.card)} anchor={menu.at} canEdit={!viewing} canReschedule={!!focusOf(menu.card)} onPick={(a) => act(menu.card, a)} onClose={() => setMenu(null)} />}
    {dmenu && <DateMenu name={`${cardName(dmenu.card)}, ${dateLabel(dmenu.d.date)}`} head={`${dateLabel(dmenu.d.date)}${dmenu.d.topic ? ` · ${dmenu.d.topic}` : ''}`} at={dmenu.at} card={dmenu.box}
      canEdit={!viewing} onPick={(a) => dact(dmenu, a)} onClose={() => setDmenu(null)} />}
    {session && <SessionSheet onClose={() => setSession(false)} />}
    {sheet && <CardSheet open={sheet} today={today} onClose={() => setSheet(null)} onDone={said} />}
    <UndoToast msg={toast} onDone={doneToast} />
  </div>)
}

function CardSheet({ open: { kind, card, sid: at }, today, onClose, onDone }: { open: NonNullable<Open>; today: string; onClose: () => void; onDone: (msg: string) => void }) {
  const data = useApp((s) => s.data); const openSession = useApp((s) => s.openSession); const sid = at ?? focusOf(card)
  if (kind === 'share') return sid ? <ShareSheet sessionId={sid} onClose={onClose} /> : null
  const c = toChecklist(data, card.classKey, card.subjectKey); const cur = c.columns.find((x) => x.sessionId === sid)
  return <DateSheet start={kind} columns={c.columns} current={sid ?? ''} today={today} subjectKey={card.subjectKey} kind={card.kind}
    ticks={cur ? c.pupils.filter((p) => c.ticked(cur.sessionId, p.roll)).length : 0} onPick={(s) => openSession(card.classKey, s)} onClose={onClose} onDone={onDone} />
}
