// @vitest-environment node
// v0.5 device registry on the COPY bridge (docs/DEVICE_REGISTRY_PLAN.md). Written before the bridge change.
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import { MockSpreadsheet, makeGlobals } from './mockSheets'
const CODE = readFileSync(new URL('../Code.js', import.meta.url), 'utf8')
function env() {
  const ss = new MockSpreadsheet(); const { g, props } = makeGlobals(ss)
  const ctx = vm.createContext({ ...g, Date, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, parseInt })
  vm.runInContext(CODE, ctx)
  const c = ctx as Record<string, (...a: unknown[]) => any>
  const token = c.token_()
  const post = (body: object) => JSON.parse(c.doPost({ postData: { contents: JSON.stringify(body) } }).text)
  const claim = (deviceName: string) => { const { code } = post({ action: 'pairStart', token }); return post({ action: 'pairClaim', code, deviceName }) }
  return { post, token, props, claim }
}
describe('device registry (bridge 0.50.0-dl.1, COPY only)', () => {
  it('BR-DEV-01 pairClaim with a device name returns a per-device key (not the shared token), only its hash is stored', () => {
    const { claim, token, props } = env()
    const r = claim('Kitchen iPad')
    expect(r.ok).toBe(true); expect(r.token).toBeUndefined(); expect(r.deviceKey).toMatch(/^[0-9a-f]{32,}$/); expect(r.deviceKey).not.toBe(token)
    expect(props.get('SOW_DEVICES')).not.toContain(r.deviceKey)
  })
  it('BR-DEV-02 old clients (no deviceName) still get the shared token', () => {
    const { post, token } = env(); const { code } = post({ action: 'pairStart', token })
    expect(post({ action: 'pairClaim', code })).toMatchObject({ ok: true, token })
  })
  it('BR-DEV-03 a device key works for ping/pull; list shows name + last seen; revoking one leaves the others', () => {
    const { claim, post, token } = env()
    const a = claim('Phone A'); const b = claim('Laptop B')
    expect(post({ action: 'ping', token: a.deviceKey }).ok).toBe(true)
    const l = post({ action: 'devicesList', token: b.deviceKey })
    expect(l.devices.map((d: { name: string }) => d.name)).toEqual(['Phone A', 'Laptop B'])
    expect(l.devices[0].lastSeen).toBeTruthy(); expect(JSON.stringify(l)).not.toContain(a.deviceKey)
    expect(post({ action: 'deviceRevoke', token: b.deviceKey, id: a.deviceId }).ok).toBe(true)
    expect(post({ action: 'ping', token: a.deviceKey })).toMatchObject({ ok: false, error: 'bad token' })
    expect(post({ action: 'ping', token: b.deviceKey }).ok).toBe(true)
    expect(post({ action: 'ping', token }).ok).toBe(true) // shared token (old /sow/ app) unaffected
  })
  it('BR-DEV-04 rename; unknown token cannot list', () => {
    const { claim, post } = env(); const a = claim('Phone A')
    expect(post({ action: 'deviceRename', token: a.deviceKey, id: a.deviceId, name: 'Staff room' }).ok).toBe(true)
    expect(post({ action: 'devicesList', token: a.deviceKey }).devices[0].name).toBe('Staff room')
    expect(post({ action: 'devicesList', token: 'nope' })).toMatchObject({ ok: false, error: 'bad token' })
  })
})
