import { useEffect } from 'react'
import { useApp } from './store/store'
import { Bar } from './shell/Bar'
import { Dock } from './shell/Dock'
import { ChecklistEmpty, Placeholder } from './screens/Screens'

declare const __APP_VERSION__: string
declare const __APP_FLAVOR__: string
const VERSION = typeof __APP_VERSION__ === 'undefined' ? 'test' : __APP_VERSION__
const FLAVOR = typeof __APP_FLAVOR__ === 'undefined' ? 'stable' : __APP_FLAVOR__

export function App() {
  const tab = useApp((s) => s.tab); const side = useApp((s) => s.side)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: light)')
    const apply = () => { document.documentElement.dataset.theme = `utopian-${side === 'system' ? (mq?.matches ? 'day' : 'night') : side}` }
    apply(); mq?.addEventListener?.('change', apply); return () => mq?.removeEventListener?.('change', apply)
  }, [side])
  return (
    <>
      <Bar />
      <main className="sow-main">
        {tab === 'checklist' && <ChecklistEmpty />}
        {tab === 'overview' && <Placeholder title="Overview" />}
        {tab === 'more' && <Placeholder title="More" />}
        <p className="sow-foot">Driftline · {FLAVOR === 'beta' ? 'Beta' : 'Stable'} · v{VERSION} · demo data</p>
      </main>
      <Dock />
    </>
  )
}
