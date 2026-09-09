# Hypothetical Courses — Design (DAP-91)

Users add hypothetical courses from the catalog and see how their audit
changes. UT supports this natively: courses added to the global planner
(`audits/planner/`) are included in any audit run with the **Planned
Courses** checkbox set, and results scrape like any other audit.

Companion: `DAP_91_PLANNED_COURSE_VERIFICATION.md` (live planner
inspection). Work is tracked on the Linear map (see [Tickets](#tickets)).

## Decision

**Eager verify, non-blocking.** Selecting a course immediately: add to UT
planner → run audit (`includePlanned: true`) → scrape → show which
requirement(s) it fulfills, with a loading state meanwhile. Clicking **Add**
promotes that just-run audit to the app's main audit.

> Supersedes the earlier batched-first recommendation, which assumed
> 10–45 s per run. **Measured (n=3, verified 2026-09-09):** ~3.6 s end-to-end,
> of which UT's generation is ~2.1 s (75%) and our own code ~0.7 s. Far under
> the 15 s threshold, so eager verify stands. See [Timing](#timing).

## Verified UT facts

| Fact                                                                                                                  | Implication                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Planner is **one global list per student**                                                                            | No UT-side scenarios; anything left in the planner leaks into later planned-inclusive runs                                        |
| Add = GET wizard: `page=3` lists dept+term courses, following its `page=4` link adds one course                       | **State-changing GET — never prefetch.** Parse the exact `page=4` link from `page=3`; don't construct params by hand              |
| Delete = per-row GET: `view_planner/?key_course_id=C%20S331E&key_course_ccyys=20266&key_course_seq=999&action_code=D` | Row key = `(key_course_id, key_course_ccyys, key_course_seq)`; parse keys from View Courses. Also state-changing — never prefetch |
| `key_course_seq` counts **down** from 999 per added row (999, 998, 997 …)                                             | Never hardcode 999 — parse it. Confirmed 2026-08-05                                                                               |
| Adding the same course twice creates a **duplicate row**, not a no-op                                                 | Check membership before adding; dedupe in `syncPlannerTo()`. Confirmed 2026-08-05                                                 |
| `key_course_id` = dept + number, separator dropped (`C S` + `324E` → `C S324E`)                                       | Build this exact string for delete/modify URLs                                                                                    |
| Delete All = `view_planner/?&action_code=A`                                                                           | **Never automated** — policy. Per-row deletes only                                                                                |
| Modify edits term/pass-fail only                                                                                      | Shape confirmed 2026-08-16 (state-changing GET); course swaps are still delete + add                                              |
| **Planned courses are excluded by default**                                                                           | Manual user runs won't accidentally include hypotheticals; our runs must always set `incl_planned_crswk=Y`                        |
| Planner changes are logged by UT                                                                                      | Keep mutations purposeful; clean up previews promptly                                                                             |
| Parenthesized (expired) planner courses don't apply to audits                                                         | Exclude from previews; treat as sync failures                                                                                     |
| **UT decides requirement placement** — planner takes no target requirement                                            | The preview run IS the placement oracle; we never guess                                                                           |

## Remaining unknowns (POC ticket)

**Spike complete (2026-08-16).** Every blocking unknown is answered below;
this doc is now the source of truth, so `scripts/spike/` can be deleted.

| #   | Unknown                                        | Answer                                                           |
| --- | ---------------------------------------------- | ---------------------------------------------------------------- |
| 1   | End-to-end preview latency p50/p95             | ☑ **~3.6 s** (UT generation ≈ 2.1 s, n=3, server-clock verified) |
| 2   | `page=4` idempotency and error responses       | ☑ duplicate add creates a **duplicate row**                      |
| 3   | Modify URL/form shape                          | ☑ GET, distinct param names — see below                          |
| 4   | Planner GETs from background vs content script | ☑ worker **can** fetch with cookies; no `DOMParser`              |
| 5   | Cheapest reliable logged-out signal            | ☑ `redirect: "manual"` → `opaqueredirect`                        |
| 6   | Planner limits (max rows, validity checks)     | ⬜ not run — time-boxed out, still open                          |
| 7   | Audit submit form shape                        | ☑ the **default-degree** form, not the custom one                |
| 8   | Are parallel planner writes safe?              | 🚩 **No — race confirmed.** Serialize writes                     |

### Confirmed 2026-08-05 (live session)

**Add** — `page=4` works, ~409 ms including its redirect. Responds `200` and
**redirects to `planner/ut_course/`** (params stripped) on success.

**Delete** — per-row `action_code=D` works, ~259 ms, `200`, **no redirect**.
Removes exactly the target row.

**Row keys** — `key_course_id` is dept+number concatenated with the dept's
internal space kept and the separator dropped: `C S` + `324E` → `C S324E`;
`AFR` + `305` → `AFR305`. The planner client must build this exact form.

**`key_course_seq` is NOT always 999.** Observed 999, 998, 997, 996 … 991 —
UT assigns **descending** sequence numbers as rows are added. The earlier note
in [Verified UT facts](#verified-ut-facts) ("observed 999") generalized from a
single row. Never hardcode 999; always parse the seq from View Courses.

**Idempotency: adding the same course twice creates a DUPLICATE row** (not a
no-op) with its own seq. Two `C S324E` rows coexisted at seq 996 and 997.
Consequences for 5.2/5.4:

- The preview pipeline must check membership _before_ adding, or previews will
  silently accumulate duplicates.
- `syncPlannerTo()` must dedupe by course, not assume one row per course.
- Duplicate rows are individually addressable, so cleanup is still per-row.

**Modify** — entry page and submit use _different_ param names (confirmed
2026-08-16 via the Network tab).

Entry page (4-tuple key, note `key_course_type`, which delete doesn't carry):

```text
GET planner/modify_planned_course/?key_course_id=C%20S324E
  &key_course_ccyys=20272&key_course_seq=999&key_course_type=1&action_code=M
```

Submit — a **state-changing GET**, no CSRF, no body, same as add and delete:

```text
GET planner/modify_planned_course/
  ?action=M&course_type=1&course=324E&fos=C+S&seq=999&key_ccyys=20272
  &fos=C+S&course=324E&semester=2&year=2027&pass_fail=Y
```

Gotchas for DAP-129:

- Param names change between entry and submit: the row key becomes `fos`
  (dept, `+` for space) + `course` + `seq` + `key_ccyys` (the **original**
  term), and the action param is `action=M`, not `action_code=M`.
- The **target term is split** into `semester` (`2` = spring) + `year`, not a
  `ccyys`.
- `fos` and `course` each appear **twice** — once as row key, once as the
  editable value. Send both; the browser does.

**Nonexistent course** — a bad course number simply has no `page=4` link on
`page=3`; there's no distinct error page. Resolve failure is the error signal.

**Audit submit — use the default-degree form** (corrected 2026-08-16).

An earlier reading of this page picked the wrong form. The visible
`current`/`future`/`planned` checkboxes belong to the **custom** audit form
(`action=""` on `submissions/student_individual/`), and posting it with empty
`catalog`/`college`/`degree_plan` selects **queues nothing** — UT just
re-renders the page (200, no redirect, ~130 ms). Two timing attempts failed
with `No new audit ID within 90000ms` before this was spotted.

The form that actually queues an audit is the **default-degree "Run Audit"
form** — the same one the extension's existing `.run_button` click submits:

| Property          | Value                                                                                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Method / action   | **POST** `/apps/degree/audits/requests/test_profile_button/`                                                                                                            |
| Fields            | all hidden: `csrfmiddlewaretoken`, `student_eid`, `degree_plan`, `catalog`, `minor`, `effective_ccyys`, `incl_current_crswk`, `incl_future_crswk`, `incl_planned_crswk` |
| Planned-inclusive | **`incl_planned_crswk=Y`** (default is `" "`)                                                                                                                           |
| Success signal    | 200 + `redirected: true`, landing on `requests/history/` — **no** `submit_success=Y`                                                                                    |

So `includePlanned: true` means **`incl_planned_crswk=Y`**, not `planned=X`.
5.4 should drive this form rather than the custom one; the custom form is only
needed if a user picks a non-default degree plan, which is out of scope.

**Parallel adds — race CONFIRMED (2026-08-16).** Re-run with a serial baseline
first: all three courses add reliably **one at a time** (baseline 3/3 every
run), yet **2 of 3 parallel runs silently dropped a write**. Every request came
back `fulfilled` with a normal 200 — UT reports no error for the lost row; the
surviving rows had clean consecutive seqs, consistent with two writers
computing the same next seq and one overwriting the other.

Binding constraints for 5.2:

- **Serialize every planner write.** One at a time, no fan-out in
  `syncPlannerTo()`.
- **Verify after write** by diffing `readPlanner()`. The add response alone is
  not evidence the row landed.

**Execution context (DAP-123 Q1).** The background service worker **can** make
credentialed UT requests — session cookies ride along via
`credentials: "include"` plus the existing `host_permissions`. It has **no
`DOMParser`** (MV3 has no DOM). So planner add/delete, audit submit, and
history polling do **not** need a UT tab open; only parsing does.

Recommended shape for 5.4: **fetch in the worker, parse in an offscreen
document or content script.** That sidesteps the tab-lifetime bug entirely
(temp tab dies at 30 s vs a 90 s poll window) instead of working around it.

**Auth gate (DAP-123 Q2) — use a `redirect: "manual"` probe.** Confirmed
against a real logged-out session:

|                   | logged in | logged out           |
| ----------------- | --------- | -------------------- |
| `response.type`   | `basic`   | **`opaqueredirect`** |
| `response.status` | `200`     | `0`                  |
| `response.ok`     | `true`    | `false`              |

One request (~100 ms), no HTML parsing, works from both the page and the
service worker.

> **Two traps this replaces.** Do **not** gate writes on `response.redirected`
> (what `features/session/session.ts` `isLoggedIn()` does today): the planner's
> add, delete, and audit-submit all return `redirected: true` when they
> _succeed_, so that test misreads success as logout. And do **not** infer
> "fetch threw ⇒ logged out": with default redirect-following, a logged-out
> request throws `TypeError` from the worker because the SSO host sits outside
> `host_permissions` — indistinguishable from a network outage.

## Main-view flow (requirement view)

Preview lifecycle for a selected course:

1. **Auth gate** — verify the UT session before anything; if expired, notify
   the user and redirect to login. Never start a preview that would
   half-complete.
2. **Exclusivity** — if another preview is pending (not accepted), delete its
   course from the planner first. One pending preview at a time; previous
   results stay cached on their cards (valid while the accepted set is
   unchanged).
3. **Add** the course to the planner (resolve on `page=3`, follow the exact
   `page=4` link). Term defaults to the next semester, with an override
   option at add time.
4. **Run** an audit with `includePlanned: true`; correlate by raw history ID
   snapshot; scrape the result.
5. **Preview** — diff against the current main audit; show fulfilled
   requirement(s), hour deltas, and unapplied warning.
6. **Accept** → the previewed audit becomes the app's main audit
   (fully replace — no clean-baseline pointer kept; per-course `Planned`
   statuses carry the real-vs-planned distinction). The course stays in the
   UT planner permanently.
   **Decline/abandon** → delete from the planner immediately; if the delete
   fails, mark the planner dirty and reconcile before the next run. The
   orphaned UT history entry is accepted noise.

### Settled policies

| Policy                    | Decision                                                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Add semantics             | Fully replace main audit with the verified run; no baseline pointer                                                                |
| Preview cleanup           | Immediate delete on decline/abandon; dirty-flag + reconcile on failure                                                             |
| Concurrent previews       | Exclusive; new preview deletes the pending one; results cached                                                                     |
| Term                      | Default next semester + override at add time                                                                                       |
| Pre-existing planner rows | First-run prompt, per-row **adopt or remove** — never silent                                                                       |
| Audit list hygiene        | Preview-generated audits are tagged and **hidden** from the app's audit list (still on UT's site)                                  |
| Refreshes                 | App-driven main-audit refreshes always `includePlanned: true`                                                                      |
| Auth                      | Gate every planner/audit operation; notify + redirect on expiry                                                                    |
| Out of scope              | Suggesting courses for a requirement (preview is the only oracle); multiple named plans; automated Delete All; UI polish specifics |

## Architecture

### Planner client — `features/audit-scraping/planner-client.ts`

Credentialed fetch + `DOMParser`, same shape as the existing scraping code in
`features/audit-scraping/audit-history-sync.ts` (fetch + `DOMParser` +
`response.redirected` auth check) and `background-controller.ts` (tab-scoped
submit). There is no `audit-runner.ts` — earlier drafts of this doc and the
DAP-115 ticket both cite that filename; it never existed.

- `fetchPlannedCourses()` — parse View Courses; capture
  `(key_course_id, key_course_ccyys, key_course_seq)` per row.
- `resolveCourse(dept, ccyys, num)` — fetch `page=3`, find the exact add
  link (reuse one `page=3` response per dept+term+type). Missing course →
  surface failure. Topic courses require explicit topic selection — never
  pick one silently.
- `addCourse(link)` / `deleteCourse(key)` / `modifyCourse(key, …)` —
  sequential, fetch-before-write and verify-after-write.
- `syncPlannerTo(courses)` — reconcile planner to the accepted set (used by
  dirty-planner recovery). Per-row deletes only.

### Preview pipeline (background, serial queue)

`PREVIEW_PLANNED_COURSE` / `CANCEL_PREVIEW` messages
(`lib/browser/messages.ts`):

1. Auth gate; acquire UT tab (**fix: tab lifetime 30 s < 90 s poll window**).
2. Snapshot **raw** history audit IDs (before dedupe — the major+percentage
   UI dedupe can hide new rows).
3. Delete pending preview course if any; add the new one.
4. Submit audit (`includePlanned: true`); poll until a new raw ID appears →
   scrape.
5. Validate the result's Planned set equals accepted + candidate; mismatch →
   `contaminated`, offer re-run.
6. Diff, cache, reply.

### Diff engine — `diffAudits(base, next)` (pure)

Match rules by requirement title + rule text (course UUIDs are re-minted
every parse). Output: total before/after, per-rule hour/status changes,
newly applied courses, and `unappliedCourses` (planned but fulfilled
nothing).

### Storage

- Accepted-course list (course, term, UT row key) — small, separate from the
  scraped-audit cache.
- Preview-audit tag (hidden from the audit list).
- Dirty-planner flag for failed cleanups.

### Course-info source (decided)

Dexie catalog for search/display; planner pages only for **write
eligibility** — resolve on `page=3`, follow the exact `page=4` link, then
re-fetch View Courses to capture the UT row key.

## Timing

Current code constants (not UT latency): 500 ms history poll, 90 s poll
window, 30 s scrape timeout, 30 s temporary-tab lifetime (**mismatch bug —
tab can die mid-poll**), ~10 s content-script readiness retry.

**Measured 2026-08-16** (n=5). The non-generate stages remain valid; the
generate and total rows were later found to include harness overhead and are
struck through — see the Correction below for the real numbers.

| stage                                              | p50         | p95         |
| -------------------------------------------------- | ----------- | ----------- |
| resolve (`page=3` lookup)                          | 119 ms      | 120 ms      |
| add (`page=4` + redirect)                          | 345 ms      | 450 ms      |
| submit                                             | 278 ms      | 499 ms      |
| ~~generate~~ _(superseded — see Correction below)_ | ~~5200 ms~~ | ~~6001 ms~~ |
| scrape                                             | 395 ms      | 498 ms      |
| delete                                             | 107 ms      | 218 ms      |
| ~~total~~ _(superseded)_                           | ~~6643 ms~~ | ~~7619 ms~~ |

**p95 7.6 s < 15 s → eager verify holds.** No DAP-114 flag.

### Verified 2026-09-09 (n=3, cache-defeated, server-clock corroborated)

Superseding both earlier figures. Measured with HTTP caching defeated
(`no-store` + `Cache-Control` + unique query param) and cross-checked against
UT's own `Date` header, which is independent of our poll loop.

| run | submitMs | rowMs | linkMs | genMs | serverDeltaS |
| --- | -------- | ----- | ------ | ----- | ------------ |
| 1   | 502      | 686   | 2775   | 2090  | 2            |
| 2   | 613      | 870   | 2895   | 2024  | 2            |
| 3   | 401      | 531   | 2642   | 2110  | 2            |

`serverDeltaS` (UT's clock, 1 s granularity) agrees with `genMs` on every run —
two independent clocks, so the numbers are trustworthy. Spread is only 253 ms.
`cacheCheck` found no `Age` header and identical byte counts: the history page
is **not** cached, so no prior figure was inflated by staleness.

**UT generation ≈ 2.1 s** (not the 3.0 s from n=1, and not the original 5.2 s).

#### Where the wait actually goes

| component                        | ms        | whose    |
| -------------------------------- | --------- | -------- |
| submit POST completes            | ~505      | **ours** |
| submit → row visible (detection) | ~191      | **ours** |
| row → link (UT generating)       | ~2075     | UT floor |
| **total to ready**               | **~2771** |          |

**UT is 75% of it; ~700 ms (25%) is ours.** The ~505 ms submit is the larger
half and was not previously accounted for. Detection lag (~191 ms) matches the
predicted half-cycle (~138 ms at 125 ms fetch + 150 ms sleep), so the poll loop
behaves as designed.

Corrected end-to-end preview: **~3.6 s** (was ~4.5 s, originally 6.6 s). Still
far under the 15 s threshold — eager verify is not in question.

#### Poll target

| target                           | ms  | KB  | exposes audit state |
| -------------------------------- | --- | --- | ------------------- |
| `submissions/history/` (current) | 195 | 47  | ✅                  |
| `audits/` home                   | 169 | 17  | ❌ no table         |
| `requests/history/`              | 353 | 47  | ✅                  |

The current target is already the best of the three: the home page is smaller
but carries no audit table, and `requests/history/` — where the submit
redirects — costs 353 ms for the same payload. Keep polling
`submissions/history/`.

#### Full round-trip budget (all stages measured)

| stage              | ms       | whose | verdict                                            |
| ------------------ | -------- | ----- | -------------------------------------------------- |
| resolve (`page=3`) | 128      | ours  | **parallelizable** — see below                     |
| add (`page=4`)     | 345      | ours  | state-changing, must stay serial                   |
| submit POST        | 505      | ours  | largest ours; overlap with add is unproven         |
| UT generation      | 2075     | UT    | immovable                                          |
| detection lag      | 191      | ours  | at floor — fetch dominates sleep                   |
| scrape results     | 395      | ours  | required                                           |
| **total**          | **3639** |       | (delete ~107 ms runs after, off the critical path) |

`stepIndependence` confirmed resolve (128 ms) and the pre-submit history
snapshot (137 ms) are independent read-only calls: running them concurrently
saves **~128 ms**, the only proven-safe win available.

**UT is 57% of the full round trip.** Even if every millisecond of our own code
were free, the preview could not drop below ~2.1 s.

#### Optimization ceiling — revised 2026-09-09 (trim audit)

The budget above measured each of our stages as one number. Splitting them
with Resource Timing (`scripts/spike/trim-audit.js`) showed most of "ours" is
bytes we download and discard, or fetches repeated per preview that only need
to happen once per session. Measured n=1 each, on top of the n=3 budget.

| stage              | today                                          | achievable                 | how                                                                                           | verdict                                                                 |
| ------------------ | ---------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| submit POST        | 505 ms                                         | **149 ms**                 | `redirect: "manual"` — stop downloading the `requests/history/` page the POST redirects to    | ✅ proven: `opaqueredirect`, audit queued, row visible 140 ms later     |
| add + verify       | 331 ms                                         | **213 ms**                 | `redirect: "manual"` on `page=4`, then one `view_planner/` read                               | ✅ the landing page does _not_ carry the rows, so the verify read stays |
| resolve (`page=3`) | 128 ms                                         | **0 on the critical path** | prefetch the listing when the user picks the course; still parse the link, never construct it | ✅ link stable across fetches, no nonce                                 |
| audit form GET     | 111 ms _(was hidden)_                          | **0 per preview**          | fetch `student_individual/` once per session; hidden fields are stable                        | ✅ `fieldsStable: true`                                                 |
| history snapshot   | 123 ms _(was hidden)_                          | 0 on the critical path     | overlap with resolve/prefetch                                                                 | ✅ already proven                                                       |
| scrape             | 382 ms                                         | 379 ms                     | nothing — 376 ms is UT's TTFB rendering the audit; parse is 8 ms                              | ❌ immovable                                                            |
| UT generation      | 2.0–2.3 s typical, **up to 10.6 s** under load | —                          | —                                                                                             | ❌ immovable, and not a fixed floor (see below)                         |

Total cuttable: **~840 ms**, of which ~600 ms was inside the 3.6 s budget and
~235 ms was per-preview work the budget never listed. Critical path becomes:

```text
add ~213 → submit ~149 → detection ~140 → UT ~2075 → scrape ~380  ≈ 2.95 s
```

**Proven end to end (2026-09-09, interleaved A/B against the old path, 4
audits):** trimmed previews of 3343 and 3507 ms including ~220 ms of reads
that move to course-pick time; normalised to the same UT generation as the
reference, **~3.0–3.1 s**. The old path in the same minutes took 3672 and
3069 ms just from submit to link; the trimmed path took 2466 and 2621.

**~3.0 s preview (was 3.6 s), and UT is now ~83% of it.** The earlier note
that "submit can't move" was wrong: it was the redirect landing page, not the
POST, that cost 500 ms. Overlapping submit with the add is still off the table
— the audit must be queued after the row exists.

Consequences for 5.2/5.4:

- Every planner write and the audit POST use `redirect: "manual"` and treat
  `type === "opaqueredirect"` as "UT accepted"; a `basic` 200 means UT
  re-rendered the form (silent rejection). The auth gate runs first so an SSO
  bounce can't be mistaken for acceptance.
- Verify-after-write stays as one `view_planner/` read per write.
- Cache the audit form's field set for the session; refresh on a 403.
- Resolve `page=3` on course selection, keep the parsed `page=4` href, follow
  it on preview. Re-resolve if the term changes.

**UT generation is not a fixed 2.1 s.** Eleven samples on 2026-09-09 ranged
2.0–10.6 s (median 2.3 s); two back-to-back runs around noon took 6.2 s and
10.6 s on both the old and trimmed paths, so it is UT's queue, not us. Worst
observed full preview: **12.1 s** — under the 15 s eager-verify threshold, but
the margin is ~3 s, not ~11 s. Consequences: 5.6's progress UI must be
designed for a 2–12 s wait, not a 3 s one, and the 90 s poll window stays.
If a run ever crosses 15 s, DAP-114 reopens.

Beyond that the UX lever remains presentation: UT publishes `In progress`
within ~150 ms of the POST, so a progress display makes a 2–10 s generation
feel shorter than any further trimming would.

## Later: planner view (drag-and-drop)

Long-term multi-semester planning view; dragging a course re-runs the audit
in the background so progress updates live. Flow undecided — deferred until
the main-view feature ships (decision ticket on the map). Open: run cadence
while dragging (debounce/coalesce), progress display, planned→registered
transitions at registration time.

## Tickets

Tracked on the Linear map
[DAP-114 "Hypothetical Courses — map (DAP-91)"](https://linear.app/longhorn-devs/issue/DAP-114/hypothetical-courses-map-dap-91)
(Sprint 5A, milestone "Design and Implement CRUD for planned courses"):

- **5.1 (DAP-115)** POC: planner mechanics + preview timing — ✅ **done**
- **5.2 (DAP-117)** Planner client ← 5.1 _(unblocked — next)_
- **5.3 (DAP-116)** Run correctness fixes _(unblocked; overlaps DAP-103)_
- **5.4 (DAP-118)** Preview pipeline (backend) ← 5.2, 5.3 — 🚩 **checkpoint**
- **5.5 (DAP-119)** Accept + storage + hygiene ← 5.4
- **5.6 (DAP-120)** Minimal UI wiring ← 5.4, 5.5
- **5.7 (DAP-121)** Decide planner-view drag-and-drop flow ← 5.6

Sub-issues are numbered `5.N.M` under each ticket.

Every ticket carries TLDR / Recommendations / Testing (device proof in the
PR) / Connections sections; Connections states exactly which other issues to
refer to and what to pull from them. Each has sub-issues splitting the work.

## Branching

The feature is not yet proven end to end, so it integrates on its own branch
rather than landing piecemeal on `main`:

```text
main
 └── feature/dap-91-hypothetical-courses   <- acts as "main" for this feature
      ├── feature/dap-117-planner-client   <- one branch per ticket, PR'd in
      ├── feature/dap-118-preview-pipeline
      └── …
```

- **Per-ticket branches PR into the feature branch**, not into `main`. Review
  still happens per ticket; `main` stays clean until the feature works.
- **Merge `main` in periodically.** `main` is quiet (bug fixes only), but
  `session.ts`, `audit-history-sync.ts`, `messages.ts`, and
  `background-controller.ts` — every file this feature touches — have all seen
  recent commits. Pulling `main` in regularly keeps those conflicts small.
- **Checkpoint at 5.4.** The preview pipeline is where the eager-verify
  approach either works end to end or doesn't. If it works, merge the feature
  branch to `main` then rather than waiting for 5.6 — a smaller, earlier merge
  beats one large one. If it doesn't, the branch is discarded without having to
  revert anything from `main`.

The 5.1 spike harness lives on `feature/dap-115-51-poc-planner-mechanics-preview-timing`
and is deliberately **not** merged — it is throwaway console tooling. Its
findings are in this document, which is the durable output.

## Acceptance criteria

- Auth checked before every planner/audit operation; expired session →
  notify + redirect, no partial planner writes.
- Preview runs always `includePlanned: true`; declined previews leave no
  planner rows (or a dirty flag that reconciles on next run).
- One pending preview at a time; accepting promotes exactly the previewed
  audit to main; correct raw-ID correlation (UI dedupe untouched).
- Preview-generated audits never appear in the app's audit list.
- Unrelated planner rows never deleted without per-row user confirmation;
  Delete All never automated.
- Parenthesized/expired courses rejected as preview inputs.
- Timeout/logout/reload leaves a recoverable state: dirty planner flags
  reconcile, no stray planner rows accumulate.
