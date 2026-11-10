// Dev sizer panel: grouped sliders on :root, Pick mode (tap the page to pick a group), saved to this device.
import { useEffect, useRef, useState } from 'react'
import { GROUPS, KEY, apply, beta3, defaults, groupOf, load, readout, summary, type Group, type Values } from './groups'

export function Sizer() {
  const [vals, setVals] = useState<Values>(() => load(localStorage))
  const [open, setOpen] = useState(false)
  const [group, setGroup] = useState<string>('all')
  const [picking, setPicking] = useState(false)
  const [lift, setLift] = useState(0) // px the panel is dragged up from the bottom
  const [copied, setCopied] = useState<'' | 'ok' | 'select'>('')
  const [full, setFull] = useState(false) // values line expanded
  const tabs = useRef<HTMLElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const drag = useRef<{ y: number; lift: number } | null>(null)
  const text = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { apply(vals, document.documentElement.style); localStorage.setItem(KEY, JSON.stringify(vals)) }, [vals])
  useEffect(() => { if (copied === 'select') text.current?.select() }, [copied])
  usePick(picking && open, (g) => setGroup(g.id))
  useEffect(() => { tabs.current?.querySelector('.is-on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); list.current?.scrollTo({ top: 0 }) }, [group, open])

  const line = summary(vals)
  const set = (v: Values) => { setVals(v); setCopied('') }
  const copy = async () => { try { await navigator.clipboard.writeText(line); setCopied('ok') } catch { setCopied('select') } }
  const move = (e: React.PointerEvent) => {
    if (!drag.current) return
    setLift(Math.max(0, Math.min(window.innerHeight * 0.6, drag.current.lift + drag.current.y - e.clientY)))
  }
  const shown = group === 'all' ? GROUPS : GROUPS.filter((x) => x.id === group)

  if (!open) return <Pill onOpen={() => setOpen(true)} />
  return (
    <>
      {picking && group !== 'all' && <Outline group={GROUPS.find((x) => x.id === group)!} vals={vals} />}
      <section className="szr" style={{ bottom: `${lift}px` }} aria-label="Sizer">
        <header className="szr__head" onPointerDown={(e) => { if ((e.target as Element).closest('button')) return; e.currentTarget.setPointerCapture?.(e.pointerId); drag.current = { y: e.clientY, lift } }}
          onPointerMove={move} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
          <i className="szr__grip" aria-hidden />
          <b>Sizer</b>
          <button type="button" className={picking ? 'is-on' : ''} aria-pressed={picking} onClick={() => setPicking((p) => !p)}>{picking ? 'Picking…' : 'Pick'}</button>
          <button type="button" onClick={copy}>{copied === 'ok' ? 'Copied' : 'Copy values'}</button>
          <button type="button" onClick={() => { setOpen(false); setPicking(false); setCopied('') }} aria-label="Collapse sizer">▾</button>
        </header>
        <nav ref={tabs} className="szr__tabs" aria-label="Sizer groups">
          {[{ id: 'all', label: 'All' }, ...GROUPS].map((x) => (
            <button key={x.id} type="button" className={group === x.id ? 'is-on' : ''} aria-pressed={group === x.id} onClick={() => setGroup(x.id)}>{x.label}</button>
          ))}
        </nav>
        {picking && <p className="szr__hint">Tap the page to pick a group (the app ignores taps).</p>}
        {copied === 'select' && <textarea ref={text} className="szr__copy" readOnly value={line} onFocus={(e) => e.currentTarget.select()} />}
        <div ref={list} className="szr__list">
          {shown.map((x) => (
            <div key={x.id} className="szr__grp">
              {group === 'all' && <small className="szr__group">{x.label}</small>}
              {x.sizes.map((s) => (
                <label key={s.key} className={`szr__row${vals[s.key] === s.beta ? '' : ' is-changed'}`}>
                  <span className="szr__name">{s.label}</span>
                  <input type="range" min={s.min} max={s.max} step={s.step ?? 1} value={vals[s.key]} aria-label={s.label}
                    onChange={(e) => set({ ...vals, [s.key]: Number(e.currentTarget.value) })} />
                  <output>{readout(s, vals[s.key]!)}</output>
                </label>
              ))}
            </div>
          ))}
        </div>
        <footer className="szr__foot">
          <p className={`szr__sum${full ? ' is-full' : ''}`} onClick={() => setFull((f) => !f)} title="Tap to show all">{line}</p>
          <button type="button" onClick={() => set(defaults())}>Reset</button>
          <button type="button" onClick={() => set(beta3())}>Reset to beta.3</button>
        </footer>
      </section>
    </>
  )
}

/** While on, taps outside the sizer pick a group and never reach the app (capture phase on window, before React's root). */
function usePick(on: boolean, onPick: (g: Group) => void) {
  const cb = useRef(onPick); cb.current = onPick
  useEffect(() => {
    if (!on) return
    const types = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click', 'dblclick', 'contextmenu'] as const
    const stop = (e: Event) => {
      const t = e.target as Element | null
      if (!t || t.closest('#sow-sizer')) return
      if (e.cancelable && e.type !== 'touchstart' && e.type !== 'touchend') e.preventDefault() // touches stay passive so the page still scrolls
      e.stopImmediatePropagation()
      if (e.type === 'pointerup') { const g = groupOf(t); if (g) cb.current(g) }
    }
    for (const ty of types) window.addEventListener(ty, stop, true)
    return () => { for (const ty of types) window.removeEventListener(ty, stop, true) }
  }, [on])
}

/** Soft outline around everything in the picked group (union of its elements on screen). */
function Outline({ group, vals }: { group: Group; vals: Values }) {
  const [box, setBox] = useState<DOMRect | null>(null)
  useEffect(() => {
    let raf = 0
    const measure = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const rs = [...document.querySelectorAll(group.outline)].map((el) => el.getBoundingClientRect()).filter((r) => r.width && r.height && r.bottom > 0 && r.top < window.innerHeight)
        if (!rs.length) return setBox(null)
        const l = Math.min(...rs.map((r) => r.left)); const t = Math.min(...rs.map((r) => r.top))
        setBox(new DOMRect(l, Math.max(0, t), Math.max(...rs.map((r) => r.right)) - l, Math.min(window.innerHeight, Math.max(...rs.map((r) => r.bottom))) - Math.max(0, t)))
      })
    }
    measure(); window.addEventListener('scroll', measure, true); window.addEventListener('resize', measure)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', measure, true); window.removeEventListener('resize', measure) }
  }, [group, vals])
  if (!box) return null
  return <div className="szr-outline" aria-hidden style={{ left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` }} />
}

/** Collapsed pill: tap opens; drag moves it anywhere (position saved) so it never sits on what you're sizing. */
function Pill({ onOpen }: { onOpen: () => void }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => { try { return JSON.parse(localStorage.getItem(`${KEY}:pill`) || localStorage.getItem('sow-driftline-sizer:v1:pill') || 'null') } catch { return null } })
  const drag = useRef<{ sx: number; sy: number; x: number; y: number; moved: boolean } | null>(null)
  const style = pos ? { left: `${pos.x}px`, top: `${pos.y}px`, bottom: 'auto' } : undefined
  return (
    <button type="button" className="szr-pill" style={style} aria-label="Open sizer"
      onPointerDown={(e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.setPointerCapture?.(e.pointerId); drag.current = { sx: e.clientX, sy: e.clientY, x: r.left, y: r.top, moved: false } }}
      onPointerMove={(e) => {
        const d = drag.current; if (!d) return
        const dx = e.clientX - d.sx; const dy = e.clientY - d.sy
        if (!d.moved && Math.hypot(dx, dy) < 6) return
        d.moved = true; setPos({ x: Math.max(0, Math.min(window.innerWidth - 40, d.x + dx)), y: Math.max(0, Math.min(window.innerHeight - 40, d.y + dy)) })
      }}
      onPointerUp={() => { const d = drag.current; drag.current = null; if (d?.moved) { if (pos) localStorage.setItem(`${KEY}:pill`, JSON.stringify(pos)) } else onOpen() }}
      onClick={(e) => { if (e.detail === 0) onOpen() /* keyboard */ }} onPointerCancel={() => { drag.current = null }}>⇲ Sizer</button>
  )
}
