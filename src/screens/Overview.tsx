// v0.8 Overview (O2g, L-OVERVIEW): header with today's date, filter chips (All · classes · types), one card per class +
// subject + type. Tap a card or date → Checklist there; ＋ → New date; All › → All dates; press and hold → card menu.
import { useState } from 'react'
import { useApp } from '../store/store'
import { overviewCards, type Card } from '../data/overview'
import { dateLabel, toChecklist } from '../data/model'
import { todayIso } from '../data/today'
import { AllDates } from './AllDates'
import { CardMenu, type CardAction } from './CardMenu'
import { DateSheet } from './DateSheet'
import { Hint } from './Hint'
import { OverviewCard, cardName } from './OverviewCard'
import { ShareSheet } from './ShareSheet'

type Filter = { classKey: string | null; kind: string | null }
type Open = { kind: 'new' | 'edit' | 'share'; card: Card } | null
const uniq = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b))
/** The date the menu, share and reschedule act on: the card's current date, else the latest one. */
const focusOf = (c: Card) => c.dates[0]?.sessionId ?? c.open

export function Overview() {
  const data = useApp((s) => s.data); const openSession = useApp((s) => s.openSession); const today = todayIso()
  const cards = overviewCards(data, today)
  const [filter, setFilter] = useState<Filter>({ classKey: null, kind: null })
  const [menu, setMenu] = useState<{ card: Card; at: DOMRect } | null>(null)
  const [sheet, setSheet] = useState<Open>(null); const [all, setAll] = useState<string | null>(null)
  const classes = uniq(cards.map((c) => c.classKey)); const kinds = uniq(cards.map((c) => c.kind))
  const shown = cards.filter((c) => (!filter.classKey || c.classKey === filter.classKey) && (!filter.kind || c.kind === filter.kind))
  const allCard = cards.find((c) => c.subjectKey === all)
  const act = (card: Card, a: CardAction) => { setMenu(null); if (a === 'all') setAll(card.subjectKey); else setSheet({ kind: a === 'add' ? 'new' : a === 'reschedule' ? 'edit' : 'share', card }) }
  const chip = (label: string, on: boolean, next: Filter) => <button key={label} className={`sow-fchip${on ? ' on' : ''}`} aria-pressed={on} onClick={() => setFilter(next)}>{label}</button>
  return (<div className="sow-ov">
    {allCard ? <AllDates card={allCard} today={today} onBack={() => setAll(null)} onOpen={(sid) => openSession(allCard.classKey, sid)} onAdd={() => setSheet({ kind: 'new', card: allCard })} onShare={() => setSheet({ kind: 'share', card: allCard })} />
      : <>
        <header className="sow-ovh"><h1 className="sow-ovh__title">Overview</h1><span className="sow-ovh__date">{dateLabel(today)}</span></header>
        <div className="sow-filters" role="group" aria-label="Filter classes">
          {chip('All', !filter.classKey && !filter.kind, { classKey: null, kind: null })}
          {classes.map((k) => chip(cards.find((c) => c.classKey === k)!.label, filter.classKey === k, { ...filter, classKey: filter.classKey === k ? null : k }))}
          <span className="sow-filters__div" aria-hidden />
          {kinds.map((k) => chip(k, filter.kind === k, { ...filter, kind: filter.kind === k ? null : k }))}
        </div>
        <Hint ids={['hold']} />
        <div className="sow-ocs">{shown.map((c) => <OverviewCard key={c.subjectKey} card={c} held={menu?.card.subjectKey === c.subjectKey} onOpen={(sid) => openSession(c.classKey, sid)}
          onAdd={() => setSheet({ kind: 'new', card: c })} onAll={() => setAll(c.subjectKey)} onHold={(el) => setMenu({ card: c, at: el.getBoundingClientRect() })} />)}</div>
        {!cards.length && <p className="dl-muted">No classes yet.</p>}
      </>}
    {menu && <CardMenu name={cardName(menu.card)} anchor={menu.at} canReschedule={!!focusOf(menu.card)} onPick={(a) => act(menu.card, a)} onClose={() => setMenu(null)} />}
    {sheet && <CardSheet open={sheet} today={today} onClose={() => setSheet(null)} />}
  </div>)
}

function CardSheet({ open: { kind, card }, today, onClose }: { open: NonNullable<Open>; today: string; onClose: () => void }) {
  const data = useApp((s) => s.data); const openSession = useApp((s) => s.openSession); const sid = focusOf(card)
  if (kind === 'share') return sid ? <ShareSheet subjectKey={card.subjectKey} sessionId={sid} onClose={onClose} /> : null
  const c = toChecklist(data, card.classKey, card.subjectKey); const cur = c.columns.find((x) => x.sessionId === sid)
  return <DateSheet start={kind} columns={c.columns} current={sid ?? ''} today={today} subjectKey={card.subjectKey} kind={card.kind}
    ticks={cur ? c.pupils.filter((p) => c.ticked(cur.sessionId, p.roll)).length : 0} onPick={(s) => openSession(card.classKey, s)} onClose={onClose} />
}
