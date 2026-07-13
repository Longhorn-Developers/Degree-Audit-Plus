# Simplification Suggestions
---

## Tier 6 — Architecture / code design

### 20. Split `course-add-modal.tsx` — it's two features in one file (~ 0 net lines, real seam)

**File:** `features/catalog/components/course-add-modal.tsx` (535 lines — largest in features/)

The file contains two unrelated UI surfaces that happen to share a directory:

| Surface | Components | Used from |
|---|---|---|
| Fulfilling-courses **modal** | `CourseAddModal`, `FulfillingCoursesContent` | opened via `openModal()` from requirement rows |
| Course-search **side panel** | `CourseSearchPanel`, `CourseSearchContent`, `CourseSearchResults`, `DivisionToggle` | embedded directly in both pages' side rails |

They share nothing except `CourseCard` and the mappers. Move the search panel to
`features/catalog/components/course-search-panel.tsx`. Bonus: after items 17/18 the search
panel file has no audit-context import at all, and the modal file's dependencies shrink to
`useCourseModalContext` + `useAuditContext.addPlannedCourse`.

### 21. Decide the composite-audit question explicitly (biggest conceptual simplifier)

**File:** `features/audit/audit-provider.tsx` lines 95–112

Today the provider wraps the single current audit into a one-element `CompositeAuditData`,
runs it through `getCompositeAuditRequirements` (which computes `auditName` and
`duplicateCourseCodes` per requirement), and every view consumes the result — but **no view
reads the composite-only fields**, and `lib/storage/composite-storage.ts` has no app
consumers yet. Two honest options:

- **A. Multi-audit view ships soon** → keep the pipeline exactly as-is. The indirection is
  the feature's landing zone; removing it now means re-adding it next month.
- **B. Multi-audit view is not imminent** → have the provider derive `sections` directly
  from `auditData.requirements` and delete the wrapper `useMemo`s. The tested functions in
  `lib/audit-calculations.ts` stay for when the feature lands.

Either is fine; what's costing you is the *undecided middle* where every reader of the
provider has to understand composite plumbing that does nothing yet. Pick A or B and note
it in the code.










### 34. Rejected — and why (so these don't get re-litigated)

- **Zustand / Redux / Jotai:** context + derived `useMemo` fits this app. State lives in
  one provider; item 17 fixes the only real re-render problem. A store adds concepts, not
  capability.
- **TanStack Query:** its value is caching/refetching/invalidating server state. The async
  sources here are extension storage and IndexedDB — one-shot local reads. Nothing to cache.
- **Zod (runtime validation):** validation already exists where data actually crosses a
  trust boundary (`validate-catalog.ts` for scraped data, error paths in the scraper).
  Schema-defining every internal type would duplicate the TS types for data this codebase
  itself wrote.
- **React Router:** two views behind a toggle plus one query param. A router adds routes,
  layouts, and navigation concepts to avoid one `viewMode === "audit"` ternary.
- **date-fns / dayjs:** the only date logic is semester math (`getCurrentSemester`,
  `nextSemester`) — domain-specific, ~20 lines, no date library helps.
- **shadcn/Radix wholesale:** the `components/ui/` set matches the Figma design and is
  small. One targeted exception worth knowing: if/when the modal and the audit-card menu
  get proper a11y (Escape-to-close, focus trap, outside-click dismiss — none exist today),
  reach for `@radix-ui/react-dialog` / `react-dropdown-menu` rather than hand-rolling focus
  management. Until then, no.
- **framer-motion is on watch, not rejected:** it's a heavy dependency with exactly one
  consumer (the graph tooltip fade/slide in `graph.tsx`), and CSS transitions could do that
  job. Not urgent — but if bundle size ever matters or a second animation need *doesn't*
  appear, replace and drop it.

---

## Tier 9 — Second-pass findings (storage layer, popup architecture, leftovers)

From a follow-up review after the first cleanup rounds landed. The provider memoization,
`currentAuditName`, and WXT typed preferences all check out — `updateLastAuditId` is
properly `useCallback`'d, so the audit-load effect that depends on it stays stable.

### 35. The popup content script runs on every website the user visits (biggest item here)
◊
**File:** `entrypoints/popup-ui.content.tsx` (`matches: ["<all_urls>"]`)

What this costs today, on **every page the user opens anywhere on the web**:

- `loadFonts()` runs immediately in `main()` — it appends three Google Fonts `<link>` tags
  into the *host page's* `<head>` before the popup is ever opened. That fires requests to
  Google from every site the user visits and can change fonts on pages that use the same
  families.
- Two `console.log`s pollute every page's console.
- The manifest needs `<all_urls>` host access → the scary "read and change all your data on
  all websites" install warning and slower store review.
- On pages where content scripts can't run (chrome://, Web Store, PDFs), clicking the
  toolbar icon does nothing — `sendTabMessage(...).catch(() => {})` in
  `background-controller.ts` swallows the failure silently.

Two options, honestly weighed:

- **A (recommended): make it a standard action popup.** `popup-app.tsx` is already designed
  as a fixed 438px card — it *is* a toolbar popup wearing an overlay costume. Point the
  manifest `action.default_popup` at a `popup.html` entrypoint rendering `<App />`. Then
  delete: the whole content script, the `TOGGLE_POPUP` message + its background listener,
  the font/head injection, and the `<all_urls>` requirement. UX change: the popup anchors
  to the toolbar icon instead of overlaying the page — for this UI that's arguably more
  native, but it is a visible change, so it's your call.
- **B (minimum fix, no UX change):** move `loadFonts()` inside `showPopup()` so pages the
  user never opens the popup on are left untouched, and delete the `console.log`s. The
  `<all_urls>` permission cost remains.

### 36. Audit history is the next `storage.defineItem` candidate — three hand-rolled consumers

Item 33 said "adopt WXT storage opportunistically." The opportunity is now concrete:
**three places** independently hand-roll reads/listeners for the same `auditHistory` key
that `lib/storage/audit-storage.ts` owns privately:

- `features/popup/popup-app.tsx` — `browser.storage.onChanged` + `changes.auditHistory`
- `features/banner/try-dap-banner.tsx` — same listener pattern, plus ad-hoc inline types
  (`{ audits?: { auditId?: string }[] }`) re-describing `AuditHistoryData`
- `features/audit/audit-provider.tsx` — one-shot read (goes stale after a background
  re-scrape until reload)

Defining `auditHistoryItem = storage.defineItem<AuditHistoryData>("local:auditHistory")`
inside audit-storage (keeping the same key, so **no data migration**) collapses all three:
consumers call `auditHistoryItem.watch(...)` and the stringly `changes.auditHistory`
lookups and duplicate inline types disappear. This is the same pattern
preferences-provider already uses, applied to the key with the most consumers.

### 37. `getUncachedAuditIds` does N storage reads for an existence check

**File:** `lib/storage/audit-storage.ts` lines 59–64

It `Promise.all`s a full `getAuditData` per id — deserializing every cached audit (which
are large objects) just to test presence. `browser.storage.local.get` accepts an array:

```ts
const keys = auditIds.map((id) => `${AUDIT_DATA_PREFIX}${id}`);
const result = await browser.storage.local.get(keys);
return auditIds.filter((id) => !(`${AUDIT_DATA_PREFIX}${id}` in result));
```

One round trip instead of N. Mechanical, and `background-controller.test.ts` doesn't touch
this function, so no test churn.

### 38. Test data is living in `lib/` — move it to `tests/`

`lib/examples/data/ut-degree-programs.ts` (423 lines, the single biggest file under `lib/`)
has exactly one consumer: `tests/validate-parse-major.ts`. It's expected-output fixture
data, not library code. Move it to `tests/fixtures/` (next to
`ut-direct-degree-plan-cases.ts`'s eventual home) and delete the now-empty `lib/examples/`.
Rule this encodes: `lib/` contains only code the app imports.

### 39. Dead and no-op helpers in `lib/utils.ts`

Verified against all call sites:

- `formatMajorLabel` **is the identity function** (`return major;`) — called in 3 places
  (provider, navbar ×2) for zero effect. Either it's a placeholder for real formatting
  (then add the TODO saying what it should do) or delete it and unwrap the call sites.
- `getColorBySectionTitle` and `getColorByIndex` have **zero consumers** — delete both.
  (`getColorByCourseCode` is used; keep.)

### 40. Gate debug logging, keep error logging

8 `console.log`s ship in production code paths (scraper-window ×3, popup content script,
background batch summary, etc.). The zero-dependency fix: wrap them in WXT's built-in flag —
`if (import.meta.env.DEV) console.log(...)` — or just delete the ones that only narrate
("Toggle message received"). Keep every `console.error`/`console.warn`; those are doing
real work. Don't build a logger abstraction for 8 call sites.

### 41. Left alone on purpose (so the next reviewer doesn't re-flag them)

- **`scraper-window.ts`** — reviewed closely; the listener-before-create ordering, timeout
  cleanup, and `activeScraperTabs` bookkeeping are all correct. Its complexity is inherent
  to tab lifecycle management, not accidental. Don't simplify it.
- **`parse-major.ts`** — 176 lines of UT-specific regex special cases looks scary but is
  data-driven, table-shaped, and covered by `validate-parse-major` against 400+ real degree
  programs. The ugliness lives in UT's data, not this code.
- **Preferences in `sync:` storage** — fine (theme/view prefs syncing across a student's
  machines is a feature; the provider's fallback already handles a synced `lastAuditId`
  pointing at an audit not cached locally). One caveat to know: keys moved from `local:` to
  `sync:`, so existing users' saved preferences reset once. Acceptable for defaults this
  cheap; not worth a migration.

---

## Noticed while reviewing — pre-existing issues, NOT cleanup (decide separately)

These change behavior, so they're out of scope for this pass, but they were easy to spot:

1. **Donut tooltip mislabels units** — `degree-completion-donut.tsx` line 110 always says
   "courses completed" but the numbers are hours for hour-based sections.
2. **Requirement dropdown overwrites Department** (see item 3, last bullet).
3. **Dead placeholder UI** — `sidebar.tsx`: all four Resources links, the Feedback link, and
   the social/footer icons are `href="#"`; the footer Moon icon does nothing while the real
   dark-mode toggle lives in the navbar; the `+` button next to "MY AUDITS" has no handler.
   `audit-card.tsx`: "Duplicate" and "Delete Audit" menu items have no handlers.
4. **`CreditHourTotalsCard` renders hardcoded data** — `degree-audit-page.tsx` lines 58–71
   pass literal 21/36-hour requirements with hardcoded `met` flags instead of audit data.
5. **`lib/storage/composite-storage.ts` has no app consumers** (only `tests/validate-*.ts`
   scripts). Presumably staged for the composite-audit feature — fine to keep, just noting
   it is not wired into the UI yet (see item 21).
6. **Back button doesn't switch audits** — `setCurrentAuditId` does
   `window.history.pushState(..., "?auditId=...")` but nothing listens for `popstate`, so
   pressing Back changes the URL without changing the displayed audit. Either handle
   `popstate` or use `replaceState` so Back leaves the page entirely.

---

## Suggested order

1. **Tier 7 first** (items 25–28): CI test job, lockfile/dep cleanup, lint rules. These are
   config-only, take minutes, and the lint rules then police everything that follows.
2. Item 17 (provider memoization) alone in its own commit — mechanical but touches all
   three providers, so keep it isolated and easy to revert.
3. Items 18 + 20 together (modal reads context, then the file split falls out naturally).
4. Items 29–30 (icon/`cn` standardization) — safe find-replaces, any time.
5. Items 21–24 as individual decisions; 21 first, since A/B changes what the provider
   looks like for everything after.
6. Items 31–33 opportunistically, as the files they touch come up for other reasons.
7. **Tier 9:** items 37–40 are quick, isolated wins (do any time). Item 36 (auditHistory
   `defineItem`) is one focused commit that simplifies three files. Item 35 is the one that
   needs a product decision (A vs B) — decide it deliberately, don't let it linger, because
   option A deletes an entire content script and a store-review-hostile permission.

Expected net effect: a leaner provider API, an end to the toggle-sidebar →
re-render-everything cascade, five dependencies and a stray lockfile gone, tests actually
running in CI, and lint rules that keep dead code from re-accumulating — with zero
user-visible change (except item 35A, if chosen, which relocates the popup to the toolbar).
