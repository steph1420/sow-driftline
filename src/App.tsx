import { useEffect, useState } from 'react'
import { sheetLabel, useApp } from './store/store'
import { Bar } from './shell/Bar'
import { Dock } from './shell/Dock'
import { Placeholder } from './screens/Screens'
import { Checklist } from './screens/Checklist'
import { More } from './screens/More'
import { todayIso } from './data/today'
import { CONFIG } from './config'
import { isMod, isTypingTarget } from './screens/keyboard'

declare const __APP_VERSION__: string
declare const __APP_FLAVOR__: string
const VERSION = typeof __APP_VERSION__ === 'undefined' ? 'test' : __APP_VERSION__
const FLAVOR = typeof __APP_FLAVOR__ === 'undefined' ? 'stable' : __APP_FLAVOR__

export const saveText = (s: string, n: number) => ({ saved: 'all saved', saving: 'saving…', offline: `offline · ${n} waiting`, error: `not saved yet · ${n} waiting`, demo: 'on this device' } as Record<string, string>)[s] ?? ''
export function App() {
  const tab = useApp((s) => s.tab); const side = useApp((s) => s.side)
  const data = useApp((s) => s.data); const cls = useApp((s) => s.currentClass); const jump = useApp((s) => s.jump); const source = useApp((s) => s.source); const tick = useApp((s) => s.tick); const dev = useApp((s) => s.dev); const save = useApp((s) => s.save); const waiting = useApp((s) => s.waiting)
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= CONFIG.layout.desktopMinWidthPx)
  useEffect(() => { void useApp.getState().refresh(); const r = () => setWide(window.innerWidth >= CONFIG.layout.desktopMinWidthPx); window.addEventListener('resize', r); return () => window.removeEventListener('resize', r) }, [])
  useEffect(() => { // Ctrl/Cmd+Z undo · Ctrl+Y or Ctrl/Cmd+Shift+Z redo (as /sow/)
    const k = (e: KeyboardEvent) => { if (!isMod(e) || isTypingTarget(e.target as Element)) return; const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) { e.preventDefault(); useApp.getState().undo() } else if (key === 'y' || (key === 'z' && e.shiftKey)) { e.preventDefault(); useApp.getState().redo() } }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [])
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: light)')
    const apply = () => { document.documentElement.dataset.theme = `utopian-${side === 'system' ? (mq?.matches ? 'day' : 'night') : side}` }
    apply(); mq?.addEventListener?.('change', apply); return () => mq?.removeEventListener?.('change', apply)
  }, [side])
  return (
    <>
      <Bar />
      <main className="sow-main">
        {tab === 'checklist' && <Checklist state={data} classKey={cls} today={todayIso()} layout={wide ? 'desktop' : 'phone'} jump={jump} onTick={tick} onTickMany={useApp.getState().tickMany} swipe={dev.swipeTick} railSide={dev.railSide} railBubble={dev.railBubble} onRailSide={(railSide) => useApp.getState().setDev({ railSide })} />}
        {tab === 'overview' && <Placeholder title="Overview" />}
        {tab === 'more' && <More />}
        <p className="sow-foot">Driftline · {FLAVOR === 'beta' ? 'Beta' : 'Stable'} · v{VERSION} · {source === 'copy' ? `${sheetLabel()} · ${saveText(save, waiting)}` : 'demo data · saved on this device'}</p>
      </main>
      <Dock />
    </>
  )
}
