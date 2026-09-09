/**
 * DAP-124 verification: are the ~3s generation timings trustworthy, and how
 * fast can we actually detect completion?
 *
 * Three questions, three tools:
 *   1. cacheCheck()   - is the history page being served stale? (correctness)
 *   2. verifyTiming() - n=1 is not a measurement. Repeat it, with cache
 *                       defeated and server-side timestamps captured.
 *   3. Both report whether a delayed first poll is safe.
 *
 * Read-only apart from the submits YOU trigger via the callback.
 * Paste alongside planner-poc.js on a logged-in UT audits page.
 */
(() => {
  const BASE = "https://utdirect.utexas.edu/apps/degree/audits";
  const HISTORY = `${BASE}/submissions/history/`;
  const now = () => performance.now();
  const log = (...a) => console.log("%c[verify]", "color:#bf5700", ...a);
  const warn = (...a) => console.warn("%c[verify]", "color:#bf5700", ...a);

  const PROCESSING_RE = /in progress|process|pending|running|queue|submitted/i;

  /**
   * Cache-defeating fetch. Three layers, because any one can fail:
   *   - cache: "no-store"      tells Chrome not to use or write the HTTP cache
   *   - Cache-Control header   asks intermediaries not to serve stale
   *   - unique query param     defeats anything keying purely on URL
   * Returns server-side cache headers so we can SEE whether it mattered.
   */
  async function getFresh(url, { bustQuery = true } = {}) {
    const u = new URL(url);
    if (bustQuery) u.searchParams.set("_poc", String(Math.random()).slice(2));
    const r = await fetch(u.toString(), {
      credentials: "include",
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    });
    const t = await r.text();
    return {
      r,
      text: t,
      doc: new DOMParser().parseFromString(t, "text/html"),
      headers: {
        date: r.headers.get("date"),
        age: r.headers.get("age"),
        cacheControl: r.headers.get("cache-control"),
        etag: r.headers.get("etag"),
        lastModified: r.headers.get("last-modified"),
      },
    };
  }

  function parseRows(doc) {
    const rows = [];
    for (const tr of doc.querySelectorAll("table tbody tr")) {
      const cells = tr.querySelectorAll("td");
      if (cells.length < 8) continue;
      const idCell = cells[6];
      const rowText = tr.textContent.replace(/\s+/g, " ").trim();
      rows.push({
        key: [...cells]
          .slice(0, 6)
          .map((c) => c.textContent.trim())
          .join("|"),
        linked: Boolean(idCell.querySelector("a")),
        auditId: idCell.querySelector("a")?.textContent?.trim() ?? null,
        processing: PROCESSING_RE.test(rowText),
        rowText,
      });
    }
    return rows;
  }

  /**
   * QUESTION 1 — is the history page cached?
   *
   * Compares a plain fetch against a cache-defeating one, and reports the
   * server's own cache headers. If `age` is non-zero or the two responses
   * differ in length, the plain path was serving stale HTML and every previous
   * timing is suspect.
   */
  async function cacheCheck() {
    const plain = await fetch(HISTORY, { credentials: "include" });
    const plainText = await plain.text();
    const fresh = await getFresh(HISTORY);

    const out = {
      plainBytes: plainText.length,
      freshBytes: fresh.text.length,
      identical: plainText.length === fresh.text.length,
      serverDate: fresh.headers.date,
      age: fresh.headers.age ?? "(none)",
      cacheControl: fresh.headers.cacheControl ?? "(none)",
      etag: fresh.headers.etag ?? "(none)",
    };
    console.table([out]);

    const ageNum = Number(fresh.headers.age ?? 0);
    if (ageNum > 0) {
      warn(
        `Age: ${ageNum}s — a cache IS serving stale content. Timings are suspect.`,
      );
    } else if (
      /no-store|no-cache|max-age=0/i.test(fresh.headers.cacheControl ?? "")
    ) {
      log(
        "Server says no-cache/no-store — responses are generated per request.",
      );
    } else {
      log(
        "No Age header and no explicit no-cache. Likely uncached, but the " +
          "cache-busted fetch is used for measurement regardless.",
      );
    }
    return out;
  }

  /**
   * QUESTION 2 — repeat the measurement properly.
   *
   * `submitFn` must trigger ONE audit submit (e.g. () => poc.submitPlannedAudit()).
   * Each run: snapshot -> submit -> poll with cache defeated until the ID links.
   *
   * Also captures the server's `Date` header at row-appearance and at
   * link-ready. That's a SERVER-side clock, independent of our poll loop, so it
   * cross-checks the client timing at 1-second granularity.
   */
  async function verifyTiming(submitFn, runs = 3, { intervalMs = 150 } = {}) {
    if (typeof submitFn !== "function") {
      throw new Error(
        "Pass a submit function, e.g. () => poc.submitPlannedAudit()",
      );
    }
    const results = [];

    for (let i = 0; i < runs; i++) {
      log(`--- run ${i + 1}/${runs}`);
      const before = parseRows((await getFresh(HISTORY)).doc);
      const beforeKeys = new Set(before.map((r) => r.key));

      const t0 = now();
      await submitFn();
      const tSubmit = now() - t0;

      let tRow = null,
        tLink = null,
        auditId = null,
        polls = 0;
      let serverDateAtRow = null,
        serverDateAtLink = null,
        rowText = null;
      const deadline = now() + 90_000;

      while (now() < deadline) {
        polls++;
        const page = await getFresh(HISTORY);
        const fresh = parseRows(page.doc).find((r) => !beforeKeys.has(r.key));

        if (fresh && tRow === null) {
          tRow = now() - t0;
          serverDateAtRow = page.headers.date;
          rowText = fresh.rowText;
        }
        if (fresh?.linked && tLink === null) {
          tLink = now() - t0;
          serverDateAtLink = page.headers.date;
          auditId = fresh.auditId;
          break;
        }
        await new Promise((r) => setTimeout(r, intervalMs));
      }

      // Server-clock delta: independent of our loop, 1s granularity.
      let serverDeltaS = null;
      if (serverDateAtRow && serverDateAtLink) {
        serverDeltaS =
          (new Date(serverDateAtLink) - new Date(serverDateAtRow)) / 1000;
      }

      const run = {
        run: i + 1,
        submitMs: Math.round(tSubmit),
        rowMs: tRow === null ? null : Math.round(tRow),
        linkMs: tLink === null ? null : Math.round(tLink),
        genMs:
          tRow !== null && tLink !== null ? Math.round(tLink - tRow) : null,
        serverDeltaS,
        polls,
        auditId,
      };
      results.push(run);
      log(`run ${i + 1}:`, run);
      if (rowText) log(`   row: ${rowText.slice(0, 110)}`);
    }

    const linkTimes = results.map((r) => r.linkMs).filter((n) => n !== null);
    if (linkTimes.length) {
      const sorted = [...linkTimes].sort((a, b) => a - b);
      const summary = {
        n: sorted.length,
        minMs: sorted[0],
        medianMs: sorted[Math.floor(sorted.length / 2)],
        maxMs: sorted[sorted.length - 1],
        spreadMs: sorted[sorted.length - 1] - sorted[0],
      };
      console.table([summary]);

      // The safe first-poll delay is the FASTEST observed completion, minus
      // margin — never the median, or fast runs get detected late.
      const safeDelay = Math.max(0, Math.floor(summary.minMs * 0.6));
      log(`fastest completion: ${summary.minMs}ms`);
      log(
        `=> a first-poll delay above ~${safeDelay}ms risks missing fast runs`,
      );
      if (summary.spreadMs > summary.minMs * 0.5) {
        warn(
          `spread is ${summary.spreadMs}ms — high variance; do NOT tune a ` +
            "fixed delay to the median.",
        );
      }
      console.table(results);
      return { results, summary, suggestedFirstPollMs: safeDelay };
    }
    warn("no runs completed");
    return { results, summary: null, suggestedFirstPollMs: null };
  }

  globalThis.verify = { cacheCheck, verifyTiming, getFresh, parseRows };
  log(
    "ready. Run in order:\n" +
      "  await verify.cacheCheck();\n" +
      "  await verify.verifyTiming(() => poc.submitPlannedAudit(), 3);",
  );
})();
