# Upfront Audit Scraping Implementation

## Overview

This document describes the upfront audit scraping system that ensures audit data is always available, even when the user is not authenticated to UT Direct.

## Problem Solved

Previously, when a user clicked an audit card from the popup without being authenticated to UT Direct, the scraping would fail because:
1. The hidden tab would load a login page instead of the audit data
2. No cached data existed for that audit
3. User would see a loading spinner indefinitely

## Solution

We now scrape **all audit details upfront** when the user visits the UT Direct audits page (when they are authenticated). This ensures:
- All audit data is cached before the user needs it
- Clicking any audit from popup/sidebar loads instantly from cache
- No authentication issues since scraping happens during an authenticated session

---

## Architecture

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ User visits UT Direct audits page (authenticated)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ content.tsx: fetchAndStoreAuditHistory()                        │
│  1. Fetch audit history list                                    │
│  2. Save to storage                                             │
│  3. Get list of uncached audit IDs                              │
│  4. Send SCRAPE_ALL_AUDITS to background                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ background.ts: SCRAPE_ALL_AUDITS handler                        │
│  For each audit ID:                                             │
│    1. Create hidden tab with audit URL                          │
│    2. Wait for page to load                                     │
│    3. Send RUN_SCRAPER message                                  │
│    4. Wait for AUDIT_RESULTS                                    │
│    5. Close tab                                                 │
│    6. Move to next audit (500ms delay)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ content.tsx: RUN_SCRAPER handler                                │
│  1. Check for login page (auth error)                           │
│  2. Parse coursework table                                      │
│  3. Parse requirements sections                                 │
│  4. Send AUDIT_RESULTS back                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ All audits now cached in browser.storage.local                  │
│ Key: "auditData_{auditId}"                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files Modified

### 1. `lib/general-types.ts`
Added `scrapedAuditIds` field to `AuditHistoryData` interface:
```typescript
export interface AuditHistoryData {
  audits: DegreeAuditCardProps[];
  timestamp: number;
  error?: string;
  auditNumber?: number;
  scrapedAuditIds?: string[];  // NEW: Track which audits have been scraped
}
```

### 2. `lib/storage.ts`
Added helper function to find uncached audits:
```typescript
export async function getUncachedAuditIds(auditIds: string[]): Promise<string[]> {
  const uncached: string[] = [];
  for (const id of auditIds) {
    const cached = await getAuditData(id);
    if (!cached) uncached.push(id);
  }
  return uncached;
}
```

### 3. `entrypoints/background.ts`
Added batch scraping infrastructure:
- `scrapeAuditById(auditId)` - Reusable function to scrape a single audit
- `SCRAPE_ALL_AUDITS` message handler - Orchestrates sequential scraping
- `AUDIT_SCRAPE_ERROR` message handler - Handles scrape failures
- `pendingScrapes` map - Tracks promises for async resolution

### 4. `entrypoints/content.tsx`
Modified `fetchAndStoreAuditHistory()` to trigger batch scraping:
- Gets list of audit IDs from history
- Filters to only uncached IDs
- Sends `SCRAPE_ALL_AUDITS` message to background

Enhanced `RUN_SCRAPER` handler:
- Detects login page (auth failure)
- Passes `auditId` in response messages
- Added comprehensive console logging

### 5. `entrypoints/degree-audit/main.tsx`
Simplified audit loading:
- Removed on-demand scraping (`SCRAPE_AUDIT` message)
- Removed `AUDIT_RESULTS` listener
- Shows error with link to UT Direct if audit not cached

---

## Message Types

| Message | Sender | Receiver | Purpose |
|---------|--------|----------|---------|
| `SCRAPE_ALL_AUDITS` | content.tsx | background.ts | Start batch scraping |
| `RUN_SCRAPER` | background.ts | content.tsx | Scrape current page |
| `AUDIT_RESULTS` | content.tsx | background.ts | Return scraped data |
| `AUDIT_SCRAPE_ERROR` | content.tsx | background.ts | Report scrape failure |

---

## Error Handling

### Authentication Expired
- **Detection**: Content script checks for login form on page
- **Response**: Sends `AUDIT_SCRAPE_ERROR` with `AUTH_REQUIRED`
- **Result**: Audit marked as failed, continues to next

### Table Not Found
- **Detection**: `#coursework table.results` selector fails
- **Response**: Sends `AUDIT_SCRAPE_ERROR` with `TABLE_NOT_FOUND`
- **Result**: Audit marked as failed, continues to next

### Timeout
- **Detection**: Page doesn't load within 30 seconds
- **Response**: Tab closed automatically, promise rejected
- **Result**: Audit marked as failed, continues to next

### Partial Failures
- Each audit is scraped independently
- Failed audits don't affect successful ones
- On next visit to UT Direct, uncached audits will be retried

---

## Console Logging

All scraping activity is logged with prefixes for easy filtering:

| Prefix | Location | Purpose |
|--------|----------|---------|
| `[Content]` | content.tsx | History fetch & batch trigger |
| `[Scraper]` | content.tsx | Individual page scraping |
| `[Batch Scraper]` | background.ts | Batch orchestration |
| `[Background]` | background.ts | Tab management |
| `[Main]` | main.tsx | Audit loading |

### Example Console Output
```
[Content] Fetching audit history...
[Content] Successfully fetched 3 audits
[Content] Audit history saved to storage
[Content] Found 3 audit IDs: ["12345", "12346", "12347"]
[Content] 2 audits need to be cached: ["12346", "12347"]
[Content] Sending SCRAPE_ALL_AUDITS to background script...
[Batch Scraper] Starting batch scrape for 2 audits: ["12346", "12347"]
[Batch Scraper] Starting scrape for audit: 12346
[Batch Scraper] Created hidden tab 42 for audit: 12346
[Batch Scraper] Tab 42 loaded, sending RUN_SCRAPER for audit: 12346
[Scraper] Content script received message: RUN_SCRAPER
[Scraper] Starting scrape for audit: 12346
[Scraper] Found coursework table
[Scraper] Parsed 6 requirement sections for audit: 12346
[Scraper] Parsed 45 courses for audit: 12346
[Scraper] Sent AUDIT_RESULTS for audit: 12346
[Background] Received AUDIT_RESULTS for audit: 12346
[Background] Closing scraper tab: 42
[Background] Resolving pending scrape for audit: 12346
[Batch Scraper] Successfully scraped audit: 12346
... (continues for next audit)
[Batch Scraper] Complete. Succeeded: 2, Failed: 0
```

---

## Storage Structure

```typescript
// Audit History (list of audits)
browser.storage.local["auditHistory"] = {
  audits: DegreeAuditCardProps[],  // Basic audit info for display
  timestamp: number,
  error?: string,
  scrapedAuditIds?: string[]       // Track what's been scraped
}

// Individual Audit Data (detailed info per audit)
browser.storage.local["auditData_12345"] = {
  requirements: RequirementSection[],  // Parsed requirements
  courses: CourseRowData[]             // Parsed courses
}
```

---

## Code Reuse

This implementation maximizes code reuse:

| Existing Code | Reused For |
|---------------|------------|
| `SCRAPE_AUDIT` handler logic | Extracted into `scrapeAuditById()` |
| `RUN_SCRAPER` content script | Works unchanged |
| `AUDIT_RESULTS` listener | Extended to handle `auditId` |
| `saveAuditData()` | Called by existing flow |
| `getAuditData()` | Used to check cache |
| Tab creation/cleanup | Same pattern, called sequentially |

---

## Testing

To test the implementation:

1. **Clear storage**: Open DevTools > Application > Storage > Clear site data
2. **Visit UT Direct**: Go to `https://utdirect.utexas.edu/apps/degree/audits/`
3. **Check console**: Look for `[Content]` and `[Batch Scraper]` logs
4. **Verify caching**: Check DevTools > Application > Local Storage for `auditData_*` keys
5. **Test popup**: Click popup and select an audit - should load instantly
