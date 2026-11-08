// v0.8 F-SH-06: check for a new version when the app comes back into view; never reload in the middle of work.
// An update found before the first tap or key (a fresh open) applies straight away; after that it only raises the
// quiet dot in Settings › Updates and waits for "Restart to update" (or the next open).
type Registration = { update: () => Promise<unknown> }
type Hooks = { onNeedRefresh?: () => void; onRegisteredSW?: (url: string, r: Registration | undefined) => void }
export type Register = (hooks: Hooks) => (reload?: boolean) => Promise<void>
type Opts = { register: Register; onReady: () => void; onChecked?: (atMs: number) => void; target?: EventTarget; visible?: () => boolean }

export function startUpdates({ register, onReady, onChecked, target = document, visible = () => !document.hidden }: Opts) {
  let working = false; let reg: Registration | undefined
  const check = () => { void reg?.update(); onChecked?.(Date.now()) }
  const reload = register({
    onRegisteredSW: (_url, r) => { reg = r },
    onNeedRefresh: () => { if (working) onReady(); else void reload(true) },
  })
  const startWork = () => { working = true }
  target.addEventListener('pointerdown', startWork, { once: true, capture: true }); target.addEventListener('keydown', startWork, { once: true, capture: true })
  target.addEventListener('visibilitychange', () => { if (visible()) check() })
  return { apply: () => void reload(true), check }
}
