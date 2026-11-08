import { useEffect, useState } from 'react'
import { sheetLabel, useApp } from './store/store'
import { Bar } from './shell/Bar'
import { Dock } from './shell/Dock'
import { PastPill } from './shell/PastPill'
import { Overview } from './screens/Overview'
import { QuickOverview } from './screens/QuickOverview'
import { dateColsFor } from './data/model'
import { Checklist } from './screens/Checklist'
import { Settings } from './screens/settings/Settings'
import { todayIso } from './data/today'
import { APP_VERSION, CONFIG, FLAVOR_LABEL } from './config'
import { themeFor } from './shell/theme'
import { isMod, isTypingTarget } from './screens/keyboard'

export function App() {
  const tab = useApp((s) => s.tab); const side = useApp((s) => s.side); const contrast = useApp((s) => s.contrast)
  const data = useApp((s) => s.data); const cls = useApp((s) => s.currentClass); const jump = useApp((s) => s.jump); const source = useApp((s) => s.source); const tick = useApp((s) => s.tick); const dev = useApp((s) => s.dev); const view = useApp((s) => s.view); const focus = useApp((s) => s.focus); const subject = useApp((s) => s.subject); const pending = useApp((s) => s.pending); const viewOnly = useApp((s) => s.viewing !== null)
  const [land, setLand] = useState(() => typeof window !== 'undefined' && window.innerWidth > window.innerHeight)
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= CONFIG.layout.desktopMinWidthPx)
  useEffect(() => { void useApp.getState().refresh(); const r = () => { setWide(window.innerWidth >= CONFIG.layout.desktopMinWidthPx); setLand(window.innerWidth > window.innerHeight) }; window.addEventListener('resize', r); return () => window.removeEventListener('resize', r) }, [])
  useEffect(() => { // Ctrl/Cmd+Z undo · Ctrl+Y or Ctrl/Cmd+Shift+Z redo (as /sow/)
    const k = (e: KeyboardEvent) => { if (!isMod(e) && e.shiftKey && e.key === 'O' && !isTypingTarget(e.target as Element) && useApp.getState().tab === 'checklist') { e.preventDefault(); useApp.getState().setQuick(true); return }
      if (!isMod(e) || isTypingTarget(e.target as Element)) return; const key = e.key.toLowerCase()
      void key; if (key === 'z' && !e.shiftKey) { e.preventDefault(); useApp.getState().undo() } else if (key === 'y' || (key === 'z' && e.shiftKey)) { e.preventDefault(); useApp.getState().redo() } }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [])
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: light)')
    const apply = () => { document.documentElement.dataset.theme = themeFor(side, contrast, !!mq?.matches) }
    apply(); mq?.addEventListener?.('change', apply); return () => mq?.removeEventListener?.('change', apply)
  }, [side, contrast])
  const layout = wide ? 'desktop' : 'phone'; const dateCols = dateColsFor({ layout, landscape: land, weeks: view.weeks, phoneCols: view.phoneCols })
  return (
    <>
      {tab === 'checklist' && <Bar />}{/* the class bar belongs to Checklist only (v0.7j Overview, v0.8 S1 Settings) */}
      <main className="sow-main">
        {tab === 'checklist' && <Checklist state={data} classKey={cls} subjectKey={subject} pendingOnly={pending} onPick={useApp.getState().pickSession} onQuick={() => useApp.getState().setQuick(true)} today={todayIso()} layout={layout} jump={jump} focusSessionId={focus} onTick={viewOnly ? undefined : tick} onTickMany={viewOnly ? undefined : useApp.getState().tickMany} swipe={dev.swipeTick} dateCols={dateCols} railSide={dev.railSide} railBubble={dev.railBubble} onRailSide={(railSide) => useApp.getState().setDev({ railSide })} />}
        {tab === 'overview' && <Overview />}
        {tab === 'settings' && <Settings />}
        <p className="sow-foot">Driftline · {FLAVOR_LABEL} · v{APP_VERSION} · {source === 'copy' ? sheetLabel() : 'demo data'}</p>
      </main>
      {tab === 'checklist' && <QuickOverview layout={layout} dateCols={dateCols} />}
      {tab !== 'settings' && <PastPill />}
      <Dock />
    </>
  )
}
