// RDs2 Settings › Haptics: one place for every buzz. Off | Light | Normal | Strong (saved with the other prefs).
export type Haptics = 'off' | 'light' | 'normal' | 'strong'
export const HAPTICS: readonly { id: Haptics; label: string }[] = [{ id: 'off', label: 'Off' }, { id: 'light', label: 'Light' }, { id: 'normal', label: 'Normal' }, { id: 'strong', label: 'Strong' }]
const MS: Record<Haptics, number> = { off: 0, light: 4, normal: 8, strong: 16 }
export const cleanHaptics = (v: unknown): Haptics => (HAPTICS.some((h) => h.id === v) ? (v as Haptics) : 'normal')
/** A tick (scrubbing, a hold that lands) at the chosen strength; nothing when Off or unsupported. */
export function buzz(level: Haptics) { const ms = MS[level]; if (ms) navigator.vibrate?.(ms) }
