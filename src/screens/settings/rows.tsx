// Settings building blocks (S1): a titled group of quiet rows, a row that opens a page, and a segmented choice.
import { useState, type ReactNode } from 'react'
import { LayoutGroup, motion } from 'framer-motion'
import { useMoment } from '../../ui/useMotionOn'
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

type SegProps<T extends string> = { label: string; options: readonly { id: T; label: string }[]; value: T | null; onChange: (v: T) => void }
/** beta.9 moment "switch" (3c): the pill is one element that slides to the picked option, stretching on the way and
 * squashing as it lands; at rest it is the same pill as before. */
export function Segment<T extends string>({ label, options, value, onChange }: SegProps<T>) {
  const mk = useMoment('switch'); const [moved, setMoved] = useState(false) // squash only after a pick, not on first show
  return <div className="dl-row sow-set__row"><span aria-hidden>{label}</span><span className="sow-sp" /><LayoutGroup id={`seg-${label}`}><div className="dl-seg" role="group" aria-label={label}>{options.map((o) =>
    <button key={o.id} className={`dl-seg__item${o.id === value ? ' is-on' : ''}`} aria-pressed={o.id === value} onClick={() => { setMoved(true); onChange(o.id) }}>
      {o.id === value && (mk.on ? <motion.span layoutId="pill" className="dl-seg__pill" initial={moved ? undefined : false} animate={{ scaleY: [1, 0.9, 1.05, 1] }} transition={{ layout: mk.spring('snappy'), scaleY: mk.tween(0.36, { times: [0, 0.4, 0.75, 1] }) }} />
        : <span className="dl-seg__pill" />)}<span className="dl-seg__label">{o.label}</span></button>)}</div></LayoutGroup></div>
}

type ChoiceProps<T extends string> = { label: string; options: readonly { id: T; label: string; note?: string }[]; value: T; onChange: (v: T) => void }
/** A titled radio list (one quiet row per choice, ✓ on the chosen one) for a Settings page. */
export function Choices<T extends string>({ label, options, value, onChange }: ChoiceProps<T>) {
  return <section className="sow-set__group"><h2 className="dl-eyebrow sow-set__eyebrow">{label}</h2><div className="dl-list" role="radiogroup" aria-label={label}>{options.map((o) =>
    <button key={o.id} role="radio" aria-checked={value === o.id} aria-label={o.label} className="dl-row dl-row--btn sow-set__row" onClick={() => onChange(o.id)}>
      <span className="sow-set__txt"><span>{o.label}</span>{o.note && <small className="dl-muted">{o.note}</small>}</span><span className="sow-sp" />{value === o.id && <span className="sow-set__check" aria-hidden>✓</span>}</button>)}</div></section>
}
