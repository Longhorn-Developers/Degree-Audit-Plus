# DAP-115 (5.1) POC findings

Recorded outputs from following `RUNBOOK.md`. Session date: 2026-08-16.
Fold these into the design doc, then delete `scripts/spike/`.

Legend: ⬜ not run · ✅ done · 🚩 flag

---

## 0. Session sanity ✅

`await poc.readPlanner()` on a logged-in `utdirect.utexas.edu/apps/degree/audits/`
tab: harness loaded, `planner has 0 row(s)`, no "Not logged in" error.

## 1. Planner stock-take ✅

Rows present before any spike work; rows deleted (leftover `C S324E` dupes only).

**Before:** planner was **empty** (0 rows) — no leftover spike rows, nothing to delete.

**Deleted:** none

**Before screenshot:** (path or "attached to DAP-115")

## 2. ⭐ Preview round-trip timing (DAP-124) ✅

`await poc.timePreview({ dept: "C S", num: "324E", ccyys: "20272" }, 5)`

**Submit mechanics (found while unblocking this, 2026-08-16):**

- First two attempts failed with `No new audit ID within 90000ms`. Cause: the
  harness posted the _custom_ audit form (`action=""`, owns the visible
  `current`/`future`/`planned` checkboxes) with empty `catalog`/`college`/
  `degree_plan` selects → UT re-rendered it (200, no redirect, ~130 ms) and
  queued nothing.
- The working submit is the **default-degree Run Audit form**
  (`POST /apps/degree/audits/requests/test_profile_button/`, the same form the
  extension's `.run_button` click submits). All fields hidden:
  `csrfmiddlewaretoken`, `student_eid`, `degree_plan`, `catalog`, `minor`,
  `effective_ccyys`, `incl_current_crswk`, `incl_future_crswk`,
  `incl_planned_crswk`. Planned-inclusive = **`incl_planned_crswk=Y`** (default
  is `" "`).
- Success signal: 200 + `response.redirected: true`, landing on
  `/apps/degree/audits/requests/history/` (~257 ms). No `submit_success=Y` on
  that URL. Confirmed a new request appeared at the top of the history page.
- Add responses (`add.responseSignals`): 200, `redirected: true`, final URL
  `planner/ut_course/`, title "Student Planner - IDA".

**Per-run `round trip {...}` (ms, rounded):**

| run | resolve | add | submit | generate | scrape | total\* |
| --- | ------- | --- | ------ | -------- | ------ | ------- |
| 1   | 120     | 314 | 262    | 4969     | 395    | 6408    |
| 2   | 107     | 407 | 282    | 5194     | 359    | —       |
| 3   | 119     | 345 | 278    | 6001     | 498    | 7619    |
| 4   | 119     | 307 | 245    | 5200     | 365    | —       |
| 5   | 117     | 450 | 499    | 5403     | 404    | —       |

\* per-run totals were truncated in the console paste; min/max come from the
table below. Audit IDs likewise not captured per run (see `poc.report()` in
Finish).

**`console.table` (p50 / p95 / min / max per stage, ms):**

| stage      | n   | p50  | p95  | min  | max  |
| ---------- | --- | ---- | ---- | ---- | ---- |
| resolveMs  | 5   | 119  | 120  | 107  | 120  |
| addMs      | 5   | 345  | 450  | 307  | 450  |
| submitMs   | 5   | 278  | 499  | 245  | 499  |
| generateMs | 5   | 5200 | 6001 | 4969 | 6001 |
| scrapeMs   | 5   | 395  | 498  | 359  | 498  |
| deleteMs   | 5   | 107  | 218  | 94   | 218  |
| totalMs    | 5   | 6643 | 7619 | 6408 | 7619 |

**Verdict:** p95 totalMs = **7619 ms** → ✅ < 15 s — eager-verify holds. No
DAP-114 flag. Audit generation (`generateMs`, ~5.2 s p50 / 6.0 s p95) is ~78%
of the round trip; every other stage is < 0.5 s. All 5 runs succeeded; planner
row was added and deleted each run.

## 3. Parallel adds ✅

`await poc.testParallelAdd([...])` then `await poc.cleanup()`, repeated 2–3×.

Courses: `C S 324E`, `C S 331`, `C S 429H` (20272). Non-CS throwaways
(`GEO 303`, `MUS 307`, `GEO 302N`) had no `page=4` link in UT's planner listing
for 20272, so they could not be used.

| run | serialBaseline              | requested | fulfilled | rowsCreated | allLanded | duplicateSeq | seqValues |
| --- | --------------------------- | --------- | --------- | ----------- | --------- | ------------ | --------- |
| 1   | C S 324E, C S 331, C S 429H | 3         | 3         | 3           | true      | (see note)   |           |
| 2   | C S 324E, C S 331, C S 429H | 3         | 3         | **2**       | **false** |              |           |
| 3   | C S 324E, C S 331, C S 429H | 3         | 3         | **2**       | **false** | false        | 998, 999  |

Note: `duplicateSeq`/`seqValues` for runs 1–2 were truncated in the console
paste; run 3 shows the pattern — the two surviving rows have clean consecutive
seqs and the third write vanished (likely two writers computed the same next
seq and one overwrote the other).

**Verdict:** 🚩 **Serialize planner writes in 5.2.** All three courses add
reliably one at a time (serial baseline 3/3 in every run), yet 2 of 3 parallel
runs silently dropped one row even though all 3 requests `fulfilled` with a
normal response. UT gives no error for the lost write — the only detection is
a planner re-read. So 5.2 must: one write at a time, verify-after-write by
diffing `readPlanner()`, never trust the add response alone.

## 4. Modify URL submit shape (DAP-129) ✅

Manual, via Network tab (Doc filter, Preserve log). Row used: `C S 324E`,
20272, seq 999.

**Entry page** (typed in address bar — 4-tuple key, `action_code=M`):

```text
GET /apps/degree/audits/planner/modify_planned_course/
  ?key_course_id=C%20S324E&key_course_ccyys=20272&key_course_seq=999
  &key_course_type=1&action_code=M
```

**Submit** (fired by the page's form; `sec-fetch-site: same-origin`, referrer =
entry page):

- Method: **GET** — a state-changing GET, same as add (`page=4`) and delete
  (`action_code=D`). No CSRF token, no body.
- URL: `https://utdirect.utexas.edu/apps/degree/audits/planner/modify_planned_course/`
- Query params (in order, verbatim):

```text
action=M&course_type=1&course=324E&fos=C+S&seq=999&key_ccyys=20272
&fos=C+S&course=324E&semester=2&year=2027&pass_fail=Y
```

Shape notes:

- Param names differ from the entry URL: row key is `fos` (dept, `+` for
  space) + `course` (number) + `seq` + `key_ccyys` (the **original** term),
  plus `course_type` and `action=M` (not `action_code`).
- New values are `semester` (`2` = spring) + `year` (`2027`) — the target term
  is split, not a `ccyys` — and `pass_fail` (`Y`/presumably `N`).
- `fos` and `course` appear **twice** (once as the row key, once as the form's
  editable value). Send both; the browser does.
- Test change applied: term unchanged (20272 → semester 2 / year 2027),
  pass/fail set to `Y`.

## 5a. Execution context — service worker (DAP-123 Q1) ✅

`await poc.testExecutionContext()` from the extension service-worker console
(`bun run dev` build, `chrome://extensions` → service worker). Page-console
column is implied by every other step in this file working there.

| field              | page console (content-script case) | service worker                          |
| ------------------ | ---------------------------------- | --------------------------------------- |
| status             | 200                                | 200                                     |
| redirected         | false                              | false                                   |
| finalUrl           | `…/planner/view_planner/`          | `…/planner/view_planner/`               |
| cookiesRodeAlong   | true                               | **true**                                |
| domParserAvailable | true                               | **false** (`DOMParser is not defined`)  |
| parsedPlannerRows  | true (when rows exist)             | false — planner was empty at the time\* |

\* not a parsing failure: the planner had 0 rows; the worker fetch returned the
real planner page (200, no SSO redirect). The harness's `get()` was patched to
regex-fallback when `DOMParser` is missing so this test could run at all.

**Verdict:** ✅ The background service worker **can** make credentialed UT
requests (session cookies ride along via `credentials: "include"` +
`host_permissions`), so planner add/delete/audit-submit/history-poll do not
need a UT tab open. It cannot parse HTML — a **hybrid** (fetch in worker, hand
HTML to an offscreen document or content script for parsing) is viable and
avoids the tab-lifetime problem (temp tab dies at 30 s vs 90 s poll window).

## 5b. Auth signal — logged in vs logged out (DAP-123 Q2) ✅

`await poc.testAuthSignal()` once logged in (UT page console), once logged out.

Logged-out runs could not be done from a `utdirect.utexas.edu` page: every
audit/registrar URL tried in incognito bounced to SSO
(`enterprise.login.utexas.edu`), and a console on the SSO page is cross-origin.
So the logged-out capture was taken from the **extension service worker** after
logging out of UT — which is the production context anyway.

**Default `fetch` (follows redirects) — what `poc.testAuthSignal()` and
`session.ts` do today:**

| signal                | logged in (UT page console)             | logged out (service worker)                                                                                                                                                                 | flips? |
| --------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| response.redirected   | false                                   | n/a — **fetch throws**                                                                                                                                                                      | —      |
| !response.ok          | false                                   | n/a                                                                                                                                                                                         | —      |
| status                | 200                                     | n/a (network layer saw `302` → SSO)                                                                                                                                                         | —      |
| response.url          | `…/submissions/history/` (as requested) | n/a                                                                                                                                                                                         | —      |
| url !== requested     | false                                   | n/a                                                                                                                                                                                         | —      |
| password input in DOM | false                                   | n/a                                                                                                                                                                                         | —      |
| elapsedMs             | 100                                     | —                                                                                                                                                                                           |        |
| bytes                 | 40127                                   | —                                                                                                                                                                                           |        |
| exception             | none                                    | `TypeError: Failed to fetch` — 302 to `enterprise.login.utexas.edu/idp/profile/SAML2/Redirect/SSO?…&RelayState=<requested url>`, blocked by CORS (SSO origin is outside `host_permissions`) | ✅     |

**`fetch(..., { redirect: "manual" })` probe** (does not follow the 302, so CORS
never enters):

| field      | logged in (UT page console) | logged out (service worker) |
| ---------- | --------------------------- | --------------------------- |
| type       | `basic`                     | `opaqueredirect`            |
| status     | `200`                       | `0`                         |
| ok         | `true`                      | `false`                     |
| redirected | `false`                     | `false`                     |
| url        | requested URL               | requested URL (unchanged)   |

**Verdict (cheapest signal that flips):** use a **`redirect: "manual"`** probe:
logged out → `response.type === "opaqueredirect"` (status 0); logged in → a
real 200. It is one request (~100 ms), needs no HTML parsing, works from both
the page and the service worker, and — crucially — cannot be confused with the
planner's own success redirects (add/delete/audit-submit all return
`redirected: true` when they _work_). Do not gate writes on
`response.redirected` (`features/session/session.ts` `isLoggedIn()`), and do
not rely on "fetch threw ⇒ logged out": with default redirect-following, a
logged-out request throws `TypeError` from the worker because the SSO host is
not in `host_permissions` — indistinguishable from a network outage.

## Optional — not run

- Planner max rows: not run (time-boxed out; no number to report).
- Closed-term add: not run.

## Finish ✅

- `poc.state.findings` was spread across several consoles (UT page, service
  worker, incognito) so a single `poc.report()` JSON is not meaningful; every
  finding is transcribed in the sections above.
- Final `await poc.cleanup()` → nothing to clean; `await poc.readPlanner()` →
  **0 rows**. Planner restored to its step-1 state (empty).
- Side effects left on the UT account: ~7 audits in history (1 submit probe +
  5 timing runs + the 1 default-form submit that UT rejected queued nothing);
  planner add/delete/modify entries in UT's planner log for `C S 324E`,
  `C S 331`, `C S 429H` (20272). No planner rows remain.
- Before/after screenshots: empty planner both times (attach to DAP-115).

## Summary for DAP-115

| Question                           | Answer                                                                                                                                                      |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preview round-trip (DAP-124)       | **p50 6.6 s / p95 7.6 s** (n=5). Generation ≈ 5.2 s; all other stages < 0.5 s. ✅ Eager-verify holds; no DAP-114 flag.                                      |
| How to submit a planned audit      | POST `requests/test_profile_button/` (default-degree Run Audit form) with `incl_planned_crswk=Y`; success = redirect to `requests/history/`.                |
| Parallel planner adds              | 🚩 **Race confirmed** — 2 of 3 parallel runs lost a write silently (serial baseline 3/3). Serialize writes + verify-after-write in 5.2.                     |
| Modify submit shape (DAP-129)      | GET `planner/modify_planned_course/?action=M&course_type=1&course=…&fos=…&seq=…&key_ccyys=…&fos=…&course=…&semester=…&year=…&pass_fail=…`.                  |
| Where can the client run (DAP-123) | Service worker fetches UT with cookies (`cookiesRodeAlong: true`); no `DOMParser`. Hybrid: fetch in worker, parse in offscreen doc/content script.          |
| Auth gate (DAP-123)                | `fetch(url, { redirect: "manual" })`: logged out → `type: "opaqueredirect"`, status 0; logged in → `basic`/200. Don't use `response.redirected` for writes. |
