// t95u/t96u/t99u share targets. Phones: WhatsApp, Messages + More (system share sheet).
// Computers: only what works there: WhatsApp (web), and More only if the browser has a share sheet.
// beta.10 (t224u): Keep removed, so Copy + WhatsApp + Messages + More fit one row on a phone.
export type Target = 'whatsapp' | 'mail' | 'sms' | 'more'
export function shareTargets(o: { phone: boolean; canShare: boolean }): Target[] {
  if (o.phone) return o.canShare ? ['whatsapp', 'sms', 'more'] : ['whatsapp', 'sms']
  return o.canShare ? ['whatsapp', 'more'] : ['whatsapp']
}
export const isPhone = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches
