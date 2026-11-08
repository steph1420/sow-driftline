// F-TP-03: large free-text editor. A mirror under the transparent textarea paints the tokens:
// known blue, submitted family purple, unknown amber with a wavy line.
import type { RefObject } from 'react'
import { splitTokens } from '../../data/templates'

type Props = { value: string; onChange: (v: string) => void; inputRef: RefObject<HTMLTextAreaElement | null> }

export function TokenEditor({ value, onChange, inputRef }: Props) {
  return (
    <div className="sow-tpl__editor">
      <div className="sow-tpl__mirror" aria-hidden>{splitTokens(value).map((p, i) => p.kind ? <mark key={i} className={`sow-tok ${p.kind}`}>{p.text}</mark> : <span key={i}>{p.text}</span>)}{'\n'}</div>
      <textarea ref={inputRef} className="sow-tpl__input" aria-label="Template text" value={value} spellCheck={false} onChange={(e) => onChange(e.target.value)} />
    </div>)
}
