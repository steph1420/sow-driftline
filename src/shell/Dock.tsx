import { motion, useReducedMotion } from 'framer-motion'
import { useApp, type Tab } from '../store/store'
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'checklist', label: 'Checklist', icon: '✓' }, { id: 'overview', label: 'Overview', icon: '◎' }, { id: 'more', label: 'More', icon: '⋯' },
]
export function Dock() {
  const tab = useApp((s) => s.tab); const setTab = useApp((s) => s.setTab); const reduce = useReducedMotion()
  return (
    <nav className="dl-dock" role="tablist" aria-label="Sections">
      {TABS.map((t) => (
        <button key={t.id} role="tab" aria-label={t.label} aria-selected={tab === t.id} className={`dl-dock__tab ${tab === t.id ? 'is-on' : ''}`} onClick={() => setTab(t.id)}>
          {tab === t.id && <motion.span layoutId="dock-pill" className="dl-dock__pill" transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }} />}
          <span className="dl-dock__icon" aria-hidden>{t.icon}</span>{t.label}
        </button>
      ))}
    </nav>
  )
}
