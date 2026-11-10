// v0.8 F-OV-06 (O2g-hold): the press-and-hold menu under a lifted card; the rest of the page blurs.
// beta.9 (t221u, 2A): the same menu for one date of the strip (Share, Open, Reschedule for that date), headed by the date.
// Moment "hold" (3a): the menu grows out of the press point (≈60% → 104% → 100%) and the scrim fades in.
import { useEffect, type CSSProperties } from 'react'
import { useBackLayer } from '../ui/useBackLayer'
import { motion } from 'framer-motion'
import { Icon, type IconName } from '../ui/icons'
import { DUR } from '../config/motion'
import { useMoment } from '../ui/useMotionOn'

export type CardAction = 'share' | 'all' | 'add' | 'reschedule'
export type DateAction = 'share' | 'open' | 'reschedule'
const ITEMS: { id: CardAction; label: string; icon: IconName }[] = [
  { id: 'share', label: 'Share', icon: 'share' }, { id: 'all', label: 'All dates', icon: 'list' },
  { id: 'add', label: 'Add date', icon: 'calendarPlus' }, { id: 'reschedule', label: 'Reschedule', icon: 'reschedule' },
]
const DATE_ITEMS: { id: DateAction; label: string; icon: IconName }[] = [
  { id: 'share', label: 'Share', icon: 'share' }, { id: 'open', label: 'Open', icon: 'check' }, { id: 'reschedule', label: 'Reschedule', icon: 'reschedule' },
]
/** `canEdit` false (a past year): Share and All dates only. */
const READ_ONLY: CardAction[] = ['share', 'all']
type Props = { name: string; anchor: DOMRect; canEdit: boolean; canReschedule: boolean; onPick: (a: CardAction) => void; onClose: () => void }

function useEscape(onClose: () => void) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k) }, [onClose])
}
type ShellProps = { name: string; className: string; style: CSSProperties; origin: string; head?: string; onClose: () => void; children: React.ReactNode }
function MenuShell({ name, className, style, origin, head, onClose, children }: ShellProps) {
  const mk = useMoment('hold'); useBackLayer(true, onClose) // beta.11 (t229u): Back closes the hold menu
  return (<>
    <motion.button className="sow-scrim sow-scrim--blur" aria-label="Close menu" onClick={onClose} initial={mk.on ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={mk.tween(DUR.fade)} />
    <motion.div className={`dl-card sow-cardmenu ${className}`.trim()} role="menu" aria-label={name} style={{ ...style, transformOrigin: origin }}
      initial={mk.on ? { opacity: 0, scale: 0.6 } : false} animate={{ opacity: 1, scale: 1 }} transition={{ ...mk.spring('menu'), opacity: mk.tween(DUR.fade) }}>
      {head && <div className="sow-cardmenu__head" aria-hidden>{head}</div>}
      {children}
    </motion.div></>)
}

export function CardMenu({ name, anchor, canEdit, canReschedule, onPick, onClose }: Props) {
  useEscape(onClose)
  const below = anchor.bottom < window.innerHeight * 0.6 // room under the card, else open above it
  const place = below ? { top: anchor.bottom, right: window.innerWidth - anchor.right } : { bottom: window.innerHeight - anchor.top, right: window.innerWidth - anchor.right }
  return (<MenuShell name={name} className={below ? '' : 'up'} style={place} origin={below ? 'top right' : 'bottom right'} onClose={onClose}>
    {ITEMS.filter((x) => READ_ONLY.includes(x.id) || (canEdit && (x.id !== 'reschedule' || canReschedule))).map((x) =>
      <button key={x.id} role="menuitem" className="dl-row dl-row--btn" onClick={() => onPick(x.id)}><span>{x.label}</span><span className="sow-sp" /><Icon name={x.icon} /></button>)}
  </MenuShell>)
}

/** 2A: `at` = the held date button, `card` = its card (the menu opens under the card, starting at the date). */
type DateProps = { name: string; head: string; at: DOMRect; card: DOMRect; canEdit: boolean; onPick: (a: DateAction) => void; onClose: () => void }
export function DateMenu({ name, head, at, card, canEdit, onPick, onClose }: DateProps) {
  useEscape(onClose)
  const below = card.bottom < window.innerHeight * 0.6; const left = Math.max(card.left, Math.min(at.left - at.width * 0.5, window.innerWidth * 0.4))
  const place = below ? { top: card.bottom, left } : { bottom: window.innerHeight - card.top, left }
  const ox = at.left + at.width / 2 - left; const origin = below ? `${ox}px ${at.top + at.height / 2 - card.bottom}px` : `${ox}px calc(100% + ${card.top - at.top - at.height / 2}px)`
  return (<MenuShell name={name} className={`sow-cardmenu--date${below ? '' : ' up'}`} style={place} origin={origin} head={head} onClose={onClose}>
    {DATE_ITEMS.filter((x) => canEdit || x.id !== 'reschedule').map((x) =>
      <button key={x.id} role="menuitem" className="dl-row dl-row--btn" onClick={() => onPick(x.id)}><span>{x.label}</span><span className="sow-sp" /><Icon name={x.icon} /></button>)}
  </MenuShell>)
}
