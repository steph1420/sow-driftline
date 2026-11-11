# SoW / Driftline — system reference (sheet · bridge · app)
Last updated: 2026-11-11 (v0.9.0-beta.18, bridge 0.60.0-ol.1). Owner: Teacher-S (Steve). Written for t245u, updated t250u, t254u (op log):
"a reference sheet of all the structure of both the bridge script, the Google Sheets and our own app … so a redo will be easy to migrate".

No pupil names and no tokens are in this file (house rule). Private values (the live bridge URL, the live token) live only in
Steve's own setup files and in `steph1420/system-private` (`lfps/real-data/`); this file only points there.

Contents: 1 Map · 2 Google Sheets · 3 Bridge (Apps Script) · 4 Setup files · 5 App architecture · 6 Release and tests ·
7 Migration guide (live sheet → v2, app → live) · 8 Known caveats · 9 Change log of this file

---

## 1. Map

| Piece | Where | State (11 Nov 2026) |
|---|---|---|
| LIVE workbook "Notebook Status SOW" | Google Drive, id `1vGXltIwxto-KGZr1ygSDk9EEM0m5rkLySXshZMdv4UQ` | Read-only for agents. Was 0.46.2; Steve is deploying 0.51.0-dl.1 himself (t250u; agents don't ping LIVE). Used by the old app. Backup `1CyCxBkBvOBowp8EYyXOp9ssA8nzKL7-QBaPWNezq6k4`. |
| TEST copy "Notebook Status SOW - TEST copy" | id `1iIGXOzdW9NTqLxWnBwI6UkpwOKyihQxvrG8L1v6njYI` | All tests. Bridge **0.51.0-dl.1** (deployed by Steve, t250u). Backup `1UJl8tjcM1Xj2J4UBsKu-sVdWEM4WEnhltD3u0_gDF80`. Baseline: 7 sessions · 311 tick rows · 216 ticked · 89 pupils · 4 subjects. |
| Old app "SoW" (Stable) | `steph1420/sow` v0.47.1 → github.io/sow/ | Untouched. Talks to LIVE. Bridge source: `apps-script/Code.js` (copy here: `bridge/legacy/Code-0.46.2.js`). |
| Driftline (this repo) | `steph1420/sow-driftline`, branch `feat/rds2` | Beta builds from tags. Talks to the TEST copy only (`allowedSheets`). |
| Beta site | `steph1420/sow-driftline-beta` (file `BETA_REF` = full commit sha) | github.io/sow-driftline-beta/ |
| Stable Driftline site | this repo's CI on `master`/tags | Never ships a prerelease (`-beta.n`); Stable needs Steve's go. |
| Bridge source | `bridge/Code.js` (0.60.0-ol.1) + `bridge/appsscript.json`; older: `bridge/legacy/` (0.46.2, dl.1, dl.2) | dl.1 deployed on TEST (and LIVE by Steve); **dl.2 and ol.1 not deployed** (Steve deploys; see §7). |
| Working rules | `steph1420/agent-common`: `06-coding-standards.md`, `handovers/lfps-sow/WORKING_RULES.md` | |

## 2. Google Sheets

### 2.1 Before setup (the original hand-made layout, "OLD" tabs)
One tab per class + subject + kind, named like `KGA Eng CW` (regex `^(KG[A-Z])\s+(\w+)\s+(CW|HW)$`).
- `C2:D2` two date slots (text `d/m`; a real Date typed under the mm/dd locale is swapped back and flagged).
- `C3:D3` the topic for each slot.
- Row 4 down: `A` roll, `B` name, `C`/`D` checkbox per slot.
- `SoW_RosterMeta` (from the very old app): `subjectKey | roll | … | left (TRUE) | leftAt`.
`SoW › 1. Setup + migrate (once)` (`setupAndMigrate_`) reads these, builds the schema-1 tabs below, renames each old tab to
`OLD <name>`, sets locale `en_IN` and time zone `Asia/Kolkata`, and writes `_Meta`. Running it twice is refused.

### 2.2 Schema 1 (LIVE and TEST copy today; bridge v2 keeps it exactly)
Ids: `classKey` = section (`KGA`) · `subjectKey` = `CLASS_Subject_KIND` (`KGA_Eng_CW`) · `sessionId` = `subjectKey|yyyy-mm-dd`
· `tickId` = `sessionId|roll`. The script writes data columns only; formula columns are never written.

| Tab | Columns (row 1 = header, frozen) | Formats / rules |
|---|---|---|
| `Roster` | A classKey · B roll · C name · D status · E leftOn · F note · G updatedAt | D list `Active`/`Left`; E `dd/mm/yyyy`; G text (ISO). Editing a row stamps G; `Left` fills E. |
| `Subjects` | A subjectKey · B classKey · C subject · D kind · E active · F order · G createdAt | D list `CW`/`HW`; E checkbox. |
| `Sessions` | A sessionId · B subjectKey · C classKey · D date · E topic · F status · G createdAt · H updatedAt | D real Date `dd/mm/yyyy`; F list `Open`/`Completed`; G/H text ISO. Topics starting `=` or `'` are stored with a leading `'` (plain text). |
| `Ticks` | A tickId · B sessionId · C subjectKey · D classKey · E roll · F set · G updatedAt · H by · **I pupilStatus** (formula) · J subManual | F TRUE/FALSE; G text ISO; H `app` / `sheet` / `migrate`; I = `ARRAYFORMULA` lookup of Roster status ("Missing" if absent); J (0.46+) TRUE = Submitted ticked by hand, FALSE = manual off while Set on, blank = none. |
| `Entry` | B1 subjectKey (validation from Subjects!A) · B2 date · B3 topic · row 4 header `Roll / Name / Set` · rows 5+ | Hand entry on the sheet: picking B1/B2 lists Active pupils with checkboxes; ticking C goes through the same push rule (`by = sheet`). |
| `Dashboard` | Date · Subject · Topic · sessionId · classKey · Active · Set · Set % · Not Set · Names not Set | All formulas (SORT/FILTER/MAP over Sessions, Roster, Ticks); D:E hidden. |
| `_Meta` | key · value | `schemaVersion` (1), `academicYearStartMonth` (4), `migratedAt`, `migrationFlags`, `lastPush`, `removed <subjectKey>` (backup URL), v2: `setupFileMadeAt`. |
| `Prefs` (hidden, 0.36+) | key · category · value (JSON) · updatedAt · deviceId | One row per app option; newer wins per key. Keys matching `bridgeToken|token|syncUrl|sheetUrl|haptics.|chrome.reduceMotion|share.lastUsedId` are never stored. |

Script Properties (Extensions › Apps Script › Project settings): `SOW_TOKEN` (shared app token, made on first use),
`SOW_PAIR` (the one live pairing code: salt + SHA-256 + expiry + tries), `SOW_DEVICES` (0.50+: per-device keys, salted hashes only),
`SOW_TOMBS` (session tombstones `{sessionId: at}`, kept 60 days / newest 120).

### 2.3 v2 sheet layout
dl.1: identical to schema 1 (no tab, column, format or formula changes). New: menu `SoW › Make app setup file…`, `_Meta` key `setupFileMadeAt`.
Date moves, new dates, topics and deletes fit schema 1 through the existing `push` fields (§3.3).

**dl.2 adds one tab, nothing else** (additive; existing tabs, columns and formulas untouched, so the old app v0.47.1 is unaffected):

| Tab | Columns (row 1 = header, frozen) | Rules |
|---|---|---|
| `Marks` (hidden; made on the first mark write) | A tickId · B sessionId · C markedAt · D backDated · E updatedAt · F deviceId | One row per marked tick (late / back-dated). C = when the tick was marked (ISO), D TRUE/FALSE, E/F stamp. Newer E wins. C empty = mark cleared (kept as a tombstone row so an old device can't bring it back). A date move re-keys the rows; a date delete / subject removal deletes them. |

Why a separate tab and not Ticks!K/L: the bridge rewrites Ticks rows in place and the old bridge only knows A:J, so extra Ticks columns
could fall out of line with their rows; a tab only dl.2 touches can't.

### 2.4 Op-log layout (bridge 0.60.0-ol.1, after SoW › Migrate to op log)
Spec: Q-HARM-10 (agent-common `08-shared-app-patterns.md`, commit 75bd97a) = `steph1420/sow` `docs/CRDT_SYNC_PLAN.md` §12 locks + §13.
Before Migrate nothing in this section exists and the sheet works exactly as §2.2/§2.3 (the old app v0.47.1 keeps working).
Migrate adds three hidden tabs (all columns plain text) and four `_Meta` keys; no existing tab, column or formula changes:

| Tab | Columns | What |
|---|---|---|
| `Ops` | A opId (`deviceId:seq`) · B deviceId · C seq · D lamport · E vv (JSON) · F kind · G target · H value (JSON) · I wallAt · J recvAt · K status | Every change, appended in receipt order. K: '' = counts · `refused` = the sheet said no (kept so seq has no gap, never counts) · `alias:<sid>` = a new date that another session already had; filed under that session. |
| `Base` | A register · B value (JSON) · C opId · D deviceId · E seq · F lamport · G vv · H recvAt · I wallAt · J by | The state the log starts from: Migrate writes one row per register from the old tabs (device `base`, lamport 0, seen by every op); compaction folds old ops in (they keep their device/seq/vv). |
| `Conflicts` | A at · B register · C rule · D winValue · E winDevice · F winOp · G loseValue · H loseDevice · I loseOp | One row per true-concurrency clash, written once. Nothing blocks sync. |

`_Meta`: `oplogMigratedAt` (the switch), `oplogBackup` (URL of the full Drive copy made first), `oplogFloor` (JSON vv of compacted ops),
`tickConflict` (`set` default · `unset` · `latest` = the Developer-option hook: Steve can change it in `_Meta`; there is no app UI for it),
later `lastCompaction`.

Registers (field:target), what each op kind writes. A session's id (`sid`) is fixed when it is made (`subjectKey|yyyy-mm-dd` of its first
date, or with a `+`/`~…` suffix if that id was used before); its date is a register, so a move changes no ids:

| Op kind | target | value | Registers written | True-concurrency rule |
|---|---|---|---|---|
| `tick.set` | `sid|roll` | true/false | `tick:` | **Set wins** (tickConflict `unset` = Unset wins, `latest` = later recvAt) |
| `tick.mark` | `sid|roll` | `{at, back}` or null (cleared) | `mark:` | later recvAt |
| `session.add` | sid | `{subjectKey, classKey, date, topic?}` | `alive:` true, `meta:`, `date:`, `topic:` | alive: keep wins |
| `session.remove` | sid | null | `alive:` false | keep wins (an add beats a concurrent remove) |
| `session.date` | sid | `yyyy-mm-dd` | `date:` | later recvAt |
| `session.topic` | sid | text ≤ 200 | `topic:` | later recvAt |
| `left.set` | `classKey|roll` | `Left`/`Active` | `left:` | **sheet wins**; device vs device: later recvAt |
| `subject.add` | `CLASS_Subject_KIND` | `{classKey, subject, kind, order}` | `subj:`, `subjAct:` true | later recvAt |
| `subject.active` | subjectKey | true/false | `subjAct:` | later recvAt |

Migration-only registers: `sub:sid|roll` (Ticks!J manual Submitted) — kept from Base, no op kind yet.

Order (core `olBefore`/`olResolve`): op B is after op A when B's vv has seen A (`vv[A.deviceId] ≥ A.seq`), or same device and later seq; Base
is before everything. The winner of a register is the one op every other op came before; if two or more ops are concurrent, the rule above
picks one (ties: recvAt, then lamport, then deviceId) and the others are written to Conflicts. **No device clock decides anything**:
`wallAt` is display only; recvAt (the sheet's clock at receipt) only breaks ties.

After Migrate the old tabs are **views**: the bridge rewrites Sessions, Ticks (+J), Roster D/E/G (Left), Subjects E (Active) and Marks from
fold(Base + Ops) after every accepted op, writing only what changed. On the sheet a session shows as `subjectKey|date` (its current date),
so the old `pull`, the Dashboard and Entry formulas read as before. Hand edits there become ops from device `sheet` (vv = everything the
sheet has, so they come after everything synced): Entry ticks and topic (B3), Ticks F, Sessions D (date) and E (topic), Roster D,
Subjects E and new Subjects rows. A hand edit the log refuses (e.g. a date that is taken) is put back. New pupils are still typed into
Roster by hand (names are not ops).

## 3. Bridge (Apps Script web app bound to the workbook)

### 3.1 Versions
| Version | Where | Adds |
|---|---|---|
| 0.44.0 | old `sow-pwa` checkout | structs rename/delete, tombstones |
| 0.46.2 | **deployed on LIVE and the TEST copy**; sow v0.47.1 `apps-script/Code.js` = `bridge/legacy/Code-0.46.2.js` | clock offset + clamp, changed-rows-only Ticks write, subManual (J), strict dates, plain-text topics, roster status check, tombstone cap |
| 0.50.0-dl.1 | written in this repo (never deployed) | device registry: pairClaim with `deviceName` → per-device key; `devicesList`/`deviceRevoke`/`deviceRename` |
| 0.51.0-dl.1 = bridge v2 | `bridge/legacy/Code-0.51.0-dl.1.js` (tag v0.9.0-beta.16); **deployed on the TEST copy** (LIVE: Steve) | 0.50 + setup-file maker (menu) + `caps` on `ping`. Additive only. |
| 0.51.0-dl.2 | `bridge/legacy/Code-0.51.0-dl.2.js` (tag v0.9.0-beta.17; not deployed) | dl.1 + `Marks` tab: `caps` gains `marks`; `pull`/`push` `withMarks`; `push` `marks[]`. Additive only; dl.1 replies unchanged unless `withMarks:true`. |
| **0.60.0-ol.1** | `bridge/Code.js` (tag v0.9.0-beta.18; not deployed) | dl.2 + op log (§2.4, §3.5): caps `oplog`, ping `oplog: true/false`, `opsPull`/`opsPush`, menu Migrate / Compact, compaction. Before Migrate: identical to dl.2 (old app suite 63/63). After: legacy `push` → `update the app`. |

Compatibility proof: the old app's own bridge suite (sow v0.47.1, `apps-script/test`, 63 tests) passes on `bridge/Code.js`
except the 7 checks that compare the version label; with the label set back to 0.46.2 all 63 pass. Driftline's
`tests/beta16.test.ts` / `tests/beta17.test.ts` run the app's sync against 0.46.2, dl.1 and dl.2 (`tests/helpers/realBridge.ts`).
The same 63/63 holds for dl.2 (label set back).

### 3.2 Transport and auth
- `POST <exec URL>` with `Content-Type: text/plain;charset=utf-8` (no CORS preflight) and a JSON body `{ action, token, … }`.
  `GET <exec URL>?token=…` = `pull`. Every reply is JSON and carries `version` (bridge version) and `serverNow`; `clamped: n` when stamps were clamped.
- `token` = the shared `SOW_TOKEN` or (0.50+) a non-revoked device key. Wrong/missing → `{ ok:false, error:'bad token' }` (still with `version`, so an unauthenticated ping shows the bridge version).
- Errors: `{ ok:false, error:'<message>' }`; unknown action → `error:'unknown action'` (apps use this to detect an older bridge).
- Writes run under the script lock (20 s wait).

### 3.3 Actions
| Action | Auth | Request | Reply |
|---|---|---|---|
| `ping` | token | – | `{ ok, schema:1, sheetId, caps?, oplog? }` (v2 adds `caps`: ticks, roster, structs, sessions, subs, prefs, pairing, devices, setupFile; dl.2 adds `marks`; ol.1 adds `oplog` and `oplog: true` once migrated) |
| `pull` | token | – | `{ ok, schema, serverTime, subjects[], roster[], sessions[], ticks[] }` — subjects `{subjectKey,classKey,subject,kind,active,order}`; roster `{classKey,roll,name,status,updatedAt}`; sessions `{sessionId,subjectKey,classKey,date:'yyyy-mm-dd',topic,status,updatedAt}`; ticks `{tickId,sessionId,subjectKey,classKey,roll,set,updatedAt,sub,subOff}`. dl.2: request `{ withMarks:true }` adds `marks[]` `{tickId,sessionId,roll,at,back,updatedAt}` (absent otherwise) |
| `push` | token | `{ clientNow?, structs?[], ticks?[], subs?[], sessions?[], roster?[], marks?[] (dl.2), withMarks? (dl.2) }` | `{ ok, applied, ignored, rejected[], sessionsApplied, structApplied, marksApplied (dl.2), offsetMs, state:<pull> }` |
| `opsPull` (ol.1, migrated) | token | `{ vv?, full? }` | `{ ok, migrated, vv, lamport, rules, floor, ops[] (the ones `vv` hasn't seen), base[]? (when vv is missing or behind the compaction floor, or full), roster[{classKey,roll,name}], conflicts[] (last 100) }` |
| `opsPush` (ol.1, migrated) | token | `{ deviceId, ops[≤500], vv? }` | `{ …opsPull reply, accepted[{opId, recvAt, status, message?}], dup, resend: {deviceId: fromSeq} or null, rejected[] }` |
| `pairStart` | token | – | `{ ok, code:'6 digits', expiresInSec:300, expiresAt }` |
| `pairClaim` | none | `{ code, deviceName? }` | 0.46: `{ ok, token }`; 0.50+ with deviceName: `{ ok, deviceKey, deviceId }`. Errors: bad code / no code / expired / wrong code (`triesLeft`) / locked (5 tries) |
| `pairCancel` | token | – | `{ ok }` |
| `prefsPull` | token | – | `{ ok, prefs:[{key,category,value,updatedAt,deviceId}] }` |
| `prefsPush` | token | `{ rows:[{key,category,value,updatedAt}], deviceId }` | `{ ok, applied, ignored, prefs }` |
| `devicesList` (0.50+) | token | – | `{ ok, devices:[{id,name,createdAt,lastSeen,revoked}] }` |
| `deviceRevoke` / `deviceRename` (0.50+) | token | `{ id, name? }` | `{ ok }` / `no such device` |

`push` order and rules (applyPush_): **structs first, then ticks (+ subs), then sessions, then roster, then marks (dl.2).**
- `structs[]`: `{ kind:'rename', subjectKey, from:'yyyy-mm-dd', to, at }` moves the session row (new id `subjectKey|to`) and re-keys its
  ticks (dl.2: and its marks); refused if `to` already has a session, with `rejected` text `<to> already has a session — <from> not moved`. `{ kind:'delete', subjectKey, date, at }` removes the session and its ticks. Both leave a
  tombstone on the old id; later ops for that id count only if stamped after the tombstone (so Undo works, stale ops don't resurrect).
- `ticks[]`: `{ subjectKey, date, topic, roll, set, updatedAt, sub?, subOff? }`. The session is `subjectKey|date` and is created if missing
  (unless tombstoned). Per tick, newer `updatedAt` wins. Roll must be a whole number on that class's Roster.
- `subs[]` (0.46): Submitted-by-hand flags from older apps; only ever turn J on.
- `sessions[]`: `{ subjectKey, date, topic, updatedAt }` creates the session if missing, else sets the topic when newer than the row's H.
- `roster[]`: `{ classKey, roll, status:'Active'|'Left', updatedAt }`; never invents pupils.
- `marks[]` (dl.2): `{ subjectKey, date, roll, at, back, updatedAt }` — `at` = ISO time the tick was marked, `''` = clear; `back` = back-dated.
  Newer `updatedAt` wins per tick; a mark for a session that doesn't exist is ignored; a bad shape goes to `rejected` (`bad mark …`).
  Older bridges ignore the field (unknown keys are skipped), so sending it is safe, but the app only sends it when `caps` has `marks`.
- `clientNow`: if the phone clock is off by >30 s, stamps are shifted by the offset; anything >10 min ahead of the server is clamped to now.

After Migrate (ol.1): `push` answers `{ ok:false, error:'update the app' }` and changes nothing (Q-CRDT-6); `pull`, `prefs*`, pairing and
devices work as before. Before Migrate, `opsPull`/`opsPush` answer `not migrated`.

### 3.4 Menu (`onOpen` → menu "SoW")
`1. Setup + migrate (once)` · `Show app token` · v2 `Make app setup file…` · `Remove a subject (backup first)…` (makes a Drive backup
spreadsheet of that subject's rows, then removes them; the backup URL goes into `_Meta`; **off after Migrate**: untick Active instead) ·
ol.1 `Migrate to op log (backup first)…` · `Compact op log now…`.

### 3.5 Ops contract (opsPush rules, in receipt order, under the script lock)
- An op: `{ opId: deviceId:seq, deviceId, seq (1,2,3… per device), lamport (max seen + 1), vv {deviceId: last seq seen}, kind, target, value, wallAt }`.
  deviceId = `d` + 6–40 lowercase letters/digits, chosen once per install; a device may only send its own ops (never `sheet`/`base`).
- Idempotent: an opId the sheet has is answered again (`dup`, with its recvAt/status), never applied twice. A seq at or below the compaction
  floor is a `dup` too.
- Gaps: if seq > last seq + 1 for that device, nothing from that point is taken and `resend: {deviceId: last+1}` asks for them again.
- Checks (else status `refused` with a message; the op is kept so seq stays whole): session exists and the roll is on that class's Roster
  (ticks, marks); a valid date; `session.date` onto a day that subject already has → `"<to> already has a session — <from> not moved"`
  (same text as rename since 0.44, so the app's refusal handling is shared); `session.add` on a day another session has → `alias:<sid>`.
- recvAt = the sheet's clock, strictly increasing. Then fold, rewrite the views, log new conflicts, `_Meta lastPush`.
- Limits: ≤ 500 ops per push (`OL_BATCH_MAX`); the bridge reads Ops + Base on each ops call (fine up to the ~20k ops between compactions).

### 3.6 Compaction (§13)
`olCompactNow_` (menu `Compact op log now…`, or `compactionJob` from an optional daily trigger that `installCompactionTrigger()` sets up when
Steve runs it once from the Apps Script editor; **not installed automatically**):
1. SoW runs per subject = consecutive dates (in date order) sharing a topic. Current SoW = the run holding the latest date ≤ today
   (Asia/Calcutta); all in the future → the first run. Previous SoW = the run before it (also across the school-year boundary).
2. Protected: every op on those runs' sessions (ticks, marks, topics, dates, add/remove), and the latest op of every Left/subject target.
3. Everything else received more than 60 days ago (`OL_KEEP_DAYS`) folds into Base, only where every register keeps the same value (checked
   per register, and again for the whole view before anything is written; a difference aborts with nothing changed).
4. First a Drive backup spreadsheet `SoW Ops backup <date>` of the whole Ops tab; then Base and Ops are rewritten, `oplogFloor` gets the
   removed ops' vv, `_Meta lastCompaction` the count and backup URL. Devices behind the floor get Base again on their next pull.

## 4. Setup files
A setup file connects an app to a bridge without typing. It contains the bridge URL and a token, so it is private.

| | Old SoW (sow v0.47.1) | Driftline (beta.13+; v, exportedAt, sheetUrl since beta.16) |
|---|---|---|
| kind | `sow-setup` | `sow-driftline-setup` |
| v | 1 | 1 |
| URL key | `syncUrl` | `bridgeUrl` |
| token | `token` | `token` |
| other | `sheetUrl` (may be empty), `exportedAt`, `appVersion` | `sheetUrl` (optional), `exportedAt`, `bridgeVersion` (when made by the bridge) |
| file name | (old app's choice) | `sow-driftline-setup.json` |

Driftline (`src/data/setup.ts` `parseSetup`) reads **both** kinds. Rules: BOM allowed; `v` absent or 1 (a higher `v` fails with "update the app
first"); the URL must be a deployed web app `https://script.google.com/[a/<domain>/]macros/s/<id>/exec`. After parsing, the app pings the
bridge and only keeps the file if the sheet id is allowed (Beta: TEST copy only), so an old LIVE file is refused by Beta.
Makers: Driftline Settings › Sync & pairing › Export setup file (`exportSetup`); bridge v2 menu `SoW › Make app setup file…`
(`setupFile_` + a download dialog; the token is never shown on screen; uses the shared `SOW_TOKEN`; needs a web-app deployment).

## 5. App architecture (Driftline)
Stack: React 19 + TypeScript, Vite PWA (vite-plugin-pwa), Zustand store, framer-motion. Coding rules: agent-common `06-coding-standards.md`
(one data layer, single state owner, small modules, tests with code, versioned contract, no magic numbers, small releases, decisions logged).

### 5.1 Modules (`src/`)
- `main.tsx`, `App.tsx` — boot, MotionConfig, update hook.
- `config/index.ts` — the one config module: flavor (stable/beta), `APP_VERSION`, `CONFIG.timing` (grace 3 s, retry 15 s, quick sync 4 s,
  bridge timeout 60 s, snapshot every 10 min, gesture thresholds…), `CONFIG.data` (`undoMax` 60, `snapshotsMax` 12, `snapshotBudgetChars` 1 M),
  `CONFIG.layout`; `storageKey(name)` = `<namespace>:<name>:v1` (namespace `sow-driftline` or `sow-driftline-beta`).
- `config/motion.ts` — the one motion system: `SPRING`, `DUR`, the animation scale (Off … 5x) and the 20 per-moment switches (`moments`).
- `data/` — pure logic: `contract.ts` (SheetState types), `sheetSource.ts` (bridge client, copy-only guard, `copyWriter`), `edits.ts`
  (date edits overlay, re-key, inverse, `editsToPush`), `setup.ts`, `devices.ts`, `model.ts` (classes), `overview.ts`, `qoCard.ts`,
  `quickSearch.ts`, `sortNames.ts`, `scope.ts`, `schoolYear.ts`, `since.ts`, `late.ts`, `dial.ts`, `dateFormat.ts`, `share*.ts`, `templates.ts`,
  `templateBook.ts`, `demoSchool.ts` / `fakeSource.ts` (fake demo data), `today.ts`, `gestures.ts`.
- `sync/` — `engine.ts` (auto-save: outbox + date-edit queue, one writer across tabs via Web Locks, BroadcastChannel, retry, status),
  `outbox.ts` (per-cell queue, newest wins), `ops.ts` (per-cell merge rules), `history.ts` (Undo/Redo, last 60), `snapshots.ts`
  (on-device ring, ≤1 MB), `poller.ts` (quick sync), `prefs.ts` (Prefs tab sync), `updates.ts` (PWA update check, never mid-work).
- `store/store.ts` — the single state owner (Zustand). Every screen reads from it and sends intents to it; it is the only caller of the
  engine/bridge. `store/templates.ts` — share templates.
- `screens/` — Overview, Checklist, DateSheet (Reschedule / New date), AllDates, CardMenu, ShareSheet, SortMenu, TableHead, AzRail, Wheels,
  QuickOverview + `qo/`, `settings/` (Settings pages, Sync pages, Export setup, Display, Sort), `templates/` (maker), `flash.ts` (row flash),
  `keyboard.ts`, `paint.ts`, `scroll.ts`.
- `shell/` — Bar, Dock, ClassChip, ClassesPanel, FavPicker, PastPill, Shortcuts, UndoButton, `shell.css` (all sizes as `--sow-*`), theme,
  displayScale, haptics, saveState.
- `ui/` — Sheet, Push, Chips, Switch, UndoToast, icons, hooks (`useBackLayer` = one history entry per open layer for phone Back, `useHold`,
  `usePress`, `useRubberBand`, `useMotionOn`).
- `oplog/` (t254u) — `core.js` (+ `core.d.ts`): the one fold/order/compaction core, embedded byte-for-byte in `bridge/Code.js` between
  `// <oplog-core>` markers (`node scripts/embed-core.mjs`; test OL-CORE-00 fails if they differ). `log.ts` (OpLog: local ops with seq,
  lamport, vv; receive/adopt; unsent; fold → SheetState), `persist.ts` (IndexedDB `sow-driftline-oplog`, memory fallback), `engine.ts`
  (opsPush/opsPull, resend on gap, one writer across tabs), `legacy.ts` (waiting push-path changes → ops, once).
- `vendor/driftline/` — kit tokens (`tokens.css`) and base styles. `tests/tokenPurity` forbids raw hex/px outside tokens unless the line says `token-ok`.

### 5.2 Data flow
Sheet → `pull` → `SheetState` → `engine.adoptPull` (waiting ticks on top) → `applyEdits` (waiting date edits on top) → store `data`.
A tap → `store.tick` → History (undo step) + mark time + `write(op)` → copy: `engine.local` (outbox, other tabs, save after 3 s) /
demo: on-device ops. A date edit → `store.moveSession|setTopic|addSession` (Undo of an add = a delete edit) → stored in `edits-<src>`,
shown at once, and on the copy sent with the next push (`copyWriter`: `editsToPush` folds them into `structs` + `sessions`), then dropped.
A move gives the session the sheet's id for its new date (`subjectKey|date`) and moves its waiting ticks, Undo steps, marks and focus
with it (the same rule the bridge's rename uses), so local ids always match the sheet. Reply `state` → `mergeNewest` (per cell newest
wins, waiting ticks on top). Quick sync polls `pull` every 4 s while visible.

Marks (beta.17): the app reads `caps` on each ping (`bridgeHas('marks')`). With dl.2 it pulls/pushes `withMarks:true`, queues each mark
change in the `marksOut` outbox (newest wins, sent with the next push) and adopts the sheet's marks (`sync/marks.ts adoptMarks`: newer wins,
a waiting local change wins, a cleared mark removes it). With dl.1 / 0.46 marks stay on the device only (no queue, no error).

Refused move (beta.17): date moves are sent in their own push before ticks/topics. If the reply's `rejected` says `<to> already has a
session` and the old session still exists, the app puts the session back on its old date (ids, waiting ticks, topics, marks, Undo steps),
resends the waiting ticks to the old date (never onto the other device's session), and shows the usual bottom toast:
"The sheet already has CW on Wed 9 Dec · kept on Mon 7 Dec".

Op path (beta.18, t254u): only when ping says `caps` has `oplog` **and** `oplog: true` (the sheet is migrated). Then the store sends
every intent as an op instead of the outbox/edits: a tap = `tick.set` (+ `tick.mark` for its marked time, F-LT-05), Reschedule =
`session.date`, + New date = `session.add`, Undo of it = `session.remove`, topic = `session.topic`; Undo/Redo and Restore make new ops.
`data` = the log's fold (session ids stay fixed, so no re-keying). Quick sync calls `opsPull` with the device's vv every 4 s. A refused
`session.date` gives the same toast as beta.17 and leaves the Undo list; the fold already ignores it. Conflicts are kept in the store
(`conflicts`) and logged on the sheet; Sync › Review is mocked only (`/workspace/rds2/crdt-review/`, needs Steve's lock). The first time,
whatever still waited on the push path (outbox ticks, date edits, marks) becomes ops on the sessions' first ids. If the sheet is migrated
while a phone is on the push path, its next save fails with "update the app" and the store switches to the op path at once.
Otherwise (dl.1, dl.2, ol.1 before Migrate) everything below is unchanged.

Restore after a move (beta.17): every local move is logged with its time (`moves`, last 300). Restoring a snapshot maps its session ids
through the moves made after the snapshot, so it restores ticks on the session's current date and never brings back the old column.

### 5.3 Device storage keys (`storageKey(name)`)
`prefs` · `view` · `dev` · `deviceName` · `lastTab` · `hints` · `favs` · `nameSort` · `scope` · `shareTemplates` · `copyToken` (token or
device key) · `copyBridge` (bridge URL) · `outbox` · `tabs` (BroadcastChannel name) · `demoTicks` / `demoTicksSchool` ·
`undo-{demo|copy}` · `snapshots-{demo|copy}` · `edits-{demo|copy}[-school]` · `marks-{demo|copy}[-school]` · `marksOut` (beta.17:
mark changes waiting for the sheet) · `moves` (beta.17: move log `{from,to,at}` used by Restore) · `opDevice` (t254u: this install's
op-log device id) · `opSeq` (its last seq, shared by tabs) · `tabs-oplog` (BroadcastChannel). IndexedDB `sow-driftline-oplog`, record
`<namespace>:oplog:v1`: the device's log (Base, ops, floor, rules, roster names).
Beta and Stable never share keys (different namespace on the same github.io origin).

### 5.4 Features
The full list with IDs, locks and tests is `FEATURES.md` (F-SH shell, F-OV Overview, F-CL Checklist, F-LT late/back-date, F-DT dates,
F-SY saving/sync, F-ST settings, F-TP share templates, F-DY Day theme, session/past years, §11 RDs2 checklist). Decisions: `DECISIONS.md`;
bugs: `BUGS.md`; history: `CHANGELOG.md`. Mockups: `docs/mockups/` and `/workspace/rds2/` (box).

## 6. Release and tests
Release (Beta; "always release" t-rule; Stable only on Steve's go):
1. `git branch backup/pre-v<ver>` and a tarball (no node_modules/dist).
2. `npm version <ver> --no-git-tag-version`; CHANGELOG entry at the top (turns, rollback line, tests count).
3. Commit as `LFPS~SOW <lfps-sow@users.noreply.github.com>`, explicit paths only; push `feat/rds2`, tag `v<ver>`, the backup branch.
4. In `sow-driftline-beta`: write the full sha into `BETA_REF`, commit, push; `gh run watch <id> --exit-status`.
5. Done only when the run is green **and** the bundle name in `https://steph1420.github.io/sow-driftline-beta/` changed.
Never force-push, never move a tag. Rollback = put the previous sha in `BETA_REF`.

Tests: `npx tsc -b && npx vitest run` (jsdom). `tests/*.test.ts(x)` per release/feature; `tests/helpers/realBridge.ts` runs the real bridge
code (deployed 0.46.2 or v2) on `bridge/test/mockSheets.ts` behind a fake fetch; `bridge/test/*.test.ts` = bridge unit tests (node).
Live checks on the TEST copy only (token from env `SOW_TEST_BRIDGE_TOKEN`, never printed): sandbox dates in Dec 2026, restore with the
break-it `restore.mjs` (deletes extra sandbox sessions, reverts changed cells) and compare to the baseline counts in §1.

## 7. Migration guide
### 7.0 Rollback points (do first)
1. Drive copies of LIVE and TEST copy (File › Make a copy; the bound script is copied with the file). Name: `BACKUP pre-bridge-v2 <date> – <name>`.
2. Apps Script › Deploy › Manage deployments: note the current version number (rollback = edit the deployment back to it).
3. Copy the current `Code.gs` text into a file (or keep `bridge/legacy/Code-0.46.2.js`, which is the same code).

### 7.1 Deploy bridge v2 to the TEST copy (Steve, ~5 min)
1. Open the TEST copy › Extensions › Apps Script › `Code.gs`: select all, paste all of `bridge/Code.js` (tag `v0.9.0-beta.16`). Save.
2. Deploy › Manage deployments › pencil on the existing Web app › Version: New version › Deploy (same /exec URL; paired phones keep working).
3. Reload the sheet; menu SoW › Make app setup file… → authorise if asked → Download. (Optional) open it in Driftline Beta.
4. Check: Driftline Beta still says Saved after a tick; Settings › Devices now lists devices after a re-pair.
Nothing in the sheet layout changes, so no data step is needed.

### 7.2 Deploy bridge v2 to LIVE (only when Steve says go)
Same as 7.1 on the LIVE workbook, after 7.0. The old app v0.47.1 keeps working (all its bridge tests pass on v2). Rollback: Manage deployments › previous version.

### 7.2a Upgrade dl.1 → dl.2 (marks sync; TEST copy first, LIVE only on Steve's go)
1. Rollback point: Manage deployments, note the current version (dl.1). Source also in `bridge/legacy/Code-0.51.0-dl.1.js`.
2. Extensions › Apps Script › `Code.gs`: select all, paste all of `bridge/Code.js` at tag `v0.9.0-beta.17`
   (raw: `https://raw.githubusercontent.com/steph1420/sow-driftline/v0.9.0-beta.17/bridge/Code.js`). Save.
3. Deploy › Manage deployments › pencil › Version: New version › Deploy (same /exec URL).
4. Check: open the /exec URL in a browser (unauthenticated reply shows `"version":"0.51.0-dl.2"`); in Driftline Beta mark a late tick
   on one phone and see the mark on a second phone after it syncs.
   The hidden `Marks` tab appears on the first mark. No data step; existing tabs unchanged.
Rollback: Manage deployments › the dl.1 version. The `Marks` tab can stay (nothing else reads it) or be deleted.

### 7.2b Op log: dl.1 → 0.60.0-ol.1, then Migrate (TEST copy first; LIVE only on Steve's go)
Before: phones on Driftline **beta.18 or later** (older Driftline builds and the old SoW app v0.47.1 can read but not save after Migrate).
1. Rollback point: Deploy › Manage deployments, note the current version. (dl.1 source: `bridge/legacy/Code-0.51.0-dl.1.js`.)
2. Extensions › Apps Script › `Code.gs`: select all, paste all of `bridge/Code.js` at tag `v0.9.0-beta.18`
   (raw: `https://raw.githubusercontent.com/steph1420/sow-driftline/v0.9.0-beta.18/bridge/Code.js`). Save.
3. Deploy › Manage deployments › pencil › Version: New version › Deploy (same /exec URL).
4. Check (nothing has changed yet): the /exec URL shows `"version":"0.60.0-ol.1"`; Driftline Beta still saves a tick; the old app still saves.
5. Reload the sheet. Menu SoW › **Migrate to op log (backup first)…** → OK. Authorise if asked (it copies the file in your Drive). The
   message shows the Base row count, "tabs unchanged" and the backup copy's link. `_Meta` now has `oplogMigratedAt`.
6. Check: Driftline Beta › reopen: a tick saves (Saved); the hidden `Ops` tab gets rows; ticking on Entry adds a row with device `sheet`;
   the old app now says "update the app" when it saves (by design, Q-CRDT-6), but still shows the data.
Rollback: (a) before step 5: Manage deployments › the previous version. (b) after Migrate: open the backup copy from `_Meta oplogBackup`
(a full copy made before anything changed) or, to keep the newer data, set the deployment back to dl.1 **and** delete the `_Meta` row
`oplogMigratedAt` (the views then are plain tabs again, holding the latest state; the Ops/Base/Conflicts tabs can stay hidden or be deleted).

### 7.2c Compaction (optional)
Nothing runs on its own. To compact by hand: SoW › Compact op log now…. For a nightly run: Apps Script editor › run
`installCompactionTrigger` once. The manifest lists its scopes, so first add
`"https://www.googleapis.com/auth/script.scriptapp"` to `appsscript.json` › `oauthScopes` (Project Settings › show the manifest), or the
run fails with a permission error; it then asks to approve the new permission. Remove the trigger under Triggers (clock icon).

### 7.3 Point Driftline at LIVE (later, separate go; needs code change)
Driftline Beta refuses any sheet but the TEST copy (`allowedSheets` in `src/data/sheetSource.ts`, Steve t168u/t169u). Opening LIVE needs:
(a) Steve's decision which flavor may use LIVE; (b) change `allowedSheets`; (c) a break-it run against a fresh Drive copy of LIVE;
(d) a setup file from the LIVE bridge (7.2 step 3). Until then the old app stays on LIVE and Steve keeps working there.

### 7.4 Moving to a new sheet design later
Export with `pull` (JSON: subjects, roster, sessions, ticks) + `prefsPull`; ids are self-describing (`subjectKey|date|roll`), so a new store
can be filled from that JSON alone. Keep the contract in §3.3 or version it (06 rule 5: additive = minor, breaking = major, a mismatch fails visibly).

## 8. Known caveats (open)
- Op log (ol.1) is tested on the node harness only (the real `Code.js` on the sheet mock); not yet on Google (needs Steve's deploy + Migrate).
- After Migrate: the old app v0.47.1 and Driftline ≤ beta.17 can't save ("update the app"); Remove a subject is off; prefs still use the
  old per-key newer-wins (CRDT_SYNC_PLAN §6 not built). Devices not seen for 60 days are not dropped from vectors yet (§7).
- Two tabs of one install share one seq run through localStorage; a tap in two tabs in the same millisecond could reuse a seq (the bridge
  then keeps the first and answers the second as a duplicate).
- Marks are shared only once dl.2 is deployed; until then they stay on each device. Marks made before dl.2 are not uploaded backwards
  (only changes after it). The old app v0.47.1 neither shows nor sends marks.
- A refused move is detected by the bridge's message text (0.44 – dl.2 all use the same text).
- Phone clock running fast: own tick shown over another device's newer one until reload. Same roll twice in a class would share ticks.
- Another device's later edit to the same tick wins without notice. Accented first letters go under "A" on the rail.
- `SOW_TOMBS` keeps sandbox tombstones from tests (60-day expiry); harmless.

## 9. Change log of this file
- 2026-11-11 first version (t245u).
- 2026-11-11 t254u: op log (§2.4, §3.5, §3.6, §5.2 op path, §7.2b/c, caveats).
- 2026-11-11 t250u: bridge dl.2 `Marks` tab, marks sync, refused-move toast, Restore after a move, §7.2a, caveats.
