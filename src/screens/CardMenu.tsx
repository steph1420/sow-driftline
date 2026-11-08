// v0.8 F-OV-06 (O2g-hold): the press-and-hold menu under a lifted card; the rest of the page blurs.
import { useEffect } from 'react'
import { Icon, type IconName } from '../ui/icons'

export type CardAction = 'share' | 'all' | 'add' | 'reschedule'
const ITEMS: { id: CardAction; label: string; icon: IconName }[] = [
  { id: 'share', label: 'Share', icon: 'share' }, { id: 'all', label: 'All dates', icon: 'list' },
  { id: 'add', label: 'Add date', icon: 'calendarPlus' }, { id: 'reschedule', label: 'Reschedule', icon: 'reschedule' },
]
type Props = { name: string; anchor: DOMRect; canReschedule: boolean; onPick: (a: CardAction) => void; onClose: () => void }

export function CardMenu({ name, anchor, canReschedule, onPick, onClose }: Props) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k) }, [onClose])
  const below = anchor.bottom < window.innerHeight * 0.6 // room under the card, else open above it
  const place = below ? { top: anchor.bottom, right: window.innerWidth - anchor.right } : { bottom: window.innerHeight - anchor.top, right: window.innerWidth - anchor.right }
  return (<>
    <button className="sow-scrim sow-scrim--blur" aria-label="Close menu" onClick={onClose} />
    <div className={`dl-card sow-cardmenu${below ? '' : ' up'}`} role="menu" aria-label={name} style={place}>
      {ITEMS.filter((x) => x.id !== 'reschedule' || canReschedule).map((x) =>
        <button key={x.id} role="menuitem" className="dl-row dl-row--btn" onClick={() => onPick(x.id)}><span>{x.label}</span><span className="sow-sp" /><Icon name={x.icon} /></button>)}
    </div></>)
}
