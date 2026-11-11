/**
 * SoW sheet bridge (schema 1). Full reference: docs/REFERENCE.md (sheet layout, actions, setup files, migration).
 * Bound to the workbook COPY. Paste into Extensions > Apps Script (or `clasp push`).
 *
 * Tabs: Roster · Subjects · Sessions · Ticks · Entry · Dashboard · _Meta
 * The script writes data columns only; Dashboard and Ticks!I are formulas.
 * Ids: sessionId = subjectKey|yyyy-mm-dd · tickId = sessionId|roll · classKey = section (KGA).
 */
var SCHEMA = 1
// Bridge v2 = 0.51.0-dl.1 (t245u): 0.46.2 (deployed on LIVE and the test copy) + device registry (0.50.0-dl.1) + setup-file
// maker + `caps` on ping. Purely additive: every 0.46.2 action, field and sheet column is unchanged, so the old app (sow v0.47.1) keeps working.
// 0.51.0-dl.2 (t250u): + late/back-date marks in a hidden `Marks` tab (push `marks`, pull/push `withMarks`). Additive: old apps
// never send or ask for marks, and every dl.1 action, field and column is unchanged.
// 0.60.0-ol.1 (t254u): op-log sync (Q-HARM-10, CRDT_SYNC_PLAN §12/§13): hidden Ops/Base/Conflicts tabs, opsPush/opsPull,
// menu SoW › Migrate to op log (Drive copy first), compaction. Until Migrate is clicked nothing changes (every dl.2 action works
// as before, so the old app keeps working). After it, the tabs are views rewritten from the log and legacy `push` answers
// "update the app"; `pull` still reads.
var BRIDGE_VERSION = '0.60.0-ol.1'
/** What this bridge can do, for apps that want to check before using a feature (ping → caps). */
var CAPS = ['ticks', 'roster', 'structs', 'sessions', 'subs', 'prefs', 'pairing', 'devices', 'setupFile', 'marks', 'oplog']
var T = { roster: 'Roster', subjects: 'Subjects', sessions: 'Sessions', ticks: 'Ticks', entry: 'Entry', dash: 'Dashboard', meta: '_Meta' }
var H = {
  roster: ['classKey', 'roll', 'name', 'status', 'leftOn', 'note', 'updatedAt'],
  subjects: ['subjectKey', 'classKey', 'subject', 'kind', 'active', 'order', 'createdAt'],
  sessions: ['sessionId', 'subjectKey', 'classKey', 'date', 'topic', 'status', 'createdAt', 'updatedAt'],
  ticks: ['tickId', 'sessionId', 'subjectKey', 'classKey', 'roll', 'set', 'updatedAt', 'by'],
}
var ENTRY_FIRST_ROW = 5
var OLD_TAB_RE = /^(KG[A-Z])\s+(\w+)\s+(CW|HW)$/i

// ───────────────────────── helpers ─────────────────────────
function nowIso_() { return new Date().toISOString() }
/** v0.36.1 clock guard (t55u): a stamp more than 10 min ahead of the server clock is clamped to server now. */
var CLOCK_SLACK_MS = 10 * 60 * 1000
var clamped_ = 0
/** v0.46.2 (t29u, B-0462-1): a stamp shifted by the phone-clock offset may never pass server time (replayed/late pushes). */
function capShifted_(at, off, nowMs) {
  var s = clampStamp_(shiftStamp_(at, off), nowMs)
  if (!off) return s
  var t = Date.parse(String(s)), now = nowMs == null ? Date.now() : nowMs
  return !isNaN(t) && t > now ? new Date(now).toISOString() : s
}
function clampStamp_(at, nowMs) {
  var t = Date.parse(String(at)), now = nowMs == null ? Date.now() : nowMs
  if (!isNaN(t) && t > now + CLOCK_SLACK_MS) { clamped_++; return new Date(now).toISOString() }
  return String(at)
}
function pad2_(n) { return (n < 10 ? '0' : '') + n }
function isoDate_(d) { return d.getFullYear() + '-' + pad2_(d.getMonth() + 1) + '-' + pad2_(d.getDate()) }
// v0.46.2 (t29u, B-0462-2): a date that does not exist (30 Feb, month 13) is rejected, never rolled over
function dateFromIso_(s) {
  var m = String(s).match(/^(\d{4})-(\d\d)-(\d\d)/); if (!m) return null
  var d = new Date(+m[1], +m[2] - 1, +m[3])
  return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? d : null
}
/** v0.46.2 (t29u, B-0462-3): topics are plain text — a leading = or ' would be read as a formula / eaten by Sheets. */
function plainText_(v) { var t = String(v == null ? '' : v); return /^[=']/.test(t) ? "'" + t : t }
function toIsoStamp_(v) { return v instanceof Date ? v.toISOString() : String(v || '') }
function academicYear_(nowIso, startMonth) {
  var y = +String(nowIso).slice(0, 4), mo = +String(nowIso).slice(5, 7)
  return mo >= (startMonth || 4) ? y : y - 1
}
/** d/m (no year) into the academic year (April–March) that `nowIso` falls in. */
function dateFromDm_(day, mon, nowIso) {
  var ay = academicYear_(nowIso, 4)
  return new Date(mon >= 4 ? ay : ay + 1, mon - 1, day)
}
function sessionId_(subjectKey, iso) { return subjectKey + '|' + iso }
function tickId_(sid, roll) { return sid + '|' + roll }
function sectionOf_(subjectKey) { return String(subjectKey).split('_')[0] }

function sheet_(ss, name) { var s = ss.getSheetByName(name); if (!s) throw new Error('Missing tab ' + name + ' — run SoW > Setup first'); return s }
/** Rows (without header) of the first n columns, as arrays. */
function read_(ss, name, n) {
  var s = sheet_(ss, name), last = s.getLastRow()
  if (last < 2) return []
  return s.getRange(2, 1, last - 1, n).getValues().filter(function (r) { return r[0] !== '' && r[0] != null })
}
/** Overwrite data rows (columns 1..n only) — formula columns to the right are untouched. */
/** New tabs start with 1000 rows; grow before writing past the end (with headroom). */
function ensureRows_(s, lastRowNeeded) {
  var max = s.getMaxRows()
  if (lastRowNeeded > max) s.insertRowsAfter(max, lastRowNeeded - max + 500)
}
function write_(ss, name, n, rows) {
  var s = sheet_(ss, name), last = s.getLastRow()
  ensureRows_(s, rows.length + 1)
  if (last >= 2) s.getRange(2, 1, last - 1, n).clearContent()
  if (rows.length) s.getRange(2, 1, rows.length, n).setValues(rows)
}
/** v0.46.0: Ticks rows carry a 9th element = Ticks!J subManual (Submitted ticked by hand). Column I is a formula and is never written. */
var SUB_COL = 10
function ticksRead_(ss) {
  var s = sheet_(ss, T.ticks), last = s.getLastRow()
  if (last < 2) return []
  return s.getRange(2, 1, last - 1, SUB_COL).getValues().filter(function (r) { return r[0] !== '' && r[0] != null })
    .map(function (r) { var j = r[SUB_COL - 1]; var x = r.slice(0, 8); x.push(j === true ? true : j === false ? 'off' : false); return x })
}
function subHeader_(s) { if (s.getRange(1, SUB_COL).getValue() !== 'subManual') s.getRange(1, SUB_COL).setValue('subManual').setFontWeight('bold') }
function subVals_(rows) { return rows.map(function (r) { return [r[8] === true ? true : r[8] === 'off' ? false : ''] }) }
/** t16u: J has something to write (TRUE manual on, FALSE manual off while Set on). */
function subAny_(r) { return r[8] === true || r[8] === 'off' }
/** Full rewrite (structure changes): A–H as write_, plus J kept aligned with its row. */
function ticksWrite_(ss, rows) {
  var s = sheet_(ss, T.ticks), last = s.getLastRow()
  write_(ss, T.ticks, 8, rows.map(function (r) { return r.slice(0, 8) }))
  if (last >= 2) s.getRange(2, SUB_COL, last - 1, 1).clearContent()
  if (rows.some(subAny_)) { subHeader_(s); s.getRange(2, SUB_COL, rows.length, 1).setValues(subVals_(rows)) }
}
/** v0.46.0 (t4u): write only the changed rows in place and append new ones. Same final sheet as ticksWrite_, unless the tab
 *  has blank gap rows (then the old compacting rewrite runs, so the result stays identical to the old bridge). */
function ticksWriteChanged_(ss, rows, dirty, origLen, compact) {
  if (!compact) return ticksWrite_(ss, rows)
  var s = sheet_(ss, T.ticks), idx = Object.keys(dirty).map(Number).sort(function (a, b) { return a - b })
  if (!idx.length) return
  ensureRows_(s, rows.length + 1)
  if (rows.some(function (r, i) { return dirty[i] && subAny_(r) })) subHeader_(s)
  var hasSubHeader = s.getRange(1, SUB_COL).getValue() === 'subManual'
  for (var k = 0; k < idx.length;) {
    var j = k; while (j + 1 < idx.length && idx[j + 1] === idx[j] + 1) j++
    var run = rows.slice(idx[k], idx[j] + 1)
    s.getRange(idx[k] + 2, 1, run.length, 8).setValues(run.map(function (r) { return r.slice(0, 8) }))
    if (hasSubHeader) s.getRange(idx[k] + 2, SUB_COL, run.length, 1).setValues(subVals_(run))
    k = j + 1
  }
}
function isCompact_(ss, name, n) { var s = sheet_(ss, name), last = s.getLastRow(); return last < 2 || read_(ss, name, n).length === last - 1 }
/** v0.46.0 (t7u): server − phone clock offset; only applied when the phone is off by more than 30 s. */
var CLOCK_FIX_MIN_MS = 30000
function clockOffset_(clientNow, nowMs) {
  var c = Date.parse(String(clientNow || '')); if (isNaN(c)) return 0
  var off = (nowMs == null ? Date.now() : nowMs) - c
  return Math.abs(off) > CLOCK_FIX_MIN_MS ? off : 0
}
function shiftStamp_(at, off) { if (!off || !at) return at; var t = Date.parse(String(at)); return isNaN(t) ? at : new Date(t + off).toISOString() }
function header_(s, cols) { s.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold'); s.setFrozenRows(1) }
function meta_(ss, key, value) {
  var s = sheet_(ss, T.meta), rows = s.getLastRow() >= 2 ? s.getRange(2, 1, s.getLastRow() - 1, 2).getValues() : []
  for (var i = 0; i < rows.length; i++) if (rows[i][0] === key) { s.getRange(i + 2, 2).setValue(value); return }
  s.appendRow([key, value])
}
function token_() {
  var p = PropertiesService.getScriptProperties(), t = p.getProperty('SOW_TOKEN')
  if (!t) { t = Utilities.getUuid().replace(/-/g, ''); p.setProperty('SOW_TOKEN', t) }
  return t
}

// ───────────────────────── setup + migrate ─────────────────────────
/** Old tick-slot date cell → {date, flag}. Text d/m is trusted; a real Date was typed under the mm/dd locale → day/month swapped back. */
function oldSlotDate_(v, nowIso, where) {
  if (v instanceof Date) {
    var day = v.getMonth() + 1, mon = v.getDate()
    if (mon > 12) return { date: v, flag: where + ': kept ' + isoDate_(v) + ' (cannot swap)' }
    var d = dateFromDm_(day, mon, nowIso)
    return { date: d, flag: where + ': ' + isoDate_(v) + ' swapped to ' + isoDate_(d) + ' (typed under mm/dd) — please check' }
  }
  var m = String(v || '').match(/(\d{1,2})\/(\d{1,2})/)
  return m ? { date: dateFromDm_(+m[1], +m[2], nowIso), flag: '' } : null
}

function setupAndMigrate_(ss, nowIso) {
  nowIso = nowIso || nowIso_()
  if (ss.getSheetByName(T.ticks)) throw new Error('SoW tabs already exist — setup already done (nothing changed)')
  ss.setSpreadsheetLocale('en_IN')
  ss.setSpreadsheetTimeZone('Asia/Kolkata')
  var flags = []

  var roster = {}, rosterOrder = [], subjects = [], sessions = [], ticks = []
  var olds = ss.getSheets().filter(function (s) { return OLD_TAB_RE.test(s.getName()) })
  olds.forEach(function (s, idx) {
    var m = s.getName().match(OLD_TAB_RE)
    var cls = m[1].toUpperCase(), subj = m[2], kind = m[3].toUpperCase()
    var key = cls + '_' + subj + '_' + kind
    subjects.push([key, cls, subj, kind, true, idx + 1, nowIso])
    var last = s.getLastRow()
    var head = s.getRange(2, 3, 2, 2).getValues() // C2:D3 = date row, topic row
    var slots = []
    for (var c = 0; c < 2; c++) {
      var od = oldSlotDate_(head[0][c], nowIso, s.getName() + ' ' + (c ? 'D' : 'C'))
      if (!od) continue
      if (od.flag) flags.push(od.flag)
      var sid = sessionId_(key, isoDate_(od.date))
      if (slots.some(function (x) { return x.sid === sid })) { flags.push(s.getName() + ': C and D share ' + isoDate_(od.date) + ' — D skipped'); continue }
      slots.push({ col: c, sid: sid })
      sessions.push([sid, key, cls, od.date, String(head[1][c] || ''), 'Open', nowIso, nowIso])
    }
    if (last < 4) return
    s.getRange(4, 1, last - 3, 4).getValues().forEach(function (r) {
      var roll = Number(r[0]), name = String(r[1] || '').trim()
      if (!(roll > 0) || !name) return
      var rk = cls + '|' + roll
      if (!roster[rk]) { roster[rk] = [cls, roll, name, 'Active', '', '', nowIso]; rosterOrder.push(rk) }
      slots.forEach(function (sl) {
        var v = r[2 + sl.col]
        if (v !== true && v !== false) return
        ticks.push([tickId_(sl.sid, roll), sl.sid, key, cls, roll, v, nowIso, 'migrate'])
      })
    })
  })
  // Left from the app's old SoW_RosterMeta (per subject → per section)
  var rm = ss.getSheetByName('SoW_RosterMeta')
  if (rm && rm.getLastRow() >= 2) rm.getRange(2, 1, rm.getLastRow() - 1, 5).getValues().forEach(function (r) {
    var rk = sectionOf_(r[0]) + '|' + Number(r[1])
    if (r[3] === true && roster[rk]) { roster[rk][3] = 'Left'; roster[rk][6] = toIsoStamp_(r[4]) || nowIso }
  })

  buildTabs_(ss)
  write_(ss, T.roster, 7, rosterOrder.map(function (k) { return roster[k] }))
  write_(ss, T.subjects, 7, subjects)
  write_(ss, T.sessions, 8, sessions)
  write_(ss, T.ticks, 8, ticks)
  olds.forEach(function (s) { s.setName('OLD ' + s.getName()) })
  meta_(ss, 'schemaVersion', SCHEMA)
  meta_(ss, 'academicYearStartMonth', 4)
  meta_(ss, 'migratedAt', nowIso)
  meta_(ss, 'migrationFlags', flags.join(' | ') || 'none')
  token_()
  return { roster: rosterOrder.length, subjects: subjects.length, sessions: sessions.length, ticks: ticks.length, flags: flags }
}

function buildTabs_(ss) {
  var v = SpreadsheetApp.newDataValidation
  var r = ss.insertSheet(T.roster); header_(r, H.roster)
  r.getRange(2, 4, 999, 1).setDataValidation(v().requireValueInList(['Active', 'Left'], true).build())
  r.getRange(2, 5, 999, 1).setNumberFormat('dd/mm/yyyy')
  r.getRange(2, 7, 999, 1).setNumberFormat('@')

  var su = ss.insertSheet(T.subjects); header_(su, H.subjects)
  su.getRange(2, 4, 999, 1).setDataValidation(v().requireValueInList(['CW', 'HW'], true).build())
  su.getRange(2, 5, 999, 1).insertCheckboxes()

  var se = ss.insertSheet(T.sessions); header_(se, H.sessions)
  se.getRange(2, 4, 999, 1).setNumberFormat('dd/mm/yyyy')
  se.getRange(2, 6, 999, 1).setDataValidation(v().requireValueInList(['Open', 'Completed'], true).build())
  se.getRange(2, 7, 999, 2).setNumberFormat('@')

  var t = ss.insertSheet(T.ticks); header_(t, H.ticks)
  t.getRange(1, 9).setValue('pupilStatus').setFontWeight('bold')
  t.getRange(2, 9).setFormula('=ARRAYFORMULA(IF(A2:A="",,IFERROR(VLOOKUP(D2:D&"|"&E2:E,{Roster!A2:A&"|"&Roster!B2:B,Roster!D2:D},2,FALSE),"Missing")))')
  t.getRange(2, 7, 999, 1).setNumberFormat('@')

  var e = ss.insertSheet(T.entry)
  e.getRange(1, 1, 4, 3).setValues([['Subject', '', 'pick a subjectKey'], ['Date', '', 'dd/mm/yyyy'], ['Topic', '', 'optional'], ['Roll', 'Name', 'Set']])
  e.getRange(1, 2).setDataValidation(v().requireValueInRange(sheet_(ss, T.subjects).getRange('A2:A'), true).build())
  e.getRange(2, 2).setNumberFormat('dd/mm/yyyy')
  e.setFrozenRows(4)

  var d = ss.insertSheet(T.dash)
  d.getRange(1, 1, 1, 10).setValues([['Date', 'Subject', 'Topic', 'sessionId', 'classKey', 'Active', 'Set', 'Set %', 'Not Set', 'Names not Set']]).setFontWeight('bold')
  d.setFrozenRows(1)
  d.getRange(2, 1).setFormula('=IFERROR(SORT(FILTER({Sessions!D2:D,Sessions!B2:B,Sessions!E2:E,Sessions!A2:A,Sessions!C2:C},Sessions!A2:A<>""),1,FALSE,2,TRUE),"")')
  d.getRange(2, 6).setFormula('=MAP(D2:D,E2:E,LAMBDA(s,c,IF(s="","",COUNTIFS(Roster!A2:A,c,Roster!D2:D,"Active"))))')
  d.getRange(2, 7).setFormula('=MAP(D2:D,LAMBDA(s,IF(s="","",COUNTIFS(Ticks!B2:B,s,Ticks!F2:F,TRUE,Ticks!I2:I,"Active"))))')
  d.getRange(2, 8).setFormula('=MAP(F2:F,G2:G,LAMBDA(a,b,IF(a="","",IFERROR(b/a,0))))')
  d.getRange(2, 9).setFormula('=MAP(F2:F,G2:G,LAMBDA(a,b,IF(a="","",a-b)))')
  d.getRange(2, 10).setFormula('=MAP(D2:D,E2:E,LAMBDA(s,c,IF(s="","",IFERROR(TEXTJOIN(", ",TRUE,FILTER(Roster!C2:C,Roster!A2:A=c,Roster!D2:D="Active",ISNA(MATCH(s&"|"&Roster!B2:B,FILTER(Ticks!A2:A,Ticks!F2:F=TRUE),0)))),""))))')
  d.getRange(2, 1, 999, 1).setNumberFormat('dd/mm')
  d.getRange(2, 8, 999, 1).setNumberFormat('0%')
  d.getRange(2, 10, 999, 1).setWrap(true)
  d.hideColumns(4, 2)

  var m = ss.insertSheet(T.meta); header_(m, ['key', 'value'])
}

// ───────────────────────── state + push ─────────────────────────
function state_(ss, withMarks) {
  return {
    ok: true,
    schema: SCHEMA,
    serverTime: nowIso_(),
    subjects: read_(ss, T.subjects, 7).map(function (r) { return { subjectKey: r[0], classKey: r[1], subject: r[2], kind: r[3], active: r[4] !== false, order: r[5] } }),
    roster: read_(ss, T.roster, 7).map(function (r) { return { classKey: r[0], roll: Number(r[1]), name: String(r[2]), status: r[3] === 'Left' ? 'Left' : 'Active', updatedAt: toIsoStamp_(r[6]) } }),
    sessions: read_(ss, T.sessions, 8).map(function (r) { return { sessionId: r[0], subjectKey: r[1], classKey: r[2], date: r[3] instanceof Date ? isoDate_(r[3]) : String(r[3]), topic: String(r[4] || ''), status: r[5] || 'Open', updatedAt: toIsoStamp_(r[7]) } }),
    ticks: ticksRead_(ss).map(function (r) { return { tickId: r[0], sessionId: r[1], subjectKey: r[2], classKey: r[3], roll: Number(r[4]), set: r[5] === true, updatedAt: toIsoStamp_(r[6]), sub: r[8] === true, subOff: r[8] === 'off' } }),
    marks: withMarks ? marksRead_(ss).map(markOut_) : undefined
  }
}

/** ops: { ticks:[{subjectKey,date,topic,roll,set,updatedAt}], roster:[{classKey,roll,status,updatedAt}] } */
// v0.44.0: session structure ops — rename (move a date; ticks move with it) and delete. Idempotent.
// Tombstones (script property) stop older tick/topic ops from re-creating a renamed-away or deleted session.
var TOMB_KEY = 'SOW_TOMBS'
function tombs_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(TOMB_KEY) || '{}') } catch (e) { return {} } }
// v0.46.2 (t29u, B-0462-6): tombstones older than TOMB_MAX_AGE_DAYS are dropped and only the newest TOMB_MAX kept (property limit 9 KB)
var TOMB_MAX_AGE_DAYS = 60, TOMB_MAX = 120
function saveTombs_(t) {
  var cut = new Date(Date.now() - TOMB_MAX_AGE_DAYS * 864e5).toISOString()
  var keys = Object.keys(t).filter(function (k) { return String(t[k]) >= cut }).sort(function (a, b) { return String(t[b]).localeCompare(String(t[a])) }).slice(0, TOMB_MAX)
  var out = {}; keys.forEach(function (k) { out[k] = t[k] })
  PropertiesService.getScriptProperties().setProperty(TOMB_KEY, JSON.stringify(out))
}
function applyStructs_(ss, structs, subjects, rejected, off) {
  var done = 0, tb = tombs_()
  var srows = read_(ss, T.sessions, 8), ticks = ticksRead_(ss), changed = false
  var find = function (sid) { for (var i = 0; i < srows.length; i++) if (srows[i][0] === sid) return i; return -1 }
  structs.forEach(function (o) {
    if (!subjects[o.subjectKey]) { rejected.push(o.subjectKey + ' is not in Subjects'); return }
    var at = o.at ? capShifted_(o.at, off) : nowIso_()
    if (o.kind === 'rename') {
      var df = dateFromIso_(o.from), dt = dateFromIso_(o.to)
      if (!df || !dt) { rejected.push('bad rename ' + JSON.stringify(o)); return }
      var from = sessionId_(o.subjectKey, isoDate_(df)), to = sessionId_(o.subjectKey, isoDate_(dt))
      var i = find(from), j = find(to)
      if (i < 0) { done++; if (!tb[from] || tb[from] < at) tb[from] = at; return } // already moved (or never existed): no-op
      if (j >= 0) { rejected.push(isoDate_(dt) + ' already has a session — ' + isoDate_(df) + ' not moved'); return }
      srows[i][0] = to; srows[i][3] = dt; srows[i][7] = at
      ticks.forEach(function (t) { if (t[1] === from) { t[1] = to; t[0] = tickId_(to, Number(t[4])) } })
      marksMove_(ss, from, to) // dl.2: marks follow their ticks
      tb[from] = at; delete tb[to]; changed = true; done++
    } else if (o.kind === 'delete') {
      var dd = dateFromIso_(o.date)
      if (!dd) { rejected.push('bad delete ' + JSON.stringify(o)); return }
      var sid = sessionId_(o.subjectKey, isoDate_(dd)), k = find(sid)
      if (k >= 0) { srows.splice(k, 1); ticks = ticks.filter(function (t) { return t[1] !== sid }); changed = true; marksMove_(ss, sid, null) }
      if (!tb[sid] || tb[sid] < at) tb[sid] = at
      done++
    } else rejected.push('unknown struct ' + o.kind)
  })
  if (changed) { write_(ss, T.sessions, 8, srows); ticksWrite_(ss, ticks) }
  saveTombs_(tb)
  return { done: done, tombs: tb }
}

function applyPush_(ss, ops, by) {
  var applied = 0, ignored = 0, rejected = []
  var subjects = {}; read_(ss, T.subjects, 7).forEach(function (r) { subjects[r[0]] = r })
  var structApplied, off = clockOffset_(ops.clientNow)
  if (ops.structs && ops.structs.length) structApplied = applyStructs_(ss, ops.structs, subjects, rejected, off).done
  var tb = tombs_()
  // an op for a tombstoned session counts only if it is newer than the tombstone (e.g. Undo after Sync)
  var buried = function (sid, at) { return tb[sid] && String(at) <= tb[sid] }

  // v0.46.0 (t5u): subs = manual Submitted made before bridge 0.46 — only ever turns Ticks!J on (never clears, never touches Set/stamp)
  var tickOps = (ops.ticks || []).concat((ops.subs || []).map(function (x) { return { subjectKey: x.subjectKey, date: x.date, topic: '', roll: x.roll, set: false, sub: true, updatedAt: x.updatedAt, subOnly: true } }))
  if (tickOps.length) {
    var sessions = read_(ss, T.sessions, 8), sIdx = {}
    sessions.forEach(function (r, i) { sIdx[r[0]] = i })
    // v0.46.2 (t29u, B-0462-4): only whole-number rolls that exist in that class's Roster
    var onRoster = {}; read_(ss, T.roster, 7).forEach(function (r) { onRoster[r[0] + '|' + Number(r[1])] = true })
    var ticks = ticksRead_(ss), tIdx = {}, dirty = {}, origLen = ticks.length, sesLen = sessions.length, compact = isCompact_(ss, T.ticks, 8)
    ticks.forEach(function (r, i) { tIdx[r[0]] = i })
    tickOps.forEach(function (t) {
      if (!subjects[t.subjectKey]) { rejected.push(t.subjectKey + ' is not in Subjects'); return }
      var d = dateFromIso_(t.date), roll = Number(t.roll), at = t.updatedAt ? capShifted_(t.updatedAt, off) : ''
      if (!d || !(roll > 0) || Math.floor(roll) !== roll || !at || !onRoster[sectionOf_(t.subjectKey) + '|' + roll]) { rejected.push('bad tick ' + JSON.stringify(t)); return }
      var cls = sectionOf_(t.subjectKey), sid = sessionId_(t.subjectKey, isoDate_(d)), id = tickId_(sid, roll)
      if (sIdx[sid] == null && buried(sid, at)) { ignored++; return }
      if (sIdx[sid] == null) { sIdx[sid] = sessions.length; sessions.push([sid, t.subjectKey, cls, d, plainText_(typeof t.topic === 'string' ? t.topic : ''), 'Open', at, at]) }
      var i = tIdx[id]
      if (t.subOnly && i != null) { if (ticks[i][8] === true) ignored++; else { ticks[i][8] = true; dirty[i] = true; applied++ } return }
      if (i != null && String(ticks[i][6]) >= at) { ignored++; return } // per-tick newer wins
      // v0.46.0: sub (manual Submitted) — an op without it (older app, sheet Entry) keeps the stored flag
      // t16u: subOff = manual off while Set on (J FALSE); kept only while Set is on
      var sub = typeof t.sub === 'boolean' ? (t.sub ? true : (t.subOff === true && t.set === true ? 'off' : (typeof t.subOff === 'boolean' ? false : (i != null && ticks[i][8] === 'off' && t.set === true ? 'off' : false)))) : (i != null ? (ticks[i][8] === 'off' && t.set !== true ? false : ticks[i][8]) : false)
      var row = [id, sid, t.subjectKey, cls, roll, t.set === true, at, by, sub]
      if (i == null) { tIdx[id] = ticks.length; dirty[ticks.length] = true; ticks.push(row) } else { ticks[i] = row; dirty[i] = true }
      applied++
    })
    if (sessions.length !== sesLen) write_(ss, T.sessions, 8, sessions) // v0.46.0: Sessions only when a session was added
    ticksWriteChanged_(ss, ticks, dirty, origLen, compact)
  }

  // v0.40.0: topic edits from the app. Per-session newer wins on updatedAt; older apps simply don't send this.
  var sessionsApplied = 0
  if (ops.sessions && ops.sessions.length) {
    var srows = read_(ss, T.sessions, 8), sI = {}
    srows.forEach(function (r, i) { sI[r[0]] = i })
    ops.sessions.forEach(function (o) {
      if (!subjects[o.subjectKey]) { rejected.push(o.subjectKey + ' is not in Subjects'); return }
      var d = dateFromIso_(o.date), at = o.updatedAt ? capShifted_(o.updatedAt, off) : ''
      if (!d || !at || (o.topic != null && typeof o.topic !== 'string')) { rejected.push('bad session ' + JSON.stringify(o)); return }
      var sid = sessionId_(o.subjectKey, isoDate_(d)), i = sI[sid], topic = plainText_(String(o.topic == null ? '' : o.topic).slice(0, 200))
      if (i == null && buried(sid, at)) { ignored++; return }
      if (i == null) { sI[sid] = srows.length; srows.push([sid, o.subjectKey, sectionOf_(o.subjectKey), d, topic, 'Open', at, at]); sessionsApplied++; return }
      if (toIsoStamp_(srows[i][7]) >= at) { ignored++; return }
      srows[i][4] = topic
      srows[i][7] = at
      sessionsApplied++
    })
    if (sessionsApplied) write_(ss, T.sessions, 8, srows)
  }

  if (ops.roster && ops.roster.length) {
    var roster = read_(ss, T.roster, 7), rIdx = {}, rosterApplied = 0
    roster.forEach(function (r, i) { rIdx[r[0] + '|' + Number(r[1])] = i })
    ops.roster.forEach(function (p) {
      var i = rIdx[p.classKey + '|' + Number(p.roll)]
      if (i == null) { rejected.push('no pupil ' + p.classKey + ' roll ' + p.roll + ' in Roster'); return } // never invent pupils
      if (p.status !== 'Left' && p.status !== 'Active') { rejected.push('bad status ' + JSON.stringify(p.status) + ' for ' + p.classKey + ' roll ' + p.roll); return } // v0.46.2 B-0462-5
      p.updatedAt = capShifted_(p.updatedAt, off)
      if (String(roster[i][6]) >= String(p.updatedAt)) { ignored++; return }
      var left = p.status === 'Left'
      roster[i][3] = left ? 'Left' : 'Active'
      roster[i][4] = left ? (roster[i][4] || dateFromIso_(String(p.updatedAt).slice(0, 10))) : ''
      roster[i][6] = String(p.updatedAt)
      applied++; rosterApplied++
    })
    if (rosterApplied) write_(ss, T.roster, 7, roster)
  }
  var marksApplied = 0
  if (ops.marks && ops.marks.length) marksApplied = applyMarks_(ss, ops.marks, off, rejected, tb)
  meta_(ss, 'lastPush', nowIso_())
  return { applied: applied, ignored: ignored, rejected: rejected, sessionsApplied: sessionsApplied, structApplied: structApplied, offsetMs: off, marksApplied: marksApplied }
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON) }

// ───────────────────────── device pairing (v0.34.0, docs/SETUP_PAIRING_PLAN.md) ─────────────────────────
var PAIR_KEY = 'SOW_PAIR', PAIR_TTL_MS = 300000, PAIR_TRIES = 5
function sha256Hex_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(function (b) { var h = ((b + 256) % 256).toString(16); return h.length < 2 ? '0' + h : h }).join('')
}
function randHex_() { return Utilities.getUuid().replace(/-/g, '') }
/** One active code at a time; only salt + SHA-256(salt + code) is stored. */
function pairStart_(nowMs) {
  var n = parseInt(randHex_().slice(0, 12), 16) % 1000000
  var code = String(1000000 + n).slice(1), salt = randHex_()
  PropertiesService.getScriptProperties().setProperty(PAIR_KEY, JSON.stringify({ salt: salt, hash: sha256Hex_(salt + code), exp: nowMs + PAIR_TTL_MS, tries: 0 }))
  return { ok: true, code: code, expiresInSec: PAIR_TTL_MS / 1000, expiresAt: new Date(nowMs + PAIR_TTL_MS).toISOString() }
}
/** Code → token. Single use, 300 s, locked after 5 wrong tries. Caller holds the script lock. */
function pairClaim_(code, nowMs) {
  code = String(code == null ? '' : code)
  if (!/^\d{6}$/.test(code)) return { ok: false, error: 'bad code' }
  var p = PropertiesService.getScriptProperties(), raw = p.getProperty(PAIR_KEY)
  if (!raw) return { ok: false, error: 'no code' }
  var st = JSON.parse(raw)
  if (nowMs > st.exp) { p.deleteProperty(PAIR_KEY); return { ok: false, error: 'expired' } }
  if (sha256Hex_(st.salt + code) !== st.hash) {
    st.tries = (st.tries || 0) + 1
    if (st.tries >= PAIR_TRIES) { p.deleteProperty(PAIR_KEY); return { ok: false, error: 'locked' } }
    p.setProperty(PAIR_KEY, JSON.stringify(st))
    return { ok: false, error: 'wrong code', triesLeft: PAIR_TRIES - st.tries }
  }
  p.deleteProperty(PAIR_KEY)
  if (deviceName_ != null) return deviceAdd_(deviceName_, nowMs) // Driftline: per-device key
  return { ok: true, token: token_() }
}
// ───────────────────────── device registry (0.50.0-dl.1) ─────────────────────────
// SOW_DEVICES = [{ id, name, salt, hash, createdAt, lastSeen, revoked }]. Only salted SHA-256 of each key is stored.
var DEV_KEY = 'SOW_DEVICES', DEV_SEEN_MS = 300000, deviceName_ = null
function devices_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(DEV_KEY) || '[]') } catch (e) { return [] } }
function devicesSave_(l) { PropertiesService.getScriptProperties().setProperty(DEV_KEY, JSON.stringify(l)) }
function deviceAdd_(name, nowMs) {
  var l = devices_(), key = randHex_() + randHex_(), salt = randHex_(), id = randHex_().slice(0, 12), at = new Date(nowMs).toISOString()
  l.push({ id: id, name: String(name).slice(0, 40) || 'Device', salt: salt, hash: sha256Hex_(salt + key), createdAt: at, lastSeen: at, revoked: false })
  devicesSave_(l)
  return { ok: true, deviceKey: key, deviceId: id }
}
/** The device row for this key (not revoked), or null. Touches lastSeen at most every 5 min. */
function deviceOf_(key) {
  if (!key) return null
  var l = devices_()
  for (var i = 0; i < l.length; i++) {
    var d = l[i]
    if (!d.revoked && sha256Hex_(d.salt + key) === d.hash) {
      var now = Date.now()
      if (!d.lastSeen || now - Date.parse(d.lastSeen) > DEV_SEEN_MS) { d.lastSeen = new Date(now).toISOString(); devicesSave_(l) }
      return d
    }
  }
  return null
}
function devicesRoute_(body) {
  var l = devices_()
  if (body.action === 'devicesList') return { ok: true, devices: l.map(function (d) { return { id: d.id, name: d.name, createdAt: d.createdAt, lastSeen: d.lastSeen, revoked: !!d.revoked } }) }
  var d = l.filter(function (x) { return x.id === body.id })[0]
  if (!d) return { ok: false, error: 'no such device' }
  if (body.action === 'deviceRevoke') d.revoked = true
  if (body.action === 'deviceRename') d.name = String(body.name || '').slice(0, 40) || d.name
  devicesSave_(l)
  return { ok: true }
}
// ───────────────────────── prefs sync (v0.36.0, t52u) ─────────────────────────
// Hidden `Prefs` tab, one row per key: key | category | value (JSON) | updatedAt | deviceId. Newer wins per key.
// Unknown keys are kept (newer app versions add options). Token / URLs / device-only keys are never stored.
var PREFS_TAB = 'Prefs'
var PREFS_H = ['key', 'category', 'value', 'updatedAt', 'deviceId']
var PREFS_DENY = /^(bridgeToken|token|syncUrl|sheetUrl|haptics\.|chrome\.reduceMotion|share\.lastUsedId)/i
function prefsSheet_(ss) {
  var s = ss.getSheetByName(PREFS_TAB)
  if (!s) { s = ss.insertSheet(PREFS_TAB); header_(s, PREFS_H); s.hideSheet() }
  return s
}
function prefsRead_(ss) {
  var s = prefsSheet_(ss), last = s.getLastRow()
  if (last < 2) return []
  return s.getRange(2, 1, last - 1, 5).getValues().filter(function (r) { return r[0] !== '' && r[0] != null }).map(function (r) {
    var v; try { v = JSON.parse(String(r[2])) } catch (e) { v = r[2] }
    return { key: String(r[0]), category: String(r[1]), value: v, updatedAt: toIsoStamp_(r[3]), deviceId: String(r[4] || '') }
  })
}
function prefsPush_(ss, rows, deviceId) {
  var cur = prefsRead_(ss), byKey = {}, applied = 0, ignored = 0
  cur.forEach(function (p, i) { byKey[p.key] = i })
  ;(rows || []).forEach(function (r) {
    var key = String(r && r.key || '')
    if (!key || PREFS_DENY.test(key) || !r.updatedAt) { ignored++; return }
    r = { key: r.key, category: r.category, value: r.value, updatedAt: clampStamp_(r.updatedAt) }
    var next = { key: key, category: String(r.category || ''), value: r.value, updatedAt: String(r.updatedAt), deviceId: String(deviceId || '') }
    var i = byKey[key]
    if (i == null) { byKey[key] = cur.length; cur.push(next); applied++ }
    else if (String(r.updatedAt) > cur[i].updatedAt) { cur[i] = next; applied++ }
    else ignored++
  })
  if (applied) {
    var s = prefsSheet_(ss), last = s.getLastRow()
    ensureRows_(s, cur.length + 1)
    if (last >= 2) s.getRange(2, 1, last - 1, 5).clearContent()
    if (cur.length) s.getRange(2, 1, cur.length, 5).setValues(cur.map(function (p) { return [p.key, p.category, JSON.stringify(p.value), p.updatedAt, p.deviceId] }))
  }
  return { applied: applied, ignored: ignored }
}

function withLock_(fn) {
  var lock = LockService.getScriptLock()
  lock.waitLock(20000)
  try { return fn() } finally { lock.releaseLock() }
}

function handle_(body) {
  clamped_ = 0
  var out = route_(body)
  out.version = BRIDGE_VERSION
  out.serverNow = nowIso_()
  if (clamped_) out.clamped = clamped_
  return out
}
function route_(body) {
  if (body && body.action === 'pairClaim') return withLock_(function () { deviceName_ = typeof body.deviceName === 'string' ? body.deviceName : null; try { return pairClaim_(body.code, Date.now()) } finally { deviceName_ = null } })
  if (!body || !body.token || (body.token !== token_() && !deviceOf_(body.token))) return { ok: false, error: 'bad token' }
  if (/^(devicesList|deviceRevoke|deviceRename)$/.test(body.action)) return withLock_(function () { return devicesRoute_(body) })
  if (body.action === 'ping') { var sp = SpreadsheetApp.getActiveSpreadsheet(); return { ok: true, schema: SCHEMA, sheetId: sp.getId(), caps: CAPS, oplog: olMigrated_(sp) } }
  if (body.action === 'pairStart') return withLock_(function () { return pairStart_(Date.now()) })
  if (body.action === 'pairCancel') return withLock_(function () { PropertiesService.getScriptProperties().deleteProperty(PAIR_KEY); return { ok: true } })
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  if (body.action === 'pull') return state_(ss, body.withMarks === true)
  if (body.action === 'prefsPull') return withLock_(function () { return { ok: true, prefs: prefsRead_(ss) } })
  if (body.action === 'prefsPush') return withLock_(function () {
    var r = prefsPush_(ss, body.rows, body.deviceId)
    return { ok: true, applied: r.applied, ignored: r.ignored, prefs: prefsRead_(ss) }
  })
  if (body.action === 'opsPull') return withLock_(function () { return opsPull_(ss, body) })
  if (body.action === 'opsPush') return withLock_(function () { return opsPush_(ss, body) })
  if (body.action === 'push' && olMigrated_(ss)) return { ok: false, error: 'update the app' } // ol.1: the sheet is on the op log (Q-CRDT-6)
  if (body.action === 'push') {
    var lock = LockService.getScriptLock()
    lock.waitLock(20000)
    try {
      var r = applyPush_(ss, body, 'app')
      return { ok: true, applied: r.applied, ignored: r.ignored, rejected: r.rejected, sessionsApplied: r.sessionsApplied, structApplied: r.structApplied === undefined ? 0 : r.structApplied, offsetMs: r.offsetMs, marksApplied: r.marksApplied, state: state_(ss, body.withMarks === true) }
    } finally { lock.releaseLock() }
  }
  return { ok: false, error: 'unknown action' }
}

/** App sends Content-Type text/plain (no CORS preflight). */
function doPost(e) {
  try { return json_(handle_(JSON.parse((e && e.postData && e.postData.contents) || '{}'))) }
  catch (err) { return json_({ ok: false, error: String(err && err.message || err) }) }
}
function doGet(e) {
  try { return json_(handle_({ token: e && e.parameter && e.parameter.token, action: 'pull' })) }
  catch (err) { return json_({ ok: false, error: String(err && err.message || err) }) }
}

// ───────────────────────── onEdit (Entry + stamping) ─────────────────────────
function onEdit(e) {
  if (!e || !e.range) return
  var s = e.range.getSheet(), name = s.getName(), row = e.range.getRow(), col = e.range.getColumn()
  var ss = e.source || SpreadsheetApp.getActiveSpreadsheet()
  var now = nowIso_()
  if (olMigrated_(ss)) return olOnEdit_(ss, s, name, row, col, e.range.getNumRows(), e.range.getNumColumns())
  if (name === T.entry) return entryEdit_(ss, s, row, col, e.range.getNumRows(), now)
  if (row < 2) return
  var n = e.range.getNumRows()
  if (name === T.roster) {
    for (var i = 0; i < n; i++) {
      s.getRange(row + i, 7).setValue(now)
      var st = s.getRange(row + i, 4).getValue()
      if (st === 'Left' && !s.getRange(row + i, 5).getValue()) s.getRange(row + i, 5).setValue(new Date())
      if (st === 'Active') s.getRange(row + i, 5).setValue('')
    }
  } else if (name === T.sessions) { for (var j = 0; j < n; j++) s.getRange(row + j, 8).setValue(now) }
  else if (name === T.ticks) { for (var k = 0; k < n; k++) { s.getRange(row + k, 7).setValue(now); s.getRange(row + k, 8).setValue('sheet') } }
}

function entryEdit_(ss, s, row, col, n, now) {
  var key = String(s.getRange(1, 2).getValue() || ''), d = s.getRange(2, 2).getValue()
  if (row <= 3 && col === 2) return renderEntry_(ss, s, key, d)
  if (row < ENTRY_FIRST_ROW || col !== 3 || !key || !(d instanceof Date)) return
  var ops = []
  for (var i = 0; i < n; i++) {
    var roll = Number(s.getRange(row + i, 1).getValue())
    if (roll > 0) ops.push({ subjectKey: key, date: isoDate_(d), topic: String(s.getRange(3, 2).getValue() || ''), roll: roll, set: s.getRange(row + i, 3).getValue() === true, updatedAt: now })
  }
  var lock = LockService.getScriptLock(); lock.waitLock(20000)
  try { applyPush_(ss, { ticks: ops }, 'sheet') } finally { lock.releaseLock() }
}

/** Entry lists Active pupils of the subject's class with their current Set ticks for that date. */
function renderEntry_(ss, s, key, d) {
  var last = Math.max(s.getLastRow(), ENTRY_FIRST_ROW)
  s.getRange(ENTRY_FIRST_ROW, 1, last - ENTRY_FIRST_ROW + 1, 3).clearContent().removeCheckboxes()
  if (!key || !(d instanceof Date)) return
  var cls = sectionOf_(key), sid = sessionId_(key, isoDate_(d)), set = {}
  read_(ss, T.ticks, 8).forEach(function (r) { if (r[1] === sid) set[Number(r[4])] = r[5] === true })
  var ses = read_(ss, T.sessions, 8).filter(function (r) { return r[0] === sid })[0]
  if (ses && !s.getRange(3, 2).getValue()) s.getRange(3, 2).setValue(ses[4])
  var rows = read_(ss, T.roster, 7).filter(function (r) { return r[0] === cls && r[3] !== 'Left' })
    .sort(function (a, b) { return Number(a[1]) - Number(b[1]) })
    .map(function (r) { return [Number(r[1]), r[2], set[Number(r[1])] === true] })
  if (!rows.length) return
  ensureRows_(s, ENTRY_FIRST_ROW + rows.length)
  var rg = s.getRange(ENTRY_FIRST_ROW, 1, rows.length, 3)
  rg.setValues(rows)
  s.getRange(ENTRY_FIRST_ROW, 3, rows.length, 1).insertCheckboxes()
}

// ───────────────────────── remove subject (backup first) ─────────────────────────
function removeSubject_(ss, key, nowIso) {
  nowIso = nowIso || nowIso_()
  var subj = read_(ss, T.subjects, 7).filter(function (r) { return r[0] === key })
  if (!subj.length) throw new Error(key + ' is not in Subjects')
  var ses = read_(ss, T.sessions, 8), tic = ticksRead_(ss)
  var mine = { s: ses.filter(function (r) { return r[1] === key }), t: tic.filter(function (r) { return r[2] === key }) }
  var b = SpreadsheetApp.create('SoW backup ' + key + ' ' + String(nowIso).slice(0, 10))
  var put = function (name, head, rows) {
    var sh = b.insertSheet(name)
    sh.getRange(1, 1, 1, head.length).setValues([head])
    ensureRows_(sh, rows.length + 1)
    if (rows.length) sh.getRange(2, 1, rows.length, head.length).setValues(rows)
  }
  put('Subjects', H.subjects, subj)
  put('Sessions', H.sessions, mine.s)
  put('Ticks', H.ticks.concat(['subManual']), mine.t)
  var first = b.getSheetByName('Sheet1'); if (first) b.deleteSheet(first)
  SpreadsheetApp.flush()
  // backup exists → now remove
  write_(ss, T.subjects, 7, read_(ss, T.subjects, 7).filter(function (r) { return r[0] !== key }))
  write_(ss, T.sessions, 8, ses.filter(function (r) { return r[1] !== key }))
  var gone = {}; mine.s.forEach(function (r) { gone[r[0]] = true }); if (ss.getSheetByName(MARKS_TAB)) marksWrite_(ss, marksRead_(ss).filter(function (m) { return !gone[m[1]] }))
  ticksWrite_(ss, tic.filter(function (r) { return r[2] !== key }))
  var out = { key: key, url: b.getUrl(), downloadUrl: 'https://docs.google.com/spreadsheets/d/' + b.getId() + '/export?format=xlsx', sessions: mine.s.length, ticks: mine.t.length }
  meta_(ss, 'removed ' + key, nowIso + ' backup ' + out.url)
  return out
}

// ───────────────────────── menu ─────────────────────────
function onOpen() {
  SpreadsheetApp.getUi().createMenu('SoW')
    .addItem('1. Setup + migrate (once)', 'menuSetup')
    .addItem('Show app token', 'menuToken')
    .addItem('Make app setup file…', 'menuSetupFile')
    .addSeparator()
    .addItem('Remove a subject (backup first)…', 'menuRemoveSubject')
    .addSeparator()
    .addItem('Migrate to op log (backup first)…', 'menuMigrateOplog')
    .addItem('Compact op log now…', 'menuCompactOplog')
    .addToUi()
}
function menuSetup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), r = setupAndMigrate_(ss)
  SpreadsheetApp.getUi().alert('SoW setup done', 'Pupils ' + r.roster + ' · subjects ' + r.subjects + ' · sessions ' + r.sessions + ' · ticks ' + r.ticks +
    (r.flags.length ? '\n\nPlease check:\n' + r.flags.join('\n') : '') + '\n\nApp token: ' + token_(), SpreadsheetApp.getUi().ButtonSet.OK)
}
function menuToken() { SpreadsheetApp.getUi().alert('SoW app token', token_(), SpreadsheetApp.getUi().ButtonSet.OK) }
function menuRemoveSubject() {
  if (olMigrated_(SpreadsheetApp.getActiveSpreadsheet())) { SpreadsheetApp.getUi().alert('Remove a subject', 'Not available on the op log yet. Untick Active in Subjects instead (the data stays).', SpreadsheetApp.getUi().ButtonSet.OK); return }
  var ui = SpreadsheetApp.getUi(), r = ui.prompt('Remove subject', 'Type the subjectKey exactly (e.g. KGA_Eng_HW). A backup copy is made first.', ui.ButtonSet.OK_CANCEL)
  if (r.getSelectedButton() !== ui.Button.OK) return
  var out = removeSubject_(SpreadsheetApp.getActiveSpreadsheet(), r.getResponseText().trim())
  ui.alert('Removed ' + out.key, 'Backup: ' + out.url + '\nDownload (.xlsx): ' + out.downloadUrl, ui.ButtonSet.OK)
}

// ───────────────────────── setup file maker (bridge v2, t245u) ─────────────────────────
// Builds the file Driftline opens from Sync › "Or open a setup file". Format (docs/REFERENCE.md §Setup files):
// { kind:'sow-driftline-setup', v:1, bridgeUrl, token, sheetUrl, exportedAt, bridgeVersion }. The app also still reads the
// old SoW file { kind:'sow-setup', v:1, syncUrl, token, sheetUrl, exportedAt, appVersion }.
// The file holds the sheet's shared app token: anyone with it can read and write this sheet. Keep it private.
var SETUP_KIND = 'sow-driftline-setup', SETUP_V = 1, SETUP_FILENAME = 'sow-driftline-setup.json'
var EXEC_URL_RE = /^https:\/\/script\.google\.com\/(a\/[\w.-]+\/)?macros\/s\/[\w-]+\/exec$/
/** Pure: the setup file text for this web-app URL. Throws a plain message when the URL is not a deployed /exec URL. */
function setupFile_(execUrl, token, sheetUrl, nowIso) {
  var url = String(execUrl || '')
  if (!EXEC_URL_RE.test(url)) throw new Error('Deploy the web app first (Deploy › Manage deployments), then try again. Got: ' + (url || 'no web app URL'))
  if (!token) throw new Error('No app token yet')
  return JSON.stringify({ kind: SETUP_KIND, v: SETUP_V, bridgeUrl: url, token: String(token), sheetUrl: String(sheetUrl || ''), exportedAt: nowIso || nowIso_(), bridgeVersion: BRIDGE_VERSION }, null, 2) + '\n'
}
/** HTML for the download dialog: one button that saves the file; the token is never shown on screen. */
function setupFileHtml_(text) {
  var b64 = Utilities.base64Encode(text, Utilities.Charset.UTF_8)
  return '<div style="font:14px Arial,sans-serif">' +
    '<p>Save this file and open it on the phone: Driftline › Settings › Sync › <b>Or open a setup file</b>.</p>' +
    '<p style="color:#a00">It holds the sheet\'s app key. Keep it private; don\'t post or email it around.</p>' +
    '<a id="dl" download="' + SETUP_FILENAME + '" href="data:application/json;base64,' + b64 + '" style="display:inline-block;padding:8px 14px;background:#1a73e8;color:#fff;border-radius:4px;text-decoration:none">Download ' + SETUP_FILENAME + '</a>' +
    '</div>'
}
function menuSetupFile() {
  var ui = SpreadsheetApp.getUi(), ss = SpreadsheetApp.getActiveSpreadsheet(), text
  try { text = setupFile_(ScriptApp.getService().getUrl(), token_(), ss.getUrl()) } catch (e) { ui.alert('Setup file', String(e && e.message || e), ui.ButtonSet.OK); return }
  meta_(ss, 'setupFileMadeAt', nowIso_())
  ui.showModalDialog(HtmlService.createHtmlOutput(setupFileHtml_(text)).setWidth(420).setHeight(200), 'App setup file')
}

// ───────────────────────── late / back-date marks (0.51.0-dl.2, t250u) ─────────────────────────
// Hidden `Marks` tab, one row per tick cell that has (or had) a mark: tickId | sessionId | markedAt | backDated | updatedAt | deviceId.
// markedAt = when the tick was marked (ISO), blank = mark cleared (kept as a tombstone so an older mark can't come back).
// backDated TRUE = "marked on back-date" (counts as on time). Newer updatedAt wins per tickId. Moves/deletes of a session carry its marks.
var MARKS_TAB = 'Marks'
var MARKS_H = ['tickId', 'sessionId', 'markedAt', 'backDated', 'updatedAt', 'deviceId']
function marksSheet_(ss) {
  var s = ss.getSheetByName(MARKS_TAB)
  if (!s) { s = ss.insertSheet(MARKS_TAB); header_(s, MARKS_H); s.getRange(2, 3, 999, 1).setNumberFormat('@'); s.getRange(2, 5, 999, 1).setNumberFormat('@'); s.hideSheet() }
  return s
}
/** Rows as arrays; [] when the tab doesn't exist yet (it is only made on the first mark write). */
function marksRead_(ss) {
  var s = ss.getSheetByName(MARKS_TAB); if (!s || s.getLastRow() < 2) return []
  return s.getRange(2, 1, s.getLastRow() - 1, 6).getValues().filter(function (r) { return r[0] !== '' && r[0] != null })
    .map(function (r) { return [String(r[0]), String(r[1]), toIsoStamp_(r[2]), r[3] === true, toIsoStamp_(r[4]), String(r[5] || '')] })
}
function marksWrite_(ss, rows) {
  var s = marksSheet_(ss), last = s.getLastRow()
  ensureRows_(s, rows.length + 1)
  if (last >= 2) s.getRange(2, 1, last - 1, 6).clearContent()
  if (rows.length) s.getRange(2, 1, rows.length, 6).setValues(rows)
}
function markOut_(r) { var roll = Number(String(r[0]).split('|').pop()); return { tickId: r[0], sessionId: r[1], roll: roll, at: r[2], back: r[3] === true, updatedAt: r[4] } }
/** A session moved (to = new id) or deleted (to = null): its marks go with it. */
function marksMove_(ss, from, to) {
  if (!ss.getSheetByName(MARKS_TAB)) return
  var rows = marksRead_(ss), changed = false, out = []
  rows.forEach(function (m) {
    if (m[1] !== from) { out.push(m); return }
    changed = true
    if (to) { m[1] = to; m[0] = tickId_(to, Number(String(m[0]).split('|').pop())); out.push(m) }
  })
  if (changed) marksWrite_(ss, out.filter(function (m, i) { return !out.some(function (x, j) { return j > i && x[0] === m[0] && String(x[4]) >= String(m[4]) }) }))
}
/** marks: [{ subjectKey, date, roll, at ('' = cleared), back, updatedAt }]. Only for sessions that exist (never makes one). */
function applyMarks_(ss, marks, off, rejected, tb) {
  var subjects = {}; read_(ss, T.subjects, 7).forEach(function (r) { subjects[r[0]] = true })
  var sessions = {}; read_(ss, T.sessions, 8).forEach(function (r) { sessions[r[0]] = true })
  var rows = marksRead_(ss), idx = {}, applied = 0
  rows.forEach(function (m, i) { idx[m[0]] = i })
  marks.forEach(function (k) {
    var d = dateFromIso_(k && k.date), roll = Number(k && k.roll), at = k && k.updatedAt ? capShifted_(k.updatedAt, off) : ''
    if (!k || !subjects[k.subjectKey] || !d || !(roll > 0) || Math.floor(roll) !== roll || !at || (k.at && isNaN(Date.parse(String(k.at))))) { rejected.push('bad mark ' + JSON.stringify(k)); return }
    var sid = sessionId_(k.subjectKey, isoDate_(d)), id = tickId_(sid, roll)
    if (!sessions[sid]) return // the date is gone (deleted or moved away): nothing to mark
    var row = [id, sid, k.at ? String(k.at) : '', k.at ? k.back === true : false, at, 'app']
    var i = idx[id]
    if (i != null && String(rows[i][4]) >= at) return // newer wins
    if (i == null) { idx[id] = rows.length; rows.push(row) } else rows[i] = row
    applied++
  })
  if (applied) marksWrite_(ss, rows)
  return applied
}

// ───────────────────────── op log (0.60.0-ol.1, t254u; Q-HARM-10, CRDT_SYNC_PLAN §12/§13) ─────────────────────────
// Hidden tabs (made by Migrate): Ops = every change as an op; Base = the folded state the log starts from (migration, then
// compaction); Conflicts = every true-concurrency clash and how it was resolved. After Migrate the old tabs (Sessions, Ticks,
// Roster status, Subjects active, Marks) are views the bridge rewrites from fold(Base + Ops); hand edits there and on Entry
// become ops from device 'sheet'. The fold rules live in the shared core below (same file as the app's src/oplog/core.js).
var OL_T = { ops: 'Ops', base: 'Base', conflicts: 'Conflicts' }
var OL_H = {
  ops: ['opId', 'deviceId', 'seq', 'lamport', 'vv', 'kind', 'target', 'value', 'wallAt', 'recvAt', 'status'],
  base: ['register', 'value', 'opId', 'deviceId', 'seq', 'lamport', 'vv', 'recvAt', 'wallAt', 'by'],
  conflicts: ['at', 'register', 'rule', 'winValue', 'winDevice', 'winOp', 'loseValue', 'loseDevice', 'loseOp'],
}
var OL_BATCH_MAX = 500, OL_KEEP_DAYS = 60, OL_CONFLICTS_OUT = 100
var OL_DEVICE_RE = /^d[0-9a-z]{6,40}$/
function metaGet_(ss, key) {
  var s = ss.getSheetByName(T.meta); if (!s || s.getLastRow() < 2) return null
  var rows = s.getRange(2, 1, s.getLastRow() - 1, 2).getValues()
  for (var i = 0; i < rows.length; i++) if (rows[i][0] === key) return rows[i][1]
  return null
}
function olMigrated_(ss) { try { return !!metaGet_(ss, 'oplogMigratedAt') } catch (e) { return false } }
function olRules_(ss) { var t = String(metaGet_(ss, 'tickConflict') || 'set'); return { tick: OL_TICK_RULES.indexOf(t) >= 0 ? t : 'set' } }
function olFloor_(ss) { try { return JSON.parse(String(metaGet_(ss, 'oplogFloor') || '{}')) } catch (e) { return {} } }
function olTab_(ss, key) {
  var s = ss.getSheetByName(OL_T[key])
  if (!s) { s = ss.insertSheet(OL_T[key]); header_(s, OL_H[key]); s.getRange(2, 1, 999, OL_H[key].length).setNumberFormat('@'); s.hideSheet() }
  return s
}
function olJson_(v) { if (typeof v !== 'string') return v; try { return JSON.parse(v) } catch (e) { return v } }
function olRows_(ss, key) {
  var s = ss.getSheetByName(OL_T[key]); if (!s || s.getLastRow() < 2) return []
  return s.getRange(2, 1, s.getLastRow() - 1, OL_H[key].length).getValues().filter(function (r) { return r[0] !== '' && r[0] != null })
}
function olReadOps_(ss) {
  return olRows_(ss, 'ops').map(function (r) {
    return { opId: String(r[0]), deviceId: String(r[1]), seq: Number(r[2]), lamport: Number(r[3]), vv: olJson_(r[4]) || {}, kind: String(r[5]), target: String(r[6]), value: olJson_(r[7]), wallAt: toIsoStamp_(r[8]), recvAt: toIsoStamp_(r[9]), status: String(r[10] || '') }
  })
}
function olOpRow_(o) { return [o.opId, o.deviceId, o.seq, o.lamport, JSON.stringify(o.vv || {}), o.kind, o.target, JSON.stringify(o.value === undefined ? null : o.value), o.wallAt || '', o.recvAt, o.status || ''] }
function olReadBase_(ss) {
  return olRows_(ss, 'base').map(function (r) {
    return { register: String(r[0]), value: olJson_(r[1]), opId: String(r[2] || ''), deviceId: String(r[3]), seq: Number(r[4]) || 0, lamport: Number(r[5]) || 0, vv: olJson_(r[6]) || {}, recvAt: toIsoStamp_(r[7]), wallAt: toIsoStamp_(r[8]), by: String(r[9] || '') || undefined }
  })
}
function olBaseRow_(b) { return [b.register, JSON.stringify(b.value === undefined ? null : b.value), b.opId || '', b.deviceId, b.seq || 0, b.lamport || 0, JSON.stringify(b.vv || {}), b.recvAt || '', b.wallAt || '', b.by || ''] }
function olWriteAll_(ss, key, rows) {
  var s = olTab_(ss, key), n = OL_H[key].length, last = s.getLastRow()
  ensureRows_(s, rows.length + 1)
  if (last >= 2) s.getRange(2, 1, last - 1, n).clearContent()
  if (rows.length) s.getRange(2, 1, rows.length, n).setNumberFormat('@').setValues(rows)
}
function olAppend_(ss, key, rows) {
  if (!rows.length) return
  var s = olTab_(ss, key), n = OL_H[key].length, at = Math.max(s.getLastRow(), 1) + 1
  ensureRows_(s, at + rows.length)
  s.getRange(at, 1, rows.length, n).setNumberFormat('@').setValues(rows)
}
/** Everything a request needs, read once. */
function olLoad_(ss) {
  var base = olReadBase_(ss), ops = olReadOps_(ss), floor = olFloor_(ss), rules = olRules_(ss)
  var st = { base: base, ops: ops, floor: floor, rules: rules, ids: {} }
  ops.forEach(function (o) { st.ids[o.opId] = o })
  st.have = olVv(ops, floor)
  st.lamport = olMaxLamport(ops, olMaxLamport(base, 0))
  st.lastRecv = ops.reduce(function (m, o) { return o.recvAt > m ? o.recvAt : m }, '')
  olRefold_(st)
  return st
}
function olRefold_(st) { st.fold = olFold(st.base, st.ops, st.rules); st.view = olView(st.fold) }
function olRoster_(ss) { var m = {}; read_(ss, T.roster, 7).forEach(function (r) { m[r[0] + '|' + Number(r[1])] = true }); return m }
function olSession_(st, sid) {
  var x = sid, n = 0; while (st.fold.alias[x] && n++ < 20) x = st.fold.alias[x]
  var al = st.fold.regs['alive:' + x], meta = st.fold.regs['meta:' + x], date = st.fold.regs['date:' + x]
  return al ? { sid: x, alive: al.value === true, subjectKey: meta && meta.value.subjectKey, classKey: meta && meta.value.classKey, date: date && date.value } : null
}
function olOnDate_(st, subjectKey, date, notSid) {
  for (var i = 0; i < st.view.sessions.length; i++) { var s = st.view.sessions[i]; if (s.subjectKey === subjectKey && s.date === date && s.sid !== notSid) return s.sid }
  return null
}
function olShapeOk_(o, dev) {
  return o && o.deviceId === dev && typeof o.seq === 'number' && o.seq >= 1 && Math.floor(o.seq) === o.seq && o.opId === dev + ':' + o.seq &&
    typeof o.lamport === 'number' && o.lamport >= 0 && o.vv && typeof o.vv === 'object' && OL_KINDS.indexOf(o.kind) >= 0 &&
    typeof o.target === 'string' && o.target.length > 0 && o.target.length <= 200
}
/** Checks one op against the sheet as it stands (the bridge decides in receipt order). → { status, message } */
function olCheck_(st, o, roster) {
  var bad = function (m) { return { status: 'refused', message: m } }, v = o.value
  if (o.kind === 'tick.set' || o.kind === 'tick.mark') {
    var i = o.target.lastIndexOf('|'), sid = o.target.slice(0, i), roll = Number(o.target.slice(i + 1)), s = olSession_(st, sid)
    if (!s) return bad('no session ' + sid)
    if (!(roll > 0) || Math.floor(roll) !== roll || !roster[s.classKey + '|' + roll]) return bad('bad tick ' + o.target)
    if (o.kind === 'tick.set' && typeof v !== 'boolean') return bad('bad tick ' + o.target)
    if (o.kind === 'tick.mark' && v !== null && !(v && typeof v.at === 'string' && !isNaN(Date.parse(v.at)))) return bad('bad mark ' + o.target)
    return { status: '' }
  }
  if (o.kind === 'session.add') {
    if (!v || !st.fold.regs['subj:' + v.subjectKey]) return bad((v && v.subjectKey) + ' is not in Subjects')
    var d = dateFromIso_(v.date); if (!d || isoDate_(d) !== v.date) return bad('bad date ' + JSON.stringify(v.date))
    if (o.target.indexOf(v.subjectKey + '|') !== 0) return bad('bad session id ' + o.target)
    v.classKey = sectionOf_(v.subjectKey)
    if (st.fold.regs['alive:' + o.target]) return { status: '' } // the same session again (another phone made it too): one session
    var other = olOnDate_(st, v.subjectKey, v.date, o.target)
    return other ? { status: 'alias:' + other } : { status: '' }
  }
  if (o.kind === 'session.remove' || o.kind === 'session.date' || o.kind === 'session.topic') {
    var se = olSession_(st, o.target); if (!se) return bad('no session ' + o.target)
    if (o.kind === 'session.topic' && (typeof v !== 'string' || v.length > 200)) return bad('bad topic')
    if (o.kind === 'session.date') {
      var dd = dateFromIso_(v); if (!dd || isoDate_(dd) !== v) return bad('bad date ' + JSON.stringify(v))
      if (se.alive && olOnDate_(st, se.subjectKey, v, se.sid)) return bad(v + ' already has a session — ' + se.date + ' not moved') // same text as rename (0.44+)
    }
    return { status: '' }
  }
  if (o.kind === 'left.set') { if (!roster[o.target] || (v !== 'Left' && v !== 'Active')) return bad('bad left ' + o.target); return { status: '' } }
  if (o.kind === 'subject.add') { if (!v || !v.classKey || !v.subject || (v.kind !== 'CW' && v.kind !== 'HW') || o.target !== v.classKey + '_' + v.subject + '_' + v.kind) return bad('bad subject ' + o.target); return { status: '' } }
  if (o.kind === 'subject.active') { if (!st.fold.regs['subj:' + o.target] || typeof v !== 'boolean') return bad('no subject ' + o.target); return { status: '' } }
  return bad('unknown kind ' + o.kind)
}
function olNextRecv_(st) {
  var now = Date.now(), last = st.lastRecv ? Date.parse(st.lastRecv) : 0
  var t = new Date(Math.max(now, last + 1)).toISOString(); st.lastRecv = t; return t
}
/** Takes ops from one device (in seq order). Duplicates are answered, a gap asks for a resend, nothing is applied twice. */
function olAccept_(ss, st, dev, ops) {
  var roster = olRoster_(ss), out = { accepted: [], dup: 0, resend: null, rejected: [], added: [] }
  var list = (ops || []).slice().sort(function (a, b) { return (a && a.seq || 0) - (b && b.seq || 0) })
  for (var i = 0; i < list.length; i++) {
    var o = list[i]
    if (!olShapeOk_(o, dev)) { out.rejected.push('bad op ' + JSON.stringify(o).slice(0, 120)); continue }
    var had = st.ids[o.opId]
    if (had) { out.dup++; out.accepted.push({ opId: had.opId, recvAt: had.recvAt, status: had.status }); continue }
    var have = st.have[dev] || 0
    if (o.seq <= have) { out.dup++; continue } // already folded into Base by compaction
    if (o.seq > have + 1) { out.resend = {}; out.resend[dev] = have + 1; break } // a gap: send from here again
    var op = { opId: o.opId, deviceId: dev, seq: o.seq, lamport: Math.floor(o.lamport), vv: o.vv, kind: o.kind, target: o.target, value: o.value === undefined ? null : o.value, wallAt: String(o.wallAt || '').slice(0, 40), recvAt: '', status: '' }
    var ck = olCheck_(st, op, roster)
    op.status = ck.status; op.recvAt = olNextRecv_(st)
    st.ops.push(op); st.ids[op.opId] = op; st.have[dev] = op.seq; if (op.lamport > st.lamport) st.lamport = op.lamport
    out.added.push(op); out.accepted.push({ opId: op.opId, recvAt: op.recvAt, status: op.status, message: ck.message })
    if (!ck.status || ck.status.indexOf('alias:') === 0) if (op.kind !== 'tick.set' && op.kind !== 'tick.mark') olRefold_(st)
  }
  if (out.added.length) {
    olAppend_(ss, 'ops', out.added.map(olOpRow_))
    olRefold_(st); olRender_(ss, st); olConflictsLog_(ss, st)
    meta_(ss, 'lastPush', nowIso_())
  }
  return out
}
/** What a device needs: ops it hasn't seen, Base when it is new or behind a compaction, roster names, rules. */
function olOut_(ss, st, vv, full) {
  var need = full || !vv || typeof vv !== 'object' || Object.keys(st.floor).some(function (d) { return ((vv && vv[d]) || 0) < st.floor[d] })
  return {
    ok: true, migrated: true, vv: st.have, lamport: st.lamport, rules: st.rules, floor: st.floor,
    ops: olSince(st.ops, need ? st.floor : vv), base: need ? st.base : undefined,
    roster: read_(ss, T.roster, 7).map(function (r) { return { classKey: r[0], roll: Number(r[1]), name: String(r[2]) } }),
    conflicts: olRows_(ss, 'conflicts').slice(-OL_CONFLICTS_OUT).map(function (r) { return { at: toIsoStamp_(r[0]), register: r[1], rule: r[2], winValue: olJson_(r[3]), winDevice: r[4], winOp: r[5], loseValue: olJson_(r[6]), loseDevice: r[7], loseOp: r[8] } })
  }
}
function opsPull_(ss, body) {
  if (!olMigrated_(ss)) return { ok: false, error: 'not migrated' }
  return olOut_(ss, olLoad_(ss), body.vv, body.full === true)
}
function opsPush_(ss, body) {
  if (!olMigrated_(ss)) return { ok: false, error: 'not migrated' }
  var dev = String(body.deviceId || '')
  if (!OL_DEVICE_RE.test(dev)) return { ok: false, error: 'bad deviceId' }
  if (!Array.isArray(body.ops) || body.ops.length > OL_BATCH_MAX) return { ok: false, error: 'send at most ' + OL_BATCH_MAX + ' ops' }
  var st = olLoad_(ss), r = olAccept_(ss, st, dev, body.ops), out = olOut_(ss, st, body.vv, body.full === true)
  out.accepted = r.accepted; out.dup = r.dup; out.resend = r.resend; out.rejected = r.rejected
  return out
}
/** Ops made on the sheet itself (Entry, hand edits): device 'sheet', causally after everything the sheet has. */
function olSheetOps_(ss, st, list) {
  if (!list.length) return null
  var ops = list.map(function (x, i) {
    var seq = (st.have.sheet || 0) + 1 + i
    return { opId: 'sheet:' + seq, deviceId: 'sheet', seq: seq, lamport: st.lamport + 1 + i, vv: JSON.parse(JSON.stringify(st.have)), kind: x.kind, target: x.target, value: x.value, wallAt: nowIso_() }
  })
  return olAccept_(ss, st, 'sheet', ops)
}

// ── views: the old tabs, rewritten from the fold (only what changed is written) ──
function olStampOf_(r) { return r && r.win ? String(r.win.recvAt || '') : '' }
function olMaxStamp_() { var m = ''; for (var i = 0; i < arguments.length; i++) { var x = olStampOf_(arguments[i]); if (x > m) m = x } return m }
function olRender_(ss, st) {
  var v = st.view
  // Subjects: Active, and subjects added through the log
  var su = read_(ss, T.subjects, 7), suChanged = false, onTab = {}
  su.forEach(function (r) { onTab[r[0]] = true; var x = v.subjects[r[0]]; if (x && x.actReg && x.actReg.win.deviceId !== 'base' && (r[4] !== false) !== x.active) { r[4] = x.active; suChanged = true } })
  Object.keys(v.subjects).forEach(function (k) { var x = v.subjects[k]; if (!onTab[k] && x.reg) { su.push([k, x.classKey, x.subject, x.kind, x.active !== false, x.order || su.length + 1, olStampOf_(x.reg)]); suChanged = true } })
  if (suChanged) write_(ss, T.subjects, 7, su)
  // Sessions
  var cur = read_(ss, T.sessions, 8), pos = {}
  cur.forEach(function (r, i) { pos[r[0]] = i })
  var rows = v.sessions.map(function (s) {
    var R = s.regs, id = s.subjectKey + '|' + s.date
    var upd = olMaxStamp_(R.alive, R.date, R.topic)
    return [id, s.subjectKey, s.classKey, dateFromIso_(s.date), plainText_(s.topic), s.status, s.createdAt || olStampOf_(R.alive), upd]
  })
  rows.sort(function (a, b) { var pa = pos[a[0]], pb = pos[b[0]]; if (pa != null && pb != null) return pa - pb; if (pa != null) return -1; if (pb != null) return 1; return a[0] < b[0] ? -1 : 1 })
  var sameSes = rows.length === cur.length && rows.every(function (r, i) { var c = cur[i]; return c[0] === r[0] && c[1] === r[1] && c[2] === r[2] && (c[3] instanceof Date ? isoDate_(c[3]) : String(c[3])) === isoDate_(r[3]) && (String(c[4]) === r[4] || plainText_(String(c[4])) === r[4] || String(c[4]) === String(r[4]).replace(/^'/, '')) && String(c[5] || 'Open') === r[5] && toIsoStamp_(c[7]) === r[7] })
  if (!sameSes) write_(ss, T.sessions, 8, rows.map(function (r, i) { var c = cur[i]; if (c && c[0] === r[0] && toIsoStamp_(c[6])) r[6] = c[6]; return r }))
  // Ticks (and J = manual Submitted)
  var tk = ticksRead_(ss), tpos = {}
  tk.forEach(function (r, i) { tpos[r[0]] = i })
  var trows = v.ticks.map(function (t) {
    var subjectKey = t.viewSid.split('|')[0], r = t.reg, by = r.win.by || (r.win.deviceId === 'sheet' ? 'sheet' : 'app')
    var sub = v.subs[t.sid + '|' + t.roll]
    return [t.viewSid + '|' + t.roll, t.viewSid, subjectKey, sectionOf_(subjectKey), t.roll, t.set, String(r.win.recvAt || ''), by, sub === true ? true : sub === 'off' ? 'off' : false]
  })
  trows.sort(function (a, b) { var pa = tpos[a[0]], pb = tpos[b[0]]; if (pa != null && pb != null) return pa - pb; if (pa != null) return -1; if (pb != null) return 1; return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0 })
  var eq = function (c, r) { return c && c[0] === r[0] && c[1] === r[1] && c[2] === r[2] && c[3] === r[3] && Number(c[4]) === r[4] && (c[5] === true) === r[5] && toIsoStamp_(c[6]) === r[6] && String(c[7]) === r[7] && c[8] === r[8] }
  var prefix = trows.length >= tk.length && tk.every(function (c, i) { return trows[i][0] === c[0] })
  if (prefix) { var dirty = {}; trows.forEach(function (r, i) { if (!eq(tk[i], r)) dirty[i] = true }); if (Object.keys(dirty).length) ticksWriteChanged_(ss, trows, dirty, tk.length, isCompact_(ss, T.ticks, 8)) }
  else ticksWrite_(ss, trows)
  // Roster: Left from the log (pupil rows themselves stay hand-made)
  var ro = read_(ss, T.roster, 7), roChanged = false
  ro.forEach(function (r) {
    var x = v.left[r[0] + '|' + Number(r[1])]; if (!x || x.win.deviceId === 'base') return
    var st2 = x.value === 'Left' ? 'Left' : 'Active'
    if ((r[3] === 'Left' ? 'Left' : 'Active') === st2) return
    r[3] = st2; r[4] = st2 === 'Left' ? (r[4] || dateFromIso_(String(x.win.recvAt).slice(0, 10))) : ''; r[6] = String(x.win.recvAt); roChanged = true
  })
  if (roChanged) write_(ss, T.roster, 7, ro)
  // Marks (dl.2 readers): a view too, when the tab exists
  if (ss.getSheetByName(MARKS_TAB)) {
    var mk = v.marks.map(function (m) { return [m.viewSid + '|' + m.roll, m.viewSid, m.at, m.back === true, String(m.reg.win.recvAt || ''), m.reg.win.deviceId] })
    var curM = marksRead_(ss)
    if (JSON.stringify(curM.map(function (r) { return r.slice(0, 4) })) !== JSON.stringify(mk.map(function (r) { return r.slice(0, 4) }))) marksWrite_(ss, mk)
  }
}
function olConflictsLog_(ss, st) {
  if (!st.fold.conflicts.length) return
  var have = {}; olRows_(ss, 'conflicts').forEach(function (r) { have[r[1] + '|' + r[5] + '|' + r[8]] = true })
  var id = function (c) { return c.opId || (c.deviceId + ':' + c.seq) }
  var rows = st.fold.conflicts.filter(function (c) { return !have[c.register + '|' + id(c.win) + '|' + id(c.lose)] }).map(function (c) {
    return [nowIso_(), c.register, c.rule, JSON.stringify(c.win.value), c.win.deviceId, id(c.win), JSON.stringify(c.lose.value), c.lose.deviceId, id(c.lose)]
  })
  olAppend_(ss, 'conflicts', rows)
}

// ── hand edits after Migrate: become ops from device 'sheet' ──
function olOnEdit_(ss, s, name, row, col, nr, nc) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000)
  try {
    var st = olLoad_(ss), list = []
    var sidOf = function (viewSid) { for (var i = 0; i < st.view.sessions.length; i++) { var x = st.view.sessions[i]; if (x.subjectKey + '|' + x.date === viewSid) return x.sid } return null }
    if (name === T.entry) {
      var key = String(s.getRange(1, 2).getValue() || ''), d = s.getRange(2, 2).getValue()
      if (row <= 3 && col <= 2 && col + nc - 1 >= 2) {
        if (row === 3 && key && d instanceof Date) { var sx = sidOf(key + '|' + isoDate_(d)); if (sx) list.push({ kind: 'session.topic', target: sx, value: String(s.getRange(3, 2).getValue() || '') }) }
        else return renderEntry_(ss, s, key, d)
      } else if (row >= ENTRY_FIRST_ROW && col <= 3 && col + nc - 1 >= 3 && key && d instanceof Date) {
        var iso = isoDate_(d), sid = sidOf(key + '|' + iso)
        if (!sid) { sid = key + '|' + iso; var k = 0; while (st.fold.regs['alive:' + sid]) sid = key + '|' + iso + '~s' + (++k); list.push({ kind: 'session.add', target: sid, value: { subjectKey: key, classKey: sectionOf_(key), date: iso, topic: String(s.getRange(3, 2).getValue() || '') } }) }
        for (var i = 0; i < nr; i++) { var roll = Number(s.getRange(row + i, 1).getValue()); if (roll > 0) list.push({ kind: 'tick.set', target: sid + '|' + roll, value: s.getRange(row + i, 3).getValue() === true }) }
      }
    } else if (row >= 2 && name === T.ticks) {
      for (var j = 0; j < nr; j++) {
        var tr = s.getRange(row + j, 1, 1, 6).getValues()[0], ts = sidOf(String(tr[1]))
        if (ts && col <= 6 && col + nc - 1 >= 6) list.push({ kind: 'tick.set', target: ts + '|' + Number(tr[4]), value: tr[5] === true })
      }
    } else if (row >= 2 && name === T.sessions) {
      for (var m = 0; m < nr; m++) {
        var r = s.getRange(row + m, 1, 1, 5).getValues()[0], ss2 = sidOf(String(r[0]))
        if (ss2 && col <= 4 && col + nc - 1 >= 4 && r[3] instanceof Date) list.push({ kind: 'session.date', target: ss2, value: isoDate_(r[3]) })
        if (ss2 && col <= 5 && col + nc - 1 >= 5) list.push({ kind: 'session.topic', target: ss2, value: String(r[4] == null ? '' : r[4]) })
      }
    } else if (row >= 2 && name === T.roster) {
      for (var q = 0; q < nr; q++) { var rr = s.getRange(row + q, 1, 1, 4).getValues()[0]; if (col <= 4 && col + nc - 1 >= 4 && rr[0]) list.push({ kind: 'left.set', target: rr[0] + '|' + Number(rr[1]), value: rr[3] === 'Left' ? 'Left' : 'Active' }) }
    } else if (row >= 2 && name === T.subjects) {
      for (var u = 0; u < nr; u++) {
        var sr = s.getRange(row + u, 1, 1, 6).getValues()[0]; if (!sr[0]) continue
        if (!st.fold.regs['subj:' + sr[0]]) list.push({ kind: 'subject.add', target: String(sr[0]), value: { classKey: sr[1], subject: sr[2], kind: sr[3], order: sr[5], active: sr[4] !== false } })
        else if (col <= 5 && col + nc - 1 >= 5) list.push({ kind: 'subject.active', target: String(sr[0]), value: sr[4] !== false })
      }
    }
    var r2 = olSheetOps_(ss, st, list)
    if (!r2 || !r2.added.length) olRender_(ss, st) // nothing taken (or refused): put the view back to the log's state
    else if (r2.accepted.some(function (a) { return a.status === 'refused' })) olRender_(ss, st)
  } finally { lock.releaseLock() }
}

// ── Migrate (one click, Drive copy first) ──
function olMigrate_(ss, nowIso) {
  nowIso = nowIso || nowIso_()
  if (olMigrated_(ss)) throw new Error('This sheet is already on the op log (nothing changed)')
  sheet_(ss, T.ticks)
  var backup = ss.copy('BACKUP pre-op-log ' + String(nowIso).slice(0, 10) + ' – ' + ss.getName()) // the whole file, bound script included
  var base = [], B = function (register, value, recvAt, by) { base.push({ register: register, value: value, opId: '', deviceId: 'base', seq: 0, lamport: 0, vv: {}, recvAt: String(recvAt || ''), wallAt: String(recvAt || ''), by: by }) }
  read_(ss, T.subjects, 7).forEach(function (r) { var at = toIsoStamp_(r[6]) || nowIso; B('subj:' + r[0], { classKey: r[1], subject: r[2], kind: r[3], order: r[5] }, at); B('subjAct:' + r[0], r[4] !== false, at) })
  read_(ss, T.sessions, 8).forEach(function (r) {
    var sid = String(r[0]), at = toIsoStamp_(r[7]) || nowIso
    B('alive:' + sid, true, at); B('meta:' + sid, { subjectKey: r[1], classKey: r[2], status: r[5] || 'Open', createdAt: toIsoStamp_(r[6]) }, at)
    B('date:' + sid, r[3] instanceof Date ? isoDate_(r[3]) : String(r[3]), at); B('topic:' + sid, String(r[4] == null ? '' : r[4]), at)
  })
  ticksRead_(ss).forEach(function (r) {
    var t = r[1] + '|' + Number(r[4]), at = toIsoStamp_(r[6])
    B('tick:' + t, r[5] === true, at, String(r[7] || 'migrate'))
    if (r[8] === true || r[8] === 'off') B('sub:' + t, r[8], at)
  })
  read_(ss, T.roster, 7).forEach(function (r) { B('left:' + r[0] + '|' + Number(r[1]), r[3] === 'Left' ? 'Left' : 'Active', toIsoStamp_(r[6]) || nowIso) })
  marksRead_(ss).forEach(function (m) { if (m[2]) B('mark:' + m[1] + '|' + Number(String(m[0]).split('|').pop()), { at: m[2], back: m[3] === true }, m[4]) })
  olTab_(ss, 'ops'); olTab_(ss, 'conflicts'); olWriteAll_(ss, 'base', base.map(olBaseRow_))
  meta_(ss, 'oplogFloor', '{}')
  if (!metaGet_(ss, 'tickConflict')) meta_(ss, 'tickConflict', 'set')
  meta_(ss, 'oplogBackup', backup.getUrl())
  meta_(ss, 'oplogMigratedAt', nowIso)
  var st = olLoad_(ss), before = state_(ss, true)
  olRender_(ss, st)
  var after = state_(ss, true), same = JSON.stringify([before.sessions, before.ticks, before.roster, before.subjects]) === JSON.stringify([after.sessions, after.ticks, after.roster, after.subjects])
  return { base: base.length, backupUrl: backup.getUrl(), identical: same }
}
function menuMigrateOplog() {
  var ui = SpreadsheetApp.getUi(), ss = SpreadsheetApp.getActiveSpreadsheet()
  if (olMigrated_(ss)) { ui.alert('Op log', 'This sheet is already on the op log.', ui.ButtonSet.OK); return }
  var ok = ui.alert('Migrate to op log', 'A full copy of this file is made in your Drive first. After this, every change is kept as an op, and app versions before Driftline beta.18 (and the old SoW app) are told to update; they can still read. Continue?', ui.ButtonSet.OK_CANCEL)
  if (ok !== ui.Button.OK) return
  var r = withLock_(function () { return olMigrate_(ss) })
  ui.alert('Op log ready', 'Base rows: ' + r.base + (r.identical ? ' · tabs unchanged' : ' · tabs were tidied, please check') + '\nBackup copy: ' + r.backupUrl, ui.ButtonSet.OK)
}

// ── Compaction (§13): a function, an optional daily trigger (not installed automatically) ──
function olTodayIso_() { return new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10) } // Asia/Calcutta, no DST
function olCompactNow_(ss, nowMs) {
  if (!olMigrated_(ss)) throw new Error('Not on the op log yet')
  nowMs = nowMs == null ? Date.now() : nowMs
  var st = olLoad_(ss), today = new Date(nowMs + 330 * 60000).toISOString().slice(0, 10), cut = new Date(nowMs - OL_KEEP_DAYS * 864e5).toISOString()
  var r = olCompact(st.base, st.ops, st.rules, today, cut, st.floor)
  if (!r.gone.length) return { folded: 0 }
  var before = JSON.stringify(olPlain(olView(olFold(st.base, st.ops, st.rules)))), after = JSON.stringify(olPlain(olView(olFold(r.base, r.ops, st.rules))))
  if (before !== after) throw new Error('Compaction would change the data · nothing was changed')
  var b = SpreadsheetApp.create('SoW Ops backup ' + today), sh = b.insertSheet('Ops')
  var all = st.ops.map(olOpRow_); sh.getRange(1, 1, 1, OL_H.ops.length).setValues([OL_H.ops]); ensureRows_(sh, all.length + 1)
  if (all.length) sh.getRange(2, 1, all.length, OL_H.ops.length).setNumberFormat('@').setValues(all)
  var first = b.getSheetByName('Sheet1'); if (first) b.deleteSheet(first)
  SpreadsheetApp.flush()
  olWriteAll_(ss, 'base', r.base.map(olBaseRow_)); olWriteAll_(ss, 'ops', r.ops.map(olOpRow_))
  meta_(ss, 'oplogFloor', JSON.stringify(r.floor)); meta_(ss, 'lastCompaction', new Date(nowMs).toISOString() + ' folded ' + r.gone.length + ' backup ' + b.getUrl())
  return { folded: r.gone.length, backupUrl: b.getUrl(), left: r.ops.length }
}
function compactionJob() { var ss = SpreadsheetApp.getActiveSpreadsheet(); if (olMigrated_(ss)) withLock_(function () { return olCompactNow_(ss) }) }
/** Optional: run once from the Apps Script editor to compact every night at 3 (not installed automatically). */
function installCompactionTrigger() { ScriptApp.newTrigger('compactionJob').timeBased().everyDays(1).atHour(3).create() }
function menuCompactOplog() {
  var ui = SpreadsheetApp.getUi(), ss = SpreadsheetApp.getActiveSpreadsheet()
  if (ui.alert('Compact op log', 'Ops older than ' + OL_KEEP_DAYS + ' days fold into Base (the current and previous SoW of each subject are kept). A backup of Ops is made first. Continue?', ui.ButtonSet.OK_CANCEL) !== ui.Button.OK) return
  var r = withLock_(function () { return olCompactNow_(ss) })
  ui.alert('Compact op log', r.folded ? 'Folded ' + r.folded + ' ops · backup: ' + r.backupUrl : 'Nothing old enough to fold.', ui.ButtonSet.OK)
}

// <oplog-core> Op-log sync core (Q-HARM-10, CRDT_SYNC_PLAN §12/§13). ONE source: this file. bridge/Code.js carries an exact copy
// between the oplog-core markers (scripts/embed-core.mjs writes it, test OL-CORE-00 checks it). Plain JS, no imports, so it runs
// in Apps Script (V8) and in the app. No device clock decides anything here: order = version vectors (who saw what), then the
// field rule on true concurrency; recvAt (server clock) and lamport are tiebreaks only; wallAt is display only.
var OL_KINDS = ['tick.set', 'tick.mark', 'session.add', 'session.remove', 'session.date', 'session.topic', 'left.set', 'subject.add', 'subject.active']
var OL_DEFAULT_RULES = { tick: 'set' }
var OL_TICK_RULES = ['set', 'unset', 'latest']
/** The registers (field:target) an op writes, with their values. One op can write several (session.add). */
function olWrites(op) {
  var t = op.target, v = op.value
  switch (op.kind) {
    case 'tick.set': return [['tick:' + t, v === true]]
    case 'tick.mark': return [['mark:' + t, v && v.at ? { at: String(v.at), back: v.back === true } : null]]
    case 'tick.sub': return [['sub:' + t, v === true ? true : v === 'off' ? 'off' : false]]
    case 'session.add': {
      var w = [['alive:' + t, true], ['meta:' + t, { subjectKey: v.subjectKey, classKey: v.classKey, status: v.status || 'Open', createdAt: v.createdAt || '' }], ['date:' + t, v.date]]
      if (typeof v.topic === 'string') w.push(['topic:' + t, v.topic])
      return w
    }
    case 'session.remove': return [['alive:' + t, false]]
    case 'session.date': return [['date:' + t, String(v)]]
    case 'session.topic': return [['topic:' + t, String(v == null ? '' : v)]]
    case 'left.set': return [['left:' + t, v === 'Left' ? 'Left' : 'Active']]
    case 'subject.add': return [['subj:' + t, { classKey: v.classKey, subject: v.subject, kind: v.kind, order: v.order }], ['subjAct:' + t, v.active !== false]]
    case 'subject.active': return [['subjAct:' + t, v === true]]
  }
  return []
}
function olField(reg) { return reg.slice(0, reg.indexOf(':')) }
var OL_SID_FIELDS = { tick: 2, mark: 2, sub: 2, alive: 1, meta: 1, date: 1, topic: 1 }
/** Session id inside a register target (tick/mark/sub targets are sid|roll). */
function olSidOf(reg) {
  var f = olField(reg), t = reg.slice(f.length + 1)
  if (OL_SID_FIELDS[f] === 2) { var i = t.lastIndexOf('|'); return { f: f, sid: t.slice(0, i), rest: t.slice(i) } }
  if (OL_SID_FIELDS[f] === 1) return { f: f, sid: t, rest: '' }
  return null
}
function olCanon(reg, alias) {
  var s = olSidOf(reg); if (!s || !alias[s.sid]) return reg
  var x = s.sid, n = 0; while (alias[x] && n++ < 20) x = alias[x]
  return s.f + ':' + x + s.rest
}
/** a happened before b: b's version vector had seen a (or a is the migration base). */
function olBefore(a, b) {
  if (a === b) return false
  if (a.deviceId === 'base') return b.deviceId !== 'base'
  if (b.deviceId === 'base') return false
  if (a.deviceId === b.deviceId) return a.seq < b.seq
  return ((b.vv && b.vv[a.deviceId]) || 0) >= a.seq
}
/** Receipt order for tiebreaks: an op not yet received by the sheet (on this device only) counts as the newest. */
function olRecv(c) { return c.recvAt ? String(c.recvAt) : '\uffff' }
function olNewer(a, b) {
  var ra = olRecv(a), rb = olRecv(b)
  if (ra !== rb) return ra > rb ? -1 : 1
  if ((a.lamport || 0) !== (b.lamport || 0)) return (b.lamport || 0) - (a.lamport || 0)
  if (a.deviceId !== b.deviceId) return a.deviceId > b.deviceId ? -1 : 1
  return (b.seq || 0) - (a.seq || 0)
}
function olSame(a, b) { return JSON.stringify(a) === JSON.stringify(b) }
/** Winner among the candidates of one register. Returns { win, rule, lose[] } (lose = concurrent heads with another value). */
function olResolve(field, cands, rules) {
  var heads = cands.filter(function (c) { return !cands.some(function (d) { return d !== c && olBefore(c, d) }) })
  heads.sort(olNewer)
  if (heads.length === 1) return { win: heads[0], rule: 'after', lose: [] }
  var win = heads[0], rule = 'latest'
  var pick = function (fn) { for (var i = 0; i < heads.length; i++) if (fn(heads[i])) return heads[i]; return null }
  var tr = (rules && rules.tick) || 'set'
  if (field === 'tick' && tr === 'set') { win = pick(function (c) { return c.value === true }) || heads[0]; rule = 'set wins' }
  else if (field === 'tick' && tr === 'unset') { win = pick(function (c) { return c.value !== true }) || heads[0]; rule = 'unset wins' }
  else if (field === 'alive') { win = pick(function (c) { return c.value === true }) || heads[0]; rule = 'keep wins' }
  else if (field === 'left') { var s = pick(function (c) { return c.deviceId === 'sheet' }); if (s) { win = s; rule = 'sheet wins' } else rule = 'later receipt' }
  else rule = 'later receipt'
  return { win: win, rule: rule, lose: heads.filter(function (c) { return c !== win && !olSame(c.value, win.value) }) }
}
function olCand(op, value) {
  return { value: value, opId: op.opId, deviceId: op.deviceId, seq: op.seq || 0, lamport: op.lamport || 0, vv: op.vv || {}, recvAt: op.recvAt || '', wallAt: op.wallAt || '', by: op.by }
}
/** Aliases: a session.add the sheet filed under a session that already had that date (status 'alias:<sid>'). */
function olAliases(ops) {
  var a = {}
  ops.forEach(function (o) { if (o.kind === 'session.add' && typeof o.status === 'string' && o.status.indexOf('alias:') === 0) a[o.target] = o.status.slice(6) })
  return a
}
/** fold(base + ops) → registers. base = [{ register, value, deviceId, seq, lamport, vv, recvAt, wallAt, by }].
 *  Refused ops (status 'refused') never count. Returns { regs: {register: {value, win, rule, lose}}, conflicts, alias }. */
function olFold(base, ops, rules) {
  var live = ops.filter(function (o) { return o.status !== 'refused' }), alias = olAliases(live), by = {}
  var add = function (reg, c) { var k = olCanon(reg, alias); (by[k] || (by[k] = [])).push(c) }
  ;(base || []).forEach(function (b) { add(b.register, b) })
  live.forEach(function (o) {
    if (o.kind === 'session.add' && alias[o.target]) return // filed under the other session: only its ticks/topics follow (canon)
    olWrites(o).forEach(function (w) { add(w[0], olCand(o, w[1])) })
  })
  var regs = {}, conflicts = []
  Object.keys(by).forEach(function (k) {
    var r = olResolve(olField(k), by[k], rules)
    regs[k] = { value: r.win.value, win: r.win, rule: r.rule, lose: r.lose }
    r.lose.forEach(function (l) { conflicts.push({ register: k, rule: r.rule, win: r.win, lose: l }) })
  })
  return { regs: regs, conflicts: conflicts, alias: alias }
}
/** Highest seq per device (ops of one device always arrive in seq order, gaps are refused), merged over a floor. */
function olVv(ops, floor) {
  var v = {}; Object.keys(floor || {}).forEach(function (d) { v[d] = floor[d] })
  ops.forEach(function (o) { if ((v[o.deviceId] || 0) < o.seq) v[o.deviceId] = o.seq })
  return v
}
function olSince(ops, vv) { vv = vv || {}; return ops.filter(function (o) { return o.seq > (vv[o.deviceId] || 0) }) }
function olMaxLamport(ops, floorLamport) { var m = floorLamport || 0; ops.forEach(function (o) { if ((o.lamport || 0) > m) m = o.lamport || 0 }); return m }
function olPad(n) { return (n < 10 ? '0' : '') + n }
/** The view of a fold: subjects, sessions (each with its sheet id subjectKey|date), ticks, Left, marks, manual Submitted. */
function olView(f) {
  var subjects = {}, sessions = {}, ticks = [], left = {}, marks = [], subs = {}
  Object.keys(f.regs).forEach(function (k) {
    var fd = olField(k), t = k.slice(fd.length + 1), r = f.regs[k]
    if (fd === 'subj') { subjects[t] = subjects[t] || { subjectKey: t, active: true }; var v = r.value || {}; subjects[t].classKey = v.classKey; subjects[t].subject = v.subject; subjects[t].kind = v.kind; subjects[t].order = v.order; subjects[t].reg = r }
    else if (fd === 'subjAct') { subjects[t] = subjects[t] || { subjectKey: t }; subjects[t].active = r.value === true; subjects[t].actReg = r }
    else if (fd === 'left') left[t] = r
    else if (OL_SID_FIELDS[fd] === 1) { var s = sessions[t] || (sessions[t] = { sid: t }); s[fd] = r }
  })
  var out = []
  Object.keys(sessions).forEach(function (sid) {
    var s = sessions[sid]
    if (!s.alive || s.alive.value !== true || !s.meta || !s.date) return
    out.push({ sid: sid, subjectKey: s.meta.value.subjectKey, classKey: s.meta.value.classKey, date: s.date.value, topic: s.topic ? s.topic.value : '', status: s.meta.value.status || 'Open', createdAt: s.meta.value.createdAt || '', regs: s })
  })
  var vid = {}; out.forEach(function (s) { vid[s.sid] = s.subjectKey + '|' + s.date })
  var known = function (sid) { return !!sessions[sid] }
  Object.keys(f.regs).forEach(function (k) {
    var fd = olField(k); if (OL_SID_FIELDS[fd] !== 2) return
    var p = olSidOf(k), roll = Number(p.rest.slice(1)), r = f.regs[k]
    if (known(p.sid) && !vid[p.sid]) return // its session was removed (or never fully made): hidden, kept in the log
    var row = { sid: p.sid, viewSid: vid[p.sid] || p.sid, roll: roll, reg: r }
    if (fd === 'tick') { row.set = r.value === true; ticks.push(row) }
    else if (fd === 'mark') { if (r.value) { row.at = r.value.at; row.back = r.value.back === true; marks.push(row) } }
    else if (fd === 'sub') subs[p.sid + '|' + roll] = r.value
  })
  return { subjects: subjects, sessions: out, ticks: ticks, left: left, marks: marks, subs: subs }
}
/** The values of a view only (no op metadata), in a fixed order: two views are the same data when these are equal. */
function olPlain(v) {
  var sort = function (l) { return l.slice().sort(function (a, b) { var x = JSON.stringify(a), y = JSON.stringify(b); return x < y ? -1 : x > y ? 1 : 0 }) }
  return {
    subjects: sort(Object.keys(v.subjects).map(function (k) { var x = v.subjects[k]; return [k, x.classKey, x.subject, x.kind, x.order, x.active] })),
    sessions: sort(v.sessions.map(function (s) { return [s.sid, s.subjectKey, s.classKey, s.date, s.topic, s.status, s.createdAt] })),
    ticks: sort(v.ticks.map(function (t) { return [t.sid, t.viewSid, t.roll, t.set] })),
    left: sort(Object.keys(v.left).map(function (k) { return [k, v.left[k].value] })),
    marks: sort(v.marks.map(function (m) { return [m.sid, m.roll, m.at, m.back] })),
    subs: sort(Object.keys(v.subs).map(function (k) { return [k, v.subs[k]] }))
  }
}
/** §13: the SoW runs of each subject (consecutive dates sharing a topic) and the protected ones (current + previous). */
function olProtectedSids(sessions, todayIso) {
  var bySub = {}, keep = {}
  sessions.forEach(function (s) { (bySub[s.subjectKey] || (bySub[s.subjectKey] = [])).push(s) })
  Object.keys(bySub).forEach(function (k) {
    var l = bySub[k].slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0 }), runs = []
    l.forEach(function (s) { var r = runs[runs.length - 1]; if (r && r.topic === s.topic) r.sids.push(s.sid); else runs.push({ topic: s.topic, sids: [s.sid], first: s.date }) ; runs[runs.length - 1].last = s.date })
    var cur = -1; for (var i = 0; i < runs.length; i++) if (runs[i].first <= todayIso) cur = i
    if (cur < 0) cur = 0
    ;[cur, cur - 1].forEach(function (j) { if (j >= 0 && runs[j]) runs[j].sids.forEach(function (sid) { keep[sid] = true }) })
  })
  return keep
}
/** §13 compaction (pure): ops received before `cutIso`, not in the current/previous SoW and not the latest op of a
 *  Left/subject target, fold into base. Only when every register stays identical; an op leaves the log only when all the
 *  registers it writes are folded. → { base, ops, gone: [ops removed], floor: vv of removed ops (merged over `floor`) } */
function olCompact(base, ops, rules, todayIso, cutIso, floor) {
  var f = olFold(base, ops, rules), v = olView(f), keep = olProtectedSids(v.sessions, todayIso), alias = f.alias
  var regOps = {}, opRegs = {}
  var valueIn = function (o, k) { var w = olWrites(o).filter(function (x) { return olCanon(x[0], alias) === k })[0]; return w ? w[1] : undefined }
  ops.forEach(function (o) {
    if (o.kind === 'session.add' && alias[o.target]) { opRegs[o.opId] = null; return } // alias ops stay for good
    opRegs[o.opId] = o.status === 'refused' ? [] : olWrites(o).map(function (w) { var k = olCanon(w[0], alias); (regOps[k] || (regOps[k] = [])).push(o); return k })
  })
  var latest = {}
  Object.keys(regOps).forEach(function (k) { var fd = olField(k); if (fd === 'left' || fd === 'subj' || fd === 'subjAct') latest[regOps[k].slice().sort(olNewer)[0].opId] = true })
  var inC = {}
  ops.forEach(function (o) {
    var r = opRegs[o.opId]; if (!r || !o.recvAt || !(String(o.recvAt) < cutIso) || latest[o.opId]) return
    if (r.some(function (k) { var sd = olSidOf(k); return sd && keep[sd.sid] })) return
    inC[o.opId] = true
  })
  var baseBy = {}; (base || []).forEach(function (b) { var k = olCanon(b.register, alias); (baseBy[k] || (baseBy[k] = [])).push(b) })
  var newBase = {}
  for (var pass = 0; pass < 50; pass++) {
    var changed = false; newBase = {}
    Object.keys(regOps).forEach(function (k) {
      var l = regOps[k], old = l.filter(function (o) { return inC[o.opId] }); if (!old.length) return
      var fd = olField(k), stay = l.filter(function (o) { return !inC[o.opId] })
      var oldWin = olResolve(fd, (baseBy[k] || []).concat(old.map(function (o) { return olCand(o, valueIn(o, k)) })), rules).win
      var after = olResolve(fd, [oldWin].concat(stay.map(function (o) { return olCand(o, valueIn(o, k)) })), rules).win
      if (!olSame(after.value, f.regs[k].value)) { old.forEach(function (o) { delete inC[o.opId] }); changed = true; return }
      newBase[k] = oldWin
    })
    if (!changed) break
  }
  var gone = ops.filter(function (o) { return inC[o.opId] })
  var outBase = [], seen = {}
  ;(base || []).forEach(function (b) { var k = olCanon(b.register, alias); if (newBase[k]) { if (!seen[k]) { seen[k] = true; outBase.push(olBaseEntry(k, newBase[k])) } } else outBase.push(b) })
  Object.keys(newBase).forEach(function (k) { if (!seen[k]) outBase.push(olBaseEntry(k, newBase[k])) })
  return { base: outBase, ops: ops.filter(function (o) { return !inC[o.opId] }), gone: gone, floor: olVv(gone, floor) }
}
function olBaseEntry(register, c) {
  return { register: register, value: c.value, opId: c.opId || '', deviceId: c.deviceId, seq: c.seq || 0, lamport: c.lamport || 0, vv: c.vv || {}, recvAt: c.recvAt || '', wallAt: c.wallAt || '', by: c.by }
}
// </oplog-core>
