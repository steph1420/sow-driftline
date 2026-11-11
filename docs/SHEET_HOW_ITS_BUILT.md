# How the Driftline server is built

This is the plain-English companion to the full plan in `docs/SERVER_SHEET_V2_PLAN.md`. It is for Steve. Nothing in this file was built yet (11 Nov 2026, updated t259u). It describes the design so a later pass can construct the new server without guesswork.

We call the Google spreadsheet the **server**. Phones are called by their names (for example Maya's phone). The small file that points the app at the server is a **profile** (it used to be called a setup file).

---

## What this server is

It is a **new** Google spreadsheet, designed from scratch, that holds your classes, dates, topics and ticks. Your current live spreadsheet and the old SoW app stay as they are. Your old data is **copied in** once, not rebuilt by hand.

Under the hood, every change is a line in a hidden diary (the **op log**). The tabs you see are a picture of that diary. That is already a locked rule: phones and the server all agree by reading the same diary, in the order the server received things, not by comparing clocks.

---

## What you will see

Only the human tabs are visible. Everything the system needs is hidden.

- **Server** — a status page: Saved or Unsaved, last Update, last phone save (by name), last backup, last savestate, and the list of paired phones (names only).
- **Pupils** — the register. Class, roll, name, Active or Left. This is the one place names are edited.
- **Plan** — your scheme of work as a simple list: date, class, subject, CW or HW, topic. Add a row to add a date. Change a topic here in bulk.
- **One tab per subject**, named the way your old tabs were, for example `KGA Eng CW`. Pupils down the side, dates across the top, topic in the header, tick boxes in the grid. **You pick which dates are open** from a dropdown at the top (you can add more). By default you get the two latest dates — the same idea as the app (today if there is one, otherwise the next class, otherwise the last past date, plus the date before it). The script shows only those columns, quickly. Your choice is remembered on that tab.
- **Progress** — a read-only dashboard, in the spirit of your old Dashboard: per class and subject, how many are done or still pending, the percentage, who is behind, and the next dates. It follows the dates you have open, and also has a "this year" total. Each subject tab also has a small progress strip for the open dates. You do not type on these; the script rebuilds them.

Hidden tabs (names starting with `_`) hold the diary, the official tables, backups index, and so on. You should not need to open them. If one is unhidden by accident it can be hidden again; the data is still there.

---

## Daily use: edit, then Update

1. Pick the dates you want to see, then type in the tab — tick boxes, a topic, a Left on the Pupils tab.
2. The tab says **Unsaved changes**. (Changing the date dropdown does not count as an unsaved edit; if you already have unsaved ticks, finish Update or discard first, then change dates.)
3. Choose **SoW › Update** (or tick **Update now** on the tab). You get a short preview: how many ticks and topics will be saved.
4. Confirm. The server writes those edits into the diary. Only the dates on the screen are included.

If a phone changed a box *after* this tab was last drawn, so you were looking at an older picture of that box, Update will **not** overwrite it. It is flagged and listed under Sync › Review in the app for you to pick. Your other edits, on boxes that were still up to date, are saved.

Until you Update, a phone can still save. The server will not wipe what you are mid-typing.

Please do not insert extra header rows or sort a subject tab in a way that moves the Roll and Name columns. If the layout is moved, Update will stop and ask you to put it back rather than guess.

---

## Backup, savestates, undo, redo

These are on the **SoW** menu.

- **Backup now** — makes a full copy in your Drive. Automatic copies are also made before big steps (import, compact, restore). The last 14 automatic copies are kept; older ones go to Drive trash. You will be told if one is trashed.
- **Save state…** — a named quick-save, like a game: "Before parents evening". It stores a Drive copy plus a bookmark in the diary. Named saves are kept until you delete them.
- **Load state…** — goes back to that save, but if a phone still has unsaved work it will be applied on top (you can Update afterwards if you want the last word).
- **Rewind to state…** — also goes back, and phones **drop** unsaved work. Use this when you really mean "put it back as it was."
- **Restore from backup…** — the same two ideas, but you pick an automatic copy.
- **Undo last Update** / **Redo** — these do not delete history. They write a new "put it back" line in the diary. You can undo the last twenty Updates. The 60-step undo on the phone is separate and still works there.

A rewind or a load always makes a safety copy of the current server first.

---

## How phones fit in

Each phone has a **profile** that points it at this server (it holds the same kind of shared token as today's setup file). Pairing still uses a short code. After that, the phone sends and receives diary lines in the background.

If two phones tick the same box in different ways at the same time, the usual rule is: a "done" (Set) is not lost. Left is decided by the server. If a phone changes a box you have open but have not yet seen, Update leaves that box and puts it in Review. Conflicts are listed in the app under Sync › Review.

Old phones and the old SoW app are not used with this new server. They stay on the old live spreadsheet. Every phone that will use the new server needs the new app first, and a new profile.

---

## Starting from your old data

1. A blank spreadsheet is created and the new script is put in (you will get steps when it is time).
2. A menu item **Import from old server** reads your current data (test copy first, live only when you say go) and does not change the old file.
3. The human tabs appear, already filled, with the two default dates open. We check counts (how many sessions, how many ticks, how many Left) before anyone relies on it.
4. You get a new profile. The old spreadsheet keeps serving the old app.

---

## Another way: a small computer on the internet (Option B)

There is a complete alternative in the plan (§12): a small Go program hosted on something like Fly.io, Render, or Cloud Run, with a proper database.

It would use the same diary rules and could still keep human tabs in a Google Sheet, as a live picture of the database.

**You have locked Option A now** (this Google spreadsheet plus Apps Script). A hosted box can come later if the Sheet version runs into Google's limits. A has no extra bill, no extra machine to babysit, and your pupil names stay in your Google account. The plan already has a path to move across without changing the diary rules.

---

## What is decided, and what is still open

Already locked (do not reopen unless you ask): the diary, no phone clock in charge, Set wins between phones, the server wins Left, conflicts are recorded, 60-day cleanup that never touches the current and previous SoW. Plus, from 11 Nov (t259u): Option A now (Go later); the profile keeps the shared token like today; Update does not overwrite a box a phone changed that you had not seen (it goes to Review); subject tabs use a date picker (default two latest dates); and the Progress dashboards follow those open dates.

Still open, with a recommendation in the plan §15: whether names are edited only on Pupils, load vs rewind, the workbook name, year-end, and a few smaller items.

The full technical instructions — every tab, every column, the bridge, tests, and the Go option — are in `docs/SERVER_SHEET_V2_PLAN.md`.
