// v0.8 F-SH-09 (O3-session-past2, G5d-past): solid pill above the dock while a past year is shown.
import { useApp } from '../store/store'
import { yearById } from '../data/schoolYear'

export function PastPill() {
  const viewing = useApp((s) => s.viewing); const viewYear = useApp((s) => s.viewYear)
  if (!viewing) return null
  const label = `Viewing ${yearById(viewing).label}`
  return (
    <div className="sow-pastpill" role="status" aria-label={label}>
      <span>{label}</span><span className="sow-pastpill__div" aria-hidden />
      <button onClick={() => viewYear(null)}>Back to now</button>
    </div>)
}
