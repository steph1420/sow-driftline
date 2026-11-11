#!/usr/bin/env python3
"""SOW Register (server sheet v2) - Phase 1 empty-workbook builder spec.

One source of truth for the tab layout. Emits Google Sheets batchUpdate
requests (JSON) that turn a freshly created, empty spreadsheet into the empty
SOW Register. Structure only: no pupils, no tokens, no real data.

Usage:
  python3 build_register.py requests  <defaultSheetId>  > requests.json
  python3 build_register.py markdown                    > tabs.md
  python3 build_register.py check <readback.json>       # verify headers/hidden flags

The same spec is meant to be ported verbatim into the Apps Script builder
(SoW > Advanced > Build) in Phase 6, so a rebuild from the bridge gives the
same layout. Layout doc: docs/SOW_REGISTER_LAYOUT.md.
"""
import json, sys

TITLE = "SOW Register"
# Sheets API rejects "en_IN" ("Unsupported locale", 11 Nov 2026); en_GB gives dd/mm/yyyy.
LOCALE, TZ = "en_GB", "Asia/Kolkata"
SCHEMA = 2
YEAR = "2026-27"

HUMAN_HDR_BG = {"red": 0.91, "green": 0.93, "blue": 0.97}
SYS_HDR_BG = {"red": 0.93, "green": 0.93, "blue": 0.93}
HINT_FG = {"red": 0.40, "green": 0.40, "blue": 0.40}

# ---------------------------------------------------------------- visible tabs
# Each human tab: title row (row 1, hint), header row (row 2), data from row 3.
VISIBLE = [
    dict(id=100, title="Home", tab_color={"red": 0.20, "green": 0.45, "blue": 0.85},
         purpose="Front page: is everything saved, last phone change, last backup, school year, changes to check, paired phones (names only). Filled by the Register; no typing needed.",
         cols=4, rows=40),
    dict(id=101, title="Pupils", tab_color={"red": 0.30, "green": 0.65, "blue": 0.45},
         purpose="The register. One row per pupil this school year. Admission number is the pupil's permanent ID. The only place names are typed.",
         hint="Type here, then SOW menu > Update. When a pupil leaves, set Status to Left (don't delete the row).",
         headers=["Adm No", "Name", "Class", "Roll", "Status", "Joined on", "Left on", "Note", "id"],
         widths=[90, 220, 70, 55, 80, 95, 95, 220, 60], freeze_cols=2, hidden_cols=["I"],
         rows=500),
    dict(id=102, title="Plan", tab_color={"red": 0.95, "green": 0.65, "blue": 0.20},
         purpose="The scheme of work as a list: one row per class date (date, class, subject, CW/HW, topic). Add a row to add a date; change a date to move it.",
         hint="One row per class date. Add a row to add a date, change the date to move it, then SOW menu > Update.",
         headers=["Date", "Class", "Subject", "CW/HW", "Topic", "Status", "id"],
         widths=[95, 70, 90, 65, 320, 95, 60], freeze_cols=1, hidden_cols=["G"],
         rows=1000),
    dict(id=103, title="Progress", tab_color={"red": 0.55, "green": 0.45, "blue": 0.80},
         purpose="Read-only dashboard rebuilt by the Register: open dates, this year, by class. Follows the dates open on each subject tab.",
         cols=10, rows=300),
]

HOME_CELLS = [
    ["SOW Register", "", "", ""],
    ["Setting Of Work - who has handed in which notebook.", "", "", ""],
    ["", "", "", ""],
    ["Status", "Not connected yet - the Register's script is installed in a later step.", "", ""],
    ["Last change from a phone", "-", "", ""],
    ["Last Update from this sheet", "(never)", "", ""],
    ["Last backup", "(none yet)", "", ""],
    ["Last saved copy", "(none yet)", "", ""],
    ["School year", YEAR, "", ""],
    ["Changes to check", "0", "", ""],
    ["", "", "", ""],
    ["", "", "", ""],
    ["Devices", "", "", ""],
    ["Name", "Paired on", "Last seen", "Status"],
]

PROGRESS_CELLS = [
    ["Progress", "", "", "", "", "", "", "", "", ""],
    ["Filled in by the Register. No need to type here.", "", "", "", "", "", "", "", "", ""],
    ["Open dates", "", "", "", "", "", "", "", "", ""],
    ["Class", "Subject", "CW/HW", "Date", "Topic", "Pupils", "Done", "Not yet", "%", "Not yet (names)"],
    ["", "", "", "", "", "", "", "", "", ""],
    ["This year", "", "", "", "", "", "", "", "", ""],
    ["Class", "Subject", "CW/HW", "Dates so far", "Done", "Not yet", "%", "Next date", "Next topic", ""],
    ["", "", "", "", "", "", "", "", "", ""],
    ["By class", "", "", "", "", "", "", "", "", ""],
    ["Class", "Open dates %", "This year %", "", "", "", "", "", "", ""],
]

# Subject-tab template (hidden). The script copies it to make "KGA Eng CW" etc.
TEMPLATE = dict(id=150, title="_Template",
    purpose="Layout the Register copies when a subject is added (e.g. 'KGA Eng CW'): picker row, banner, progress strip, dates, topics, Roll/Name, tick grid.",
    cells=[
        ["(subject)", "Dates shown:", "", "", "", "Update now"],
        ["All saved", "", "", "", "", ""],
        ["", "Date", "", "", "", ""],
        ["", "Topic", "", "", "", ""],
        ["Roll", "Name", "", "", "", ""],
    ])

# ---------------------------------------------------------------- hidden tabs
SYSTEM = [
    (120, "_Meta", ["key", "value", "note"], "Settings and stamps (schema, school year, epoch, last backup...). No tokens."),
    (121, "_Migrations", ["id", "appliedAt", "fromVersion", "toVersion", "notes"], "One row per layout change; 2.0.0 = this build."),
    (122, "_Classes", ["classKey", "label", "order", "active", "createdAt"], "Class list (KGA...). Feeds the Class dropdowns."),
    (123, "_Subjects", ["subjectKey", "classKey", "subject", "kind", "active", "order", "createdAt"], "One row per class subject + CW/HW; each has its own visible tab."),
    (124, "_Pupils", ["pupilId", "admNo", "name", "note", "createdAt", "updatedRecvAt"], "Pupil identity: permanent id (from the admission number), name. Kept across years."),
    (125, "_Enrolment", ["enrolId", "year", "pupilId", "classKey", "roll", "status", "joinedOn", "leftOn", "updatedRecvAt"], "Which class and roll a pupil has in each school year, and Active/Left/Moved on."),
    (126, "_Years", ["year", "startsOn", "endsOn", "status", "startedAt", "archivedAt", "archiveCopyUrl", "carriedOver", "note"], "School years: current one, and archived ones with a link to their saved copy."),
    (127, "_Sessions", ["sessionId", "subjectKey", "classKey", "year", "date", "topic", "status", "alive", "createdAt", "updatedRecvAt"], "One row per class date (stable id; moving a date keeps the id)."),
    (128, "_Ticks", ["tickId", "sessionId", "subjectKey", "pupilId", "roll", "set", "updatedRecvAt", "by", "subManual"], "One row per pupil per date: ticked or not, and which device last changed it."),
    (129, "_Marks", ["tickId", "sessionId", "markedAt", "backDated", "updatedRecvAt", "deviceId"], "When a tick was marked (and if it was back-dated)."),
    (130, "_Ops", ["opId", "deviceId", "seq", "lamport", "vv", "kind", "target", "value", "wallAt", "recvAt", "status"], "The change history (append-only). Everything else is rebuilt from this."),
    (131, "_Base", ["register", "value", "opId", "deviceId", "seq", "lamport", "vv", "recvAt", "wallAt", "by"], "Starting values (import, or history tidied after 60 days)."),
    (132, "_Conflicts", ["at", "register", "rule", "winValue", "winDeviceId", "winOpId", "loseValue", "loseDeviceId", "loseOpId", "winName", "resolvedAt", "resolvedBy"], "Two changes to the same box: who won, who lost, and whether Steve has checked it."),
    (133, "_Prefs", ["key", "category", "value", "updatedAt", "deviceId"], "Shared app settings (share templates...). Display prefs stay on each phone."),
    (134, "_HumanPublished", ["tab", "rev", "publishedAt", "hash", "snapshot"], "What each editable tab looked like when last drawn (finds unsaved typing)."),
    (135, "_TabPrefs", ["tab", "openSessionIds", "watermarkRecvAt", "watermarkVv", "watermarkLamport", "renderedAt"], "Which dates are open on each subject tab, and when it was drawn."),
    (136, "_Saves", ["id", "name", "kind", "at", "url", "fileId", "epoch", "vv", "lamport", "opCount", "year", "note"], "Index of saved copies and backups (the copies are separate Drive files)."),
    (137, "_UndoStack", ["id", "at", "label", "epoch", "forwardOps", "undoOpIds", "state"], "Last 20 Updates, for Undo / Redo (by new changes, never deleting history)."),
]

META_ROWS = [
    ["schemaVersion", str(SCHEMA), "layout version"],
    ["registerName", TITLE, "SOW = Setting Of Work"],
    ["academicYearStartMonth", "4", "April"],
    ["academicYearLabel", YEAR, "current school year"],
    ["builtAt", "{BUILT_AT}", "empty structure built"],
    ["builtBy", "LFPS~SOW phase-1 builder (structure only)", ""],
    ["bridgeVersion", "", "empty until the Register's script is installed"],
    ["epoch", "1", "bumped only by a rewind that drops phones' unsent work"],
    ["serverDeviceId", "server", "reserved id in the change history; 'sheet' accepted as the same"],
    ["serverDeviceLabel", "Register", "what people see in 'who changed what'"],
    ["pupilIdRule", "a:<Adm No, trimmed, upper-case, spaces removed>", "set once; never changes"],
    ["tickConflict", "set", "phone vs phone tick clash: Set wins"],
    ["locale", LOCALE, ""],
    ["timeZone", TZ, ""],
    ["importedAt", "", ""],
    ["importedFrom", "", ""],
    ["lastPush", "", ""],
    ["lastUpdate", "", ""],
    ["dirty", "", ""],
    ["humanRev", "0", ""],
    ["oplogFloor", "{}", ""],
    ["oplogFloorAt", "", "oldest time Rewind can reach without a saved copy"],
    ["lastCompaction", "", ""],
    ["lastBackup", "", ""],
    ["lastSave", "", ""],
    ["profileMadeAt", "", ""],
    ["repairNeeded", "", ""],
]


def col_idx(letter):
    n = 0
    for ch in letter:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def grid(sid, r0, r1, c0, c1):
    g = {"sheetId": sid, "startRowIndex": r0, "startColumnIndex": c0}
    if r1 is not None:
        g["endRowIndex"] = r1
    if c1 is not None:
        g["endColumnIndex"] = c1
    return g


def strv(v):
    return {"userEnteredValue": {"stringValue": v}}


def rows_data(rows):
    return [{"values": [strv(c) if c != "" else {} for c in r]} for r in rows]


def write(sid, r0, c0, rows):
    return {"updateCells": {"start": {"sheetId": sid, "rowIndex": r0, "columnIndex": c0},
                            "rows": rows_data(rows), "fields": "userEnteredValue"}}


def fmt(sid, r0, r1, c0, c1, cell_fmt, fields):
    return {"repeatCell": {"range": grid(sid, r0, r1, c0, c1), "cell": {"userEnteredFormat": cell_fmt},
                           "fields": fields}}


def width(sid, c, px):
    return {"updateDimensionProperties": {"range": {"sheetId": sid, "dimension": "COLUMNS", "startIndex": c, "endIndex": c + 1},
                                          "properties": {"pixelSize": px}, "fields": "pixelSize"}}


def hide_col(sid, c):
    return {"updateDimensionProperties": {"range": {"sheetId": sid, "dimension": "COLUMNS", "startIndex": c, "endIndex": c + 1},
                                          "properties": {"hiddenByUser": True}, "fields": "hiddenByUser"}}


def dv(sid, r0, c0, c1, cond, strict, msg=None, r1=None):
    rule = {"condition": cond, "strict": strict, "showCustomUi": True}
    if msg:
        rule["inputMessage"] = msg
    return {"setDataValidation": {"range": grid(sid, r0, r1, c0, c1), "rule": rule}}


def protect(sid, desc, rng=None):
    pr = {"description": desc, "warningOnly": True, "range": rng or {"sheetId": sid}}
    return {"addProtectedRange": {"protectedRange": pr}}


def named(name, rng):
    return {"addNamedRange": {"namedRange": {"name": name, "range": rng}}}


def requests(default_sid, built_at):
    R = [{"updateSpreadsheetProperties": {"properties": {"title": TITLE, "locale": LOCALE, "timeZone": TZ},
                                          "fields": "title,locale,timeZone"}}]
    # tabs: visible first, then hidden template + system tabs
    order = 0
    for t in VISIBLE:
        cols = len(t.get("headers", [])) or t["cols"]
        R.append({"addSheet": {"properties": {"sheetId": t["id"], "title": t["title"], "index": order,
                  "tabColor": t["tab_color"], "gridProperties": {"rowCount": t["rows"], "columnCount": cols,
                  "frozenRowCount": 2 if "headers" in t else 0, "frozenColumnCount": t.get("freeze_cols", 0)}}}})
        order += 1
    for sid, title, hdr, _ in SYSTEM:
        R.append({"addSheet": {"properties": {"sheetId": sid, "title": title, "index": order, "hidden": True,
                  "gridProperties": {"rowCount": 200, "columnCount": len(hdr), "frozenRowCount": 1}}}})
        order += 1
    R.append({"addSheet": {"properties": {"sheetId": TEMPLATE["id"], "title": TEMPLATE["title"], "index": order, "hidden": True,
              "gridProperties": {"rowCount": 60, "columnCount": 8, "frozenRowCount": 5, "frozenColumnCount": 2}}}})
    R.append({"deleteSheet": {"sheetId": default_sid}})

    bold = {"textFormat": {"bold": True}}
    # Home
    h = 100
    R.append(write(h, 0, 0, HOME_CELLS))
    R.append(fmt(h, 0, 1, 0, 1, {"textFormat": {"bold": True, "fontSize": 18}}, "userEnteredFormat.textFormat"))
    R.append(fmt(h, 1, 2, 0, 1, {"textFormat": {"foregroundColor": HINT_FG, "italic": True}}, "userEnteredFormat.textFormat"))
    R.append(fmt(h, 3, 10, 0, 1, bold, "userEnteredFormat.textFormat"))
    R.append(fmt(h, 12, 13, 0, 1, {"textFormat": {"bold": True, "fontSize": 12}}, "userEnteredFormat.textFormat"))
    R.append(fmt(h, 13, 14, 0, 4, {"textFormat": {"bold": True}, "backgroundColor": HUMAN_HDR_BG},
                 "userEnteredFormat(textFormat,backgroundColor)"))
    for c, px in enumerate([230, 380, 140, 110]):
        R.append(width(h, c, px))
    R.append(protect(h, "Filled in by the Register - no need to type here."))
    # Pupils / Plan
    for t in VISIBLE[1:3]:
        sid, n = t["id"], len(t["headers"])
        R.append(write(sid, 0, 0, [[t["hint"]] + [""] * (n - 1), t["headers"]]))
        R.append(fmt(sid, 0, 1, 0, n, {"textFormat": {"foregroundColor": HINT_FG, "italic": True}}, "userEnteredFormat.textFormat"))
        R.append(fmt(sid, 1, 2, 0, n, {"textFormat": {"bold": True}, "backgroundColor": HUMAN_HDR_BG},
                     "userEnteredFormat(textFormat,backgroundColor)"))
        for c, px in enumerate(t["widths"]):
            R.append(width(sid, c, px))
        for L in t["hidden_cols"]:
            R.append(hide_col(sid, col_idx(L)))
            R.append(protect(sid, "Hidden id kept by the Register - never type here.",
                             grid(sid, 0, None, col_idx(L), col_idx(L) + 1)))
        R.append(protect(sid, "Header rows - the Register reads columns by these names.", grid(sid, 0, 2, 0, n)))
    P = 101  # Pupils
    R.append(fmt(P, 2, None, 0, 1, {"numberFormat": {"type": "TEXT"}}, "userEnteredFormat.numberFormat"))
    R.append(dv(P, 2, 0, 1, {"type": "CUSTOM_FORMULA", "values": [{"userEnteredValue": "=COUNTIF($A$3:$A,A3)=1"}]}, False,
                "Admission number - must be unique."))
    R.append(dv(P, 2, 2, 3, {"type": "ONE_OF_RANGE", "values": [{"userEnteredValue": "=_Classes!$A$2:$A"}]}, False,
                "Pick a class (a new one is added on Update)."))
    R.append(dv(P, 2, 3, 4, {"type": "NUMBER_GREATER", "values": [{"userEnteredValue": "0"}]}, False, "Roll number"))
    R.append(dv(P, 2, 4, 5, {"type": "ONE_OF_LIST", "values": [{"userEnteredValue": "Active"}, {"userEnteredValue": "Left"}]}, True))
    R.append(dv(P, 2, 5, 7, {"type": "DATE_IS_VALID"}, False, "dd/mm/yyyy"))
    R.append(fmt(P, 2, None, 5, 7, {"numberFormat": {"type": "DATE", "pattern": "dd/mm/yyyy"}}, "userEnteredFormat.numberFormat"))
    L = 102  # Plan
    R.append(fmt(L, 2, None, 0, 1, {"numberFormat": {"type": "DATE", "pattern": "dd/mm/yyyy"}}, "userEnteredFormat.numberFormat"))
    R.append(dv(L, 2, 0, 1, {"type": "DATE_IS_VALID"}, True, "Date (dd/mm/yyyy)"))
    R.append(dv(L, 2, 1, 2, {"type": "ONE_OF_RANGE", "values": [{"userEnteredValue": "=_Classes!$A$2:$A"}]}, False))
    R.append(dv(L, 2, 2, 3, {"type": "ONE_OF_LIST", "values": [{"userEnteredValue": s} for s in ["Eng", "Maths", "EVS", "Hindi", "GK"]]}, False,
                "Subject (others allowed)"))
    R.append(dv(L, 2, 3, 4, {"type": "ONE_OF_LIST", "values": [{"userEnteredValue": "CW"}, {"userEnteredValue": "HW"}]}, True))
    R.append(fmt(L, 2, None, 4, 5, {"numberFormat": {"type": "TEXT"}, "wrapStrategy": "CLIP"},
                 "userEnteredFormat(numberFormat,wrapStrategy)"))
    R.append(dv(L, 2, 5, 6, {"type": "ONE_OF_LIST", "values": [{"userEnteredValue": "Open"}, {"userEnteredValue": "Completed"}]}, True))
    # Progress
    G = 103
    R.append(write(G, 0, 0, PROGRESS_CELLS))
    R.append(fmt(G, 0, 1, 0, 1, {"textFormat": {"bold": True, "fontSize": 16}}, "userEnteredFormat.textFormat"))
    R.append(fmt(G, 1, 2, 0, 1, {"textFormat": {"foregroundColor": HINT_FG, "italic": True}}, "userEnteredFormat.textFormat"))
    for r in (2, 5, 8):
        R.append(fmt(G, r, r + 1, 0, 1, {"textFormat": {"bold": True, "fontSize": 12}}, "userEnteredFormat.textFormat"))
    for r in (3, 6, 9):
        R.append(fmt(G, r, r + 1, 0, 10, {"textFormat": {"bold": True}, "backgroundColor": HUMAN_HDR_BG},
                     "userEnteredFormat(textFormat,backgroundColor)"))
    R.append(width(G, 4, 260))
    R.append(width(G, 9, 300))
    R.append(protect(G, "Rebuilt by the Register - typing here is overwritten."))
    # System tabs
    for sid, title, hdr, _ in SYSTEM:
        R.append(write(sid, 0, 0, [hdr]))
        R.append(fmt(sid, 0, None, 0, len(hdr), {"numberFormat": {"type": "TEXT"}}, "userEnteredFormat.numberFormat"))
        R.append(fmt(sid, 0, 1, 0, len(hdr), {"textFormat": {"bold": True}, "backgroundColor": SYS_HDR_BG},
                     "userEnteredFormat(textFormat,backgroundColor)"))
        R.append(protect(sid, "Register system tab - written by the script only."))
    R.append(write(120, 1, 0, [[k, v.replace("{BUILT_AT}", built_at), n] for k, v, n in META_ROWS]))
    R.append(write(121, 1, 0, [["2.0.0", built_at, "", "2", "Empty SOW Register built (structure only, no data)."]]))
    R.append(write(126, 1, 0, [[YEAR, "2026-04-01", "2027-03-31", "Current", built_at, "", "", "", ""]]))
    # Template
    T = TEMPLATE["id"]
    R.append(write(T, 0, 0, TEMPLATE["cells"]))
    R.append(fmt(T, 0, 1, 0, 1, {"textFormat": {"bold": True, "fontSize": 14}}, "userEnteredFormat.textFormat"))
    R.append(fmt(T, 1, 2, 0, 1, {"textFormat": {"foregroundColor": HINT_FG, "italic": True}}, "userEnteredFormat.textFormat"))
    R.append(fmt(T, 2, 5, 0, 8, {"textFormat": {"bold": True}, "backgroundColor": HUMAN_HDR_BG},
                 "userEnteredFormat(textFormat,backgroundColor)"))
    R.append(fmt(T, 2, 3, 2, 8, {"numberFormat": {"type": "DATE", "pattern": "dd/mm/yyyy"}}, "userEnteredFormat.numberFormat"))
    R.append(dv(T, 5, 2, 8, {"type": "BOOLEAN"}, True))
    R.append(dv(T, 0, 6, 7, {"type": "BOOLEAN"}, True, r1=1))  # G1 only (fixed after first build)
    R.append(protect(T, "Template for subject tabs - edit only through the builder."))
    # named ranges
    R += [
        named("HomeStatus", grid(100, 3, 4, 1, 2)),
        named("PupilsTable", grid(101, 1, None, 0, 9)),
        named("PlanTable", grid(102, 1, None, 0, 7)),
        named("ClassList", grid(122, 1, None, 0, 1)),
        named("SubjectList", grid(123, 1, None, 0, 1)),
        named("MetaTable", grid(120, 0, None, 0, 3)),
        named("ChangeHistory", grid(130, 0, None, 0, 11)),
    ]
    return R


def markdown():
    out = ["| # | Tab | Shown? | Columns (row 2 headers on human tabs, row 1 on system tabs) | What it is for |", "|---|---|---|---|---|"]
    i = 1
    for t in VISIBLE:
        cols = ", ".join(t.get("headers", [])) or "(see layout)"
        out.append(f"| {i} | `{t['title']}` | visible | {cols} | {t['purpose']} |"); i += 1
    for sid, title, hdr, purpose in SYSTEM:
        out.append(f"| {i} | `{title}` | hidden | {', '.join(hdr)} | {purpose} |"); i += 1
    out.append(f"| {i} | `{TEMPLATE['title']}` | hidden | (subject-tab layout) | {TEMPLATE['purpose']} |")
    return "\n".join(out)


def check(path):
    """Compare a get_spreadsheet(+grid data of row 1/2) readback to the spec."""
    data = json.load(open(path))
    sheets = {s["properties"]["title"]: s for s in data["sheets"]}
    want = [t["title"] for t in VISIBLE] + [s[1] for s in SYSTEM] + [TEMPLATE["title"]]
    errs = []
    if list(sheets) != want:
        errs.append(f"tab order {list(sheets)} != {want}")
    for t in VISIBLE:
        if sheets.get(t["title"], {}).get("properties", {}).get("hidden"):
            errs.append(f"{t['title']} should be visible")
    for _, title, _, _ in SYSTEM + [(0, TEMPLATE["title"], 0, 0)]:
        if not sheets.get(title, {}).get("properties", {}).get("hidden"):
            errs.append(f"{title} should be hidden")
    print("OK" if not errs else "\n".join(errs))
    return not errs


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "requests":
        import datetime
        now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=5, minutes=30))).strftime("%Y-%m-%dT%H:%M:%S+05:30")
        print(json.dumps(requests(int(sys.argv[2]), now), separators=(",", ":")))
    elif cmd == "markdown":
        print(markdown())
    elif cmd == "check":
        sys.exit(0 if check(sys.argv[2]) else 1)
