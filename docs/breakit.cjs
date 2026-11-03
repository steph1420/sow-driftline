// Break-it run v0.5 against a URL. Demo data + a stand-in bridge (page.route) for the copy path. Never touches a real sheet.
const { chromium } = require('/workspace/choir-attendance/node_modules/playwright-core');
const B = process.argv[2]; const SHOTS = '/workspace/sow-v05-shots';
const COPY = '1iIGXOzdW9NTqLxWnBwI6UkpwOKyihQxvrG8L1v6njYI', LIVE = '1vGXltIwxto-KGZr1ygSDk9EEM0m5rkLySXshZMdv4UQ';
const results = []; const ok = (id, pass, note = '') => { results.push({ id, pass: !!pass, note }); console.log((pass ? 'PASS ' : 'FAIL ') + id + (note ? ' — ' + note : '')) };
const NAMES = ['Aarav Rohan Fenwick', 'Mohammed Elias Thornbury', 'Lia Park', 'Lia Park', 'Zoya Imran', 'Ishaan Dev Okonkwo-Hale', 'Nathaniel Kwabena Ashworth', 'Ruhi Anand', 'Tobias Arjun Wexley', 'Sienna Priya Maddox', 'Omar Leif Bramwell', 'Yuki Asha'];
function mkServer(sheetId = COPY) {
  const d = '2026-11-04', st = { ok: true, schema: 1, subjects: [{ subjectKey: 'X_ENG_CW', classKey: 'X', subject: 'English', kind: 'CW', active: true }],
    roster: NAMES.map((name, i) => ({ classKey: 'X', roll: i + 1, name, status: 'Active', updatedAt: '' })),
    sessions: [{ sessionId: 'X_ENG_CW_' + d, subjectKey: 'X_ENG_CW', classKey: 'X', date: d, topic: '', status: 'Open', updatedAt: '' }], ticks: [] };
  const srv = { st, sheetId, offline: false, pushes: [], calls: [] };
  srv.handle = async (route) => {
    if (srv.offline) return route.abort('internetdisconnected');
    const b = JSON.parse(route.request().postData() || '{}'); srv.calls.push(b.action); let out
    if (b.action === 'pairClaim') out = b.code === '123456' ? { ok: true, token: 'tok' } : { ok: false, error: 'wrong code' }
    else if (b.token !== 'tok') out = { ok: false, error: 'bad token' }
    else if (b.action === 'ping') out = { ok: true, schema: 1, sheetId: srv.sheetId }
    else if (b.action === 'pull') out = st
    else if (b.action === 'push') { srv.pushes.push(b.ticks); for (const t of b.ticks) { const sid = 'X_ENG_CW_' + t.date; const k = st.ticks.find((x) => x.sessionId === sid && x.roll === t.roll); if (k) { if (k.updatedAt < t.updatedAt) { k.set = t.set; k.updatedAt = t.updatedAt } } else st.ticks.push({ tickId: sid + t.roll, sessionId: sid, subjectKey: t.subjectKey, classKey: 'X', roll: t.roll, set: t.set, updatedAt: t.updatedAt }) } out = { ok: true, applied: b.ticks.length, state: st } }
    else out = { ok: false, error: 'unknown action' }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(out) })
  };
  srv.isSet = (roll) => st.ticks.some((t) => t.roll === roll && t.set);
  return srv;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function pair(pg) { await pg.goto(B, { waitUntil: 'networkidle' }); await pg.getByRole('tab', { name: 'More' }).click(); await pg.getByLabel('6-digit code').fill('123456'); await pg.getByRole('button', { name: 'Connect' }).click(); await sleep(800); await pg.getByRole('tab', { name: 'Checklist' }).click(); await sleep(300) }
const onCount = (pg) => pg.locator('button.t.on').count();
(async () => {
  const br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  // ---------- demo, phone + desktop, night/day ----------
  for (const [w, h, n] of [[412, 915, 'phone'], [1440, 900, 'desktop']]) for (const side of ['night', 'day']) {
    const ctx = await br.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block', hasTouch: n === 'phone' });
    const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.goto(`${B}?demo&side=${side}`, { waitUntil: 'networkidle' }); await sleep(400);
    const tag = `${n}-${side}`;
    // rapid taps
    const b0 = pg.locator('button.t').nth(1); const was = (await b0.getAttribute('aria-pressed')) === 'true';
    for (let i = 0; i < 21; i++) await b0.click({ delay: 0 });
    ok(`RAPID-${tag}`, ((await b0.getAttribute('aria-pressed')) === 'true') === !was, '21 fast taps → flipped once net');
    // undo/redo storm
    const before = await onCount(pg);
    for (let i = 0; i < 21; i++) await pg.keyboard.press('Control+z');
    const afterU = await onCount(pg);
    for (let i = 0; i < 21; i++) await pg.keyboard.press('Control+y');
    ok(`UNDOSTORM-${tag}`, (await onCount(pg)) === before && afterU !== before, `on ${before} → undo×21 ${afterU} → redo×21 ${await onCount(pg)}`);
    // swipe across many rows and back (column of the 2nd visible date)
    const col = n === 'phone' ? 1 : 5; const rowsN = await pg.locator('tbody tr').count();
    const cell = (r) => pg.locator('tbody tr').nth(r).locator('button.t').nth(col);
    await cell(2).scrollIntoViewIfNeeded(); const startOn = (await cell(2).getAttribute('aria-pressed')) === 'true';
    const a = await cell(2).boundingBox(); const far = await cell(8).boundingBox(); const back = await cell(5).boundingBox();
    await pg.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await pg.mouse.down();
    for (let s = 1; s <= 12; s++) await pg.mouse.move(a.x + a.width / 2, a.y + a.height / 2 + (far.y - a.y) * s / 12);
    await pg.mouse.move(back.x + back.width / 2, back.y + back.height / 2, { steps: 6 });
    if (side === 'night') await pg.screenshot({ path: `${SHOTS}/swipe-${n}-${side}.png` });
    await pg.mouse.up(); await sleep(150);
    const vals = []; for (let r = 2; r <= 8; r++) vals.push((await cell(r).getAttribute('aria-pressed')) === 'true');
    ok(`SWIPE-${tag}`, vals.slice(0, 4).every((v) => v === !startOn), `rows 2–5 = ${!startOn}; rows 6–8 untouched: ${JSON.stringify(vals.slice(4))}`);
    const beforeSw = await onCount(pg); await pg.keyboard.press('Control+z'); await sleep(100);
    ok(`SWIPE-UNDO1-${tag}`, Math.abs((await onCount(pg)) - beforeSw) >= 1, 'one Ctrl+Z reverts the whole swipe');
    // A–Z: hidden letters, edges
    const letters = await pg.locator('nav.sow-rail [data-l]').evaluateAll((els) => els.map((e) => e.getAttribute('data-l')).join(''));
    ok(`AZ-HIDDEN-${tag}`, !letters.includes('C') && !letters.includes('Q') && letters.startsWith('A') && letters.endsWith('Z'), letters);
    const rail = await pg.locator('nav.sow-rail').boundingBox();
    await pg.mouse.click(rail.x + rail.width / 2, rail.y + rail.height - 2); await sleep(200);
    const selZ = await pg.locator('tr.sel td.n').textContent();
    await pg.mouse.click(rail.x + rail.width / 2, rail.y + 2); await sleep(200);
    const selA = await pg.locator('tr.sel td.n').textContent();
    ok(`AZ-EDGES-${tag}`, /^Z/.test(selZ) && /^A/.test(selA), `${selZ} / ${selA}`);
    // centre snap
    await pg.mouse.click(rail.x + rail.width / 2, rail.y + rail.height * 0.55); await sleep(250);
    const sb = await pg.locator('tr.sel').boundingBox(); const mid = (56 + 48 + h - 88) / 2;
    ok(`AZ-CENTRE-${tag}`, Math.abs(sb.y + sb.height / 2 - mid) < 80 || (await pg.evaluate(() => scrollY)) === 0, `row mid ${Math.round(sb.y + sb.height / 2)} vs ${Math.round(mid)}`);
    // rail stays pinned after scroll
    await pg.mouse.wheel(0, 3000); await sleep(300); const rail2 = await pg.locator('nav.sow-rail').boundingBox();
    ok(`AZ-PINNED-${tag}`, Math.abs(rail2.y - rail.y) < 1, `${rail.y} → ${rail2.y}`);
    // search
    const open = async (txt) => { if (n === 'desktop') { await pg.locator('body').click({ position: { x: 5, y: h / 2 } }); await pg.keyboard.type(txt.slice(0, 1)); await pg.keyboard.type(txt.slice(1)) } else { await pg.getByRole('button', { name: 'Search names' }).click(); await pg.getByRole('searchbox').fill(txt) } await sleep(150) };
    const selName = () => pg.locator('tr.sel td.n').textContent();
    await open('thornbry'); const t1 = await selName(); if (side === 'day') await pg.screenshot({ path: `${SHOTS}/search-${n}-${side}.png` }); await pg.keyboard.press('Escape');
    await open('npm'); const t2 = await selName(); await pg.keyboard.press('Escape');
    await open('qqqqzz'); const t3 = await selName(); const stillOpen = await pg.getByRole('searchbox').count(); await pg.keyboard.press('Escape');
    const closed = (await pg.getByRole('searchbox').count()) === 0;
    ok(`SEARCH-${tag}`, /Thornbury/.test(t1) && /Sienna Priya Maddox/.test(t2) && stillOpen === 1 && closed, `typo→${t1}; initials npm→${t2}; no-match keeps last (${t3}); Esc closes=${closed}`);
    if (n === 'phone') { await pg.getByRole('button', { name: 'Search names' }).click(); await pg.getByRole('searchbox').fill(''); ok(`SEARCH-EMPTY-${tag}`, errs.length === 0, 'empty query no crash'); await pg.keyboard.press('Escape') }
    // keyboard grid
    await pg.locator('button.t').first().focus(); await pg.keyboard.press('ArrowDown'); const fr = await pg.evaluate(() => document.activeElement?.getAttribute('data-r'));
    const p0 = await pg.evaluate(() => document.activeElement?.getAttribute('aria-pressed')); await pg.keyboard.press('Space'); await sleep(80);
    const p1 = await pg.evaluate(() => document.activeElement?.getAttribute('aria-pressed'));
    ok(`KEYS-${tag}`, fr === '1' && p0 !== p1, `ArrowDown→row ${fr}; Space ${p0}→${p1}`);
    // grip
    const g = await pg.locator('.sow-grip').boundingBox(); await pg.mouse.move(g.x + g.width / 2, g.y + g.height / 2); await pg.mouse.down(); await pg.mouse.move(40, g.y + g.height / 2, { steps: 8 }); await pg.mouse.up(); await sleep(200);
    const left = await pg.locator('nav.sow-rail.left').count(); if (side === 'night') await pg.screenshot({ path: `${SHOTS}/grip-left-${n}-${side}.png` });
    await pg.locator('.sow-grip').click(); await sleep(100); const right = await pg.locator('nav.sow-rail.right').count();
    ok(`GRIP-${tag}`, left === 1 && right === 1, 'drag → left edge; tap → back right');
    // long names don't overflow the page
    const ov = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(`LONGNAMES-${tag}`, ov <= 0, `horizontal overflow ${ov}px`);
    // channel switch
    await pg.getByRole('tab', { name: 'More' }).click(); await sleep(150);
    const hrefs = await pg.locator('a.dl-btn').evaluateAll((a) => a.map((x) => x.getAttribute('href')));
    ok(`CHANNEL-${tag}`, hrefs.some((x) => /\/sow-driftline\/$/.test(x)) && hrefs.some((x) => /\/sow-driftline-beta\/$/.test(x)), hrefs.join(' '));
    await pg.screenshot({ path: `${SHOTS}/more-${n}-${side}.png`, fullPage: true });
    await pg.getByRole('tab', { name: 'Checklist' }).click(); await sleep(200); await pg.evaluate(() => scrollTo(0, 0));
    await pg.screenshot({ path: `${SHOTS}/checklist-${n}-${side}.png` });
    ok(`NOERRORS-${tag}`, errs.length === 0, errs.join(' | '));
    await ctx.close();
  }
  // ---------- copy path via stand-in bridge ----------
  {
    const srv = mkServer(); const ctx = await br.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block' }); await ctx.route('https://script.google.com/**', srv.handle);
    const A = await ctx.newPage(); await pair(A); const Bp = await ctx.newPage(); await Bp.goto(B, { waitUntil: 'networkidle' }); await sleep(800);
    ok('PAIR-COPY', (await A.locator('.sow-foot').textContent()).includes('test copy'), await A.locator('.sow-foot').textContent());
    const dup = await A.locator('small.sow-roll').allTextContents(); ok('DUPNAMES', dup.join(',') === '#3,#4', dup.join(','));
    await A.locator('tbody tr').nth(0).locator('button.t').last().click(); await Bp.locator('tbody tr').nth(1).locator('button.t').last().click();
    await sleep(4500);
    ok('TWOTABS-DIFF', srv.isSet(1) && srv.isSet(2), `server r1=${srv.isSet(1)} r2=${srv.isSet(2)}`);
    const seen = async (pg, r) => (await pg.locator('tbody tr').nth(r).locator('button.t').last().getAttribute('aria-pressed')) === 'true';
    ok('TWOTABS-SEEN', (await seen(A, 1)) && (await seen(Bp, 0)), 'each tab shows the other tab’s tick');
    // same box from both tabs: last one wins, both converge
    await A.locator('tbody tr').nth(4).locator('button.t').last().click(); await sleep(50); await Bp.locator('tbody tr').nth(4).locator('button.t').last().click(); await sleep(5000);
    ok('TWOTABS-SAME', (await seen(A, 4)) === (await seen(Bp, 4)) && (await seen(A, 4)) === srv.isSet(5), `A=${await seen(A, 4)} B=${await seen(Bp, 4)} server=${srv.isSet(5)}`);
    // offline queue
    srv.offline = true; await A.locator('tbody tr').nth(6).locator('button.t').last().click(); await sleep(4500);
    const offTxt = await A.locator('.sow-foot').textContent(); srv.offline = false;
    await A.evaluate(() => dispatchEvent(new Event('online'))); await sleep(2500);
    ok('OFFLINE-QUEUE', /offline · 1 waiting|not saved yet · 1 waiting/.test(offTxt) && srv.isSet(7), `${offTxt} → server r7=${srv.isSet(7)}`);
    // reload during grace
    await A.locator('tbody tr').nth(8).locator('button.t').last().click(); await A.reload({ waitUntil: 'networkidle' }); await sleep(5000);
    ok('RELOAD-GRACE', srv.isSet(9), `server r9=${srv.isSet(9)} after reload within the 3 s grace`);
    // reload mid-save (slow bridge)
    let slow = true; await ctx.unroute('https://script.google.com/**'); await ctx.route('https://script.google.com/**', async (r) => { const b = JSON.parse(r.request().postData() || '{}'); if (slow && b.action === 'push') { await sleep(3000); return r.abort() } return srv.handle(r) });
    await A.locator('tbody tr').nth(10).locator('button.t').last().click(); await sleep(3300); const rl = A.reload({ waitUntil: 'load' }); await sleep(50); slow = false; await rl; await sleep(5000);
    ok('RELOAD-MIDSAVE', srv.isSet(11), `server r11=${srv.isSet(11)} after reload while a push was in flight`);
    await ctx.unroute('https://script.google.com/**'); await ctx.route('https://script.google.com/**', srv.handle);
    // devices graceful (stand-in bridge = old bridge: unknown action)
    await A.getByRole('tab', { name: 'More' }).click(); await sleep(800);
    ok('DEVICES-GRACEFUL', (await A.getByText(/doesn't list devices yet/).count()) === 1, 'old bridge → calm note');
    // setup file: malformed, wrong sheet
    await A.getByRole('button', { name: 'Back to demo' }).click(); await sleep(200);
    const up = async (txt) => { await A.locator('input[type=file]').setInputFiles({ name: 'setup.json', mimeType: 'application/json', buffer: Buffer.from(txt) }); await sleep(800); return (await A.locator('[role=alert]').textContent().catch(() => '')) };
    const e1 = await up('{not json'); const e2 = await up(JSON.stringify({ kind: 'sow-driftline-setup', bridgeUrl: 'https://evil.example/exec', token: 'tok' }));
    srv.sheetId = 'someOtherSheetId'; const e3 = await up(JSON.stringify({ kind: 'sow-driftline-setup', bridgeUrl: 'https://script.google.com/macros/s/AKfyTEST/exec', token: 'tok' }));
    const stored = await A.evaluate(() => Object.keys(localStorage).filter((k) => /copyToken/.test(k)).length);
    ok('SETUPFILE-BAD', /not a setup file/.test(e1) && /unexpected/.test(e2) && /not the test copy/.test(e3) && stored === 0, `${e1} | ${e2} | ${e3} | token stored: ${stored}`);
    // LIVE guard
    srv.sheetId = LIVE; const pushesBefore = srv.pushes.length; await pair(A);
    const err = await A.getByRole('tab', { name: 'More' }).click().then(() => A.locator('[role=alert]').textContent().catch(() => ''));
    await A.getByRole('tab', { name: 'Checklist' }).click(); await A.locator('button.t').first().click(); await sleep(4500);
    ok('LIVE-GUARD-BETA', /not the test copy/.test(err) && srv.pushes.length === pushesBefore, `${err}; pushes ${pushesBefore}→${srv.pushes.length}`);
    await ctx.close();
  }
  await br.close();
  require('fs').writeFileSync(`${SHOTS}/breakit-results.json`, JSON.stringify(results, null, 1));
  console.log(`\n${results.filter((r) => r.pass).length}/${results.length} pass`);
})().catch((e) => { console.error('CRASH', e.message); require('fs').writeFileSync(`${SHOTS}/breakit-results.json`, JSON.stringify(results, null, 1)); process.exit(1) });
