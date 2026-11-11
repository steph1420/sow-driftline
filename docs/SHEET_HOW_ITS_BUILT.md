# How the Driftline server is built

This is the plain-English companion to the full plan in `docs/SERVER_SHEET_V2_PLAN.md`. It is for Steve. Nothing in this file was built yet (11 Nov 2026). It describes the design so a later pass can construct the new server without guesswork.

We call the Google spreadsheet the **server**. Phones are called by their names (for example Maya's phone). The small file that points the app at the server is a **profile** (it used to be called a setup file).

---

## What this server is

It is a **new** Google spreadsheet, designed from scratch, that holds your classes, dates, topics and ticks. Your current live spreadsheet and the old SoW app stay as they are. Your old data is **copied in** once, not rebuilt by hand.

Under the hood, every change is a line in a hidden diary (the **op log**). The tabs you see are a picture of that diary. That is already a locked rule: phones and the server all agree by reading the same diary, not by comparing clocks.

---

## What you will see

Only the human tabs are visible. Everything the system needs is hidden.

- **Server** — a status page: Saved or Unsaved, last Update, last phone save (by name), last backup, last savestate, and the list of paired phones (names only).
- **Pupils** — the register. Class, roll, name, Active or Left. This is the one place names are edited.
- **Plan** — your scheme of work as a simple list: date, class, subject, CW or HW, topic. Add a row to add a date. Change a topic here in bulk.
- **One tab per subject**, named the way your old tabs were, for example `KGA Eng CW`. Pupils down the side, dates across the top, topic in the header, tick boxes in the grid. Same idea as the old `OLD *` tabs, but more than two dates: a year of work, with a Year cell if you want to look back.
- **Overview** — a read-only snapshot of the current work (who is set, who is not). You do not edit this one.

Hidden tabs (names starting with `_`) hold the diary, the official tables, backups index, and so on. You should not need to open them. If one is unhidden by accident it can be hidden again; the data is still there.

---

## Daily use: edit, then Update

1. Type in a human tab — tick boxes, a topic, a new date, a Left on the Pupils tab.
2. The tab says **Unsaved changes**.
3. Choose **SoW › Update** (or tick **Update now** on the tab). You get a short preview: how many ticks, topics, and so on, and whether any of that would overwrite something a phone already saved.
4. Confirm. The server writes those edits into the diary as its own changes. **Your tabs win.** Then the tabs refresh and say **Saved**.

Until you Update, a phone can still save. The server will not wipe what you are mid-typing. After you Update, your version of those cells is the one that sticks. If a phone had a clashing change, it is remembered under Sync › Review in the app, not quietly thrown away.

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

Each phone has a **profile** that points it at this server. Pairing still uses a short code. After that, the phone sends and receives diary lines in the background.

If two phones tick the same box in different ways at the same time, the usual rule is: a "done" (Set) is not lost. If *you* then Update that same box from a human tab, **your tab wins**. Conflicts are listed in the app under Sync › Review.

Old phones and the old SoW app are not used with this new server. They stay on the old live spreadsheet. Every phone that will use the new server needs the new app first, and a new profile.

---

## Starting from your old data

1. A blank spreadsheet is created and the new script is put in (you will get steps when it is time).
2. A menu item **Import from old server** reads your current data (test copy first, live only when you say go) and does not change the old file.
3. The human tabs appear, already filled. We check counts (how many sessions, how many ticks, how many Left) before anyone relies on it.
4. You get a new profile. The old spreadsheet keeps serving the old app.

---

## Another way: a small computer on the internet (Option B)

There is a complete alternative in the plan (§12): a small Go program hosted on something like Fly.io, Render, or Cloud Run, with a proper database.

It would use the same diary rules and could still keep human tabs in a Google Sheet, as a live picture of the database.

The recommendation is **not to start there**. A Sheet plus Apps Script has no extra bill, no extra machine to babysit, and your pupil names stay in your Google account. A hosted box is faster and avoids Google's script limits, but it needs a cloud account, usually a card, and someone to fix it if it goes down before school. If the Sheet version later runs into those limits, the plan already has a path to move across without changing the diary rules.

---

## What is decided, and what is waiting for you

Already locked (do not reopen unless you ask): the diary, no phone clock in charge, Set wins between phones, the server wins Left, conflicts are recorded, 60-day cleanup that never touches the current and previous SoW.

Waiting for your okay (each has a recommendation in the plan, §15): whether your Update also wins on ticks against a late phone; how many dates sit on a subject tab; Option A vs Option B; what a profile contains; whether names are edited only on Pupils; and a few smaller items (workbook name, year-end, and so on).

The next agent should not build until you have at least answered those. The full technical instructions — every tab, every column, the bridge, tests, and the Go option — are in `docs/SERVER_SHEET_V2_PLAN.md`.
