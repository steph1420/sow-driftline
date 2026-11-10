// RDs2 shortcuts button (replaces the ⋮ menu; there is no 3-dot menu). A plus that turns 45° into ✕.
// Tap: the circles slide straight down under it and stay until ✕ or a tap outside. Hold (100 ms), slide onto a circle and
// release: that one toggles and the circles hide. Pending only (amber) · 1/2 columns (blue, badge = columns now) · Search.
import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { STAGGER } from '../config/motion'
import { useMotion } from '../ui/useMotionOn'
import { useApp } from '../store/store'
import { hitIndex } from '../data/gestures'
import { CONFIG } from '../config'
import { Icon, type IconName } from '../ui/icons'
import { usePress } from '../ui/usePress'
import { buzz } from './haptics'

type Mode = 'tap' | 'hold' | null
type Circle = { id: 'pending' | 'cols' | 'search'; tone: 'warn' | 'accent' | 'plain'; icon: IconName; label: string; on: boolean; badge?: number }

export function Shortcuts({ columns, onOpen }: { columns: boolean; onOpen: () => void }) {
  const pending = useApp((s) => s.pending); const cols = useApp((s) => s.view.phoneCols); const find = useApp((s) => s.find); const mk = useMotion(); const reduce = !mk.on
  const [mode, setMode] = useState<Mode>(null); const [hot, setHot] = useState(-1); const refs = useRef<(HTMLButtonElement | null)[]>([])
  const list: Circle[] = [
    { id: 'pending', tone: 'warn', icon: 'pending', label: 'Pending only', on: pending },
    ...(columns ? [{ id: 'cols', tone: 'accent', icon: cols === 2 ? 'col1' : 'cols', label: cols === 2 ? 'Switch to 1 column' : 'Switch to 2 columns', on: cols === 2, badge: cols } as Circle] : []),
    { id: 'search', tone: 'plain', icon: 'magnifier', label: 'Search names', on: find != null }]
  const close = () => { setMode(null); setHot(-1) }
  const run = (c: Circle) => { const s = useApp.getState(); buzz(s.haptics)
    if (c.id === 'pending') s.setPending(!s.pending)
    else if (c.id === 'cols') s.setView({ phoneCols: s.view.phoneCols === 2 ? 1 : 2 })
    else { s.setFind(s.find == null ? '' : null); close() } }
  const under = (x: number, y: number) => hitIndex(refs.current.map((r) => r?.getBoundingClientRect() ?? { left: 0, right: -1, top: 0, bottom: -1 }), x, y)
  const press = usePress({ holdMs: CONFIG.timing.shortcutHoldMs, // t145u: 100 ms here; the chip and Undo keep pressMs
    onTap: () => { if (mode) close(); else { onOpen(); setMode('tap') } },
    onHold: () => { onOpen(); buzz(useApp.getState().haptics); setMode('hold') },
    onDrag: ({ x, y }) => { if (mode !== 'hold') return; const i = under(x, y); if (i !== hot) { setHot(i); if (i >= 0) buzz(useApp.getState().haptics) } },
    onRelease: ({ x, y }) => { if (mode !== 'hold') return; const i = under(x, y); close(); if (i >= 0) run(list[i]!) },
    onCancel: close,
  })
  const open = mode != null
  return (<>
    {mode === 'tap' && <button className="sow-scrim sow-scrim--clear" aria-label="Close shortcuts" onClick={close} />}
    <button className={`sow-ib sow-plus${open ? ' is-open' : ''}`} aria-expanded={open} aria-label="Shortcuts" aria-description="Tap to open; hold and slide onto one to pick it" {...press}>
      <motion.span className="sow-plus__icon" initial={false} animate={{ rotate: open ? 45 : 0 }} transition={mk.spring('plus')}><Icon name="plus" /></motion.span>
    </button>
    {open && <div className="sow-scs" role="group" aria-label="Shortcuts">{list.map((c, i) =>
      <motion.div key={c.id} className="sow-scs__slot" initial={reduce ? false : { opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={mk.spring('snappy', i * STAGGER.shortcuts)}>
        {hot === i && <span className="sow-scs__label" aria-hidden>{c.label}</span>}
        <button ref={(el) => { refs.current[i] = el }} className={`sow-sc sow-sc--${c.tone}${c.on ? ' is-on' : ''}${hot === i ? ' is-hot' : ''}`} aria-label={c.label} aria-pressed={c.id === 'search' ? undefined : c.on}
          onPointerEnter={() => { if (mode === 'tap') setHot(i) }} onPointerLeave={() => { if (mode === 'tap') setHot(-1) }} onFocus={() => setHot(i)} onBlur={() => setHot(-1)}
          onClick={() => run(c)}><Icon name={c.icon} />{c.badge != null && <i className="sow-sc__badge">{c.badge}</i>}</button>
      </motion.div>)}</div>}
  </>)
}
