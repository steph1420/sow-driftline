// Settings building blocks (S1): a titled group of quiet rows, a row that opens a page, and a segmented choice.
import type { ReactNode } from 'react'
import { GLYPH } from '../../ui/icons'

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return <section className="sow-set__group" role="group" aria-label={title}><h2 className="dl-eyebrow sow-set__eyebrow">{title}</h2><div className="dl-list">{children}</div></section>
}

type NavProps = { label: string; value?: string; dot?: { tone: string; label: string }; onClick: () => void }
/** Value text, or a quiet status dot (Sync, Updates), then ›. The accessible name carries what the dot means. */
export function NavRow({ label, value, dot, onClick }: NavProps) {
  const said = [label, value ?? dot?.label].filter(Boolean).join(', ')
  return (
    <button className="dl-row dl-row--btn sow-set__row" aria-label={said} onClick={onClick}>
      <span>{label}</span><span className="sow-sp" />
      {value && <span className="sow-set__value">{value}</span>}
      {dot && <span className={`sow-dot ${dot.tone}`} aria-hidden />}
      <span className="sow-set__chev" aria-hidden>{GLYPH.next}</span>
    </button>)
}

type SegProps<T extends string> = { label: string; options: readonly { id: T; label: string }[]; value: T; onChange: (v: T) => void }
export function Segment<T extends string>({ label, options, value, onChange }: SegProps<T>) {
  return <div className="dl-row sow-set__row"><span aria-hidden>{label}</span><span className="sow-sp" /><div className="dl-seg" role="group" aria-label={label}>{options.map((o) =>
    <button key={o.id} className={`dl-seg__item${o.id === value ? ' is-on' : ''}`} aria-pressed={o.id === value} onClick={() => onChange(o.id)}>
      {o.id === value && <span className="dl-seg__pill" />}<span className="dl-seg__label">{o.label}</span></button>)}</div></div>
}
