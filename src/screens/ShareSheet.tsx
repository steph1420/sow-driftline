// v0.8 F-CL-12 (Q2e-share): share sheet for one date, stacked over the quick overview or the Overview. Editable message
// (Reset brings the template text back), Copy plus the targets that work on this device (t95u–t99u: Keep, not Mail).
// F-TP-09: template pills, last used preselected; an empty message turns the targets off; a long one warns.
import { useEffect, useState, type ReactElement } from 'react'
import { CONFIG } from '../config'
import { useApp } from '../store/store'
import { useTemplates } from '../store/templates'
import { dateLabel, dayLabel } from '../data/model'
import { shareContext } from '../data/share'
import { WA_LONG_WARN, fillTemplate, pickInitial } from '../data/templates'
import { isPhone, shareTargets, type Target } from '../data/shareTargets'
import { GLYPH, Icon } from '../ui/icons'
import { Sheet } from '../ui/Sheet'

type Props = { sessionId: string; onClose: () => void }

export function ShareSheet({ sessionId, onClose }: Props) {
  const topic = shareContext(useApp((s) => s.data), sessionId); const { set, lastUsedId, use } = useTemplates()
  const [tplId, setTpl] = useState(() => pickInitial(set, lastUsedId).id); const tpl = set.templates.find((t) => t.id === tplId) ?? pickInitial(set, lastUsedId)
  const date = topic?.ctx.date ?? ''; const what = topic?.what ?? ''; const mailSubject = `${what} · ${dateLabel(date)}`
  const base = topic ? fillTemplate(tpl.body, topic.ctx) : ''
  const [msg, setMsg] = useState<string | null>(null); const [toast, setToast] = useState<string | null>(null)
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), CONFIG.timing.nameToastMs); return () => clearTimeout(t) }, [toast])
  const text = msg ?? base; const body = encodeURIComponent(text); const off = !text.trim()
  const copy = async () => { try { await navigator.clipboard?.writeText(text) } catch { /* clipboard refused: the toast still guides */ } setToast('List copied') }
  /** Keep has no web link that takes text: copy, then open Keep. */
  const keep = async () => { await copy(); setToast('List copied, paste it into a new note'); window.open('https://keep.google.com/', '_blank', 'noopener') }
  const more = async () => { try { await navigator.share?.({ text }) } catch { /* cancelled */ } }
  const targets = shareTargets({ phone: isPhone(), canShare: typeof navigator !== 'undefined' && !!navigator.share })
  const blob: Record<Target, () => ReactElement> = {
    whatsapp: () => <a key="wa" className="sow-blob wa" href={`https://wa.me/?text=${body}`} aria-disabled={off} target="_blank" rel="noopener" aria-label="WhatsApp"><i aria-hidden>✆</i><span>WhatsApp</span></a>,
    keep: () => <button key="keep" className="sow-blob keep" aria-label="Keep" disabled={off} onClick={keep}><i aria-hidden>{GLYPH.edit}</i><span>Keep</span></button>,
    mail: () => <a key="mail" className="sow-blob mail" href={`mailto:?subject=${encodeURIComponent(mailSubject)}&body=${body}`} aria-disabled={off} aria-label="Mail"><i aria-hidden>✉</i><span>Mail</span></a>,
    sms: () => <a key="sms" className="sow-blob sms" href={`sms:?&body=${body}`} aria-disabled={off} aria-label="Messages"><i aria-hidden className="txt">SMS</i><span>Messages</span></a>,
    more: () => <button key="more" className="sow-blob more" aria-label="More apps" disabled={off} onClick={more}><i aria-hidden>{GLYPH.moreDots}</i><span>More</span></button>,
  }
  return (
    <Sheet label={`Share · ${dayLabel(date)} · ${what}`} onClose={onClose} className="sow-share">
      <div className="sow-sheet__head"><h2 className="sow-sheet__title">Share · {dayLabel(date)} <span>· {what}</span></h2>
        <button className="sow-x" aria-label="Close share" onClick={onClose}>{GLYPH.close}</button></div>
      <div className="sow-share__tpls" role="group" aria-label="Template">{set.templates.map((t) =>
        <button key={t.id} className={`sow-fchip${t.id === tpl.id ? ' on' : ''}`} aria-pressed={t.id === tpl.id} onClick={() => { setTpl(t.id); use(t.id); setMsg(null) }}>{t.name}</button>)}</div>
      <div className="sow-share__box">
        <textarea aria-label="Message to share" value={text} rows={8} onChange={(e) => setMsg(e.target.value)} />
        {msg != null && msg !== base ? <button className="sow-link" onClick={() => setMsg(null)}>Reset</button> : <span className="sow-share__hint">Tap to edit</span>}
      </div>
      {text.length > WA_LONG_WARN && <p className="sow-share__warn" role="status">Long message: WhatsApp may cut it off.</p>}
      <div className={`sow-targets${off ? ' off' : ''}`} role="group" aria-label="Share to">
        <button className="sow-blob copy" aria-label="Copy" disabled={off} onClick={copy}><i aria-hidden><Icon name="copy" /></i><span>Copy</span></button>
        {targets.map((k) => blob[k]())}
      </div>
      {toast && <div className="dl-toast-region"><div className="dl-toast dl-tone--positive" role="status"><span className="dl-toast__dot" />{toast}</div></div>}
    </Sheet>)
}
