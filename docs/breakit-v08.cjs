// Phase 10 break-it run: adversarial checks against a Driftline URL (demo data only). node breakit.cjs <baseUrl> <outDir>
const {chromium}=require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
const [BASE,OUT,ONLY]=process.argv.slice(2); const fs=require('fs'); fs.mkdirSync(OUT,{recursive:true})
const Q='?demo=school&today=2026-11-04'; const results=[]
const PHONE={width:412,height:915,deviceScaleFactor:3,hasTouch:true,isMobile:true}
async function run(name, fn, view=PHONE, query=Q){
  if(ONLY && !new RegExp(ONLY).test(name)) return
  const b=await chromium.launch({executablePath:'/opt/ungoogled-chromium/chrome',args:['--no-sandbox']})
  const ctx=await b.newContext({viewport:{width:view.width,height:view.height},deviceScaleFactor:view.deviceScaleFactor??1,hasTouch:!!view.hasTouch,isMobile:!!view.isMobile})
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push('pageerror: '+e.message)); p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('console: '+m.text())})
  const issues=[]; const note=(s)=>issues.push(s)
  try{ await p.goto(BASE+query,{waitUntil:'networkidle'}); await p.waitForTimeout(500); await fn(p,note,ctx) }catch(e){ note('EXC '+e.message.split('\n')[0]) }
  if(errs.length) note('JS errors: '+[...new Set(errs)].slice(0,3).join(' | '))
  const shot=issues.length?`${OUT}/${name}.png`:null; if(shot) await p.screenshot({path:shot}).catch(()=>{})
  results.push({name,ok:!issues.length,issues,shot}); console.log((issues.length?'FAIL ':'ok   ')+name+(issues.length?' :: '+issues.join(' ; '):'')); await b.close()
}
const tab=(p,n)=>p.getByRole('tab',{name:n}).click()
const header=async(p)=>{ const t=await p.locator('.sow-tab__n').first().getAttribute('aria-label'); return +(t.match(/, (\d+) of/)||[])[1] }
const pressed=(p)=>p.locator('button.t[aria-pressed="true"]').count()
const ticksVisibleCol=(p)=>p.evaluate(()=>{ const rows=[...document.querySelectorAll('tbody tr')]; return rows.filter(r=>r.querySelector('button.t[aria-pressed="true"]')).length })
async function layoutAudit(p,note,label){
  const r=await p.evaluate(()=>{ const vw=innerWidth; const out={over:document.documentElement.scrollWidth-vw, small:[], tiny:[]}
    for(const el of document.querySelectorAll('button, a, [role=switch], input, textarea, [role=spinbutton]')){ const b=el.getBoundingClientRect(); if(!b.width||!b.height) continue; const cs=getComputedStyle(el); if(cs.visibility==='hidden'||el.closest('[aria-hidden=true]')) continue
      if(el.matches('.sow-wh__v')) continue
      const af=getComputedStyle(el,'::after'); let w=b.width,h=b.height; if(af.content!=='none'&&af.position==='absolute'&&parseFloat(af.top)<0){ w-=2*(parseFloat(af.left)||0); h-=2*(parseFloat(af.top)||0) }
      if(h<43.5 && w<43.5) out.small.push((el.getAttribute('aria-label')||el.textContent||el.className).trim().slice(0,30)+` ${Math.round(w)}x${Math.round(h)}`) }
    for(const el of document.querySelectorAll('body *')){ if(!el.childNodes.length||![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())) continue; const b=el.getBoundingClientRect(); if(!b.width) continue; const fs=parseFloat(getComputedStyle(el).fontSize); if(fs<13) out.tiny.push(el.textContent.trim().slice(0,24)+' '+fs+'px') }
    return out })
  if(r.over>1) note(`${label}: horizontal overflow ${r.over}px`)
  if(r.small.length) note(`${label}: tap targets <44px: ${[...new Set(r.small)].slice(0,5).join(', ')}`)
  if(r.tiny.length) note(`${label}: text <13px: ${[...new Set(r.tiny)].slice(0,4).join(', ')}`)
}
(async()=>{
  // 1 rapid ticks: header count must equal ticked boxes in the focused column, after a burst and after reload
  await run('01-rapid-ticks', async(p,note)=>{ await tab(p,'Checklist'); const boxes=p.locator('button.t'); const n=await boxes.count()
    const before=await header(p)
    for(let i=0;i<40;i++) await boxes.nth((i*7)%Math.min(n,12)).click({delay:0})
    await p.waitForTimeout(400); const h=await header(p), c=await ticksVisibleCol(p)
    const all=await p.evaluate(()=>document.querySelectorAll('tbody tr').length)
    if(all>=24 && h!==c) note(`header ${h} != ticked rows ${c}`)
    await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(500); await tab(p,'Checklist'); const h2=await header(p); if(h2!==h) note(`after reload header ${h2} != ${h}`)
    console.log('   ticks', before,'->',h) })
  // 2 undo/redo storm: N ticks then N undos returns to start, N redos returns to end
  await run('02-undo-redo-storm', async(p,note)=>{ await tab(p,'Checklist'); const boxes=p.locator('button.t'); const h0=await header(p)
    for(let i=0;i<10;i++) await boxes.nth(i).click(); const h1=await header(p)
    for(let i=0;i<10;i++) await p.getByRole('button',{name:'Undo'}).click(); const h2=await header(p)
    if(h2!==h0) note(`after 10 undos ${h2} != start ${h0}`)
    for(let i=0;i<10;i++) await p.getByRole('button',{name:'Redo'}).click(); const h3=await header(p)
    if(h3!==h1) note(`after 10 redos ${h3} != ${h1}`)
    if(!(await p.getByRole('button',{name:'Redo'}).isDisabled())) note('Redo still enabled at the end of the stack')
    for(let i=0;i<10;i++) await p.keyboard.press('Control+z'); if(await header(p)!==h0) note('Ctrl+Z x10 did not return to start') })
  // 3 date change via dials: move today's date one day on, ticks move with it, undo restores
  await run('03-dial-reschedule', async(p,note)=>{ await tab(p,'Checklist'); const h0=await header(p)
    await p.locator('.sow-tab__d').first().click(); await p.waitForTimeout(300)
    const day=p.getByRole('spinbutton',{name:'Date'}); await day.focus(); await p.keyboard.press('ArrowDown')
    const go=p.locator('.sow-ds__go'); const txt=await go.textContent(); if(!/Move to/.test(txt)) note('action not "Move to": '+txt)
    await go.click(); await p.waitForTimeout(400)
    const lbl=await p.locator('.sow-tab__d').first().textContent(); const h1=await header(p); if(h1!==h0) note(`ticks did not move with the date ${h0}->${h1}`)
    console.log('   moved to', lbl.trim())
    await p.getByRole('button',{name:'Undo'}).click(); await p.waitForTimeout(300); const back=await p.locator('.sow-tab__d').first().textContent(); if(!/Wed 4/.test(back)) note('undo did not restore Wed 4: '+back)
    // collision: try to move onto an existing date
    await p.locator('.sow-tab__d').first().click(); await p.waitForTimeout(300); await day.focus(); for(let i=0;i<2;i++) await p.keyboard.press('ArrowDown')
    const clash=await p.locator('.sow-ds__clash').count(); if(!clash) note('no collision note when moving Wed 4 onto Fri 6') })
  // 4 offline / online flips while ticking, then offline reload (service worker)
  await run('04-offline-flips', async(p,note,ctx)=>{ await p.waitForTimeout(1500); await tab(p,'Checklist'); const boxes=p.locator('button.t')
    for(let i=0;i<6;i++){ await ctx.setOffline(i%2===0); await boxes.nth(i).click(); await p.waitForTimeout(150) }
    await ctx.setOffline(true); const h=await header(p)
    await p.reload({waitUntil:'load'}).catch(e=>note('offline reload failed: '+e.message.split('\n')[0])); await p.waitForTimeout(1200)
    const ok=await p.getByRole('tab',{name:'Checklist'}).count(); if(!ok){ note('app did not load offline'); return }
    await tab(p,'Checklist'); if(await header(p)!==h) note('offline reload lost ticks'); await ctx.setOffline(false) })
  // 5 past-session guarantees: no tick, swipe, keyboard undo, date edits, or hold Add in a past year
  await run('05-past-view-only', async(p,note)=>{ await tab(p,'Settings'); await p.getByRole('button',{name:/^Developer options/}).click()
    await p.getByRole('group',{name:'Past sessions (preview)'}).getByRole('button',{name:'On'}).click(); await tab(p,'Overview')
    await p.getByRole('button',{name:/^Session, /}).click(); await p.getByRole('button',{name:'2025–26'}).click(); await tab(p,'Checklist')
    const h0=await header(p); const cells=p.locator('td .t'); await cells.nth(1).click(); await cells.nth(3).click()
    const bb=await cells.nth(5).boundingBox(); await p.mouse.move(bb.x+5,bb.y+10); await p.mouse.down(); await p.mouse.move(bb.x-150,bb.y+10,{steps:6}); await p.mouse.up()
    await p.keyboard.press('Control+z'); await p.keyboard.press('Control+y'); await p.keyboard.press('Space')
    if(await header(p)!==h0) note('a past-year count changed')
    await p.locator('.sow-tab__d').first().click(); if(await p.getByRole('spinbutton').count()) note('dials shown in a past year'); await p.keyboard.press('Escape')
    const ls=await p.evaluate(()=>Object.keys(localStorage).filter(k=>/demoTicks|edits-|marks-/.test(k)).map(k=>k+':'+localStorage.getItem(k).length))
    await tab(p,'Overview'); const card=p.locator('.sow-oc').first(); await card.click({button:'right'}); const items=await p.getByRole('menuitem').allTextContents()
    if(items.some(t=>/Add date|Reschedule/.test(t))) note('hold menu offers writes: '+items.join(','))
    await p.keyboard.press('Escape'); await p.getByRole('button',{name:'Back to now'}).click(); await p.waitForTimeout(500); if(await p.getByRole('status',{name:/^Viewing/}).count()) note('Back to now did not leave the past year')
    console.log('   storage', ls.join(' ')) })
  // 6 long text: share message over 1500 chars shows the WhatsApp warning; very long topic in the bar does not overflow
  await run('06-long-share', async(p,note)=>{ await tab(p,'Overview'); await p.locator('.sow-oc').first().click({button:'right'}); await p.getByRole('menuitem',{name:'Share'}).click()
    await p.getByText('Tap to edit').click().catch(()=>{}); const ta=p.locator('.sow-sheet textarea').first(); if(!await ta.count()){ note('no editable message'); return }
    await ta.fill('A'.repeat(1600)); await p.waitForTimeout(200); if(!await p.getByText('Long message: WhatsApp may cut it off.').count()) note('no long-message warning at 1600 chars')
    await ta.fill(''); await p.waitForTimeout(200); const wa=p.locator('.sow-targets'); if(!/off/.test(await wa.getAttribute('class'))) note('share targets on with an empty message')
    await layoutAudit(p,note,'share sheet') })
  // 7 template maker abuse: 30-char name, duplicate names, delete down to one, unknown token
  await run('07-template-abuse', async(p,note)=>{ await tab(p,'Settings'); await p.getByRole('button',{name:/^Share templates/}).click()
    for(let i=0;i<6;i++) await p.locator('.sow-page__action').click()
    const pills=await p.getByRole('group',{name:'Templates'}).getByRole('button').allTextContents(); if(new Set(pills).size!==pills.length) note('duplicate template names: '+pills.join('|'))
    await p.getByRole('button',{name:'Template options'}).click(); await p.getByRole('menuitem',{name:'Rename'}).click(); const nm=p.getByRole('textbox',{name:'Template name'}); await nm.fill('X'.repeat(40)); await nm.press('Enter')
    const long=(await p.getByRole('group',{name:'Templates'}).getByRole('button').allTextContents()).find(t=>t.startsWith('XXX'))||''; if(long.replace('· Default','').length>24) note('name longer than 24: '+long.length)
    const ed=p.getByRole('textbox',{name:'Template text'}); await ed.fill('{names} {bogus} {count}'); await p.waitForTimeout(200); if(!await p.locator('mark.sow-tok.unknown').count()) note('unknown token not flagged')
    for(let i=0;i<20;i++){ const o=p.getByRole('button',{name:'Template options'}); await o.click(); const d=p.getByRole('menuitem',{name:/^Delete|^Tap again/}); if(!await d.count()||await d.isDisabled()){ await p.keyboard.press('Escape'); break } await d.click(); const again=p.getByRole('menuitem',{name:'Tap again to delete'}); if(await again.count()) await again.click() }
    const left=await p.getByRole('group',{name:'Templates'}).getByRole('button').count(); if(left<1) note('deleted the last template'); console.log('   templates left', left)
    await layoutAudit(p,note,'template maker') })
  // 8 themes x screens x viewports: overflow, 44px targets, 13px text
  for(const [vn,v] of [['small',{width:320,height:568,deviceScaleFactor:2,hasTouch:true,isMobile:true}],['phone',PHONE],['large',{width:1920,height:1080}]])
    for(const side of ['night','day']) await run(`08-layout-${vn}-${side}`, async(p,note)=>{
      for(const t of ['Overview','Checklist','Settings']){ await tab(p,t); await p.waitForTimeout(250); await layoutAudit(p,note,`${t}`) } }, v, Q+'&side='+side)
  await run('09-contrast-high-day', async(p,note)=>{ await tab(p,'Settings'); await p.getByRole('button',{name:/^Contrast/}).click(); await p.getByRole('radio',{name:'High'}).click(); await p.getByRole('button',{name:'Back to Settings'}).click()
    for(const t of ['Overview','Checklist']){ await tab(p,t); await layoutAudit(p,note,t) }
    const th=await p.evaluate(()=>document.documentElement.dataset.theme); if(th!=='contrast-day') note('theme '+th) }, PHONE, Q+'&side=day')
  // 10 copy path on a stand-in bridge (page.route; fake token, no real sheet): taps while the bridge drops in and out converge on the server
  await run('10-copy-path-flaky-bridge', async(p,note)=>{
    const d='2026-11-04', st={ok:true,schema:1,subjects:[{subjectKey:'X_ENG_CW',classKey:'X',subject:'English',kind:'CW',active:true}],roster:Array.from({length:12},(_, i)=>({classKey:'X',roll:i+1,name:'Pupil '+String.fromCharCode(65+i)+' Test',status:'Active',updatedAt:''})),sessions:[{sessionId:'X_ENG_CW|'+d,subjectKey:'X_ENG_CW',classKey:'X',date:d,topic:'',status:'Open',updatedAt:''}],ticks:[]}
    let down=false; const calls=[]
    await p.route('https://script.google.com/**', async(route)=>{ if(down) return route.abort('internetdisconnected'); const b=JSON.parse(route.request().postData()||'{}'); calls.push(b.action); let out
      if(b.action==='pairClaim') out=b.code==='123456'?{ok:true,token:'tok'}:{ok:false,error:'wrong code'}
      else if(b.token!=='tok') out={ok:false,error:'bad token'}
      else if(b.action==='ping') out={ok:true,schema:1,sheetId:'1iIGXOzdW9NTqLxWnBwI6UkpwOKyihQxvrG8L1v6njYI'}
      else if(b.action==='pull') out=st
      else if(b.action==='push'){ for(const t of b.ticks){ const sid='X_ENG_CW|'+t.date; const k=st.ticks.find(x=>x.sessionId===sid&&x.roll===t.roll); if(k){ if(k.updatedAt<t.updatedAt){k.set=t.set;k.updatedAt=t.updatedAt} } else st.ticks.push({tickId:sid+'|'+t.roll,sessionId:sid,subjectKey:'X_ENG_CW',classKey:'X',roll:t.roll,set:t.set,updatedAt:t.updatedAt}) } out={ok:true,state:st} }
      else out={ok:false,error:'unknown action'}
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(out)}) })
    await p.goto(BASE+'?side=night',{waitUntil:'networkidle'}); await tab(p,'Settings'); await p.getByRole('button',{name:/^Sync, /}).click()
    await p.getByLabel('6-digit code').fill('123456'); await p.getByRole('button',{name:'Connect'}).click(); await p.waitForTimeout(1500)
    await tab(p,'Checklist'); const boxes=p.locator('button.t'); if(await boxes.count()<12){ note('copy checklist did not load ('+calls.join(',')+')'); return }
    for(let i=0;i<30;i++){ if(i%5===0) down=!down; await boxes.nth((i*5)%12).click(); await p.waitForTimeout(60) }
    down=false; await p.waitForTimeout(9000)
    const ui=await p.evaluate(()=>[...document.querySelectorAll('button.t')].map(b=>b.getAttribute('aria-pressed')==='true'))
    const srv=Array.from({length:12},(_, i)=>st.ticks.some(t=>t.roll===i+1&&t.set))
    if(JSON.stringify(ui)!==JSON.stringify(srv)) note(`UI ${ui.map(Number).join('')} != server ${srv.map(Number).join('')} after reconnect (pushes ${calls.filter(c=>c==='push').length})`)
    const dot=await p.locator('.sow-bar .sow-dot').getAttribute('aria-label'); console.log('   save dot:', dot, '| actions', [...new Set(calls)].join(','))
  })
  // 11 sideways swipe ticks one row, one Ctrl+Z reverts the whole swipe; keyboard ArrowDown + Space; search and A–Z don't crash
  await run('11-swipe-keys-search-az', async(p,note)=>{ await tab(p,'Checklist'); const row=(r)=>p.locator('tbody tr').nth(r).locator('button.t').first()
    const was=await row(3).getAttribute('aria-pressed'); const b=await row(3).boundingBox(); await p.mouse.move(b.x+b.width-4,b.y+b.height/2); await p.mouse.down(); await p.mouse.move(b.x-60,b.y+b.height/2,{steps:8}); await p.mouse.up(); await p.waitForTimeout(200)
    const now=await row(3).getAttribute('aria-pressed'); if(now===was) note('sideways swipe did not tick the row')
    await p.keyboard.press('Control+z'); await p.waitForTimeout(150); if(await row(3).getAttribute('aria-pressed')!==was) note('one Ctrl+Z did not revert the swipe')
    await row(0).focus(); await p.keyboard.press('ArrowDown'); const f=await p.evaluate(()=>document.activeElement?.getAttribute('aria-label')||''); const fv=await p.evaluate(()=>document.activeElement?.getAttribute('aria-pressed'))
    await p.keyboard.press('Space'); const fv2=await p.evaluate(()=>document.activeElement?.getAttribute('aria-pressed')); if(fv===fv2) note('Space did not toggle the focused box ('+f.slice(0,30)+')')
    await p.getByRole('button',{name:'Search names'}).click(); const q=p.getByLabel('Find a name'); for(const t of ['zoy','xqzv','',"<img src=x onerror=alert(1)>"]) { await q.fill(t); await p.waitForTimeout(120) }
    await p.keyboard.press('Escape'); await p.waitForTimeout(150)
    const z=p.locator('.sow-rail span',{hasText:'Z'}).first(); if(await z.count()){ await z.click(); await p.waitForTimeout(400) }
  })
  fs.writeFileSync(OUT+'/results.json',JSON.stringify(results,null,1)); console.log(`\n${results.filter(r=>!r.ok).length} failing of ${results.length}`)
})()
