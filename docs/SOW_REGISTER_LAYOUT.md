# SOW Register — layout plan (server sheet v2, Phase 1)

Status: **Phase 1 built** (empty structure only, 11 Nov 2026 IST, Steve t194u–t196u "You can build the sheet now"). No bridge deployed, no data imported, LIVE sheet and TEST copy untouched.
Source of truth for the layout: `scripts/sow-register/build_register.py` (the table below is generated from it). Design background: `docs/SERVER_SHEET_V2_PLAN.md`; where this file differs, **this file wins** (it carries Steve's 11 Nov answers). Dry-run walk-through: `docs/SOW_REGISTER_DRY_RUN.md`.

## 1. Steve's answers built in (11 Nov 2026)

| Topic | Answer | Effect on the layout |
|---|---|---|
| Name | Workbook **"SOW Register"** (SOW = Setting Of Work) | Title, Home A1, backup/save file names `SOW Register backup · …`, `SOW Register save · …` |
| Pupil ID (Q-SV2-3) | **Admission number** is the permanent ID | `pupilId = "a:" + AdmNo` (trimmed, upper-case, spaces removed), set once. `Adm No` is column A on Pupils. No roll-based ids. |
| Names (Q-SV2-6) | Only on the **Pupils** tab | Subject tabs and Progress show names read-only, pulled from `_Pupils`. |
| Who may update (Q-SV2-10) | **B: Steve plus any paired phone** | Bridge accepts `pupil.*`, `session.*`, `tick.*`, `left.set` from any non-revoked paired device (not owner-only). |
| End of year (Q-SV2-11) | **Third option:** "Start new year" — tick pupils to carry over (stay-backs) and/or add/import a new list; admission numbers kept; old year archived | New `_Enrolment` (class/roll/status per year) and `_Years` tabs; flow in §5. |
| Undo on the sheet (Q-SV2-7) | **A: Load and Rewind** | Load = restore a saved copy. Rewind = undo back to a **time** (§6). |
| Display prefs (Q-SV2-8) | **A: per phone for now** | `_Prefs` keeps only shared settings (share templates); contrast/Weeks never synced in v2.0. |
| Device label (Q-SV2-12) | **A: "Register"** | Change history id stays `server` (alias `sheet`, accepted); people see **Register**. |
| Test copy migration | **Dropped** | The new Register replaces it; the TEST copy stays as the old-server fallback, unmigrated. |
| Conflicts review mockups | 1–2 approved (t195u, t196u) | Unchanged; `_Conflicts` gains `resolvedAt` / `resolvedBy` so Home can count "Changes to check". |

## 2. Tabs (in order)

Visible tabs first (plain words, no ids, no jargon). Technical tabs are hidden, prefixed `_`, at the end. Subject tabs (`KGA Eng CW`, …) are **not** created by the empty build; the Register copies `_Template` when a subject is added and places it after `Plan`, before `Progress`.

| # | Tab | Shown? | Columns (row 2 headers on human tabs, row 1 on system tabs) | What it is for |
|---|---|---|---|---|
| 1 | `Home` | visible | (see layout) | Front page: is everything saved, last phone change, last backup, school year, changes to check, paired phones (names only). Filled by the Register; no typing needed. |
| 2 | `Pupils` | visible | Adm No, Name, Class, Roll, Status, Joined on, Left on, Note, id | The register. One row per pupil this school year. Admission number is the pupil's permanent ID. The only place names are typed. |
| 3 | `Plan` | visible | Date, Class, Subject, CW/HW, Topic, Status, id | The scheme of work as a list: one row per class date (date, class, subject, CW/HW, topic). Add a row to add a date; change a date to move it. |
| 4 | `Progress` | visible | (see layout) | Read-only dashboard rebuilt by the Register: open dates, this year, by class. Follows the dates open on each subject tab. |
| 5 | `_Meta` | hidden | key, value, note | Settings and stamps (schema, school year, epoch, last backup...). No tokens. |
| 6 | `_Migrations` | hidden | id, appliedAt, fromVersion, toVersion, notes | One row per layout change; 2.0.0 = this build. |
| 7 | `_Classes` | hidden | classKey, label, order, active, createdAt | Class list (KGA...). Feeds the Class dropdowns. |
| 8 | `_Subjects` | hidden | subjectKey, classKey, subject, kind, active, order, createdAt | One row per class subject + CW/HW; each has its own visible tab. |
| 9 | `_Pupils` | hidden | pupilId, admNo, name, note, createdAt, updatedRecvAt | Pupil identity: permanent id (from the admission number), name. Kept across years. |
| 10 | `_Enrolment` | hidden | enrolId, year, pupilId, classKey, roll, status, joinedOn, leftOn, updatedRecvAt | Which class and roll a pupil has in each school year, and Active/Left/Moved on. |
| 11 | `_Years` | hidden | year, startsOn, endsOn, status, startedAt, archivedAt, archiveCopyUrl, carriedOver, note | School years: current one, and archived ones with a link to their saved copy. |
| 12 | `_Sessions` | hidden | sessionId, subjectKey, classKey, year, date, topic, status, alive, createdAt, updatedRecvAt | One row per class date (stable id; moving a date keeps the id). |
| 13 | `_Ticks` | hidden | tickId, sessionId, subjectKey, pupilId, roll, set, updatedRecvAt, by, subManual | One row per pupil per date: ticked or not, and which device last changed it. |
| 14 | `_Marks` | hidden | tickId, sessionId, markedAt, backDated, updatedRecvAt, deviceId | When a tick was marked (and if it was back-dated). |
| 15 | `_Ops` | hidden | opId, deviceId, seq, lamport, vv, kind, target, value, wallAt, recvAt, status | The change history (append-only). Everything else is rebuilt from this. |
| 16 | `_Base` | hidden | register, value, opId, deviceId, seq, lamport, vv, recvAt, wallAt, by | Starting values (import, or history tidied after 60 days). |
| 17 | `_Conflicts` | hidden | at, register, rule, winValue, winDeviceId, winOpId, loseValue, loseDeviceId, loseOpId, winName, resolvedAt, resolvedBy | Two changes to the same box: who won, who lost, and whether Steve has checked it. |
| 18 | `_Prefs` | hidden | key, category, value, updatedAt, deviceId | Shared app settings (share templates...). Display prefs stay on each phone. |
| 19 | `_HumanPublished` | hidden | tab, rev, publishedAt, hash, snapshot | What each editable tab looked like when last drawn (finds unsaved typing). |
| 20 | `_TabPrefs` | hidden | tab, openSessionIds, watermarkRecvAt, watermarkVv, watermarkLamport, renderedAt | Which dates are open on each subject tab, and when it was drawn. |
| 21 | `_Saves` | hidden | id, name, kind, at, url, fileId, epoch, vv, lamport, opCount, year, note | Index of saved copies and backups (the copies are separate Drive files). |
| 22 | `_UndoStack` | hidden | id, at, label, epoch, forwardOps, undoOpIds, state | Last 20 Updates, for Undo / Redo (by new changes, never deleting history). |
| 23 | `_Template` | hidden | (subject-tab layout) | Layout the Register copies when a subject is added (e.g. 'KGA Eng CW'): picker row, banner, progress strip, dates, topics, Roll/Name, tick grid. |


## 3. Visible tabs in detail

**Home** (whole tab protected, warning only)
- A1 `SOW Register`, A2 `Setting Of Work - who has handed in which notebook.`
- A4:B10 — Status · Last change from a phone (device **name** + time) · Last Update from this sheet · Last backup · Last saved copy · School year · Changes to check (unresolved `_Conflicts` rows). Named range `HomeStatus` = B4.
- Status words: `All saved` / `Changes not saved yet - SOW menu > Update` / `Updating…` / `Needs a quick repair - SOW menu > Advanced > Repair`. Today: `Not connected yet`.
- A13 `Devices`, row 14 headers `Name | Paired on | Last seen | Status`. Names only — no keys, no hashes, no ids.
- Removed from the plan's front page: schema number and epoch (they live in `_Meta`; "no nerd palace").

**Pupils** (row 1 hint, row 2 headers, data row 3+; frozen 2 rows × 2 columns)
- `Adm No` (plain text, so leading zeros and letters survive; warning if not unique) · `Name` · `Class` (dropdown from `_Classes`, new value allowed → new class on Update) · `Roll` (number > 0; must be unique among Active pupils of a class — checked on Update) · `Status` (`Active` / `Left`, strict) · `Joined on` · `Left on` (dd/mm/yyyy) · `Note` · `id` (hidden, protected; the `pupilId`).
- Shows the **current school year** only (one row per `_Enrolment` row of this year). Rows are matched by the hidden `id`, so sorting or filtering this tab is safe.
- Never delete a pupil: set `Left`. A cleared Name on an existing row is refused in the preview.

**Plan** (row 1 hint, row 2 headers, data row 3+; frozen 2 rows × 1 column)
- `Date` (dd/mm/yyyy, strict valid date) · `Class` · `Subject` (Eng / Maths / EVS / Hindi / GK, others allowed) · `CW/HW` (strict) · `Topic` (plain text, so `=`/`+` stay text) · `Status` (`Open` / `Completed`) · `id` (hidden `sessionId`).
- New row = new date. Changed Date = move (same id). Cleared row or cleared Date on a row with an id = remove (shown in the preview, undoable). Matched by `id`, so sorting is safe.

**Subject tabs** (copied from `_Template`, e.g. `KGA Eng CW`; frozen 5 rows × 2 columns; layout rows fixed)
- Row 1: A subject title · B `Dates shown:` · C–E date-picker dropdowns (filled per subject) · F `Update now` + G checkbox.
- Row 2: A banner (`All saved` / `Changes not saved yet`) · C+ progress strip (done / not yet / %).
- Row 3 dates, row 4 topics (open dates only). Row 5 `Roll | Name`. Row 6+ tick boxes. Left pupils in a short block below a blank row labelled `Left`.
- Default open dates: the app's `pickAnchor` (today / next / last) plus the date before it.

**Progress** (whole tab protected, rebuilt by the script)
- Sections stacked with one blank row between: **Open dates** (`Class | Subject | CW/HW | Date | Topic | Pupils | Done | Not yet | % | Not yet (names)`), **This year** (`Class | Subject | CW/HW | Dates so far | Done | Not yet | % | Next date | Next topic`), **By class** (`Class | Open dates % | This year %`). The empty build places them at rows 3, 6, 9; the script moves them as rows fill.
- Names in "Not yet" are shown as `Name (roll)` so two pupils with the same name are told apart.
- A pupil counts for a date only if `Joined on ≤ date` and (`Left on` empty or `date < Left on`).

## 4. Hidden tabs — how the data maps

- **Change history** `_Ops` is the truth (append-only, never edited, never deleted). Every other `_` table and every visible tab is rebuilt from `_Base + _Ops`.
- **Pupils:** identity in `_Pupils` (pupilId, admNo, name, note) — kept across years. Class/roll/status per school year in `_Enrolment` (`enrolId = year|pupilId`). Op kinds: `pupil.add {admNo,name,classKey,roll,joinedOn}`, `pupil.name`, `pupil.adm` (correct a mistyped admission number; pupilId unchanged), `pupil.move {classKey,roll}` (current year), `left.set {status,leftOn}` (target pupilId, current year), `enrol.set` (target `year|pupilId`, written by Start new year only).
- **Dates:** `_Sessions` (stable `sessionId`, current date, topic, `year`, `alive`). Ops `session.add / date / topic / remove`; re-adding a removed id sets `alive` back to true (that is how Undo restores a date and its ticks).
- **Ticks:** `_Ticks` keyed `sessionId|pupilId` (roll kept only for the old `pull` shim); `_Marks` for the time of marking.
- **Clashes:** `_Conflicts` (phone vs phone tick = Set wins; Left = Register wins; human Update vs unseen phone change = Review, Q-SV2-1). `resolvedAt/resolvedBy` filled when Steve picks in the app.
- **Saved copies and backups:** `_Saves` indexes Drive copies (kinds `named`, `auto`, `pre-restore`, `pre-rewind`, `pre-compact`, `pre-import`, `year-end`) with epoch, vv, lamport, opCount, year.
- **Undo/Redo:** `_UndoStack`, last 20 Updates, compensating ops only.
- **School years:** `_Years` (current year row; archived years with the link to their `year-end` saved copy and how many pupils carried over). `_Meta.academicYearLabel` = current.
- **View state:** `_TabPrefs` (open dates + watermark per subject tab), `_HumanPublished` (what each editable tab looked like when last drawn).
- **Settings:** `_Meta` (key/value, no tokens), `_Migrations` (2.0.0 = this build), `_Classes`, `_Subjects`, `_Prefs`.
- System tabs are formatted as plain text (ISO dates and ids never get auto-converted), row 1 frozen, protected with a warning.

Named ranges: `HomeStatus`, `PupilsTable`, `PlanTable`, `ClassList`, `SubjectList`, `MetaTable`, `ChangeHistory`.
Protected ranges (warning only, so the script running as Steve is never blocked): Home, Progress, every `_` tab, header rows of Pupils/Plan, the hidden `id` columns.

## 5. Start new year (Q-SV2-11, Steve's third option)

Menu **SOW > Start new year…** (Register menu only, not phones):
1. Refused while any tab has unsaved typing. Makes a `year-end` saved copy `SOW Register save · End of 2026-27` (the archive).
2. Opens a temporary visible tab **`New Year`**: every Active pupil of the old year with `Carry over?` (checkbox, default off), `New class`, `New roll`; below a blank block `Adm No | Name | Class | Roll` for new pupils (type or paste a list).
3. Preview: carried N, new M, admission numbers that already exist (re-joining pupils are matched, not duplicated; a name mismatch is flagged).
4. Confirm: `_Years` closes the old year (archivedAt, archive link) and adds the new one; `enrol.set` ops for carried and new pupils; everyone not carried gets old-year status **Moved on** (identity and history kept); `_Meta.academicYearLabel` bumps; subjects copy forward; Pupils/subject tabs/Progress redraw for the new year; the `New Year` tab is removed.
5. One undo record (Undo puts the old year back) and the archive copy stays in `_Saves`.

## 6. Load and Rewind (Q-SV2-7 A)

- **Load a saved copy…** — pick from `_Saves`; backup first (`pre-restore`); copy the saved copy's values into the live Register (spreadsheet id never changes); epoch unchanged, so phones' unsent changes apply on top afterwards.
- **Rewind to a time…** — pick a date and time; backup first (`pre-rewind`); the Register works out what every box looked like at that time (`_Base + _Ops` with recvAt ≤ that time) and writes **new** `server` ops setting everything changed since back. Nothing is deleted, it is one Undo record, phones simply pull it. Times older than `_Meta.oplogFloorAt` (history tidied after 60 days) are offered the nearest saved copy instead. Optional tick **"also throw away phones' unsent changes"** bumps the epoch (the plan's original Rewind).
- Both refuse while a tab has unsaved typing, and warn when the target is in an earlier school year.

## 7. Menu (plain words)

`Update` · `Update this tab only` · `Discard my unsaved typing` · — · `Save a copy…` · `Load a saved copy…` · `Rewind to a time…` · `Back up now` · — · `Undo last Update` · `Redo` · — · `Start new year…` · — · `Advanced >` `Make app profile…`, `Show app token`, `Tidy old history now…`, `Import from old sheet…`, `Repair`.

## 8. Build notes (11 Nov 2026, 21:20 IST)

- Built in Steve's Google Drive with the Google Sheets connector from `build_register.py` (4 batch updates). The spreadsheet id is kept out of this public repo; it is in the agent's report to Steve (store it in `system-private`).
- Read back and checked: 23 tabs in the order above, 4 visible + 19 hidden, headers exact, `_Meta` 27 rows, `_Migrations` 2.0.0, `_Years` 2026-27 Current, no pupil rows, 7 named ranges, 25 warning-only protections (`build_register.py check` → OK).
- **Locale is `en_GB`, not `en_IN`:** the Sheets API refused `en_IN` ("Unsupported locale"). `en_GB` gives the same dd/mm/yyyy dates; time zone `Asia/Kolkata` (Google shows it as `Asia/Calcutta`). If Steve sets English (India) by hand in File › Settings, nothing breaks.
- First build put checkboxes on `_Template!G2:G5` by mistake; removed, and the builder now limits that checkbox to G1.
- Named ranges with open rows were saved with a fixed end (the tab's current row count, e.g. `ChangeHistory` rows 1–200). The bridge must read whole tabs (`getDataRange`), not trust named-range bounds, or re-set them after growing a tab.

## 9. What Phase 1 did not do

No Apps Script, no bridge, no menu, no triggers, no import, no subject tabs, no pupils. Phase 2 (importer) and Phase 6 (bridge `0.70.0-sv.1` bound to this Register) need Steve's go. The builder's spec is to be ported into the bridge so a rebuild gives the same layout.
