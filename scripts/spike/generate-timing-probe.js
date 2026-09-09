/**
 * DAP-124 follow-up: is `generateMs` really UT's audit generation time?
 *
 * The original harness polled history/ every 500ms and counted an audit "done"
 * only once its ID cell contained a LINK. UT shows a queued request as a row
 * (now with a "Processing"-style status) before that link renders, so the old
 * number bundled: real generation + time-to-link + poll quantization + fetch
 * overhead. Observed generation is ~1-2s, so that ~5.2s figure is suspect.
 *
 * This probe separates the events and polls ~3x finer:
 *   rowVisibleMs      - request row appears (UT accepted the job)
 *   processingSeenMs  - row shows a processing/pending status
 *   linkReadyMs       - ID becomes clickable (result actually ready)
 *   resultsFetchMs    - the results page itself returns content
 *
 * Read-only apart from whatever submit YOU trigger. Paste into a DevTools
 * console on a logged-in utdirect.utexas.edu audits page.
 */
(() => {
  const BASE = "https://utdirect.utexas.edu/apps/degree/audits";
  const HISTORY = `${BASE}/submissions/history/`;
  const now = () => performance.now();
  const log = (...a) => console.log("%c[probe]", "color:#bf5700", ...a);

  // Any of these in a row's text means "UT is still working on it".
  const PROCESSING_RE = /process|pending|progress|running|queue|wait/i;

  async function get(url) {
    const r = await fetch(url, { credentials: "include" });
    const t = await r.text();
    return { r, doc: new DOMParser().parseFromString(t, "text/html") };
  }

  /**
   * Snapshot every history row. Keeps the full row text so an intermediate
   * "Processing" state is visible even before any link exists — the original
   * harness skipped such rows entirely and so could not see them.
   */
  async function historyRows() {
    const { doc } = await get(HISTORY);
    const rows = [];
    for (const tr of doc.querySelectorAll("table tbody tr")) {
      const cells = tr.querySelectorAll("td");
      if (cells.length < 8) continue;
      const idCell = cells[6];
      const rowText = tr.textContent.replace(/\s+/g, " ").trim();
      rows.push({
        // Row identity that exists even before the link does.
        key: [...cells]
          .slice(0, 6)
          .map((c) => c.textContent.trim())
          .join("|"),
        idText: idCell.textContent.trim(),
        linked: Boolean(idCell.querySelector("a")),
        auditId: idCell.querySelector("a")?.textContent?.trim() ?? null,
        processing: PROCESSING_RE.test(rowText),
        rowText,
      });
    }
    return rows;
  }

  /**
   * One-shot: what does a freshly-refreshed history page look like right now?
   * Run this WHILE an audit generates to see the intermediate state verbatim —
   * that reveals the exact wording to poll for.
   */
  async function inspectNow() {
    const rows = await historyRows();
    console.table(
      rows.map((r) => ({
        idText: r.idText,
        linked: r.linked,
        processing: r.processing,
        rowText: r.rowText.slice(0, 90),
      })),
    );
    return rows;
  }

  /**
   * Call IMMEDIATELY after submitting an audit. Pass the row snapshot taken
   * BEFORE the submit.
   */
  async function watch(
    beforeRows,
    { windowMs = 90_000, intervalMs = 150 } = {},
  ) {
    const beforeKeys = new Set(beforeRows.map((r) => r.key));
    const t0 = now();
    let tRow = null;
    let tProcessing = null;
    let tLink = null;
    let newRow = null;
    let polls = 0;
    const deadline = t0 + windowMs;

    while (now() < deadline) {
      polls++;
      const rows = await historyRows();
      const fresh = rows.find((r) => !beforeKeys.has(r.key));

      if (fresh && tRow === null) {
        tRow = now() - t0;
        newRow = fresh;
        log(
          `ROW appeared @ ${Math.round(tRow)}ms — linked=${fresh.linked}, ` +
            `processing=${fresh.processing}`,
        );
        log(`   row text: ${fresh.rowText.slice(0, 120)}`);
      }
      if (fresh?.processing && tProcessing === null) {
        tProcessing = now() - t0;
        log(`PROCESSING seen @ ${Math.round(tProcessing)}ms`);
      }
      if (fresh?.linked && tLink === null) {
        tLink = now() - t0;
        newRow = fresh;
        log(`LINK ready @ ${Math.round(tLink)}ms — auditId=${fresh.auditId}`);
        break;
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }

    if (tRow === null) {
      log("no new row appeared within the window");
      return null;
    }

    let tFetch = null;
    let rowsParsed = null;
    if (newRow?.auditId) {
      const s = now();
      const { doc } = await get(`${BASE}/results/${newRow.auditId}/`);
      tFetch = now() - s;
      rowsParsed = doc.querySelectorAll("tr").length;
      log(
        `results page fetched in ${Math.round(tFetch)}ms (${rowsParsed} rows)`,
      );
    }

    const out = {
      rowVisibleMs: tRow === null ? null : Math.round(tRow),
      processingSeenMs: tProcessing === null ? null : Math.round(tProcessing),
      linkReadyMs: tLink === null ? null : Math.round(tLink),
      // The interval the old harness was blind to.
      queuedButNotReadyMs:
        tRow !== null && tLink !== null ? Math.round(tLink - tRow) : null,
      resultsFetchMs: tFetch === null ? null : Math.round(tFetch),
      polls,
      pollIntervalMs: intervalMs,
    };
    console.table([out]);
    return out;
  }

  /**
   * How fast can we poll history/ before UT pushes back? Answers "can we poll
   * faster" with data instead of a guess: N sequential fetches as fast as they
   * complete, reporting latency and any non-200s. Read-only.
   */
  async function pollRateTest(n = 10) {
    const times = [];
    const statuses = new Set();
    const start = now();
    for (let i = 0; i < n; i++) {
      const s = now();
      const { r } = await get(HISTORY);
      times.push(now() - s);
      statuses.add(r.status);
    }
    const sorted = [...times].sort((a, b) => a - b);
    const avg = (xs) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
    const out = {
      requests: n,
      wallClockMs: Math.round(now() - start),
      minMs: Math.round(sorted[0]),
      medianMs: Math.round(sorted[Math.floor(n / 2)]),
      maxMs: Math.round(sorted[n - 1]),
      statuses: [...statuses].join(","),
      firstThreeAvg: avg(times.slice(0, 3)),
      lastThreeAvg: avg(times.slice(-3)),
    };
    console.table([out]);
    if (out.statuses !== "200") {
      log("NON-200 seen — back off, do not poll this fast");
    } else if (out.lastThreeAvg > out.firstThreeAvg * 1.8) {
      log("latency climbing — likely throttling; keep the interval at 500ms");
    } else {
      log("no pushback back-to-back; a ~250-300ms interval looks safe");
    }
    return out;
  }

  globalThis.probe = { historyRows, watch, inspectNow, pollRateTest };
  log(
    "ready. Usage:\n" +
      "  const before = await probe.historyRows();\n" +
      "  await poc.submitPlannedAudit();   // or click Run Audit\n" +
      "  await probe.watch(before);\n" +
      "  await probe.pollRateTest();       // how fast can we poll?\n" +
      "  await probe.inspectNow();         // run mid-generation",
  );
})();
