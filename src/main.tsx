import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './vendor/driftline/tokens.css'
import './vendor/driftline/driftline.css'
import './shell/shell.css'
import { App } from './App'

registerSW({ immediate: true })
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
