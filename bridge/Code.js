/**
 * SoW sheet bridge v1 (schema 1) — see docs/SHEET_LAYOUT_PLAN.md.
 * Bound to the workbook COPY. Paste into Extensions > Apps Script (or `clasp push`).
 *
 * Tabs: Roster · Subjects · Sessions · Ticks · Entry · Dashboard · _Meta
 * The script writes data columns only; Dashboard and Ticks!I are formulas.
 * Ids: sessionId = subjectKey|yyyy-mm-dd · tickId = sessionId|roll · classKey = section (KGA).
 */
var SCHEMA = 1
var BRIDGE_VERSION = '0.50.0-dl.1' // COPY bridge for Driftline: 0.46.2 + device registry (additive)
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
function state_(ss) {
  return {
    ok: true,
    schema: SCHEMA,
    serverTime: nowIso_(),
    subjects: read_(ss, T.subjects, 7).map(function (r) { return { subjectKey: r[0], classKey: r[1], subject: r[2], kind: r[3], active: r[4] !== false, order: r[5] } }),
    roster: read_(ss, T.roster, 7).map(function (r) { return { classKey: r[0], roll: Number(r[1]), name: String(r[2]), status: r[3] === 'Left' ? 'Left' : 'Active', updatedAt: toIsoStamp_(r[6]) } }),
    sessions: read_(ss, T.sessions, 8).map(function (r) { return { sessionId: r[0], subjectKey: r[1], classKey: r[2], date: r[3] instanceof Date ? isoDate_(r[3]) : String(r[3]), topic: String(r[4] || ''), status: r[5] || 'Open', updatedAt: toIsoStamp_(r[7]) } }),
    ticks: ticksRead_(ss).map(function (r) { return { tickId: r[0], sessionId: r[1], subjectKey: r[2], classKey: r[3], roll: Number(r[4]), set: r[5] === true, updatedAt: toIsoStamp_(r[6]), sub: r[8] === true, subOff: r[8] === 'off' } }),
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
      tb[from] = at; delete tb[to]; changed = true; done++
    } else if (o.kind === 'delete') {
      var dd = dateFromIso_(o.date)
      if (!dd) { rejected.push('bad delete ' + JSON.stringify(o)); return }
      var sid = sessionId_(o.subjectKey, isoDate_(dd)), k = find(sid)
      if (k >= 0) { srows.splice(k, 1); ticks = ticks.filter(function (t) { return t[1] !== sid }); changed = true }
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
  meta_(ss, 'lastPush', nowIso_())
  return { applied: applied, ignored: ignored, rejected: rejected, sessionsApplied: sessionsApplied, structApplied: structApplied, offsetMs: off }
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
  if (body.action === 'ping') return { ok: true, schema: SCHEMA, sheetId: SpreadsheetApp.getActiveSpreadsheet().getId() }
  if (body.action === 'pairStart') return withLock_(function () { return pairStart_(Date.now()) })
  if (body.action === 'pairCancel') return withLock_(function () { PropertiesService.getScriptProperties().deleteProperty(PAIR_KEY); return { ok: true } })
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  if (body.action === 'pull') return state_(ss)
  if (body.action === 'prefsPull') return withLock_(function () { return { ok: true, prefs: prefsRead_(ss) } })
  if (body.action === 'prefsPush') return withLock_(function () {
    var r = prefsPush_(ss, body.rows, body.deviceId)
    return { ok: true, applied: r.applied, ignored: r.ignored, prefs: prefsRead_(ss) }
  })
  if (body.action === 'push') {
    var lock = LockService.getScriptLock()
    lock.waitLock(20000)
    try {
      var r = applyPush_(ss, body, 'app')
      return { ok: true, applied: r.applied, ignored: r.ignored, rejected: r.rejected, sessionsApplied: r.sessionsApplied, structApplied: r.structApplied === undefined ? 0 : r.structApplied, offsetMs: r.offsetMs, state: state_(ss) }
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
    .addSeparator()
    .addItem('Remove a subject (backup first)…', 'menuRemoveSubject')
    .addToUi()
}
function menuSetup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), r = setupAndMigrate_(ss)
  SpreadsheetApp.getUi().alert('SoW setup done', 'Pupils ' + r.roster + ' · subjects ' + r.subjects + ' · sessions ' + r.sessions + ' · ticks ' + r.ticks +
    (r.flags.length ? '\n\nPlease check:\n' + r.flags.join('\n') : '') + '\n\nApp token: ' + token_(), SpreadsheetApp.getUi().ButtonSet.OK)
}
function menuToken() { SpreadsheetApp.getUi().alert('SoW app token', token_(), SpreadsheetApp.getUi().ButtonSet.OK) }
function menuRemoveSubject() {
  var ui = SpreadsheetApp.getUi(), r = ui.prompt('Remove subject', 'Type the subjectKey exactly (e.g. KGA_Eng_HW). A backup copy is made first.', ui.ButtonSet.OK_CANCEL)
  if (r.getSelectedButton() !== ui.Button.OK) return
  var out = removeSubject_(SpreadsheetApp.getActiveSpreadsheet(), r.getResponseText().trim())
  ui.alert('Removed ' + out.key, 'Backup: ' + out.url + '\nDownload (.xlsx): ' + out.downloadUrl, ui.ButtonSet.OK)
}
