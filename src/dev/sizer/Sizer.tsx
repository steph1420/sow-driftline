// Dev sizer panel: sliders for the named layout sizes, live on :root, saved to this device.
import { useEffect, useRef, useState } from 'react'
import { KEY, SIZES, apply, defaults, load, summary, type Values } from './sizes'

export function Sizer() {
  const [vals, setVals] = useState<Values>(() => load(localStorage.getItem(KEY)))
  const [open, setOpen] = useState(false)
  const [lift, setLift] = useState(0) // px the panel is dragged up from the bottom
  const [copied, setCopied] = useState<'' | 'ok' | 'select'>('')
  const drag = useRef<{ y: number; lift: number } | null>(null)
  const text = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { apply(vals, document.documentElement.style); localStorage.setItem(KEY, JSON.stringify(vals)) }, [vals])
  useEffect(() => { if (copied === 'select') text.current?.select() }, [copied])

  const line = summary(vals)
  const copy = async () => {
    try { await navigator.clipboard.writeText(line); setCopied('ok') } catch { setCopied('select') }
  }
  const move = (e: React.PointerEvent) => {
    if (!drag.current) return
    setLift(Math.max(0, Math.min(window.innerHeight * 0.6, drag.current.lift + drag.current.y - e.clientY)))
  }

  if (!open) return <button type="button" className="szr-pill" onClick={() => setOpen(true)} aria-label="Open sizer">⇲ Sizer</button>
  return (
    <section className="szr" style={{ bottom: `${lift}px` }} aria-label="Sizer">
      <header className="szr__head" onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); drag.current = { y: e.clientY, lift } }}
        onPointerMove={move} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
        <i className="szr__grip" aria-hidden />
        <b>Sizer</b>
        <button type="button" onClick={() => setVals(defaults())}>Reset</button>
        <button type="button" onClick={copy}>{copied === 'ok' ? 'Copied' : 'Copy values'}</button>
        <button type="button" onClick={() => { setOpen(false); setCopied('') }} aria-label="Collapse sizer">▾</button>
      </header>
      {copied === 'select' && <textarea ref={text} className="szr__copy" readOnly value={line} onFocus={(e) => e.currentTarget.select()} />}
      <div className="szr__list">
        {SIZES.map((s, i) => (
          <label key={s.key} className={`szr__row${vals[s.key] === s.def ? '' : ' is-changed'}`}>
            {(i === 0 || SIZES[i - 1]!.group !== s.group) && <small className="szr__group">{s.group}</small>}
            <span className="szr__name">{s.label}</span>
            <input type="range" min={s.min} max={s.max} step={s.step ?? 1} value={vals[s.key]} aria-label={s.label}
              onChange={(e) => { const n = Number(e.currentTarget.value); setVals((v) => ({ ...v, [s.key]: n })); setCopied('') }} />
            <output>{vals[s.key]}px</output>
          </label>
        ))}
      </div>
      <p className="szr__sum">{line}</p>
    </section>
  )
}
