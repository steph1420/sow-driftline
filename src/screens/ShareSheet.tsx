// v0.8 F-CL-12 (Q2e-share): share sheet for one date, stacked over the quick overview or the Overview. Editable message
// (Reset brings the template text back), Copy plus the targets that work on this device (t95u–t99u: Keep, not Mail).
// F-TP-09: template pills, last used preselected; an empty message turns the targets off; a long one warns.
// beta.9 (t221u, 2B): a row of date pills under the title switches which date is shared (amber dot = copies still to
// come in; All › shows every date). Moment "sharepills": the pill slides and the message crossfades.
import { useEffect, useState, type ReactElement } from 'react'
import { CONFIG } from '../config'
import { useApp } from '../store/store'
import { useTemplates } from '../store/templates'
import { dateLabel, dayLabel } from '../data/model'
import { shareContext, shareDates, sharePillWindow } from '../data/share'
import { todayIso } from '../data/today'
import { motion } from 'framer-motion'
import { DUR } from '../config/motion'
import { useMoment } from '../ui/useMotionOn'
import { Chip, ChipGroup } from '../ui/Chips'
import { WA_LONG_WARN, fillTemplate, pickInitial } from '../data/templates'
import { isPhone, shareTargets, type Target } from '../data/shareTargets'
import { GLYPH, Icon } from '../ui/icons'
import { Sheet } from '../ui/Sheet'

type Props = { sessionId: string; onClose: () => void }

export function ShareSheet({ sessionId: start, onClose }: Props) {
  const data = useApp((s) => s.data); const [sessionId, setSid] = useState(start); const [allPills, setAllPills] = useState(false); const pm = useMoment('sharepills')
  const dates = shareDates(data, sessionId, todayIso()); const pills = allPills ? dates : sharePillWindow(dates, sessionId)
  const topic = shareContext(data, sessionId); const { set, lastUsedId, use } = useTemplates()
  const [tplId, setTpl] = useState(() => pickInitial(set, lastUsedId).id); const tpl = set.templates.find((t) => t.id === tplId) ?? pickInitial(set, lastUsedId)
  const date = topic?.ctx.date ?? ''; const what = topic?.what ?? ''; const mailSubject = `${what} · ${dateLabel(date)}`
  const base = topic ? fillTemplate(tpl.body, topic.ctx) : ''
  const [msg, setMsg] = useState<string | null>(null); const [toast, setToast] = useState<string | null>(null)
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), CONFIG.timing.nameToastMs); return () => clearTimeout(t) }, [toast])
  const text = msg ?? base; const body = encodeURIComponent(text); const off = !text.trim()
  const copy = async () => { try { await navigator.clipboard?.writeText(text) } catch { /* clipboard refused: the toast still guides */ } setToast('List copied') }
  const more = async () => { try { await navigator.share?.({ text }) } catch { /* cancelled */ } }
  const targets = shareTargets({ phone: isPhone(), canShare: typeof navigator !== 'undefined' && !!navigator.share })
  const blob: Record<Target, () => ReactElement> = {
    whatsapp: () => <a key="wa" className="sow-blob wa" href={`https://wa.me/?text=${body}`} aria-disabled={off} target="_blank" rel="noopener" aria-label="WhatsApp"><i aria-hidden>✆</i><span>WhatsApp</span></a>,
    mail: () => <a key="mail" className="sow-blob mail" href={`mailto:?subject=${encodeURIComponent(mailSubject)}&body=${body}`} aria-disabled={off} aria-label="Mail"><i aria-hidden>✉</i><span>Mail</span></a>,
    sms: () => <a key="sms" className="sow-blob sms" href={`sms:?&body=${body}`} aria-disabled={off} aria-label="Messages"><i aria-hidden className="txt">SMS</i><span>Messages</span></a>,
    more: () => <button key="more" className="sow-blob more" aria-label="More apps" disabled={off} onClick={more}><i aria-hidden>{GLYPH.moreDots}</i><span>More</span></button>,
  }
  return (
    <Sheet label={`Share · ${dayLabel(date)} · ${what}`} onClose={onClose} className="sow-share">
      <div className="sow-sheet__head"><h2 className="sow-sheet__title">Share · {dayLabel(date)} <span>· {what}</span></h2>
        <button className="sow-x" aria-label="Close share" onClick={onClose}>{GLYPH.close}</button></div>
      <div className="sow-share__rows">{/* beta.10 (t224u): the date pills and the template chips share one block with their own gap, so neither is squeezed */}
      {dates.length > 1 && <div className="sow-share__dates" role="group" aria-label="Date to share"><ChipGroup id="share-date">{pills.map((d) =>
        <Chip key={d.sessionId} moment="sharepills" label={dayLabel(d.date)} aria={`Share ${dateLabel(d.date)}${d.open ? ', copies still to come in' : ''}`} on={d.sessionId === sessionId}
          className={d.open ? 'open' : ''} onClick={() => { setSid(d.sessionId); setMsg(null) }}>{d.open && <i className="sow-share__dot" aria-hidden />}</Chip>)}</ChipGroup>
        {!allPills && pills.length < dates.length && <button className="sow-share__all" aria-label="All dates to share" onClick={() => setAllPills(true)}>All {GLYPH.next}</button>}</div>}
      <div className="sow-share__tpls" role="group" aria-label="Template">{set.templates.map((t) =>
        <button key={t.id} className={`sow-fchip${t.id === tpl.id ? ' on' : ''}`} aria-pressed={t.id === tpl.id} onClick={() => { setTpl(t.id); use(t.id); setMsg(null) }}>{t.name}</button>)}</div></div>
      <div className="sow-share__box">
        <motion.textarea key={sessionId} aria-label="Message to share" value={text} rows={8} onChange={(e) => setMsg(e.target.value)} initial={pm.on && sessionId !== start ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={pm.tween(DUR.fade * 1.5)} />
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
