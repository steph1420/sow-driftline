// t95u/t96u share targets. Phones: WhatsApp, Mail, Messages + More (system sheet, which has Keep).
// Computers: only what works there: WhatsApp (web), Keep (copy + open Keep), Mail, and More only if the browser has a share sheet.
export type Target = 'whatsapp' | 'keep' | 'mail' | 'sms' | 'more'
export function shareTargets(o: { phone: boolean; canShare: boolean }): Target[] {
  if (o.phone) return o.canShare ? ['whatsapp', 'mail', 'sms', 'more'] : ['whatsapp', 'mail', 'sms']
  return o.canShare ? ['whatsapp', 'keep', 'mail', 'more'] : ['whatsapp', 'keep', 'mail']
}
export const isPhone = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches
