import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }
// Stable = /sow-driftline/. Beta repo builds with DL_BASE=/sow-driftline-beta/ VITE_DL_FLAVOR=beta.
const BASE = process.env.DL_BASE || '/sow-driftline/'
const BETA = process.env.VITE_DL_FLAVOR === 'beta'

export default defineConfig({
  base: BASE,
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __APP_FLAVOR__: JSON.stringify(BETA ? 'beta' : 'stable') },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // F-SH-06: never reload mid-work (src/sync/updates.ts)
      injectRegister: false,
      includeAssets: ['favicon.svg', 'pwa-192.png', 'pwa-512.png'],
      manifest: {
        id: BASE, name: BETA ? 'SoW Driftline Beta' : 'SoW Driftline', short_name: BETA ? 'Driftline β' : 'Driftline',
        theme_color: '#070b16', background_color: '#070b16', display: 'standalone', start_url: BASE, scope: BASE,
        icons: [{ src: 'pwa-192.png', sizes: '192x192', type: 'image/png' }, { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' }],
      },
      // Own SW scope + cache prefix so /sow/ caches are never touched.
      workbox: { cacheId: BETA ? 'sow-driftline-beta' : 'sow-driftline', navigateFallback: `${BASE}index.html`, globPatterns: ['**/*.{js,css,html,svg,png}'], cleanupOutdatedCaches: true, clientsClaim: true },
    }),
  ],
})
