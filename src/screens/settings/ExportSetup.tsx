// beta.13 (t234u/t235u): Settings › Export setup file. Writes the same file Sync's "Or open a setup file" reads
// ({ kind, bridgeUrl, token }) from this device's connection. Save file downloads it; Share hands it to the phone's
// share sheet when it takes files, else downloads. The token is only ever put in the file, never logged or shown.
import { Sheet } from '../../ui/Sheet'
import { GLYPH } from '../../ui/icons'
import { SETUP_FILENAME } from '../../data/setup'

export type SetupOut = 'saved' | 'shared' | 'cancelled'
const blobOf = (text: string) => new Blob([text], { type: 'application/json' })
/** Download the text as the setup file (a temporary link, clicked once). */
export function downloadSetup(text: string): SetupOut {
  const url = URL.createObjectURL(blobOf(text)); const a = document.createElement('a')
  a.href = url; a.download = SETUP_FILENAME; a.rel = 'noopener'; a.style.display = 'none'; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0); return 'saved'
}
/** The phone's share sheet with the file; a refusal to share files (or no Web Share) falls back to a download. */
export async function shareSetup(text: string): Promise<SetupOut> {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined
  if (nav?.share && typeof File === 'function') {
    const file = new File([text], SETUP_FILENAME, { type: 'application/json' })
    if (nav.canShare?.({ files: [file] })) {
      try { await nav.share({ files: [file], title: 'Driftline setup file' }); return 'shared' }
      catch (e) { if (e instanceof Error && e.name === 'AbortError') return 'cancelled' } // anything else: download instead
    }
  }
  return downloadSetup(text)
}

type Props = { text: string; onClose: () => void; onDone: (out: SetupOut) => void }
export function ExportSetupSheet({ text, onClose, onDone }: Props) {
  const finish = (out: SetupOut) => { if (out === 'cancelled') return; onClose(); onDone(out) }
  return (
    <Sheet label="Export setup file" onClose={onClose} className="sow-export">
      <div className="sow-sheet__head"><h2 className="sow-sheet__title">Export setup file</h2><button className="sow-x" aria-label="Close" onClick={onClose}>{GLYPH.close}</button></div>
      <p className="sow-export__txt">This is the same file Sync opens with “Or open a setup file”. It has the connection — the bridge address and its token — so another phone can connect without a 6-digit code.</p>
      <p className="sow-export__warn" role="note">Keep it private. Anyone with this file can connect to your sheet.</p>
      <span className="sow-export__file">{SETUP_FILENAME}</span>
      <div className="sow-export__btns">
        <button className="dl-btn dl-btn--primary" onClick={() => finish(downloadSetup(text))}>Save file</button>
        <button className="dl-btn dl-btn--secondary" onClick={() => void shareSetup(text).then(finish)}>Share</button>
      </div>
    </Sheet>)
}
