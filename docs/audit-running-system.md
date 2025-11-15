# Complete Guide: How Audit Running Works

Let me break down exactly how the background audit execution works, explaining every concept so you can replicate this pattern for other projects.

---

## 🎯 The Big Picture

**Goal**: Click a button in the browser extension → run a degree audit on UT Direct → user stays on their current page while it happens in the background.

**Challenge**: The audit requires clicking a button on a specific webpage, but we don't want to disrupt the user's browsing.

**Solution**: Open the page in a background tab, automate the click, wait for completion, then clean up.

---

## 📚 Key Concepts & Technologies

### 1. **Browser Extension Architecture** (Manifest V3)

Browser extensions have different **contexts** (isolated JavaScript environments):

```
┌─────────────────────────────────────────────────────┐
│  POPUP (main.tsx)                                   │
│  - User interface (the extension popup)              │
│  - Runs when user clicks extension icon             │
│  - Can communicate with tabs and storage             │
│  - Has access to browser APIs                        │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  CONTENT SCRIPT (content.tsx)                       │
│  - Runs INSIDE web pages (injected by extension)     │
│  - Can access and modify the DOM                     │
│  - Limited browser API access                        │
│  - Watches for changes on the page                   │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  WEB PAGE (UT Direct)                               │
│  - The actual website                                │
│  - Has forms, buttons, data                          │
│  - Content script can interact with it               │
└─────────────────────────────────────────────────────┘
```

**Best Practice**: Separation of concerns - each context has specific responsibilities.

---

### 2. **Browser Tabs API** - Creating and Managing Tabs

```typescript
const newTab = await browser.tabs.create({
  url: "https://utdirect.utexas.edu/apps/degree/audits/",
  active: false,  // 👈 KEY: Don't switch to this tab
});
```

**What this does**:
- `browser.tabs.create()` - Opens a new browser tab
- `url` - Which page to load
- `active: false` - **Critical**: Opens tab in background (user doesn't see it)
- Returns a `newTab` object with properties like `id`

**Technology**: [Chrome Tabs API](https://developer.chrome.com/docs/extensions/reference/tabs/) (cross-browser via webextension-polyfill)

**Use Case**: Anytime you need to open a page without disrupting the user's current view.

---

### 3. **Script Injection** - Running Code Inside Web Pages

```typescript
await browser.scripting.executeScript({
  target: { tabId },
  func: () => {
    // This code runs INSIDE the web page
    const btn = document.querySelector(".run_button");
    if (btn) btn.click();
  },
});
```

**What this does**:
- `browser.scripting.executeScript()` - Injects JavaScript into a specific tab
- `target: { tabId }` - Which tab to inject into
- `func` - The function to run (executes in the page's context)

**Key Concept**: The function runs in the **web page's JavaScript context**, not the extension's. It can access the DOM (`document.querySelector()`), click buttons, fill forms, etc.

**Technology**: [Scripting API](https://developer.chrome.com/docs/extensions/reference/scripting/) (Manifest V3)

**Best Practice**: Keep injected code minimal and focused. Handle complex logic in your extension code.

---

### 4. **Tab Update Listeners** - Detecting When Pages Load

```typescript
const listener = async (tabId: number, info: any) => {
  if (tabId === newTab.id && info.status === "complete") {
    browser.tabs.onUpdated.removeListener(listener);
    await injectClicker(tabId);
  }
};
browser.tabs.onUpdated.addListener(listener);
```

**What this does**:
1. `browser.tabs.onUpdated.addListener()` - Listens for ANY tab updates (loading, complete, etc.)
2. `info.status === "complete"` - Filters for when page finishes loading
3. `tabId === newTab.id` - Ensures it's OUR tab, not random tabs
4. `removeListener()` - **Important**: Clean up listener to prevent memory leaks
5. `injectClicker()` - Once page loads, inject our click script

**Best Practice**: Always remove listeners when done. Otherwise, they keep running forever and waste memory.

**Pattern**: "Wait for event → do something → clean up listener"

---

### 5. **Storage API & Change Listeners** - Cross-Context Communication

```typescript
// Somewhere else: Content script updates storage
await browser.storage.local.set({ auditHistory: newData });

// In popup: Listen for that change
const storageListener = (changes: any) => {
  if (changes.auditHistory) {
    // Storage changed! Audit must be complete
    console.log("New audit data available!");
    browser.storage.onChanged.removeListener(storageListener);
  }
};
browser.storage.onChanged.addListener(storageListener);
```

**What this does**:
- `browser.storage.local` - Persistent storage (survives browser restart)
- `browser.storage.onChanged` - Fires when storage data changes
- `changes.auditHistory` - Specific key that changed

**Why this matters**: Storage is the **bridge between contexts**:
```
Content Script (in web page)
    → Updates storage
    → Popup detects change
    → Knows audit is complete
```

**Technology**: [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)

**Use Case**: Anytime different parts of your extension need to communicate.

---

### 6. **MutationObserver** - Detecting DOM Changes

```typescript
// In content script (content.tsx)
const observer = new MutationObserver(() => {
  const currentRowCount = tbody.querySelectorAll("tr").length;
  if (currentRowCount > lastRowCount) {
    // New row added! Audit completed!
    fetchAuditHistory();  // Update storage
  }
});

observer.observe(tbody, {
  childList: true,   // Watch for added/removed children
  subtree: false,    // Don't watch nested elements
});
```

**What this does**:
- `MutationObserver` - Browser API that watches for DOM changes
- `observe(element, options)` - Start watching an element
- Callback fires whenever DOM changes
- Counts rows to detect new audits

**Technology**: [MutationObserver API](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) (standard browser API)

**Use Case**: Anytime you need to react to changes on a web page (new items added, content updated, etc.)

---

### 7. **Timeout & Cleanup** - Defensive Programming

```typescript
const safetyTimeout = setTimeout(() => {
  if (newTab.id) browser.tabs.remove(newTab.id);
  setRunningAudit(false);
}, 30000);  // 30 seconds

// Later, if audit completes successfully:
clearTimeout(safetyTimeout);
```

**What this does**:
- `setTimeout()` - Executes code after a delay
- Safety net in case something goes wrong
- If audit doesn't complete in 30 seconds, close tab anyway
- `clearTimeout()` - Cancels the timeout if no longer needed

**Best Practice**: Always have a fallback for async operations. Never leave resources (tabs, listeners, timers) dangling.

---

## 🔄 Complete Flow Diagram

```
1. USER CLICKS "RUN NEW AUDIT"
   ↓
2. CHECK IF ALREADY ON AUDIT PAGE
   ├─ YES → Click button in current tab (no new tab needed)
   └─ NO → Continue to step 3
   ↓
3. CREATE BACKGROUND TAB
   await browser.tabs.create({
     url: "audit-page",
     active: false  // Background!
   })
   ↓
4. START SAFETY TIMEOUT (30 seconds)
   setTimeout(() => closeTab(), 30000)
   ↓
5. WAIT FOR PAGE TO LOAD
   browser.tabs.onUpdated.addListener(...)
   ↓
6. INJECT CLICKER SCRIPT
   browser.scripting.executeScript({
     func: () => document.querySelector(".run_button").click()
   })
   ↓
7. BUTTON CLICKED → AUDIT RUNS ON SERVER
   ↓
8. CONTENT SCRIPT DETECTS NEW AUDIT ROW
   MutationObserver sees new <tr> in table
   ↓
9. CONTENT SCRIPT UPDATES STORAGE
   browser.storage.local.set({ auditHistory: newData })
   ↓
10. POPUP DETECTS STORAGE CHANGE
    browser.storage.onChanged fires
    ↓
11. CLEANUP
    - clearTimeout(safetyTimeout)
    - browser.tabs.remove(backgroundTab)
    - Remove all listeners
    - setRunningAudit(false)
    ↓
12. DONE! User never left their current page
```

---

## 🛠️ Technologies Used & Why

| Technology | Purpose | Why This Choice |
|------------|---------|-----------------|
| **React** | UI framework | State management (`useState`), reactivity |
| **TypeScript** | Type safety | Catch bugs at compile time |
| **WXT Framework** | Extension development | Simplifies Manifest V3 complexity |
| **Webextension-polyfill** | Cross-browser compatibility | Same code works in Chrome, Firefox, Edge |
| **Browser APIs** | Extension capabilities | Only way to interact with tabs/storage/scripting |
| **MutationObserver** | DOM change detection | Efficient, event-driven (vs. polling) |
| **Promises/async-await** | Async operations | Clean syntax for asynchronous code |

---

## 💡 Best Practices Demonstrated

### 1. **Event-Driven Architecture**
Instead of checking "is audit done?" every second (polling), we use events:
- MutationObserver fires when DOM changes
- Storage listener fires when data updates
- Tab listener fires when page loads

**Why better**: More efficient, no wasted CPU cycles.

### 2. **Resource Cleanup**
Every listener gets removed:
```typescript
browser.tabs.onUpdated.removeListener(listener);
browser.storage.onChanged.removeListener(storageListener);
clearTimeout(safetyTimeout);
```

**Why critical**: Prevents memory leaks in long-running extensions.

### 3. **Defensive Programming**
- Safety timeout in case things go wrong
- Check if tab ID exists before removing
- Conditional logic for edge cases

### 4. **Separation of Concerns**
- **Popup**: UI and user interaction
- **Content Script**: Page-specific logic (MutationObserver, DOM interaction)
- **Injected Script**: One-time action (click button)

### 5. **User Experience First**
- `active: false` keeps user on current page
- Loading state (`runningAudit`) shows feedback
- Background tab invisible to user

---

## 🔁 Replicating This Pattern

Want to apply this to another use case? Here's the template:

```typescript
// STEP 1: Create background tab
const bgTab = await browser.tabs.create({
  url: "https://example.com/action-page",
  active: false
});

// STEP 2: Safety timeout
const timeout = setTimeout(() => {
  browser.tabs.remove(bgTab.id);
}, 30000);

// STEP 3: Wait for page load
const loadListener = async (tabId, info) => {
  if (tabId === bgTab.id && info.status === "complete") {
    browser.tabs.onUpdated.removeListener(loadListener);

    // STEP 4: Inject action script
    await browser.scripting.executeScript({
      target: { tabId },
      func: () => {
        // Do something in the page
        document.querySelector("#submit-button").click();
      }
    });
  }
};
browser.tabs.onUpdated.addListener(loadListener);

// STEP 5: Listen for completion signal
const storageListener = (changes) => {
  if (changes.myDataKey) {
    // STEP 6: Cleanup
    clearTimeout(timeout);
    browser.tabs.remove(bgTab.id);
    browser.storage.onChanged.removeListener(storageListener);
  }
};
browser.storage.onChanged.addListener(storageListener);
```

**Use cases**:
- Auto-fill forms on websites
- Scrape data from multiple pages
- Automate repetitive tasks
- Background data collection
- Silent authentication flows

---

## 🧪 Debugging Tips

1. **Check tab actually opens**: Look in browser tab bar (should appear briefly)
2. **Console logs**: Content script logs appear in page's DevTools, popup logs in extension's DevTools
3. **Storage inspector**: chrome://extensions → your extension → Service Worker → Application → Storage
4. **Network tab**: See if requests are being made
5. **Add delays**: `setTimeout(..., 5000)` to slow things down for debugging

---

## 🔍 Code Walkthrough

### File: `entrypoints/popup/main.tsx` (Lines 110-153)

```typescript
const handleRerunAudit = async () => {
  // STEP 1: Find existing UT Direct tabs
  const tabs = await browser.tabs.query({ url: "*://utdirect.utexas.edu/*" });
  const auditTab = tabs.find((t) => t.url?.includes("/apps/degree/audits/"));
  setRunningAudit(true);  // Show loading state

  if (auditTab?.id) {
    // OPTIMIZATION: If already on audit page, just click (no new tab)
    await injectClicker(auditTab.id);
    setRunningAudit(false);
  } else {
    // STEP 2: Create BACKGROUND tab
    const newTab = await browser.tabs.create({
      url: "https://utdirect.utexas.edu/apps/degree/audits/",
      active: false,  // 🔑 KEY: Background tab!
    });

    // STEP 3: Safety timeout (cleanup after 30s)
    const safetyTimeout = setTimeout(() => {
      if (newTab.id) browser.tabs.remove(newTab.id);
      setRunningAudit(false);
    }, 30000);

    // STEP 4: Wait for page load
    const listener = async (tabId: number, info: any) => {
      if (tabId === newTab.id && info.status === "complete") {
        browser.tabs.onUpdated.removeListener(listener);
        await injectClicker(tabId);  // Click button
      }
    };
    browser.tabs.onUpdated.addListener(listener);

    // STEP 5: Listen for audit completion
    const storageListener = (changes: any) => {
      if (changes.auditHistory) {
        // Audit done! Cleanup everything
        clearTimeout(safetyTimeout);
        if (newTab.id) browser.tabs.remove(newTab.id);
        setRunningAudit(false);
        browser.storage.onChanged.removeListener(storageListener);
      }
    };
    browser.storage.onChanged.addListener(storageListener);
  }
};
```

### File: `entrypoints/content.tsx` (Lines 84-145)

```typescript
function setupHistoryTableObserver() {
  let observerActive = false;
  let lastRowCount = 0;

  const checkForTable = () => {
    if (observerActive) return;

    // Find the audit history table
    const tables = document.querySelectorAll("table");
    const historyTable = Array.from(tables).find((table) => {
      const text = table.textContent || "";
      return (
        text.includes("Degree Audits Requested") ||
        text.includes("Request Created") ||
        text.includes("Audit Type")
      );
    });

    if (historyTable) {
      const tbody = historyTable.querySelector("tbody");
      if (!tbody) return;

      observerActive = true;
      lastRowCount = tbody.querySelectorAll("tr").length;

      // Create MutationObserver to watch for new rows
      const observer = new MutationObserver(() => {
        const currentRowCount = tbody.querySelectorAll("tr").length;

        if (currentRowCount > lastRowCount) {
          // NEW AUDIT DETECTED! 🎉
          console.log(`New audit! Rows: ${lastRowCount} → ${currentRowCount}`);

          // Debounce: wait 2 seconds, then update storage
          setTimeout(async () => {
            const audits = await fetchAuditHistory();
            await saveAuditHistory(audits);  // 🔔 Triggers storage listener!
            lastRowCount = currentRowCount;
          }, 2000);
        }
      });

      observer.observe(tbody, {
        childList: true,   // Watch for added/removed rows
        subtree: false,    // Only direct children (more efficient)
      });
    }
  };

  checkForTable();
  setTimeout(checkForTable, 3000);  // Retry in case of slow load
}
```

---

## 📖 Key Takeaways

1. **Browser extensions have multiple contexts** (popup, content script, web page)
2. **Communication happens via storage** and events
3. **`active: false`** is the secret to background tabs
4. **Always clean up** listeners, timeouts, and tabs
5. **Event-driven > polling** for efficiency
6. **MutationObserver** watches DOM changes
7. **Script injection** lets you run code in web pages
8. **Defensive programming** prevents edge case bugs

This pattern is incredibly powerful and can automate almost any web-based task while keeping the user's experience smooth!

---

## 📚 Further Reading

- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [WXT Framework Docs](https://wxt.dev/)
- [MutationObserver API](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
- [Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Scripting API](https://developer.chrome.com/docs/extensions/reference/scripting/)
