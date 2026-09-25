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
(latest request wins, login gate, tab open/close, storage); the **UT tab** owns everything
that talks to UT (it has the cookies and a `DOMParser`; the background has
neither).

```text
popup                background (background-controller.ts)         UT tab (audit-runner.ts)
─────                ─────────────────────────────────────         ────────────────────────
RUN_NEW_AUDIT ─────▶ runNewAudit()          latest request wins: aborts the run in
                       │                    flight (CANCEL_RUN), starts once it settled
                       └ runInUtTab()
                         ├ getCachedLoginState() false? → openLoginTab, fail
                         ├ getAuditPageTab()   existing UT tab, or open one hidden
                         ├ RUN_AUDIT ──────────────────────────▶ runAudit(runId, custom)
                         │                                        ├ fetchAuditHistoryRows() ∥ fetchRunForm()
                         │                                        │   known = every row's key
                         │                                        ├ submitForm()   POST, redirect:"manual"
                         │                                        ├ waitForNewAudit(known)   poll 150 ms
                         │                                        │   1. row whose key ∉ known → ours
                         │                                        │   2. that row has a link  → auditId
                         │                                        ├ fetchAuditResults(auditId)
                         │                                        └ console.log: total / generate / scrape ms
                         │ ◀───────────────────── { ok, outcome: { auditId, audit, history } }
                         ├ saveAuditHistory(history)   → popup + main page update via storage watchers
                         ├ saveAuditData(auditId, audit)
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

A new request while one is running: the old run gets `CANCEL_RUN`, throws
`CANCELLED` at its next poll (≤150 ms), and the new one starts. If the old run
had not POSTed yet, nothing reaches UT. The popup disables its button while a
run is in flight, so this only matters for DAP-91 previews (click course a,
then b: a is dropped, b runs).

| Error              | Where                  | Meaning                                               |
| ------------------ | ---------------------- | ----------------------------------------------------- |
| `AUTH_REQUIRED`    | gate, or any UT fetch  | Session gone; a login tab opens                       |
| `RUN_FAILED`       | `submitForm`           | UT answered 200: re-rendered the form, queued nothing |
| `RUN_NOT_ACCEPTED` | `waitForNewAudit`      | POST redirected but no new row within 10 s            |
| `CANCELLED`        | `runAudit`             | A newer request replaced this one                     |
| `RUN_TIMEOUT`      | `waitForNewAudit` / bg | Link never appeared in 90 s (120 s backstop in bg)    |
| `SCRAPE_FAILED`    | `fetchAuditResults`    | Results page didn't parse                             |

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
