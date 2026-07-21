# Audit Scraping — How It Works

Everything runs on authenticated same-origin `fetch`es from content scripts on
UT pages (they carry the session cookies and have a `DOMParser`). The
background service worker only orchestrates. No tabs or windows are opened.
Design rationale and history: [scraping-redesign.md](scraping-redesign.md).

## Flow

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

## Detecting a freshly run audit

A run takes UT a few seconds to generate, so detection sets a shared pending
marker (`local:pendingAuditRunAt`) and polls the history page (0.5 s interval,
90 s window) until the result link appears. Three triggers, all in
`audit-history-sync.ts`:

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

| File | Role |
|---|---|
| `features/audit-scraping/content-controller.ts` | Routes page loads; serves `FETCH_AUDIT` / `RUN_AUDIT_VIA_FETCH` / `FETCH_AUDIT_OPTIONS` |
| `features/audit-scraping/audit-history-sync.ts` | History sync, run detection, polling, results fetch |
| `features/audit-scraping/audit-runner.ts` | Submits default/custom audit runs; lists form options |
| `features/audit-scraping/audit-history-parser.ts` | History table → `AuditHistoryEntry[]` |
| `features/audit-scraping/audit-page-parser.ts` | Results DOM → `CachedAuditData` |
| `features/audit-scraping/background-controller.ts` | Batch orchestration, login gate, run-audit button |
| `features/session/session.ts` | Login state, probes, login tab |
| `lib/browser/messages.ts` | Typed message protocol |
