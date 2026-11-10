// Floating dock. t146u: the Checklist tab is also the Quick overview handle: a swipe up that starts on it pulls the
// sheet up under the finger; release past the threshold (or a quick flick) opens it, otherwise it snaps back.
// A tap is still a plain tab tap.
import { useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { SHIFT, SPRING } from '../config/motion'
import { useApp, type Tab } from '../store/store'
import { CONFIG } from '../config'
import { pullOpens } from '../data/gestures'
import { GLYPH } from '../ui/icons'
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: GLYPH.overview }, { id: 'checklist', label: 'Checklist', icon: GLYPH.tick }, { id: 'settings', label: 'Settings', icon: GLYPH.settings },
]

/** Pointer handlers for the Checklist tab's pull up. `eat` swallows the click that ends a pull. */
function usePullUp() {
  const p = useRef<{ y0: number; y: number; t: number; vy: number; on: boolean } | null>(null); const eat = useRef(false)
  const handlers = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => { if (e.button > 0) return; eat.current = false; p.current = { y0: e.clientY, y: e.clientY, t: e.timeStamp, vy: 0, on: false } },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const s = p.current; if (!s) return; const dy = e.clientY - s.y0
      if (!s.on) { if (-dy < CONFIG.timing.swipeEngagePx) return; s.on = true; e.currentTarget.setPointerCapture?.(e.pointerId); if (useApp.getState().tab !== 'checklist') useApp.getState().setTab('checklist') }
      const dt = e.timeStamp - s.t; if (dt > 0) s.vy = (e.clientY - s.y) / dt; s.y = e.clientY; s.t = e.timeStamp
      useApp.getState().setQuickPull(-dy)
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => { const s = p.current; p.current = null; if (!s?.on) return; eat.current = true
      const st = useApp.getState(); if (pullOpens(e.clientY - s.y0, s.vy)) st.setQuick(true); else st.setQuickPull(0) },
    onPointerCancel: () => { if (p.current?.on) useApp.getState().setQuickPull(0); p.current = null },
  }
  return { handlers, eat }
}

export function Dock() {
  const tab = useApp((s) => s.tab); const setTab = useApp((s) => s.setTab); const reduce = useReducedMotion(); const pull = usePullUp()
  return (
    <motion.nav className="dl-dock" role="tablist" aria-label="Sections" initial={reduce ? false : { y: SHIFT.dock, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...SPRING.settle, delay: 0.12 }}>
      {TABS.map((t) => { const handle = t.id === 'checklist'
        return <button key={t.id} role="tab" aria-label={t.label} aria-selected={tab === t.id} className={`dl-dock__tab ${tab === t.id ? 'is-on' : ''}${handle ? ' sow-pull' : ''}`}
          aria-description={handle ? 'Swipe up for Quick overview' : undefined} {...(handle ? pull.handlers : undefined)}
          onClick={() => { if (handle && pull.eat.current) { pull.eat.current = false; return } setTab(t.id) }}>
          {tab === t.id && <motion.span layoutId="dock-pill" className="dl-dock__pill" transition={reduce ? { duration: 0 } : SPRING.snappy} />}
          <motion.span key={tab === t.id ? 'on' : 'off'} className="dl-dock__icon" aria-hidden initial={reduce || tab !== t.id ? false : { scale: 0.6, y: 3 }} animate={{ scale: 1, y: 0 }} transition={SPRING.pop}>{t.icon}</motion.span>{t.label}
        </button> })}
    </motion.nav>
  )
}
