// t95u/t96u/t99u share targets. Phones: WhatsApp, Keep, Messages + More (system share sheet).
// Computers: only what works there: WhatsApp (web), Keep, and More only if the browser has a share sheet.
export type Target = 'whatsapp' | 'keep' | 'mail' | 'sms' | 'more'
export function shareTargets(o: { phone: boolean; canShare: boolean }): Target[] {
  // t99u: Keep instead of Mail everywhere (Keep = copy the message + open Keep).
  if (o.phone) return o.canShare ? ['whatsapp', 'keep', 'sms', 'more'] : ['whatsapp', 'keep', 'sms']
  return o.canShare ? ['whatsapp', 'keep', 'more'] : ['whatsapp', 'keep']
}
export const isPhone = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches
