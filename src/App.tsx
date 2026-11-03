import { useEffect, useState } from 'react'
import { useApp } from './store/store'
import { Bar } from './shell/Bar'
import { Dock } from './shell/Dock'
import { Placeholder } from './screens/Screens'
import { Checklist } from './screens/Checklist'
import { More } from './screens/More'
import { todayIso } from './data/today'
import { CONFIG } from './config'

declare const __APP_VERSION__: string
declare const __APP_FLAVOR__: string
const VERSION = typeof __APP_VERSION__ === 'undefined' ? 'test' : __APP_VERSION__
const FLAVOR = typeof __APP_FLAVOR__ === 'undefined' ? 'stable' : __APP_FLAVOR__

export function App() {
  const tab = useApp((s) => s.tab); const side = useApp((s) => s.side)
  const data = useApp((s) => s.data); const cls = useApp((s) => s.currentClass); const jump = useApp((s) => s.jump); const source = useApp((s) => s.source)
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= CONFIG.layout.desktopMinWidthPx)
  useEffect(() => { void useApp.getState().refresh(); const r = () => setWide(window.innerWidth >= CONFIG.layout.desktopMinWidthPx); window.addEventListener('resize', r); return () => window.removeEventListener('resize', r) }, [])
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: light)')
    const apply = () => { document.documentElement.dataset.theme = `utopian-${side === 'system' ? (mq?.matches ? 'day' : 'night') : side}` }
    apply(); mq?.addEventListener?.('change', apply); return () => mq?.removeEventListener?.('change', apply)
  }, [side])
  return (
    <>
      <Bar />
      <main className="sow-main">
        {tab === 'checklist' && <Checklist state={data} classKey={cls} today={todayIso()} layout={wide ? 'desktop' : 'phone'} jump={jump} />}
        {tab === 'overview' && <Placeholder title="Overview" />}
        {tab === 'more' && <More />}
        <p className="sow-foot">Driftline · {FLAVOR === 'beta' ? 'Beta' : 'Stable'} · v{VERSION} · {source === 'copy' ? 'test copy · read only' : 'demo data'}</p>
      </main>
      <Dock />
    </>
  )
}
