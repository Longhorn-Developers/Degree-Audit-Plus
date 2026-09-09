# DAP-115 (5.1) POC runbook

Throwaway spike for [DAP-115](https://linear.app/longhorn-devs/issue/DAP-115/51-poc-planner-mechanics-preview-timing)
and its sub-issues DAP-122 / DAP-123 / DAP-124.

Everything here needs a **real authenticated UT session (SSO + Duo)**, so it
runs on your device, not in CI and not from an agent. **`all.js` is the one
file to paste** — it bundles every script here (`poc`, `probe`, `verify`,
`overhead`, `trim`). Edit the source files and re-run `sh bundle.sh` to
regenerate it. This file is the script you follow.

Delete `scripts/spike/` once the findings are folded into
`docs/hypothetical-courses-design.md`.

---

## ✅ TODO — everything left, in order

Sections below have the detail. **Step 2 is the only thing DAP-115 is blocked
on**; 3–5 are follow-ups.

### 0. Get a session

In a fresh browser you have none. Log in at
<https://utdirect.utexas.edu/apps/degree/audits/> (SSO + Duo), then paste
`all.js` into a DevTools console **on that UT page**. Django checks
`Referer` on the audit POST, so a random tab won't do.

If `readPlanner()` throws "Not logged in", the session didn't take — re-auth
and reload before continuing.

### 1. Take stock of the planner (~1 min)

> A new browser gives you a fresh _session_, not a fresh _planner_. The planner
> lives on UT's server as one global list per student, so any rows left by
> earlier runs are still there. Look before deleting.

```js
await poc.readPlanner(); // what does UT actually have right now?
```

Then decide from the output:

- **Only your real courses** (e.g. `AFR305`, `C S331`) → nothing to do, go to
  step 2.
- **Leftover spike rows** — duplicate `C S324E` entries from the failed timing
  runs. Delete the extras, but keep any course you actually plan to take:

  ```js
  const rows = await poc.readPlanner();
  // Inspect first, delete second. `rows` shows rowText so you can eyeball it.
  for (const row of rows.filter((r) => r.key_course_id === "C S324E")) {
    await poc.testDelete(row);
  }
  ```

  If `C S324E` is a course you genuinely want planned, keep one row and delete
  only the duplicates (`rows.filter(...).slice(1)`).

Stale rows change what the audit returns, so get this right before timing.

### 2. Run the timing ⭐ (~5 min) — this is the deliverable

**Run:**

```js
await poc.timePreview({ dept: "C S", num: "324E", ccyys: "20272" }, 5);
```

No extra arguments — the form shape is known now. This creates **5 real audits**
in your UT history and adds/deletes one planner row per run.

**Expect:** five `--- round trip N/5` blocks, each logging
`round trip {resolveMs, addMs, submitMs, generateMs, scrapeMs, deleteMs,
totalMs, auditId}`, then a `console.table` at the end.

**Record:** right-click the table → Copy, or run `poc.timingTable()` again. You
want the p50/p95 row per stage.

**Judge it:**

| Result               | Meaning                                                  |
| -------------------- | -------------------------------------------------------- |
| p95 `totalMs` < 15 s | ✅ Eager-verify holds. Ticket's core question answered.  |
| p95 `totalMs` > 15 s | 🚩 **Flag DAP-114** — reopens the eager-verify decision  |
| Table prints `{}`    | Every run failed; read the error and see Troubleshooting |

**If it fails:** the error names the stage. `Planned Courses checkbox not found`
→ run `await poc.dumpAuditForm()`. A 403/CSRF → you're not on a UT page. The
harness stops after 2 consecutive failures rather than burning all five.

### 3. Re-run parallel adds (~3 min)

The earlier verdict was unsound (it couldn't tell a race from UT rejecting a
course). The test now runs a serial baseline first.

**Run — 2 or 3 times, since races are flaky:**

```js
await poc.testParallelAdd([
  { dept: "C S", num: "324E", ccyys: "20272" },
  { dept: "C S", num: "331", ccyys: "20272" },
  { dept: "C S", num: "429H", ccyys: "20272" },
]);
await poc.cleanup(); // between each run
```

**Read two findings in the output:**

- `add.serialBaseline` — which courses UT accepts one at a time. A course
  missing here was never a concurrency problem; swap in a different one.
- `add.parallel` — the verdict:

| Output                                               | Meaning                                |
| ---------------------------------------------------- | -------------------------------------- |
| `allLanded: true`, `duplicateSeq: false`, repeatable | Parallel writes look safe              |
| `allLanded: false`                                   | 🚩 **Serialize planner writes** in 5.2 |
| `duplicateSeq: true`                                 | 🚩 Serialize — seq assignment collided |

### 4. Follow the Modify URL (~5 min) — manual, no harness

**Do:** open DevTools → Network tab, then paste this into the address bar
(swap in a `key_course_seq` from your own `readPlanner()` output):

```text
https://utdirect.utexas.edu/apps/degree/audits/planner/modify_planned_course/?key_course_id=C%20S324E&key_course_ccyys=20272&key_course_seq=996&key_course_type=1&action_code=M
```

Change the term or pass/fail, submit, and in the Network tab click the submit
request.

**Record:** its **method** (GET or POST), its **URL**, and its **form data /
query params** (the "Payload" tab). That's the shape DAP-129 needs.

### 5. DAP-123 captures (~10 min) — two contexts the page console can't give you

**5a — service worker.** Run `bun run dev`, load the extension, open
`chrome://extensions` → Degree Audit + → click **service worker**. Paste
`planner-poc.js` there and run:

```js
await poc.testExecutionContext();
```

**Record** `cookiesRodeAlong`, `domParserAvailable`, `parsedPlannerRows`.
Expect `domParserAvailable: false` (MV3 has no DOM) — that's fine. The question
that matters is **`cookiesRodeAlong`**: if true, the background can fetch and
hand parsing elsewhere, which makes 5.4's pipeline much simpler.

**5b — logged out.** Open an incognito window, go to a UT audit URL **without
logging in**, paste the harness, and run:

```js
await poc.testAuthSignal();
```

**Record** which fields differ from your logged-in run. Whichever flips most
cheaply becomes the auth gate. This matters because `response.redirected` —
what `session.ts` uses today — is **true on a successful planner add**, so it
can't be the signal for writes.

### Optional (only if you have time)

- **Planner max rows:** `await poc.testAdd(...)` repeatedly until UT complains.
  Bail at ~15–20 and record where you stopped rather than inventing a number.
- **Closed term:** add a course for a past `ccyys` — rejected, or silently
  parenthesized?

### Finish

```js
poc.report(); // prints every finding collected this session
await poc.cleanup(); // planner back to how you found it
await poc.readPlanner(); // verify
```

Then: post the timing table on DAP-115, check off the table in
`docs/hypothetical-courses-design.md` § "Remaining unknowns", attach
before/after planner screenshots, and delete `scripts/spike/`.

---

> Everything below is **reference** — the mechanics behind each step, and what
> earlier runs already established. The checklist above is what to actually do.

## Ground rules

- **Screenshot the planner as-is** (View Courses) before you start. You need a
  before/after pair as proof.
- Pick a throwaway course you don't mind appearing in UT's planner log — the
  planner is one global list per student and UT logs every change. Use a course
  you'd never actually plan, in the next semester's `ccyys` (e.g. `20272`).
- `page=4` (add) and `action_code=D` (delete) are **state-changing GETs**.
  Don't re-run cells casually and don't let DevTools replay requests.

## Load the harness

Open DevTools on any `utdirect.utexas.edu` audits page, paste the whole of
`all.js` into the console, hit enter. It exposes `poc`, `probe`, `verify`,
`overhead` and `trim` in one go — no need to paste the individual files.

```js
await poc.readPlanner(); // sanity check: prints existing rows + their keys
```

If that throws "Not logged in", your session is dead — re-auth and reload.

## Why leftover rows matter

Earlier timing runs each added a row and died before deleting it, leaving
duplicate `C S324E` entries. That leak is fixed — cleanup now runs in a
`finally` — but rows written before the fix are still on UT's server, since the
planner is server-side and a new browser doesn't reset it.

Leftover rows change what a planned-inclusive audit returns, which is why step 1
above says look before you measure. Prefer a targeted filter over
`deleteAllCourses()`: it leaves your real rows untouched instead of wiping and
restoring them.

## DAP-122 — mostly done ✅

Confirmed on 2026-08-05 (recorded in
`docs/hypothetical-courses-design.md` § "Confirmed"):

| Question                   | Answer                                                      |
| -------------------------- | ----------------------------------------------------------- |
| Add via `page=4`           | Works, ~409 ms, `200` + redirect to `ut_course/`            |
| Delete via `action_code=D` | Works, ~259 ms, `200`, no redirect, exact row               |
| Duplicate add              | **Creates a duplicate row** — not a no-op                   |
| `key_course_seq`           | Counts **down** from 999 (999, 998, 997 …) — never hardcode |
| `key_course_id`            | dept+num, separator dropped: `C S` + `324E` → `C S324E`     |
| Nonexistent course         | No `page=4` link on `page=3`; no distinct error page        |
| Modify URL                 | Found — see below                                           |

**Modify** (discovered, not yet followed):

```text
/apps/degree/audits/planner/modify_planned_course/
  ?key_course_id=C S324E&key_course_ccyys=20272
  &key_course_seq=996&key_course_type=1&action_code=M
```

Still to do — open that URL in a real tab, change the term or pass/fail, submit,
and record from the Network tab what the browser actually sends. Note it carries
an extra `key_course_type` that delete doesn't, so modify's row key is a
**4-tuple**. DAP-129 needs the submit shape.

**Still open — planner limits (#6):**

```js
// Add rows one at a time until UT complains. Bail at ~15–20 if nothing does.
await poc.testAdd({ dept: "C S", num: "429H", ccyys: "20272" });
```

Record where you stopped rather than inventing a number, then `poc.cleanup()`.

Also still open: add a course for an **already-closed term** — does UT reject
it, or silently parenthesize it? (Parenthesized rows don't apply to audits, so
5.4 must treat them as sync failures.)

## Parallel adds (#8) — first result was inconclusive

The 2026-08-05 run returned `requested: 3, rowsCreated: 2, allLanded: false`
and the harness declared "UT needs serialized writes." **That conclusion wasn't
sound**, and the test has been fixed.

A missing row has two possible causes, and the old test couldn't tell them
apart:

1. A real concurrency race dropped a write.
2. UT rejected that specific course on its own merits — restricted, already
   taken, closed term. `C S 429H` had a `page=4` link but may never have been
   addable at all.

The evidence actually leaned toward **cause 2**: `duplicateSeq: false` with
clean sequential seqs `996, 997, 998` is what orderly assignment looks like,
not a corrupted race.

The test now establishes a **serial baseline first** — it adds each course one
at a time, notes which UT actually accepts, deletes them, and only then races
the courses proven to be addable. Now a shortfall means concurrency, full stop.

```js
await poc.testParallelAdd([
  { dept: "C S", num: "324E", ccyys: "20272" },
  { dept: "C S", num: "331", ccyys: "20272" },
  { dept: "C S", num: "429H", ccyys: "20272" },
]);
await poc.cleanup();
```

Read the output in two parts:

- `add.serialBaseline` — which courses UT accepts at all. If `C S 429H` is
  missing here, it was never a concurrency problem. Swap in another course.
- `add.parallel` — `allLanded: false` or `duplicateSeq: true` now genuinely
  means **serialize planner writes** in 5.2.

Races are flaky by nature, so **run it 2–3 times** before concluding parallel
is safe. One clean pass isn't proof.

## Delete All

Built as `poc.deleteAllCourses()` — but implemented as a **loop of per-row
deletes**, not UT's `action_code=A`. Same end state, three advantages: it
prints a restorable snapshot before touching anything, it reports exactly which
rows resisted deletion, and it can't half-fire into an unknown state. UT has no
undo, so that snapshot is the only way back.

```js
// Requires the exact confirmation string, so a stray paste can't fire it.
const { snapshot } = await poc.deleteAllCourses("DELETE ALL");
```

Copy the printed snapshot somewhere before continuing. To put things back:

```js
await poc.restoreFromSnapshot(snapshot);
```

Restore is **best-effort**: `key_course_seq` is UT-assigned so restored rows get
new numbers, and a course whose term has since closed won't re-add. It reports
what failed rather than pretending it round-tripped.

> Note this doesn't change the product policy — the design doc still says
> automated Delete All never ships to users, and the acceptance criteria still
> require per-row confirmation. This is spike tooling for resetting your own
> planner between runs.

## DAP-123 — what it's actually asking

Two questions that together decide **where the planner client lives**. Neither
is about the planner's behavior; both are about our extension's plumbing.

### Q1: Where can the planner code run?

A Chrome extension has two places to make requests, and they have different
powers:

|             | Content script (on a UT page)             | Background service worker                  |
| ----------- | ----------------------------------------- | ------------------------------------------ |
| Runs when   | Only while a UT tab is open               | Any time, no tab needed                    |
| Origin      | `utdirect.utexas.edu` — cookies automatic | Extension origin; needs `host_permissions` |
| `DOMParser` | Yes (it's a real page)                    | **No** — MV3 workers have no DOM           |

This matters because the whole preview flow is a background job — add, submit,
poll for ~seconds, scrape. If it must run in a content script, then **the user
closing that UT tab kills the preview mid-flight**, and 5.4 needs a
tab-lifetime strategy (there's already a known bug: the temp tab dies at 30 s
while the poll window is 90 s). If the worker can do it, the pipeline is far
simpler and more robust.

Everything you ran so far was in a **page console**, which is the
content-script case — so Q1's first half is already answered: it works there.
What's untested is the worker.

```js
await poc.testExecutionContext(); // you've effectively done this one
```

Now load the unpacked extension (`bun run dev`), open `chrome://extensions` →
Degree Audit + → **service worker**, paste `planner-poc.js` there, run the same
line. `host_permissions` for `utdirect.utexas.edu/*` is already in the manifest,
so the real questions are whether **cookies ride along** and whether parsing is
possible.

> Expect `domParserAvailable: false` — MV3 workers have no DOM. That alone
> doesn't settle it: if `cookiesRodeAlong` is true, the worker can fetch and
> hand the HTML to a content script or offscreen document to parse. A
> hybrid (fetch in worker, parse in page) may well be the answer.

### Q2: How do we know the session died?

Every planner write assumes a live session. If it's dead, we must stop _before_
writing — a half-completed preview leaves stray rows in a planner we can't
clean up. So we need a check that's cheap enough to run before every operation
and correct enough to trust.

```js
await poc.testAuthSignal(); // while logged IN — you have this data
```

Then log out (or use an incognito window) and run it again. Whichever field
flips most cheaply is the gate.

> **Your run already found a problem here.** The successful add returned
> `redirected: true`. Today
> [session.ts:39-46](../../features/session/session.ts#L39-L46) treats
> `response.redirected` as logged-out — which is fine for the read-only history
> probe it guards, but **would misread a successful planner add as a dead
> session.** That's the same bug that produced "Session died mid-add" in the
> harness. 5.2 must not reuse that check for writes. The logged-out capture
> tells us what to use instead.

## DAP-124 — preview round-trip timing (blocked → unblock it first)

The 2026-08-05 attempt produced **no timings at all**: every round trip died at
submit with `Request with GET/HEAD method cannot have body`. Two bugs, both now
fixed in the harness:

1. UT's audit form is a **GET** form — params must go in the query string, not
   a request body.
2. The harness grabbed the page's _first_ `<form>`, which is site search, not
   the audit form. That's why the Planned Courses checkbox came up missing.

**The form shape is now known** (from your `dumpAuditForm()` run, 2026-08-05).
It's form index 2 of 3 on the page:

| Property        | Value                                                        |
| --------------- | ------------------------------------------------------------ |
| Method          | **POST** (not GET)                                           |
| Action          | `""` — posts to `student_individual/` itself                 |
| CSRF            | `csrfmiddlewaretoken` (Django)                               |
| Include-options | checkboxes `current` / `future` / `planned`, all `value="X"` |
| Submit          | `name="audit"`, `value="Submit Audit"`                       |

So the Planned Courses checkbox is **`name="planned"`, `value="X"`** — that's
now the harness default. Just run:

```js
await poc.timePreview({ dept: "C S", num: "324E", ccyys: "20272" }, 5);
```

No third argument needed. (The earlier attempt passed the literal placeholder
`"THE_NAME_YOU_FOUND"` — but the real bug was mine: the form picker grabbed
UT's _site search_ form, which has no checkboxes at all, hence
`checkboxCandidates: []`. It now identifies the audit form by looking for the
`planned` checkbox itself.)

`submitPlannedAudit` still **throws rather than silently submitting without the
checkbox**, because a run that excludes planned courses measures the wrong
thing entirely. It also surfaces a Django CSRF rejection (403) instead of
polling for an audit that was never queued.

> Run this from a console **on the UT audit page**, not from a random tab —
> Django checks the `Referer` on POST, and a mismatch is rejected.

Five full round trips: resolve → add → submit → poll raw history for the new ID
→ scrape → delete. Prints a `console.table` of p50/p95 per stage.

This creates **one real audit per run** in your UT history. Five is the ticket's
minimum; don't run many more. The harness now stops after 2 consecutive
failures instead of grinding through all five.

Watch for:

- **p95 total > 15 s** → flag on DAP-114. That reopens the eager-verify
  decision, which is the whole point of measuring.
- `addMs` includes the success redirect, since that's the real cost the
  production client pays — just don't read it as pure server time.

## Troubleshooting

**"Session died mid-add" / "mid-delete"** — fixed. The old auth guard treated
`response.redirected` as logged-out, but UT's `page=4` and `action_code=D`
endpoints _redirect on success_, so a working add aborted with a scary error
after already writing the row. Mutations now report all auth signals and let
the planner before/after diff decide the outcome. If you loaded the harness
before this fix, re-paste it — and check View Courses for rows the aborted runs
left behind.

**Add reports 0 new rows** — either UT rejected it or the course was already
planned. Check `add.responseSignals` in the console for what UT actually
returned; that's also raw material for DAP-123.

**"Request with GET/HEAD method cannot have body"** — fixed. The harness had
the method backwards: UT's audit form is **POST**, and it was building a GET.

**"Planned Courses checkbox not found"** — the harness picked the wrong form.
Fixed: it now identifies the audit form by the `planned` checkbox itself. If it
recurs, UT changed the page — run `await poc.dumpAuditForm()` and pass
`{ plannedCheckboxName: "..." }` to `timePreview()`.

**"Audit submit rejected (403) — likely CSRF"** — you're running from a console
that isn't on a UT page. Django checks `Referer` on POST. Open a
`utdirect.utexas.edu` audit page and paste the harness there.

**"No new audit ID within 90000ms" on every run** — fixed 2026-08-16. The
harness was posting the _custom_ audit form (index 2 — the one that owns the
visible `planned` checkbox) with its `catalog`/`college`/`degree_plan` selects
empty, so UT re-rendered it (200, no redirect) and queued nothing. It now posts
the default-degree Run Audit form (`requests/test_profile_button/`, the same one
the extension's `.run_button` click submits) with `incl_planned_crswk=Y`, and
records `submit.acceptedRedirect` — `true` means UT redirected to a history
page (observed: `requests/history/`). If it's `false`, run `poc.dumpAuditForm()` and see
whether that form's hidden fields changed.

**Rows piling up after failed timing runs** — fixed. Cleanup now runs in a
`finally`, so a failure mid-round-trip still deletes that run's row. Rows
written before the fix must be removed manually (step 1 of the checklist).

## Re-measure generation time (DAP-124 follow-up)

**Why:** the `generateMs` ~5.2 s figure is an **upper bound, not UT's
generation time.** The old harness polled every 500 ms and only counted an
audit done once its history ID became a **link** — it skipped rows without one
entirely, so it was structurally blind to a queued-but-not-ready audit. UT now
also renders a **"Processing"** status on those rows. The old number therefore
bundles: real generation + time-to-link + up to ~600 ms quantization + ~100 ms
per fetch. Observed generation is ~1–2 s.

`probe` is already loaded by `all.js`.

**A. How fast can we poll?** (read-only, do this first)

```js
await probe.pollRateTest(10);
```

Fires 10 back-to-back history fetches. If all return 200 and latency stays
flat, a ~250–300 ms interval is safe (the probe defaults to 150 ms). If you see
non-200s or climbing latency, that's throttling — keep 500 ms.

**B. Split the generation number:**

```js
const before = await probe.historyRows(); // BEFORE submitting
await poc.submitPlannedAudit(); // or click Run Audit
await probe.watch(before);
```

| field                 | meaning                                     |
| --------------------- | ------------------------------------------- |
| `rowVisibleMs`        | request row appeared — UT accepted the job  |
| `processingSeenMs`    | row showed a "Processing" status            |
| `linkReadyMs`         | ID became clickable — result actually ready |
| `queuedButNotReadyMs` | the gap the old harness could not see       |
| `resultsFetchMs`      | how long the results page itself takes      |

**C. See the intermediate state verbatim** — run mid-generation, in a second
console tab, to capture UT's exact wording:

```js
await probe.inspectNow();
```

If UT's status text isn't matched by
`/process|pending|progress|running|queue|wait/i`, widen that regex in the probe
— and note it, because **5.4 should poll for that status too**, not just the
link.

**Interpreting:**

- `linkReadyMs` ≈ 1–2 s → the 5.2 s was mostly measurement overhead. Correct
  the Timing table; design 5.6's spinner for ~2 s.
- `linkReadyMs` ≈ 5 s → UT really is that slow; the original number stands.
- Large `queuedButNotReadyMs` → 5.4 must poll for the **link** (or a completed
  status), never the row alone, or it will scrape a not-yet-ready audit.

Either way the eager-verify decision is unaffected — re-measuring can only move
the total down.

## Verify the timings (n=1 is not a measurement)

The ~3 s generation figure came from **one run**. Before it goes into 5.4/5.6
planning it needs repeating, and one correctness gap needs closing: the probe's
`fetch` had no cache directives, so a cached history page could have inflated
`linkReadyMs`.

`timing-verify.js` closes both (loaded by `all.js` as `verify`).

**A. Is the page being served stale?** (read-only, do first)

```js
await verify.cacheCheck();
```

Compares a plain fetch against a cache-defeated one and prints the server's own
cache headers. **`age` > 0 means a cache is serving stale content** and every
prior timing is suspect. All measurement below uses the cache-defeated path
regardless (`cache: "no-store"` + `Cache-Control: no-cache` + a unique query
param).

**B. Repeat the measurement:**

```js
await verify.verifyTiming(() => poc.submitPlannedAudit(), 3);
```

Three runs, cache defeated. Also captures the server's `Date` header at
row-appearance and at link-ready — a **server-side clock**, independent of our
poll loop, cross-checking the client numbers at 1 s granularity. If
`serverDeltaS` disagrees with `genMs`, trust the server.

Creates 3 real audits. Report `min`, `median`, `spread`.

## Should we delay the first poll to ~1.5 s?

**Only if the fastest observed generation stays above it** — and n=1 can't tell
us that. Modelled against the single 2913 ms sample:

| if the true minimum is…  | runs finishing before 1.5 s | added lag                |
| ------------------------ | --------------------------- | ------------------------ |
| ~2800 ms (low variance)  | 0                           | none — delay is safe     |
| ~1400 ms (high variance) | 1 in 3                      | +100 ms on the fast ones |
| ~1200 ms (as recalled)   | 1 in 3                      | +300 ms on the fast ones |

Tune a fixed delay to the **minimum**, never the median, or fast runs get
detected late. `verifyTiming()` prints a `suggestedFirstPollMs` at 60% of the
fastest observed run.

**But be clear what it buys.** At a 287 ms cycle (137 ms fetch + 150 ms sleep),
a 1.5 s delay saves ~6 requests / ~240 KB per preview. It does **not** make the
user wait less: detection granularity is unchanged, and total latency is still
bounded below by UT's generation time.

So a delayed first poll is a **politeness/bandwidth optimization**, not a
speedup — worth doing (UT logs this traffic), but it won't move the UX.

## Can the preview actually be made faster?

UT's ~3 s generation is the floor; it's ~65% of the round trip and outside our
control. Real options, best first:

1. **Show progress instead of a spinner.** UT publishes `In progress` within
   ~130 ms. Surfacing submitted → in progress → ready makes ~3 s feel far
   shorter than an opaque wait. Biggest perceived win, no protocol risk.
2. **Overlap resolve with the previous step.** `resolveAddLink` is read-only
   (~119 ms) and can run while the UI is still settling.
3. **Skip the history poll entirely** _if_ the results URL is derivable from
   the submit response. The row text carries `Submitted (96449)` — if that
   maps to the audit ID, the poll could be replaced by a direct fetch. Worth
   one experiment; would remove the whole detection window.
4. Not worth it: polling faster than ~150 ms (no gain, more load), or
   parallelizing planner writes (proven unsafe — writes get dropped).

## Is OUR code adding latency? (overhead audit)

"We're bound by UT" is only an excuse if it's true. `overhead-audit.js`
separates UT's floor from latency we chose. **All read-only** except where
noted — no audits created, no planner writes.

```js
await overhead.detectionOverhead(150); // how late do we notice completion?
await overhead.pollTargetCost(); // are we polling the cheapest thing?
await overhead.stepIndependence(); // are our steps needlessly serialized?
```

**`detectionOverhead`** — a poll loop only notices completion at cycle
boundaries, so on average we lose **half a cycle**. At 137 ms fetch + 150 ms
sleep that's ~143 ms average, ~287 ms worst case. That number is ours, not
UT's. If it reports that the fetch dominates the sleep, shortening the sleep
further buys nothing — the fetch is the floor.

**`pollTargetCost`** — we currently poll a ~40 KB page listing every audit to
learn one bit: is the newest one ready. If a cheaper endpoint exposes the same
state, polling costs less and can run more often for the same load.

**`stepIndependence`** — `resolveAddLink` and the pre-submit history snapshot
are both read-only and independent. Running them together removes the smaller
one from the critical path (~100–150 ms).

### The big one: can the poll be deleted entirely?

If the submit response already names the audit, we can fetch the result
directly and remove the whole detection window. Capture the submit HTML:

```js
const before = await verify.getFresh(
  "https://utdirect.utexas.edu/apps/degree/audits/submissions/history/",
);
const page = await verify.getFresh(
  "https://utdirect.utexas.edu/apps/degree/audits/submissions/student_individual/",
);
// then submit and keep the response text:
const res = await poc.submitPlannedAudit();
// once you know the audit ID from the history page afterwards:
overhead.inspectSubmitResponse(
  document.documentElement.outerHTML,
  "PASTE_AUDIT_ID",
);
```

Simpler: after a normal `verify.verifyTiming(...)` run, note the `auditId` it
printed, then re-submit once and pass the resulting page HTML plus that ID.

- **Result links found / `containsKnownId: true`** → the poll can likely be
  replaced by a direct fetch. Biggest available win: removes the entire
  detection window.
- **Only `Submitted (NNNNN)`** → that token is a _request_ number, not the
  audit ID. Polling stays; it can only be shortened, not removed.

### What we already know is NOT worth doing

(But see "Trim our 25%" below — the *submit* figure was not decomposed, and
the ~505 ms turns out to include a page we download and discard.)

- **Polling faster than ~150 ms** — the fetch (~137 ms) dominates, so a shorter
  sleep barely moves detection while multiplying load UT logs.
- **Parallelizing planner writes** — proven unsafe; writes get silently
  dropped.
- **A delayed first poll** — saves bandwidth, not user time (see above).

## Trim our 25% — is our ~1.5 s real work, or bytes we throw away?

The overhead audit said UT is the floor and left our stages as fixed costs.
They aren't — every one of them was measured as a single opaque number, and
most of them bundle **a redirect landing page we download and discard**, or a
fetch that repeats every preview but only needs to happen once per session.

`trim-audit.js` (in `all.js`) splits each request with the browser's Resource
Timing API into redirect / TTFB / download / parse, so "UT server time" and
"our transfer" stop being one number.

### Hypotheses, ranked by expected saving

| # | stage | today | hypothesis | prediction if true |
| - | ----- | ----- | ---------- | ------------------ |
| 1 | submit | ~505 ms | We follow the POST's redirect to `requests/history/` (353 ms on its own) and discard the HTML. | POST with `redirect: "manual"` returns in ~150 ms as `opaqueredirect`, and the audit still queues (row appears in history). |
| 2 | add | ~345 ms | It's three things: the `page=4` request, the redirect landing page, and a second planner read to verify. The landing page (`planner/ut_course/`) may already list the rows. | Resource Timing shows `page4Ms` ≈ 100 ms; `landingMatchesPlanner: true` means the verify read is free. |
| 3 | hidden fetches | ~350 ms, **not in the table** | The audit form GET, the history snapshot and the planner snapshot run every preview. The form's hidden fields don't change within a session. | `formReuse` reports `fieldsStable: true` → the form GET is once per session. History snapshot overlaps resolve (already proven). |
| 4 | resolve | ~128 ms | The `page=3` listing is stable, so it can be fetched **when the user picks the course**, not when they hit preview. Still parsed, never constructed — the design rule holds. | `stableAcrossFetches: true`, `looksNonced: false`. |
| 5 | scrape | ~395 ms | The number includes DOMParser. Split it: if TTFB dominates, UT is rendering the audit and it's immovable; if download or parse dominates, it's ours. | `scrapeCost` names the dominant part; `scrapeAlternatives` lists any lighter representation UT itself links to. |

If 1–4 all hold, the pipeline's own cost drops from ~1.5 s to roughly
**~0.6 s** and the preview lands at **~2.7 s** instead of ~3.6 s. Submit alone
is the biggest single cut and needs one audit to prove.

### Run (≈ 5 min, 1 audit + 1 planner add/delete)

Read-only first — no side effects at all:

```js
await trim.scrapeCost(); // 3 fetches of the newest audit's results page
await trim.scrapeAlternatives(); // only follows links the results page advertises
await trim.formReuse(); // 2 fetches of the audit form, diffed
await trim.resolveStability(); // 2 fetches of the page=3 listing, diffed
```

Then the two that write:

```js
await trim.addCost(); // adds C S 324E (20272), measures, deletes it
await trim.submitCost(); // ONE real audit, POST with redirect:"manual"
trim.summary(); // achievable-savings table from whatever ran
```

**Record** every `console.table` into `FINDINGS.md` under a new "Trim" section,
plus the `trim.summary()` table.

### Read it

- **`submitCost`** — `postType` should be `opaqueredirect` and `accepted: true`.
  `postMs` is the real submit cost; `savedVsFollowMs` is what we were wasting.
  If `accepted` is false the manual-redirect POST wasn't processed (unexpected;
  fall back to following the redirect). Note `opaqueredirect` can't distinguish
  "redirected to history" from "redirected to SSO" — the auth gate runs before
  the write in production, so that's fine.
- **`addCost`** — `page4Ms` is the write itself. `landingMatchesPlanner: true`
  means the redirect target already lists the rows, so 5.2 verifies from the
  add response and skips the extra `view_planner/` read. If false, use
  `redirect: "manual"` on the add and pay one verify read.
- **`formReuse`** — `fieldsStable: true` → fetch the form once per session and
  reuse `student_eid` / `degree_plan` / `catalog` / CSRF. `csrfTokenRotatesPerRender`
  is informational: Django masks tokens per render but any of them validates
  against the session cookie, so caching one is safe.
- **`resolveStability`** — `stableAcrossFetches: true` and `looksNonced: false`
  → prefetch `page=3` on course pick. The design rule ("never construct
  `page=4`") is untouched; we still parse the link, just earlier.
- **`scrapeCost`** — read the "dominated by" line. TTFB is UT's render; only
  download and parse are ours. `gzip: (none)` on a 100 KB+ page means UT isn't
  compressing and download is a real cost — but there's nothing to do about
  that unless `scrapeAlternatives` found a lighter page.
- **`summary`** — `savedMs` per stage and a total. That's the number to carry
  into the design doc's optimization-ceiling section, replacing "submit can't
  move".

### Results (2026-09-09) — see FINDINGS.md § Trim audit

Submit 505 → 149 ms, add+verify 331 → 213, resolve/form/history off the
path, scrape immovable (TTFB). ~840 ms cuttable, ~3.0 s preview estimated.

### Prove it end to end (≈ 3 min, 3 audits + 3 add/deletes)

The estimate is stage-by-stage arithmetic. This runs the pipeline with every
trim applied at once and reports p50 per stage against the 3639 ms reference:

```js
trim.state.results.scrapeAlternatives; // still in memory — print it if the
//                                       earlier table scrolled away
await trim.timeTrimmedPreview(undefined, 3);
```

Read `totalMs` p50. Around **3.0 s** confirms the estimate; the per-stage
columns show which trim didn't hold if it's higher. `readsMs` is the three
parallel reads (resolve, history, planner) — in production those happen at
course-pick time, so subtract it for the user-visible figure.

**Record** both tables into FINDINGS.md.

**2026-09-09 result:** our stages held; UT generation varied 2.7–10.6 s
(previously a steady 2.0–2.1 s). To tell UT load from a trim side-effect,
interleave the old and trimmed paths so time-of-day can't confound it:

```js
await verify.verifyTiming(() => poc.submitPlannedAudit(), 1);
await trim.timeTrimmedPreview(undefined, 1);
await verify.verifyTiming(() => poc.submitPlannedAudit(), 1);
await trim.timeTrimmedPreview(undefined, 1);
```

Compare `genMs` across the four. Old path also slow → UT load, trims stand.
Only trimmed slow → the trimmed submit differs somehow; investigate before
adopting it.

**Result:** old path 3060 / 2466 ms generation, trimmed 2160 / 2275 in the
same minutes — UT load, not us. **Trims stand**; ~3.0–3.1 s preview proven
end to end. See FINDINGS.md § Trim audit.

### What this does NOT reopen

- **Submit overlapping the add** — still no. The audit must be queued after
  the row exists. Trimming the submit's redirect is a different thing.
- **Parallel planner writes** — still unsafe.
- **Polling faster** — still fetch-bound.
