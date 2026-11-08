// v0.8 F-CL-12 (Q2e-share): share sheet stacked over the quick overview. Editable message (Reset brings the list back),
// Copy plus the targets that work on this device (t95u–t99u: Keep, not Mail).
import { useEffect, useState, type ReactElement } from 'react'
import { CONFIG } from '../config'
import { isPhone, shareTargets, type Target } from '../data/shareTargets'
import { GLYPH, Icon } from '../ui/icons'
import { Sheet } from '../ui/Sheet'

type Props = { date: string; what: string; text: string; mailSubject: string; onClose: () => void }

export function ShareSheet({ date, what, text: base, mailSubject, onClose }: Props) {
  const [msg, setMsg] = useState<string | null>(null); const [toast, setToast] = useState<string | null>(null)
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), CONFIG.timing.nameToastMs); return () => clearTimeout(t) }, [toast])
  const text = msg ?? base; const body = encodeURIComponent(text)
  const copy = async () => { try { await navigator.clipboard?.writeText(text) } catch { /* clipboard refused: the toast still guides */ } setToast('List copied') }
  /** Keep has no web link that takes text: copy, then open Keep. */
  const keep = async () => { await copy(); setToast('List copied, paste it into a new note'); window.open('https://keep.google.com/', '_blank', 'noopener') }
  const more = async () => { try { await navigator.share?.({ text }) } catch { /* cancelled */ } }
  const targets = shareTargets({ phone: isPhone(), canShare: typeof navigator !== 'undefined' && !!navigator.share })
  const blob: Record<Target, () => ReactElement> = {
    whatsapp: () => <a key="wa" className="sow-blob wa" href={`https://wa.me/?text=${body}`} target="_blank" rel="noopener" aria-label="WhatsApp"><i aria-hidden>✆</i><span>WhatsApp</span></a>,
    keep: () => <button key="keep" className="sow-blob keep" aria-label="Keep" onClick={keep}><i aria-hidden>{GLYPH.edit}</i><span>Keep</span></button>,
    mail: () => <a key="mail" className="sow-blob mail" href={`mailto:?subject=${encodeURIComponent(mailSubject)}&body=${body}`} aria-label="Mail"><i aria-hidden>✉</i><span>Mail</span></a>,
    sms: () => <a key="sms" className="sow-blob sms" href={`sms:?&body=${body}`} aria-label="Messages"><i aria-hidden className="txt">SMS</i><span>Messages</span></a>,
    more: () => <button key="more" className="sow-blob more" aria-label="More apps" onClick={more}><i aria-hidden>{GLYPH.moreDots}</i><span>More</span></button>,
  }
  return (
    <Sheet label={`Share · ${date} · ${what}`} onClose={onClose} className="sow-share">
      <div className="sow-sheet__head"><h2 className="sow-sheet__title">Share · {date} <span>· {what}</span></h2>
        <button className="sow-x" aria-label="Close share" onClick={onClose}>{GLYPH.close}</button></div>
      <div className="sow-share__box">
        <textarea aria-label="Message to share" value={text} rows={8} onChange={(e) => setMsg(e.target.value)} />
        {msg != null && msg !== base ? <button className="sow-link" onClick={() => setMsg(null)}>Reset</button> : <span className="sow-share__hint">Tap to edit</span>}
      </div>
      <div className="sow-targets" role="group" aria-label="Share to">
        <button className="sow-blob copy" aria-label="Copy" onClick={copy}><i aria-hidden><Icon name="copy" /></i><span>Copy</span></button>
        {targets.map((k) => blob[k]())}
      </div>
      {toast && <div className="dl-toast-region"><div className="dl-toast dl-tone--positive" role="status"><span className="dl-toast__dot" />{toast}</div></div>}
    </Sheet>)
}
