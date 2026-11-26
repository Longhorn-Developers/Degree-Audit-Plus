# DAP-91: planned-course CRUD and audit verification

**Date:** 2026-07-20  
**Input:** [DAP-91](https://linear.app/longhorn-devs/issue/DAP-91/plan-out-crud-for-editing-hypothetical-courses), supplied diagram, UT planner inspection, current repo.

## TL;DR

Recommend **local plan drafts + explicit Verify with UT**.

- Local add/remove/move = instant, marked **Unverified**.
- User can keep multiple local plans.
- Only one plan is UT-synced at a time. UT has one global planner.
- Verify = sync selected plan to UT planner, run one audit with **Planned Courses** checked, scrape result, save result audit ID.
- Show local requirement placement as **Estimated** until UT verifies it.
- Do not run an audit after every Add by default. Too slow/noisy unless real latency tests prove otherwise.

## UT flow

```text
Select term/type/pass-fail
  -> fetch page=3 course list
  -> follow exact page=4 course link (adds one course)
  -> repeat per course
  -> run audit with Planned Courses checked
  -> poll history
  -> scrape new result
```

Example list URL:

```text
https://utdirect.utexas.edu/apps/degree/audits/planner/ut_course/?page=3&course_ccyys=20272&course_pass_fail=&s_pf=&course_type=1&dpt=C+S&s_lvl=U
```

Example add URL:

```text
https://utdirect.utexas.edu/apps/degree/audits/planner/ut_course/?page=4&course_ccyys=20272&course_pass_fail=&course_type=1&dpt=C%20S&course_num=324E&course_topic_id=
```

Important:

- `page=4` is a GET but changes planner state. Never prefetch it.
- Parse the exact `page=4` link from `page=3`; do not guess parameters.
- Add is one course at a time.
- Modify only changes term/year/pass-fail. Course replacement = delete + add.
- Courses in parentheses do not apply to new audits.
- Planned Courses is unchecked by default on the audit form.
- UT planner changes are logged.
- UT planner does not accept a target requirement. UT audit decides actual placement.

## Options

|                     | A: verify every Add | B: local bin + Verify | Recommended hybrid   |
| ------------------- | ------------------- | --------------------- | -------------------- |
| Add response        | Wait for UT audit   | Instant               | Instant estimate     |
| Audits for 5 edits  | Up to 5             | 1                     | 1 per Verify         |
| Exact placement     | After each Add      | After Verify          | Estimate, then exact |
| Multiple plans      | Poor                | Good locally          | Good locally         |
| UT mutations        | Every candidate     | Selected plan only    | Active plan only     |
| Audit history noise | High                | Low                   | Low                  |
| Complexity          | Highest             | Medium                | Medium               |

## Option A: verify every Add

### Flow

```text
User selects course
  -> temporarily add to UT planner
  -> run planned-course audit
  -> scrape + compare result
  -> accept: keep course, save result as plan head
  -> reject: delete course, keep previous plan head
```

“Verify before adding” is not read-only. UT needs the course in its global planner before it can audit it.

### Pros

- UT-authoritative answer for every course.
- Small, easy-to-read diffs.
- Accepted active plan remains in UT planner.

### Cons

- One audit per candidate.
- Rejected candidate still creates audit history and logged planner changes.
- Slow Add UX.
- Temporary course visible to other UT audits/tabs.
- Hard rollback/recovery on timeout, logout, or concurrent edits.
- Cannot keep multiple UT-backed plans at once.

### Timing

```text
T_add = page3 lookup + page4 write + planner verification
        + audit generation + result scrape
        + delete if rejected
```

For `k` alternatives, pay audit-generation cost `k` times.

Use only if measured p95 verification time is low and UT run volume is acceptable.

## Option B: local bin + Verify

### Flow

```text
Local CRUD (no UT calls)
  -> user selects a plan
  -> Verify with UT
  -> diff plan vs last synced planner snapshot
  -> apply UT mutations one by one
  -> run one planned-course audit
  -> scrape + save verified result
```

Candidates can stay in a bin or be placed into semesters/requirements with an **Estimated** badge.

### Pros

- Fast planning and comparison.
- One audit verifies many edits.
- Multiple local branches.
- Fewer UT mutations and audit results.
- Easier failure recovery.

### Cons

- Not authoritative until Verify.
- UT may move courses to different requirements.
- Local-only plans can be lost if extension storage is cleared.
- Switching active plan requires another UT reconciliation.

### Timing

```text
T_verify = sum(required planner mutations)
           + one audit generation
           + result scrape
```

Reuse each `page=3` response for courses sharing term/type/pass-fail/department/level. Still follow one `page=4` link per added course.

## Recommended hybrid

1. Multiple local plans.
2. One active UT-synced plan.
3. Instant estimated placement using current DAP logic.
4. Explicit Verify runs one batched sync + one audit.
5. UT result replaces estimated placements and becomes plan’s verified head.
6. Later: optional debounced auto-verify only if latency data supports it.

Useful plan states:

- `Unverified`: local draft changed.
- `Syncing`: planner mutations/audit running.
- `Verified`: draft revision matches saved UT audit.
- `Stale`: base/config or UT planner changed externally.
- `Failed`: sync/audit failed; local draft preserved.

## Plan/audit identity

Do not use `currentAuditId` as plan identity. It is UI selection.

Store per plan:

| Field              | Purpose                                                               |
| ------------------ | --------------------------------------------------------------------- |
| `baseAuditId`      | Original audit used to create/reset/compare plan                      |
| `verifiedAuditId`  | Latest UT result for this plan                                        |
| `runConfig`        | Catalog, college, degree plan, minor/certificate, include flags       |
| `draftRevision`    | Current local version                                                 |
| `verifiedRevision` | Revision represented by `verifiedAuditId`                             |
| `lastPlannerHash`  | Detect external UT planner changes                                    |
| courses            | Code, term, type, pass-fail, intended requirement, UT key, sync state |

Plan history:

```text
baseAuditId -> verifiedAuditId rev 1 -> verifiedAuditId rev 2
```

## Audit result correlation

Current scraping works: it polls history, finds uncached IDs, then scrapes them. The audit POST does not need to directly return an ID.

For plan verification:

1. Read raw audit IDs before submit.
2. Serialize DAP audit runs.
3. Submit audit.
4. Poll until a new raw ID appears.
5. Associate new ID with plan revision.
6. Apply existing major/percentage deduplication afterward for visible audit cards.

Do not remove intended UI deduplication. Correlation just needs raw rows before dedupe.

## Catalog vs planner pages

Keep current catalog for search/display:

- Schedule status
- Instructors
- Meeting info
- Core flags
- Descriptions

Use planner pages for write eligibility:

- Resolve selected course on `page=3`.
- Follow exact `page=4` add link.
- Fetch View Courses afterward and save UT planner key.

If catalog course is missing from `page=3`, keep it local and show sync failure.

Topic courses: `page=4` includes `course_topic_id`. Do not dedupe distinct topics or silently pick one. Require exact topic selection.

## Required implementation work

### 1. Audit run correctness

- Before/after raw-ID correlation.
- Single active DAP audit run.
- Return correlated audit ID to caller.
- Keep temporary UT host tab alive until completion.
- Current mismatch: history poll allows 90s, temporary tab closes after 30s.
- Tests: same-percentage runs, timeout, logout, unrelated manual audit.

### 2. UT planner client

- Fetch/parse View Courses.
- Resolve `page=3` course links.
- Follow exact `page=4` adds sequentially.
- Modify term/pass-fail.
- Exact delete by UT key. Never automated Delete All.
- Fetch-before-write and verify-after-write.
- Preserve unrelated/manual planner rows.
- Stop on external drift or ambiguous ownership.

### 3. Plan storage/UI

- Store plans separately from scraped audit cache.
- CRUD edits plan draft, not base audit.
- Add plan duplicate/rename/switch.
- Show Estimated/Verified/Stale/Failed.
- Add Verify progress, retry, and result diff.

## Runtime timing

Known code values, not measured UT latency:

| Item                           | Current value |
| ------------------------------ | ------------: |
| History poll interval          |        500 ms |
| History poll window            |          90 s |
| Audit scrape timeout           |          30 s |
| Temporary UT tab lifetime      |          30 s |
| Content-script readiness retry |    Up to 10 s |

Measure:

```text
planner sync start/end
audit submit
new history ID detected
result scraped
UI updated
```

Suggested UX gate:

| Measured p95    | Behavior                             |
| --------------- | ------------------------------------ |
| `<3s`           | Background verify may feel immediate |
| `3-8s`          | Explicit or debounced Verify         |
| `8-15s`         | Explicit Verify only                 |
| `>15s`/unstable | Staged flow with retry/recovery      |

No audit was submitted during this review, so no real p50/p95 yet.

## Implementation estimate

One engineer, current audit-runner work included:

| Work                        |  Estimate |
| --------------------------- | --------: |
| Timing + raw-ID correlation |  1-2 days |
| UT planner client           |  2-3 days |
| Local-bin MVP               |  2-3 days |
| Eager prototype             | +2-4 days |
| Hybrid branches + QA        | +1-2 days |

Recommended hybrid total: **6-10 days**. UT form changes, auth issues, or UI redesign can add time.

If testing both options in separate worktrees: land shared audit/planner client first. Branch only UX/orchestration.

## Acceptance criteria

- Five local edits make zero UT calls before Verify.
- One Verify creates one audit.
- Eager mode creates one audit per candidate and can rollback reject.
- Verification always sets `includePlanned: true`.
- Correct new audit ID associated with plan revision.
- Existing major/percentage UI dedupe stays.
- Unrelated UT planner courses never deleted.
- Multiple local plans do not overwrite each other automatically.
- Estimated placements clearly differ from UT-verified placements.
- Parenthesized/expired courses not treated as valid verification inputs.
- Timeout/logout/reload preserves local draft and recoverable sync state.

## Decision

Build **local plans + explicit Verify with UT** first.

Prototype eager verification only after timing/correlation/planner client exist. Enable it only if real latency and reliability are good enough.
