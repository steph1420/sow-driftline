// Settings › Display size (v0.8 P11): Standard | Compact, then fine-tune each part; changes apply live and stay on this device.
import { useApp } from '../../store/store'
import { SCALE_BOUNDS, SCALE_KEYS, SCALE_PRESETS, SCALE_STEP, percent, presetOf, type DisplayScale, type ScaleKey, type ScalePreset } from '../../shell/displayScale'
import { Group, Segment } from './rows'

const PRESETS: { id: ScalePreset; label: string }[] = [{ id: 'standard', label: 'Standard' }, { id: 'compact', label: 'Compact' }]
const LABELS: Record<ScaleKey, string> = { overall: 'Overall', text: 'Text', rows: 'Row spacing', ticks: 'Tickboxes', dates: 'Date headers', nav: 'Navigation' }

/** "Standard", "Compact" or "Custom" for the Settings row. */
export const displayName = (s: DisplayScale) => PRESETS.find((p) => p.id === presetOf(s))?.label ?? 'Custom'

export function DisplayPage() {
  const scale = useApp((s) => s.scale); const setScale = useApp((s) => s.setScale); const resetScale = useApp((s) => s.resetScale)
  return (<>
    <div className="dl-list"><Segment label="Size" options={PRESETS} value={presetOf(scale)} onChange={(p) => setScale(SCALE_PRESETS[p])} /></div>
    <Group title="Fine-tune">
      {SCALE_KEYS.map((k) => { const [min, max] = SCALE_BOUNDS[k]
        return <label key={k} className="dl-row sow-set__row sow-scale">
          <span className="sow-scale__label">{LABELS[k]}</span>
          <input type="range" className="sow-scale__range" aria-label={LABELS[k]} aria-valuetext={percent(scale[k])} min={min} max={max} step={SCALE_STEP} value={scale[k]}
            onChange={(e) => setScale({ [k]: Number(e.target.value) })} />
          <span className="sow-set__value sow-scale__value" aria-hidden>{percent(scale[k])}</span></label> })}
    </Group>
    <div className="dl-list"><button className="dl-row dl-row--btn sow-set__row sow-set__action" onClick={resetScale}>Reset to default</button></div>
    <p className="dl-muted sow-scale__note">Row spacing sets the gap around each tickbox, so smaller sizes stay easy to read. Taps keep a full-size target.</p>
  </>)
}
