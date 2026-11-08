// Full-screen page header (All dates, Settings pages, Share templates): ‹ back, title with an optional sub line, actions.
import type { ReactNode } from 'react'
import { GLYPH } from './icons'

type Props = { title: string; sub?: string; backLabel: string; onBack: () => void; children?: ReactNode }

export function PageHead({ title, sub, backLabel, onBack, children }: Props) {
  return (
    <header className="sow-page__head">
      <button className="sow-ib sow-bare sow-page__back" aria-label={backLabel} onClick={onBack}>{GLYPH.back}</button>
      <div className="sow-page__titles"><h1 className="sow-page__title">{title}</h1>{sub && <span className="sow-page__sub">{sub}</span>}</div>
      {children}
    </header>)
}
