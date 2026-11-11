// <oplog-core> Op-log sync core (Q-HARM-10, CRDT_SYNC_PLAN §12/§13). ONE source: this file. bridge/Code.js carries an exact copy
// between the oplog-core markers (scripts/embed-core.mjs writes it, test OL-CORE-00 checks it). Plain JS, no imports, so it runs
// in Apps Script (V8) and in the app. No device clock decides anything here: order = version vectors (who saw what), then the
// field rule on true concurrency; recvAt (server clock) and lamport are tiebreaks only; wallAt is display only.
export var OL_KINDS = ['tick.set', 'tick.mark', 'session.add', 'session.remove', 'session.date', 'session.topic', 'left.set', 'subject.add', 'subject.active']
export var OL_DEFAULT_RULES = { tick: 'set' }
export var OL_TICK_RULES = ['set', 'unset', 'latest']
/** The registers (field:target) an op writes, with their values. One op can write several (session.add). */
export function olWrites(op) {
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
export function olField(reg) { return reg.slice(0, reg.indexOf(':')) }
export var OL_SID_FIELDS = { tick: 2, mark: 2, sub: 2, alive: 1, meta: 1, date: 1, topic: 1 }
/** Session id inside a register target (tick/mark/sub targets are sid|roll). */
export function olSidOf(reg) {
  var f = olField(reg), t = reg.slice(f.length + 1)
  if (OL_SID_FIELDS[f] === 2) { var i = t.lastIndexOf('|'); return { f: f, sid: t.slice(0, i), rest: t.slice(i) } }
  if (OL_SID_FIELDS[f] === 1) return { f: f, sid: t, rest: '' }
  return null
}
export function olCanon(reg, alias) {
  var s = olSidOf(reg); if (!s || !alias[s.sid]) return reg
  var x = s.sid, n = 0; while (alias[x] && n++ < 20) x = alias[x]
  return s.f + ':' + x + s.rest
}
/** a happened before b: b's version vector had seen a (or a is the migration base). */
export function olBefore(a, b) {
  if (a === b) return false
  if (a.deviceId === 'base') return b.deviceId !== 'base'
  if (b.deviceId === 'base') return false
  if (a.deviceId === b.deviceId) return a.seq < b.seq
  return ((b.vv && b.vv[a.deviceId]) || 0) >= a.seq
}
/** Receipt order for tiebreaks: an op not yet received by the sheet (on this device only) counts as the newest. */
export function olRecv(c) { return c.recvAt ? String(c.recvAt) : '\uffff' }
export function olNewer(a, b) {
  var ra = olRecv(a), rb = olRecv(b)
  if (ra !== rb) return ra > rb ? -1 : 1
  if ((a.lamport || 0) !== (b.lamport || 0)) return (b.lamport || 0) - (a.lamport || 0)
  if (a.deviceId !== b.deviceId) return a.deviceId > b.deviceId ? -1 : 1
  return (b.seq || 0) - (a.seq || 0)
}
export function olSame(a, b) { return JSON.stringify(a) === JSON.stringify(b) }
/** Winner among the candidates of one register. Returns { win, rule, lose[] } (lose = concurrent heads with another value). */
export function olResolve(field, cands, rules) {
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
export function olCand(op, value) {
  return { value: value, opId: op.opId, deviceId: op.deviceId, seq: op.seq || 0, lamport: op.lamport || 0, vv: op.vv || {}, recvAt: op.recvAt || '', wallAt: op.wallAt || '', by: op.by }
}
/** Aliases: a session.add the sheet filed under a session that already had that date (status 'alias:<sid>'). */
export function olAliases(ops) {
  var a = {}
  ops.forEach(function (o) { if (o.kind === 'session.add' && typeof o.status === 'string' && o.status.indexOf('alias:') === 0) a[o.target] = o.status.slice(6) })
  return a
}
/** fold(base + ops) → registers. base = [{ register, value, deviceId, seq, lamport, vv, recvAt, wallAt, by }].
 *  Refused ops (status 'refused') never count. Returns { regs: {register: {value, win, rule, lose}}, conflicts, alias }. */
export function olFold(base, ops, rules) {
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
export function olVv(ops, floor) {
  var v = {}; Object.keys(floor || {}).forEach(function (d) { v[d] = floor[d] })
  ops.forEach(function (o) { if ((v[o.deviceId] || 0) < o.seq) v[o.deviceId] = o.seq })
  return v
}
export function olSince(ops, vv) { vv = vv || {}; return ops.filter(function (o) { return o.seq > (vv[o.deviceId] || 0) }) }
export function olMaxLamport(ops, floorLamport) { var m = floorLamport || 0; ops.forEach(function (o) { if ((o.lamport || 0) > m) m = o.lamport || 0 }); return m }
export function olPad(n) { return (n < 10 ? '0' : '') + n }
/** The view of a fold: subjects, sessions (each with its sheet id subjectKey|date), ticks, Left, marks, manual Submitted. */
export function olView(f) {
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
export function olPlain(v) {
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
export function olProtectedSids(sessions, todayIso) {
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
export function olCompact(base, ops, rules, todayIso, cutIso, floor) {
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
export function olBaseEntry(register, c) {
  return { register: register, value: c.value, opId: c.opId || '', deviceId: c.deviceId, seq: c.seq || 0, lamport: c.lamport || 0, vv: c.vv || {}, recvAt: c.recvAt || '', wallAt: c.wallAt || '', by: c.by }
}
// </oplog-core>
