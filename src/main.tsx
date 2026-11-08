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
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
