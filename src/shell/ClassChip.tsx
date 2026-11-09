// RDs2 class chip (top bar, left): '≡ KG-A · English HW ⌄' with scope dots. Tap = Classes panel, hold = favourites,
// swipe left / right = next / previous subject in the panel's pick (loops only when the panel's loop is on).
import { useApp } from '../store/store'
import { Icon, GLYPH } from '../ui/icons'
import { usePress } from '../ui/usePress'
import { swipeDir } from '../data/gestures'
import { scopeDots } from '../data/scope'
import { yearById } from '../data/schoolYear'
import { buzz } from './haptics'

type Props = { open: boolean; scope: { count: number; index: number }; onTap: () => void; onHold: () => void }

export function ClassChip({ open, scope, onTap, onHold }: Props) {
  const cls = useApp((s) => s.currentClass); const subjectKey = useApp((s) => s.subject); const subjects = useApp((s) => s.data.subjects)
  const classes = useApp((s) => s.classes); const viewing = useApp((s) => s.viewing)
  const label = classes.find((c) => c.classKey === cls)?.label ?? '—'
  const sub = subjects.find((x) => x.subjectKey === subjectKey); const line = [sub?.subject, sub?.kind].filter(Boolean).join(' ')
  const press = usePress({ onTap, onHold: () => { buzz(useApp.getState().haptics); onHold() },
    onRelease: ({ dx, dy, moved }) => { const d = moved ? swipeDir(dx, dy) : null; if (d && useApp.getState().stepSubject(d === 'left' ? 1 : -1)) buzz(useApp.getState().haptics) } })
  const dots = scopeDots(scope.count, scope.index)
  return (
    <button className={`sow-cs${open ? ' is-open' : ''}`} aria-expanded={open} aria-haspopup="dialog"
      aria-label={`Switch class, ${label} ${line}${viewing ? `, ${yearById(viewing).label}` : ''}`} aria-description="Tap for classes, hold for favourites, swipe sideways for the next subject" {...press}>
      <span className="sow-cs__icon" aria-hidden><Icon name="lines" /></span>
      <span className="sow-cs__label"><b>{label}</b><span className="sow-cs__sep" aria-hidden>·</span><span className="sow-cs__subj">{line}</span>
        {viewing && <span className="sow-cs__year">{yearById(viewing).label}</span>}</span>
      <span className="sow-cs__chev" aria-hidden>{open ? GLYPH.up : GLYPH.down}</span>
      {dots.count > 0 && <span className="sow-cs__dots" aria-hidden>{Array.from({ length: dots.count }, (_, i) => <i key={i} className={i === dots.on ? 'on' : undefined} />)}</span>}
    </button>)
}
