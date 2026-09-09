/**
 * Is OUR code adding latency on top of UT's floor?
 *
 * Separates the preview round trip into:
 *   - UT floor       : time we cannot influence (generation)
 *   - our overhead   : detection lag, redundant fetches, serialization we chose
 *
 * Every check here is read-only except runSequenceTest, which submits one
 * audit. Paste alongside planner-poc.js on a logged-in UT audits page.
 */
(() => {
  const BASE = "https://utdirect.utexas.edu/apps/degree/audits";
  const HISTORY = `${BASE}/submissions/history/`;
  const now = () => performance.now();
  const log = (...a) => console.log("%c[overhead]", "color:#bf5700", ...a);
  const warn = (...a) => console.warn("%c[overhead]", "color:#bf5700", ...a);

  async function getFresh(url) {
    const u = new URL(url);
    u.searchParams.set("_poc", String(Math.random()).slice(2));
    const r = await fetch(u.toString(), {
      credentials: "include",
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    const t = await r.text();
    return { r, text: t, doc: new DOMParser().parseFromString(t, "text/html") };
  }

  /**
   * CHECK 1 — how much of the wait is our detection granularity?
   *
   * A poll loop can only notice completion at cycle boundaries, so on average
   * we waste half a cycle, and up to a full cycle worst case. Measures the
   * real fetch cost instead of assuming it.
   */
  async function detectionOverhead(intervalMs = 150, samples = 8) {
    const times = [];
    for (let i = 0; i < samples; i++) {
      const s = now();
      await getFresh(HISTORY);
      times.push(now() - s);
    }
    const sorted = [...times].sort((a, b) => a - b);
    const fetchMs = Math.round(sorted[Math.floor(samples / 2)]);
    const cycle = fetchMs + intervalMs;
    const out = {
      medianFetchMs: fetchMs,
      sleepMs: intervalMs,
      cycleMs: cycle,
      avgDetectionLagMs: Math.round(cycle / 2),
      worstDetectionLagMs: cycle,
    };
    console.table([out]);
    log(
      `On average we learn the audit is ready ~${out.avgDetectionLagMs}ms ` +
        "after it actually was. That is OUR overhead, not UT's.",
    );
    if (fetchMs > intervalMs * 2) {
      warn(
        `Fetch (${fetchMs}ms) dominates the sleep (${intervalMs}ms) — ` +
          "shortening the sleep further buys almost nothing.",
      );
    }
    return out;
  }

  /**
   * CHECK 2 — is the history page the cheapest thing to poll?
   *
   * We poll a ~40KB page listing every audit, to learn one bit: is the newest
   * one ready. If a smaller endpoint answers the same question, polling gets
   * cheaper and we can poll more often for the same load.
   */
  async function pollTargetCost() {
    const targets = [
      { name: "history (current)", url: HISTORY },
      { name: "audits home", url: `${BASE}/` },
      { name: "requests/history", url: `${BASE}/requests/history/` },
    ];
    const rows = [];
    for (const t of targets) {
      try {
        const s = now();
        const page = await getFresh(t.url);
        rows.push({
          target: t.name,
          ms: Math.round(now() - s),
          kb: Math.round(page.text.length / 1024),
          status: page.r.status,
          hasAuditTable: Boolean(page.doc.querySelector("table")),
        });
      } catch (e) {
        rows.push({
          target: t.name,
          ms: null,
          kb: null,
          status: "ERR",
          hasAuditTable: false,
        });
      }
    }
    console.table(rows);
    log("Cheapest target that still exposes audit state wins.");
    return rows;
  }

  /**
   * CHECK 3 — can we skip the poll entirely?
   *
   * The history row carries a "Submitted (NNNNN)" number distinct from the
   * audit ID. If the submit RESPONSE already contains the eventual audit ID,
   * we could fetch the result directly and delete the detection window.
   *
   * Pass the raw HTML of a submit response (verify.getFresh gives .text).
   */
  function inspectSubmitResponse(html, knownAuditId) {
    if (typeof html !== "string")
      throw new Error("Pass the submit response HTML string.");
    const found = {
      containsKnownId: knownAuditId
        ? html.includes(String(knownAuditId))
        : null,
      // Long digit runs are audit-ID shaped (observed: 100018492357).
      longNumbers: [...new Set(html.match(/\b\d{9,}\b/g) ?? [])].slice(0, 10),
      submittedTokens: [
        ...new Set(html.match(/Submitted\s*\(\d+\)/gi) ?? []),
      ].slice(0, 5),
      resultLinks: [...new Set(html.match(/results\/\d+/g) ?? [])].slice(0, 5),
    };
    console.table([
      {
        containsKnownId: found.containsKnownId,
        longNumbers: found.longNumbers.join(",") || "(none)",
        submitted: found.submittedTokens.join(",") || "(none)",
        resultLinks: found.resultLinks.join(",") || "(none)",
      },
    ]);
    if (found.resultLinks.length || found.containsKnownId) {
      log(
        "PROMISING — the submit response references a result. If that ID is " +
          "the final audit, the poll can be replaced by a direct fetch.",
      );
    } else {
      log(
        "No result reference in the submit response. Polling is required; " +
          "the detection window cannot be removed, only shortened.",
      );
    }
    return found;
  }

  /**
   * CHECK 4 — are our own steps serialized when they need not be?
   *
   * Times the read-only resolve step alone. If it is meaningful and does not
   * depend on the submit, it can overlap with earlier UI work instead of
   * sitting on the critical path.
   */
  // Default term must be a FUTURE one — a past ccyys has no page=4 links and
  // resolve fails. ccyys = YYYY + semester digit (2=spring, 6=summer, 9=fall).
  async function stepIndependence(
    course = { dept: "C S", num: "331", ccyys: "20272" },
  ) {
    if (typeof poc === "undefined")
      throw new Error("Load planner-poc.js first.");
    const s1 = now();
    let resolveMs = null,
      ok = false;
    try {
      await poc.resolveAddLink(course);
      resolveMs = Math.round(now() - s1);
      ok = true;
    } catch (e) {
      warn(`resolve failed (${e.message}) — try a different course/ccyys`);
    }
    const s2 = now();
    await getFresh(HISTORY);
    const historyMs = Math.round(now() - s2);

    const out = {
      resolveMs,
      historySnapshotMs: historyMs,
      // Both are read-only and independent of each other.
      ifRunInParallelMs: ok ? Math.max(resolveMs, historyMs) : null,
      savedMs: ok
        ? resolveMs + historyMs - Math.max(resolveMs, historyMs)
        : null,
    };
    console.table([out]);
    if (ok) {
      log(
        `Resolve and the pre-submit history snapshot are independent ` +
          `read-only calls — running them together saves ~${out.savedMs}ms.`,
      );
    }
    return out;
  }

  globalThis.overhead = {
    detectionOverhead,
    pollTargetCost,
    inspectSubmitResponse,
    stepIndependence,
    getFresh,
  };
  log(
    "ready. All read-only:\n" +
      "  await overhead.detectionOverhead(150);\n" +
      "  await overhead.pollTargetCost();\n" +
      "  await overhead.stepIndependence();\n" +
      "  overhead.inspectSubmitResponse(html, knownAuditId)  // see RUNBOOK",
  );
})();
