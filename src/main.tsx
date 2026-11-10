import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './vendor/driftline/tokens.css'
import './vendor/driftline/driftline.css'
import './shell/shell.css'
import { App } from './App'
import { useApp } from './store/store'
import { startUpdates } from './sync/updates'

const { setUpdate } = useApp.getState()
const updates = startUpdates({ register: (hooks) => registerSW({ immediate: true, ...hooks }), onReady: () => setUpdate({ ready: true }), onChecked: (checkedAt) => setUpdate({ checkedAt }) })
setUpdate({ apply: updates.apply })
const render = () => createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
// Dev sizer build only: the only hook into src/dev/sizer. Folded away (and the chunk never emitted) when VITE_DL_SIZER is unset.
if (import.meta.env.VITE_DL_SIZER === '1') void import('./dev/sizer').then((m) => { m.install(); render() })
else render()
