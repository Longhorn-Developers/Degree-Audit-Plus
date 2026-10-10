# Audit Scraping — How It Works

Everything runs on authenticated same-origin `fetch`es from content scripts on
UT pages (they carry the session cookies and have a `DOMParser`). The
background service worker only orchestrates. The one time a tab is opened is
an app-driven run with no UT tab available: a hidden one is opened and closed
when the run ends.

## Flow: syncing audits on page load

```text
UT audits page load ──▶ content script routes by pathname (content-controller.ts)
  sync pages (home, */history)  ──▶ startAuditHistorySync (audit-history-sync.ts)
        │  fetch history page → parseAuditHistory → saveAuditHistory
        │  uncached audit IDs? → SCRAPE_ALL_AUDITS ──▶ background
        ▼
background batch (background-controller.ts, AuditBatchController)
  login gate (session.ts) → per audit: FETCH_AUDIT message back to the
  requesting content script → fetchAuditResults: fetch results/{id}/ →
  parseAuditPage → reply → saveAuditData (audit-storage.ts)
        ▼
UI updates via storage watchers (popup-app.tsx, audit-provider.tsx)
```

## Running an audit from the app

The popup's Run Audit button (and every preview run in DAP-91) goes through
this path. Two sides: the **background** owns everything that crosses tabs
(one run at a time, login gate, tab open/close, storage); the **UT tab** owns everything
that talks to UT (it has the cookies and a `DOMParser`; the background has
neither).

```text
popup                background (background-controller.ts)         UT tab (audit-runner.ts)
─────                ─────────────────────────────────────         ────────────────────────
RUN_NEW_AUDIT ─────▶ runNewAudit()          queueRun: aborts a preview in flight
                       │                    (CANCEL_RUN), starts once the last run settled
                       └ runInUtTab()
                         ├ getCachedLoginState() false? → openLoginTab, fail
                         ├ getAuditPageTab()   existing UT tab, or open one hidden
                         ├ RUN_AUDIT ──────────────────────────▶ runAudit(runId, custom)
                         │                                        ├ dropPendingPreview()   last preview's course off the planner
                         │                                        ├ fetchAuditHistoryRows() ∥ fetchRunForm()
                         │                                        │   known = every row's key
                         │                                        ├ submitForm()   POST, redirect:"manual", incl_planned_crswk=Y
                         │                                        ├ waitForNewAudit(known)   poll 150 ms
                         │                                        │   1. row whose key ∉ known → ours
                         │                                        │   2. that row has a link  → auditId
                         │                                        ├ fetchAuditResults(auditId)
                         │                                        └ console.log: total / generate / scrape ms
                         │ ◀───────────────────── { ok, outcome: { auditId, audit, history } }
                         ├ saveAuditHistory(history)   → popup + main page update via storage watchers
                         ├ saveAuditData(cardId, audit)   a rerun folded into an older card refreshes that card
                         └ finally: close the tab if we opened it
◀──────────────────── { success, auditId }  |  { success: false, error }
```

Why the row, not the id: a history row exists from the moment UT accepts the
request (~150 ms after the POST), with no link yet. Its identity is the first
five cells (`AuditHistoryRow.key`), everything before Status. We remember the
one row we didn't know before the POST and wait for _that_ row's link, so an
audit finishing at the same time from UT's own page or another device is never
mistaken for ours.

Failures cross the wire as a string and end as `{ success: false, error }` at
the popup, which clears its spinner. A tab the background opened always
closes.

Default-degree runs always include planned courses, so the main audit counts
every course the user added from a preview.

Only a preview is cancelled. A new request while a preview runs sends it
`CANCEL_RUN`; it throws `CANCELLED` at its next check, and the new one starts.
If it had not POSTed yet, nothing reaches UT. Once it has, it waits for its
audit and deletes it first. A real run is never cancelled; a new request waits
for it.

| Error              | Where                  | Meaning                                               |
| ------------------ | ---------------------- | ----------------------------------------------------- |
| `AUTH_REQUIRED`    | gate, or any UT fetch  | Session gone; a login tab opens                       |
| `RUN_FAILED`       | `submitForm`           | UT answered 200: re-rendered the form, queued nothing |
| `RUN_NOT_ACCEPTED` | `waitForNewAudit`      | POST redirected but no new row within 10 s            |
| `CANCELLED`        | `runAudit`             | A newer request replaced this preview                 |
| `DELETE_FAILED`    | `deleteAuditRow`       | A preview's audit is still on UT after its delete     |
| `RUN_TIMEOUT`      | `waitForNewAudit` / bg | Link never appeared in 90 s (120 s backstop in bg)    |
| `SCRAPE_FAILED`    | `fetchAuditResults`    | Results page didn't parse                             |

## Previewing a course

Clicking a course in the Add-courses panel asks UT what it would fulfill. It is
the same run as above with one extra step at the start and one at the end.

```text
side panel (course-preview-list.tsx)     background                     UT tab
────────────────────────────────────     ──────────                     ──────
click ──PREVIEW_COURSE {course, auditId}──▶ previewCourse()
                                           ├ open audit's card.degree + getAuditData(auditId)
                                           ├ queueRun({ preview, degree }) ──▶ runAudit(runId, { preview, degree })
                                           │                              ├ planPreview(course)   add it next to the planned
                                           │                              │   courses, pendingPreview = { course, row }
                                           │                              ├ same run, degree_plan + catalog swapped in
                                           │                              └ deleteAuditRow(auditId)   gone before a sync lists it
                                           ├ diffAudits(main, preview)
                                           └ findMissingPlannedCourses() both ways
◀──────────────── { diff, degree, missingPlanned, removedPlanned }

"Add to plan" ──ACCEPT_PREVIEW {auditId}──▶ acceptPreview()
                                    ├ acceptPendingPreview()   pendingPreview → acceptedCourses
                                    └ runNewAudit({ degree })  the course stays planned, so it is in this audit
◀──────────────── { auditId }        the panel switches the dashboard to it
```

`diff` is an `AuditDiff`: UT's percentage before (the open card) and after (the
preview run's history row), and one `RuleChange`
per rule whose applied hours moved. A preview reruns the degree of the audit
the dashboard has open and is compared with that audit. Each history card has
the `degree` (degree plan + catalog year) read off its Rerun link; a card
without one (Slotting, SSI, 12th Class Day, or a minor/certificate, which is
untested) fails with `NOT_PREVIEWABLE`. `missingPlanned` lists planned courses that audit was run
without, and `removedPlanned` the ones it still has but the planner no longer
does. Either way the panel says to run a new audit, since those hours move the
diff too. The main audit and the history list are
never written. Clicking another course cancels the run in flight.

Add to plan and the planner prompt's Remove keep one audit per degree: the
audit made by the previous Add or Remove of that degree (`planAudits`) is
deleted on UT once the new one is in, unless the user renamed or pinned it or
the new run folded into its card.

The course stays on UT's planner until the next run of any kind, which takes it
back off unless it was accepted. A course that was already planned is never
taken off. The other planned courses stay on the planner, so the preview diffs
like for like against a main audit that includes them.

## Managing the planner

The courses the user added from previews are in `acceptedCourses`. The UT
planner can also have rows the app never added (typed in on UT, or left from
before), and the user can delete rows on UT at any time.

```text
Add-courses panel (planned-courses-modal.tsx)   background                 UT tab
─────────────────────────────────────────────   ──────────                 ──────
page load, or "Manage planned courses"
  ──CHECK_PLANNER──▶ checkPlanner()   queued with runs, never opens a login tab
                       ├ READ_PLANNER ───────────────────────▶ readPlanner()
                       │                                         ├ dropPendingPreview()
                       │                                         └ fetchPlannedCourses()
                       └ syncAcceptedCourses(rows)   courses gone from the planner leave the plan
  ◀──── { courses: [{ row, accepted }] }   any row not accepted opens the prompt

Save ──UPDATE_PLANNER { keep, remove }──▶ updatePlanner()
                                            ├ updateAcceptedCourses(keep, remove)
                                            ├ open audit plans a removed course? rerunForPlan({ remove }) ──▶ runAudit deletes
                                            │                                                       those rows, then the usual run
                                            └ otherwise PLANNER_DELETE each row in a UT tab, no run
  ◀──── { auditId | null }
```

Every row needs a Keep or Remove answer before Save, so nothing leaves the
planner without the user picking it. Rows are deleted one at a time; UT's
Delete All is never used. The open audit is only rerun when it has one of the
removed courses as planned; otherwise the rerun would come back the same.

## Detecting an audit run on UT's own page

Clicks on UT's own Run button don't go through the path above, so detection
sets a shared pending marker (`local:pendingAuditRunAt`) and polls the history
page (0.5 s interval, 90 s window) until the result link appears. Three
triggers, all in `audit-history-sync.ts`:

- **Click watcher** — capture-phase listener for `.run_button` clicks on any
  audits page (also catches the background's programmatic clicks).
- **Post-submit redirect** — landing on history with `?submit_success=Y`
  (covers custom audits submitted from pages the watcher doesn't see).
- **Linkless history entry** — a fetched entry without an `auditId` is still
  generating (`hasAuditResult` in `domain/audit.ts`); poll until it isn't.

The marker lives in extension storage so the poll survives the form POST's
navigation — the next audits page's content script resumes it
(`resumePendingAuditPoll`). While pending, the popup shows a dimmed spinner
card (`popup-audit-card.tsx`).

## Auth

Sessions are UT SSO + Duo and can't be renewed silently. Any login redirect is
a hard stop: the batch aborts and the user is sent to log in (`openLoginTab`);
the session-cookie watcher in `session.ts` picks things back up after re-login.

## Key files

| File                                               | Role                                                                          |
| -------------------------------------------------- | ----------------------------------------------------------------------------- |
| `features/audit-scraping/content-controller.ts`    | Routes page loads; serves `FETCH_AUDIT` / `RUN_AUDIT` / `PLANNER_*` (UT tab)  |
| `features/audit-scraping/audit-runner.ts`          | `runAudit()`: one audit end to end inside the UT tab                          |
| `features/audit-scraping/audit-history-sync.ts`    | History fetch (`fetchAuditHistoryRows`), results fetch, UT-page run detection |
| `features/audit-scraping/audit-history-parser.ts`  | History table → rows with identity → deduped `AuditHistoryEntry[]`            |
| `features/audit-scraping/audit-page-parser.ts`     | Results DOM → `CachedAuditData`                                               |
| `features/audit-scraping/background-controller.ts` | `runNewAudit()` (latest wins), batch scraping, login gate (background)        |
| `features/audit-scraping/planner-bridge.ts`        | Planner calls: UI → background → UT tab                                       |
| `features/session/session.ts`                      | Login state, probes, login tab                                                |
| `lib/browser/messages.ts`                          | Typed message protocol                                                        |
