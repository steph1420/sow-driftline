import { GLYPH, Icon } from '../ui/icons'

/** v0.8 F-CL-06 (G4c-v2-search-open): thin name search under the controls; ranks and jumps, never hides rows. */
type Props = { value: string; matches: number; total: number; onChange: (q: string) => void; onClose: () => void }

export function SearchRow({ value, matches, total, onChange, onClose }: Props) {
  return (
    <div className="sow-find" role="search">
      <Icon name="magnifier" />
      <input type="search" autoFocus aria-label="Find a name" value={value} placeholder="Name, initials or roll"
        onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); onClose() } }} />
      {value.trim() && <span className="sow-find__n dl-num">{matches} of {total}</span>}
      <button className="sow-ib sow-bare" aria-label="Close search" onClick={onClose}>{GLYPH.close}</button>
    </div>
  )
}
