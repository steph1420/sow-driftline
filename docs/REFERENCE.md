# SoW / Driftline — system reference (sheet · bridge · app)
Last updated: 2026-11-11 (v0.9.0-beta.17, bridge 0.51.0-dl.2). Owner: Teacher-S (Steve). Written for t245u, updated t250u:
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
| Bridge source | `bridge/Code.js` (0.51.0-dl.2) + `bridge/appsscript.json`; older: `bridge/legacy/` | dl.1 deployed on TEST (and LIVE by Steve); **dl.2 not deployed** (Steve deploys; see §7). |
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

## 3. Bridge (Apps Script web app bound to the workbook)

### 3.1 Versions
| Version | Where | Adds |
|---|---|---|
| 0.44.0 | old `sow-pwa` checkout | structs rename/delete, tombstones |
| 0.46.2 | **deployed on LIVE and the TEST copy**; sow v0.47.1 `apps-script/Code.js` = `bridge/legacy/Code-0.46.2.js` | clock offset + clamp, changed-rows-only Ticks write, subManual (J), strict dates, plain-text topics, roster status check, tombstone cap |
| 0.50.0-dl.1 | written in this repo (never deployed) | device registry: pairClaim with `deviceName` → per-device key; `devicesList`/`deviceRevoke`/`deviceRename` |
| 0.51.0-dl.1 = bridge v2 | `bridge/legacy/Code-0.51.0-dl.1.js` (tag v0.9.0-beta.16); **deployed on the TEST copy** (LIVE: Steve) | 0.50 + setup-file maker (menu) + `caps` on `ping`. Additive only. |
| **0.51.0-dl.2** | `bridge/Code.js` (tag v0.9.0-beta.17; not deployed) | dl.1 + `Marks` tab: `caps` gains `marks`; `pull`/`push` `withMarks`; `push` `marks[]`. Additive only; dl.1 replies unchanged unless `withMarks:true`. |

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
| `ping` | token | – | `{ ok, schema:1, sheetId, caps? }` (v2 adds `caps`: ticks, roster, structs, sessions, subs, prefs, pairing, devices, setupFile; dl.2 adds `marks`) |
| `pull` | token | – | `{ ok, schema, serverTime, subjects[], roster[], sessions[], ticks[] }` — subjects `{subjectKey,classKey,subject,kind,active,order}`; roster `{classKey,roll,name,status,updatedAt}`; sessions `{sessionId,subjectKey,classKey,date:'yyyy-mm-dd',topic,status,updatedAt}`; ticks `{tickId,sessionId,subjectKey,classKey,roll,set,updatedAt,sub,subOff}`. dl.2: request `{ withMarks:true }` adds `marks[]` `{tickId,sessionId,roll,at,back,updatedAt}` (absent otherwise) |
| `push` | token | `{ clientNow?, structs?[], ticks?[], subs?[], sessions?[], roster?[], marks?[] (dl.2), withMarks? (dl.2) }` | `{ ok, applied, ignored, rejected[], sessionsApplied, structApplied, marksApplied (dl.2), offsetMs, state:<pull> }` |
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

### 3.4 Menu (`onOpen` → menu "SoW")
`1. Setup + migrate (once)` · `Show app token` · v2 `Make app setup file…` · `Remove a subject (backup first)…` (makes a Drive backup
spreadsheet of that subject's rows, then removes them; the backup URL goes into `_Meta`).

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

Restore after a move (beta.17): every local move is logged with its time (`moves`, last 300). Restoring a snapshot maps its session ids
through the moves made after the snapshot, so it restores ticks on the session's current date and never brings back the old column.

### 5.3 Device storage keys (`storageKey(name)`)
`prefs` · `view` · `dev` · `deviceName` · `lastTab` · `hints` · `favs` · `nameSort` · `scope` · `shareTemplates` · `copyToken` (token or
device key) · `copyBridge` (bridge URL) · `outbox` · `tabs` (BroadcastChannel name) · `demoTicks` / `demoTicksSchool` ·
`undo-{demo|copy}` · `snapshots-{demo|copy}` · `edits-{demo|copy}[-school]` · `marks-{demo|copy}[-school]` · `marksOut` (beta.17:
mark changes waiting for the sheet) · `moves` (beta.17: move log `{from,to,at}` used by Restore).
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

### 7.3 Point Driftline at LIVE (later, separate go; needs code change)
Driftline Beta refuses any sheet but the TEST copy (`allowedSheets` in `src/data/sheetSource.ts`, Steve t168u/t169u). Opening LIVE needs:
(a) Steve's decision which flavor may use LIVE; (b) change `allowedSheets`; (c) a break-it run against a fresh Drive copy of LIVE;
(d) a setup file from the LIVE bridge (7.2 step 3). Until then the old app stays on LIVE and Steve keeps working there.

### 7.4 Moving to a new sheet design later
Export with `pull` (JSON: subjects, roster, sessions, ticks) + `prefsPull`; ids are self-describing (`subjectKey|date|roll`), so a new store
can be filled from that JSON alone. Keep the contract in §3.3 or version it (06 rule 5: additive = minor, breaking = major, a mismatch fails visibly).

## 8. Known caveats (open)
- Marks are shared only once dl.2 is deployed; until then they stay on each device. Marks made before dl.2 are not uploaded backwards
  (only changes after it). The old app v0.47.1 neither shows nor sends marks.
- A refused move is detected by the bridge's message text (0.44 – dl.2 all use the same text).
- Phone clock running fast: own tick shown over another device's newer one until reload. Same roll twice in a class would share ticks.
- Another device's later edit to the same tick wins without notice. Accented first letters go under "A" on the rail.
- `SOW_TOMBS` keeps sandbox tombstones from tests (60-day expiry); harmless.

## 9. Change log of this file
- 2026-11-11 first version (t245u).
- 2026-11-11 t250u: bridge dl.2 `Marks` tab, marks sync, refused-move toast, Restore after a move, §7.2a, caveats.
