/**
 * Trim OUR 25%: which of the ~1.5 s we spend around UT's ~2.1 s can go?
 *
 * The overhead audit told us UT is the floor. This asks the next question:
 * of the time that IS ours, how much is real work and how much is bytes we
 * download and throw away, or fetches we repeat every preview that only need
 * to happen once?
 *
 * Every probe uses the browser's Resource Timing API so a single request is
 * split into redirect / TTFB / download, instead of one opaque elapsed number.
 * That's what tells us whether a stage is UT's server render (immovable) or
 * our own transfer/parse (cuttable).
 *
 * Read-only unless the name says otherwise:
 *   trim.scrapeCost()          read-only  — where do the 395 ms go?
 *   trim.scrapeAlternatives()  read-only  — is there a lighter results page?
 *   trim.formReuse()           read-only  — can the audit form GET be cached?
 *   trim.resolveStability()    read-only  — can resolve be prefetched?
 *   trim.addCost(course)       1 add + 1 delete — page=4 vs landing vs verify
 *   trim.submitCost()          1 audit    — POST without following the redirect
 *   trim.timeTrimmedPreview()  1 audit + 1 add/delete PER RUN — all trims at once
 *   trim.summary()             prints achievable savings from what ran
 *
 * Paste alongside planner-poc.js on a logged-in UT audits page.
 */
(() => {
  const BASE = "https://utdirect.utexas.edu/apps/degree/audits";
  const HISTORY = `${BASE}/submissions/history/`;
  const NEW_AUDIT = `${BASE}/submissions/student_individual/`;
  const PLANNER_VIEW = `${BASE}/planner/view_planner/`;
  const PLANNER_LIST = `${BASE}/planner/ut_course/`;

  // Reference numbers from the 2026-09-09 verified run, so savings print
  // against something. Not measured here.
  const REF = { submitMs: 505, addMs: 345, scrapeMs: 395, resolveMs: 128 };

  const now = () => performance.now();
  const log = (...a) => console.log("%c[trim]", "color:#bf5700", ...a);
  const warn = (...a) => console.warn("%c[trim]", "color:#bf5700", ...a);
  const r0 = (n) => (n == null ? null : Math.round(n));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const state = { results: {} };
  const keep = (k, v) => ((state.results[k] = v), v);

  performance.setResourceTimingBufferSize(4000);

  function bust(url) {
    const u = new URL(url);
    u.searchParams.set("_poc", String(Math.random()).slice(2));
    return u.toString();
  }

  /**
   * fetch() plus the Resource Timing entry for that exact request.
   * Same-origin, so redirect/ttfb/download are all exposed.
   *
   * Returns ms as: total (our wall clock), redirect (the request that
   * answered with a 3xx — e.g. the page=4 itself), ttfb (server think time
   * on the final URL), download (bytes on the wire), parse (DOMParser, if
   * asked). encodedKb vs decodedKb shows whether UT gzips.
   */
  async function timed(url, init = {}, { parse = false } = {}) {
    const t0 = now();
    const r = await fetch(url, {
      credentials: "include",
      cache: "no-store",
      ...init,
      headers: { "Cache-Control": "no-cache", ...(init.headers ?? {}) },
    });
    const tHead = now();
    const text = r.type === "opaqueredirect" ? "" : await r.text();
    const tBody = now();
    let doc = null;
    if (parse && text) doc = new DOMParser().parseFromString(text, "text/html");
    const tParse = now();

    const e = performance.getEntriesByName(url).at(-1) ?? null;
    const ms = {
      total: r0(tBody - t0),
      redirect: e ? r0(e.redirectEnd - e.redirectStart) : null,
      ttfb: e ? r0(e.responseStart - e.requestStart) : null,
      download: e ? r0(e.responseEnd - e.responseStart) : null,
      parse: parse ? r0(tParse - tBody) : null,
      // Cross-check: fetch resolved (headers) vs body complete.
      headersAt: r0(tHead - t0),
    };
    const kb = {
      encoded: e ? r0(e.encodedBodySize / 1024) : null,
      decoded: e ? r0(e.decodedBodySize / 1024) : r0(text.length / 1024),
    };
    return { r, text, doc, ms, kb, entry: e };
  }

  function parseHistory(doc) {
    const rows = [];
    for (const tr of doc.querySelectorAll("table tbody tr")) {
      const cells = tr.querySelectorAll("td");
      if (cells.length < 8) continue;
      const a = cells[6].querySelector("a");
      rows.push({
        key: [...cells]
          .slice(0, 6)
          .map((c) => c.textContent.trim())
          .join("|"),
        auditId: a?.textContent?.trim() ?? null,
        linked: Boolean(a),
      });
    }
    return rows;
  }

  function plannerRowsIn(doc, base = PLANNER_VIEW) {
    const rows = [];
    for (const link of doc.querySelectorAll('a[href*="action_code=D"]')) {
      const p = new URL(link.getAttribute("href"), base).searchParams;
      if (!p.get("key_course_id")) continue;
      rows.push(
        [p.get("key_course_id"), p.get("key_course_ccyys"), p.get("key_course_seq")]
          .join("|"),
      );
    }
    return rows;
  }

  async function newestAuditId() {
    const page = await timed(bust(HISTORY), {}, { parse: true });
    const row = parseHistory(page.doc).find((r) => r.linked);
    if (!row) throw new Error("No linked audit in history to scrape.");
    return row.auditId;
  }

  /**
   * PROBE 1 — scrape: 395 ms of what?
   *
   * If TTFB dominates, UT is rendering the audit server-side and we can't cut
   * it. If download dominates, the page is heavy — look for a lighter
   * representation (probe 2). If parse dominates, that's our DOMParser and
   * the production parser should be measured the same way.
   */
  async function scrapeCost(auditId, n = 3) {
    auditId ??= await newestAuditId();
    const url = `${BASE}/results/${auditId}/`;
    const runs = [];
    for (let i = 0; i < n; i++) {
      const page = await timed(bust(url), {}, { parse: true });
      runs.push({
        run: i + 1,
        status: page.r.status,
        ...page.ms,
        encodedKb: page.kb.encoded,
        decodedKb: page.kb.decoded,
        gzip: page.r.headers.get("content-encoding") ?? "(none)",
        trCount: page.doc?.querySelectorAll("tr").length ?? null,
      });
      await sleep(300);
    }
    console.table(runs);

    const med = (k) => {
      const v = runs.map((x) => x[k]).filter((x) => x != null).sort((a, b) => a - b);
      return v.length ? v[Math.floor(v.length / 2)] : null;
    };
    const out = keep("scrape", {
      auditId,
      totalMs: med("total"),
      ttfbMs: med("ttfb"),
      downloadMs: med("download"),
      parseMs: med("parse"),
      decodedKb: med("decodedKb"),
      gzip: runs[0].gzip,
    });
    const parts = [
      ["ttfb (UT render)", out.ttfbMs],
      ["download (bytes)", out.downloadMs],
      ["parse (ours)", out.parseMs],
    ].sort((a, b) => b[1] - a[1]);
    log(`scrape median ${out.totalMs}ms — dominated by ${parts[0][0]} (${parts[0][1]}ms)`);
    if (out.gzip === "(none)" && out.decodedKb > 50) {
      warn(`results page is ${out.decodedKb}KB uncompressed — download is a real cost`);
    }
    return out;
  }

  /**
   * PROBE 2 — does UT expose a lighter results representation?
   *
   * Only follows links the results page itself advertises (print, text, pdf,
   * export...). No URL guessing — UT logs every hit.
   */
  async function scrapeAlternatives(auditId) {
    auditId ??= await newestAuditId();
    const url = `${BASE}/results/${auditId}/`;
    const page = await timed(bust(url), {}, { parse: true });
    const seen = new Set();
    const candidates = [];
    for (const a of page.doc.querySelectorAll("a[href]")) {
      const href = new URL(a.getAttribute("href"), url);
      if (href.origin !== new URL(BASE).origin) continue;
      const label = `${a.textContent} ${href.pathname}${href.search}`;
      if (!/print|pdf|text|plain|export|download|csv|summary|compact/i.test(label))
        continue;
      if (seen.has(href.href)) continue;
      seen.add(href.href);
      candidates.push({ text: a.textContent.trim().slice(0, 40), url: href.href });
    }
    // <link rel=alternate> is the polite way to advertise one, if UT does.
    for (const l of page.doc.querySelectorAll('link[rel~="alternate"][href]')) {
      candidates.push({ text: `alternate ${l.getAttribute("type") ?? ""}`, url: new URL(l.getAttribute("href"), url).href });
    }

    const rows = [{ text: "(current results page)", ms: page.ms.total, kb: page.kb.decoded, status: page.r.status }];
    for (const c of candidates.slice(0, 5)) {
      try {
        const alt = await timed(bust(c.url));
        rows.push({ text: c.text, ms: alt.ms.total, kb: alt.kb.decoded, status: alt.r.status, url: c.url });
      } catch (e) {
        rows.push({ text: c.text, ms: null, kb: null, status: "ERR", url: c.url });
      }
    }
    console.table(rows);
    keep("scrapeAlternatives", rows);
    if (rows.length === 1) log("results page advertises no lighter representation — scrape stays as is.");
    else log("Any row cheaper than the current page AND still containing requirement rows is a candidate.");
    return rows;
  }

  /**
   * PROBE 3 — can the audit form GET be done once per session?
   *
   * submitPlannedAudit fetches student_individual/ every preview just to read
   * hidden fields + CSRF. If those fields don't change between fetches and
   * the csrftoken cookie is readable, the fetch is a per-session cost, not a
   * per-preview one.
   */
  async function formReuse() {
    const grab = async () => {
      const page = await timed(bust(NEW_AUDIT), {}, { parse: true });
      const form = [...page.doc.querySelectorAll("form")].find(
        (f) =>
          /test_profile_button/.test(f.getAttribute("action") ?? "") ||
          f.querySelector('[name="incl_planned_crswk"]'),
      );
      if (!form) throw new Error("default audit form not found");
      const fields = {};
      for (const el of form.elements) if (el.name && !el.disabled) fields[el.name] = el.value ?? "";
      return { ms: page.ms.total, fields };
    };
    const a = await grab();
    await sleep(500);
    const b = await grab();

    const changed = Object.keys(a.fields).filter((k) => a.fields[k] !== b.fields[k]);
    const nonCsrfChanged = changed.filter((k) => k !== "csrfmiddlewaretoken");
    const cookieToken = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)?.[1] ?? null;

    const out = keep("form", {
      formGetMs: r0((a.ms + b.ms) / 2),
      fieldCount: Object.keys(a.fields).length,
      fieldsStable: nonCsrfChanged.length === 0,
      changedFields: nonCsrfChanged.join(",") || "(none)",
      csrfCookieReadable: Boolean(cookieToken),
      // Django masks per-render tokens; the cookie is the unmasked secret. Any
      // masked token from this session validates, so caching one is fine —
      // this just says whether we could skip even that.
      csrfTokenRotatesPerRender: a.fields.csrfmiddlewaretoken !== b.fields.csrfmiddlewaretoken,
    });
    console.table([out]);
    if (out.fieldsStable) {
      log(`form GET (~${out.formGetMs}ms) can run once per session and be reused — fields are stable.`);
    } else {
      warn(`fields change between fetches (${out.changedFields}) — form must be fetched per preview.`);
    }
    return out;
  }

  /**
   * PROBE 4 — is the page=3 listing stable, so resolve can be prefetched?
   *
   * The design forbids constructing page=4 by hand. It does NOT forbid
   * fetching page=3 early (when the user picks a course) and keeping the
   * parsed link. That only works if the link is the same on every fetch.
   */
  async function resolveStability(course = { dept: "C S", num: "331", ccyys: "20272" }) {
    const listUrl =
      `${PLANNER_LIST}?page=3&course_ccyys=${encodeURIComponent(course.ccyys)}` +
      `&course_pass_fail=&s_pf=&course_type=1&dpt=${encodeURIComponent(course.dept)}&s_lvl=U`;
    const hrefsFor = (doc) =>
      [...doc.querySelectorAll('a[href*="page=4"]')]
        .map((a) => a.getAttribute("href"))
        .filter((h) => new URL(h, PLANNER_LIST).searchParams.get("course_num")?.trim() === course.num);

    const a = await timed(bust(listUrl), {}, { parse: true });
    await sleep(500);
    const b = await timed(bust(listUrl), {}, { parse: true });
    const ha = hrefsFor(a.doc), hb = hrefsFor(b.doc);
    const params = ha[0] ? [...new URL(ha[0], PLANNER_LIST).searchParams.keys()] : [];

    const out = keep("resolve", {
      listMs: r0((a.ms.total + b.ms.total) / 2),
      listKb: a.kb.decoded,
      linkFound: ha.length > 0,
      stableAcrossFetches: ha.length > 0 && ha.join() === hb.join(),
      linkParams: params.join(","),
      // Long opaque values suggest a nonce; if none, the link is a pure key.
      looksNonced: ha[0] ? /[0-9a-f]{16,}|[A-Za-z0-9+/=]{24,}/.test(ha[0]) : null,
    });
    console.table([out]);
    if (out.stableAcrossFetches && !out.looksNonced) {
      log(`page=4 link is a stable key — prefetch page=3 when the course is picked; resolve leaves the critical path (~${REF.resolveMs}ms).`);
    } else if (out.linkFound) {
      warn("page=4 link differs between fetches — resolve must stay in the pipeline.");
    }
    return out;
  }

  /**
   * PROBE 5 — add: how much of the 345 ms is the write itself?
   *
   * One real add, timed with Resource Timing so the page=4 request (the
   * 3xx) is separated from the landing page it redirects to. Then checks
   * whether that landing page already lists planner rows — if so, the
   * verify-after-write re-read is a free by-product, not a second fetch.
   *
   * Mutates: adds one row, deletes it via poc.testDelete.
   */
  async function addCost(course = { dept: "C S", num: "324E", ccyys: "20272" }) {
    if (typeof poc === "undefined") throw new Error("Load planner-poc.js first.");

    const before = await timed(bust(PLANNER_VIEW), {}, { parse: true });
    const beforeKeys = new Set(plannerRowsIn(before.doc));

    const tR = now();
    const { href } = await poc.resolveAddLink(course);
    const resolveMs = r0(now() - tR);

    // The write. Followed, so Resource Timing shows both halves.
    const addUrl = new URL(href, PLANNER_LIST).toString();
    const add = await timed(addUrl, {}, { parse: true });
    const landingRows = plannerRowsIn(add.doc, add.r.url);

    const after = await timed(bust(PLANNER_VIEW), {}, { parse: true });
    const afterRows = plannerRowsIn(after.doc);
    const created = afterRows.filter((k) => !beforeKeys.has(k));

    const out = keep("add", {
      resolveMs,
      page4Ms: add.ms.redirect, // the state-changing request alone
      landingTtfbMs: add.ms.ttfb,
      landingDownloadMs: add.ms.download,
      landingKb: add.kb.decoded,
      addTotalMs: add.ms.total,
      landedOn: add.r.url.replace(BASE, ""),
      landingListsRows: landingRows.length > 0,
      landingMatchesPlanner:
        landingRows.length > 0 && landingRows.join() === afterRows.join(),
      verifyReadMs: after.ms.total,
      rowsCreated: created.length,
    });
    console.table([out]);

    if (out.landingMatchesPlanner) {
      log(`landing page IS the planner — skip the verify re-read (~${out.verifyReadMs}ms). Add can be ~${out.page4Ms + out.landingTtfbMs + out.landingDownloadMs}ms.`);
    } else {
      log(`landing page doesn't carry the rows — with redirect:"manual" add is ~${out.page4Ms}ms + verify read ~${out.verifyReadMs}ms.`);
    }

    // Cleanup — hand the row to poc so cleanup() knows about it too.
    if (created.length === 1) {
      const [id, ccyys, seq] = created[0].split("|");
      const row = { key_course_id: id, key_course_ccyys: ccyys, key_course_seq: seq };
      poc.state.added.push(row);
      await poc.testDelete(row);
    } else {
      warn(`expected 1 new row, got ${created.length} — run poc.readPlanner() and clean up manually`);
    }
    return out;
  }

  /**
   * PROBE 6 — submit: stop downloading the page we throw away.
   *
   * The POST redirects to requests/history/ (measured 353 ms). We follow it
   * and discard the HTML. redirect:"manual" returns as soon as UT answers
   * 3xx — the POST is still processed. Confirmed accepted by the row
   * appearing in history, which also re-measures rowVisible / link.
   *
   * Mutates: creates ONE real audit.
   */
  async function submitCost({ intervalMs = 150 } = {}) {
    // Snapshot + form, timed — both are per-preview costs today.
    const hist = await timed(bust(HISTORY), {}, { parse: true });
    const beforeKeys = new Set(parseHistory(hist.doc).map((r) => r.key));

    const formPage = await timed(bust(NEW_AUDIT), {}, { parse: true });
    const form = [...formPage.doc.querySelectorAll("form")].find(
      (f) =>
        /test_profile_button/.test(f.getAttribute("action") ?? "") ||
        f.querySelector('[name="incl_planned_crswk"]'),
    );
    if (!form) throw new Error("default audit form not found");
    const params = new URLSearchParams();
    for (const el of form.elements) if (el.name && !el.disabled) params.append(el.name, el.value ?? "");
    params.set("incl_planned_crswk", "Y");
    const action = new URL(form.getAttribute("action") || "", NEW_AUDIT).toString();
    const csrf = params.get("csrfmiddlewaretoken");

    const post = await timed(action, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(csrf ? { "X-CSRFToken": csrf } : {}),
      },
      body: params,
    });
    const tPosted = now();

    // opaqueredirect = UT answered 3xx = accepted (or SSO bounce — the auth
    // gate runs before this in production). basic/200 = re-rendered form =
    // silently rejected.
    const postType = post.r.type;

    let rowMs = null, linkMs = null, auditId = null, polls = 0;
    const deadline = now() + 90_000;
    while (now() < deadline) {
      polls++;
      const page = await timed(bust(HISTORY), {}, { parse: true });
      const fresh = parseHistory(page.doc).find((r) => !beforeKeys.has(r.key));
      if (fresh && rowMs === null) rowMs = r0(now() - tPosted);
      if (fresh?.linked) { linkMs = r0(now() - tPosted); auditId = fresh.auditId; break; }
      await sleep(intervalMs);
    }

    const out = keep("submit", {
      historySnapshotMs: hist.ms.total,
      formGetMs: formPage.ms.total,
      postMs: post.ms.total,
      postTtfbMs: post.ms.ttfb,
      postType,
      accepted: rowMs !== null,
      rowVisibleMs: rowMs,
      linkMs,
      genMs: rowMs != null && linkMs != null ? linkMs - rowMs : null,
      polls,
      auditId,
      savedVsFollowMs: REF.submitMs - post.ms.total,
    });
    console.table([out]);
    if (postType !== "opaqueredirect") {
      warn(`POST returned type=${postType} status=${post.r.status} — expected opaqueredirect. Check accepted.`);
    }
    if (out.accepted) {
      log(`POST without following the redirect: ${out.postMs}ms (was ~${REF.submitMs}ms). Audit ${auditId} queued fine.`);
    } else {
      warn("no new history row within 90 s — the manual-redirect POST may not have been accepted.");
    }
    return out;
  }

  /**
   * PROBE 7 — the trimmed pipeline, end to end.
   *
   * Everything the probes above said is safe, applied at once:
   *   - form fields fetched ONCE for the session, reused per run
   *   - resolve (page=3) + history snapshot + planner snapshot in parallel
   *   - page=4 add with redirect:"manual", one verify read
   *   - POST with redirect:"manual"
   *   - 150 ms serial poll until the ID links, then scrape
   * Per-run stage table + p50 vs the 3639 ms reference budget.
   *
   * Mutates: one planner add/delete and ONE real audit per run.
   */
  async function timeTrimmedPreview(
    course = { dept: "C S", num: "324E", ccyys: "20272" },
    runs = 3,
    { intervalMs = 150 } = {},
  ) {
    if (typeof poc === "undefined") throw new Error("Load planner-poc.js first.");

    // --- once per session -------------------------------------------------
    const tForm = now();
    const formPage = await timed(bust(NEW_AUDIT), {}, { parse: true });
    const form = [...formPage.doc.querySelectorAll("form")].find(
      (f) =>
        /test_profile_button/.test(f.getAttribute("action") ?? "") ||
        f.querySelector('[name="incl_planned_crswk"]'),
    );
    if (!form) throw new Error("default audit form not found");
    const baseParams = [];
    for (const el of form.elements) if (el.name && !el.disabled) baseParams.push([el.name, el.value ?? ""]);
    const action = new URL(form.getAttribute("action") || "", NEW_AUDIT).toString();
    const sessionPrepMs = r0(now() - tForm);
    log(`session prep (form fields, once): ${sessionPrepMs}ms — not on any run's path`);

    const results = [];
    let failures = 0;
    for (let i = 0; i < runs; i++) {
      log(`--- trimmed round trip ${i + 1}/${runs}`);
      const t = { run: i + 1 };
      const tTotal = now();
      let created = [];
      try {
        // --- three independent reads, together -----------------------------
        const tReads = now();
        const [resolved, hist, planner] = await Promise.all([
          poc.resolveAddLink(course),
          timed(bust(HISTORY), {}, { parse: true }),
          timed(bust(PLANNER_VIEW), {}, { parse: true }),
        ]);
        t.readsMs = r0(now() - tReads);
        const beforeHist = new Set(parseHistory(hist.doc).map((r) => r.key));
        const beforePlanner = new Set(plannerRowsIn(planner.doc));

        // --- add, unfollowed -----------------------------------------------
        const tAdd = now();
        const add = await timed(new URL(resolved.href, PLANNER_LIST).toString(), { redirect: "manual" });
        t.addMs = r0(now() - tAdd);
        t.addType = add.r.type;

        const tVerify = now();
        const after = await timed(bust(PLANNER_VIEW), {}, { parse: true });
        t.verifyMs = r0(now() - tVerify);
        created = plannerRowsIn(after.doc).filter((k) => !beforePlanner.has(k));
        if (created.length === 1) {
          const [id, ccyys, seq] = created[0].split("|");
          poc.state.added.push({ key_course_id: id, key_course_ccyys: ccyys, key_course_seq: seq });
        } else {
          throw new Error(`expected 1 new planner row, got ${created.length}`);
        }

        // --- submit, unfollowed --------------------------------------------
        const params = new URLSearchParams(baseParams);
        params.set("incl_planned_crswk", "Y");
        const csrf = params.get("csrfmiddlewaretoken");
        const tPost = now();
        const post = await timed(action, {
          method: "POST",
          redirect: "manual",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            ...(csrf ? { "X-CSRFToken": csrf } : {}),
          },
          body: params,
        });
        const tPosted = now();
        t.submitMs = r0(tPosted - tPost);
        t.submitType = post.r.type;
        if (post.r.type !== "opaqueredirect") throw new Error(`submit not accepted (type=${post.r.type}, status=${post.r.status})`);

        // --- poll ------------------------------------------------------------
        let rowMs = null, auditId = null;
        const deadline = now() + 90_000;
        while (now() < deadline) {
          const page = await timed(bust(HISTORY), {}, { parse: true });
          const fresh = parseHistory(page.doc).find((r) => !beforeHist.has(r.key));
          if (fresh && rowMs === null) rowMs = r0(now() - tPosted);
          if (fresh?.linked) { auditId = fresh.auditId; break; }
          await sleep(intervalMs);
        }
        if (!auditId) throw new Error("no linked audit within 90 s");
        t.detectMs = rowMs;
        t.genMs = r0(now() - tPosted - rowMs);

        // --- scrape ----------------------------------------------------------
        const tScrape = now();
        const res = await timed(`${BASE}/results/${auditId}/`, {}, { parse: true });
        t.scrapeMs = r0(now() - tScrape);
        t.requirementRows = res.doc.querySelectorAll("tr").length;
        t.auditId = auditId;
        t.totalMs = r0(now() - tTotal);
        results.push(t);
        log("trimmed round trip", t);
        failures = 0;
      } catch (e) {
        warn(`run ${i + 1} failed:`, e);
        if (++failures >= 2) { warn("stopping after 2 consecutive failures"); break; }
      } finally {
        if (created.length === 1) {
          const [id, ccyys, seq] = created[0].split("|");
          const tDel = now();
          await timed(
            `${PLANNER_VIEW}?key_course_id=${encodeURIComponent(id)}` +
              `&key_course_ccyys=${encodeURIComponent(ccyys)}` +
              `&key_course_seq=${encodeURIComponent(seq)}&action_code=D`,
          );
          const check = await timed(bust(PLANNER_VIEW), {}, { parse: true });
          const gone = !plannerRowsIn(check.doc).includes(created[0]);
          t.deleteMs = r0(now() - tDel);
          if (gone) poc.state.added = poc.state.added.filter((r) => r.key_course_seq !== seq);
          else warn("row survived delete — run poc.cleanup()", created[0]);
        }
      }
    }

    if (results.length) {
      console.table(results);
      const p50 = (k) => {
        const v = results.map((r) => r[k]).filter((x) => x != null).sort((a, b) => a - b);
        return v.length ? v[Math.floor(v.length / 2)] : null;
      };
      const stages = ["readsMs", "addMs", "verifyMs", "submitMs", "detectMs", "genMs", "scrapeMs", "totalMs"];
      const row = Object.fromEntries(stages.map((k) => [k, p50(k)]));
      row.sessionPrepMs = sessionPrepMs;
      row.referenceTotalMs = 3639;
      row.savedMs = 3639 - row.totalMs;
      console.table([row]);
      keep("trimmed", { results, p50: row });
      log(`trimmed preview p50 ${row.totalMs}ms vs ${row.referenceTotalMs}ms reference — UT (gen+scrape) is ${Math.round(((row.genMs + row.scrapeMs) / row.totalMs) * 100)}% of it.`);
      return { results, p50: row };
    }
    warn("no runs completed");
    return { results, p50: null };
  }

  /** What could the pipeline look like, given what ran? */
  function summary() {
    const R = state.results;
    const rows = [];
    if (R.submit) {
      rows.push({ stage: "submit POST", nowMs: REF.submitMs, achievableMs: R.submit.postMs, how: 'redirect:"manual"' });
      rows.push({ stage: "history snapshot", nowMs: R.submit.historySnapshotMs, achievableMs: 0, how: "overlap with resolve (proven)" });
    }
    if (R.form) {
      rows.push({ stage: "audit form GET", nowMs: R.form.formGetMs, achievableMs: R.form.fieldsStable ? 0 : R.form.formGetMs, how: R.form.fieldsStable ? "fetch once per session" : "must stay" });
    }
    if (R.add) {
      const a = R.add;
      const ach = a.landingMatchesPlanner
        ? a.page4Ms + a.landingTtfbMs + a.landingDownloadMs
        : a.page4Ms + a.verifyReadMs;
      rows.push({ stage: "add + verify", nowMs: a.addTotalMs + a.verifyReadMs, achievableMs: ach, how: a.landingMatchesPlanner ? "landing page is the verify read" : 'redirect:"manual" + one verify read' });
    }
    if (R.resolve) {
      rows.push({ stage: "resolve (page=3)", nowMs: REF.resolveMs, achievableMs: R.resolve.stableAcrossFetches && !R.resolve.looksNonced ? 0 : REF.resolveMs, how: R.resolve.stableAcrossFetches ? "prefetch at course pick" : "must stay" });
    }
    if (R.scrape) {
      const s = R.scrape;
      rows.push({ stage: "scrape", nowMs: s.totalMs, achievableMs: s.ttfbMs + s.downloadMs, how: `parse ${s.parseMs}ms is ours; ttfb ${s.ttfbMs}ms is UT` });
    }
    for (const r of rows) r.savedMs = r.nowMs - r.achievableMs;
    console.table(rows);
    const saved = rows.reduce((n, r) => n + Math.max(0, r.savedMs), 0);
    log(`total cuttable from what ran: ~${r0(saved)}ms`);
    return rows;
  }

  globalThis.trim = {
    scrapeCost,
    scrapeAlternatives,
    formReuse,
    resolveStability,
    addCost,
    submitCost,
    timeTrimmedPreview,
    summary,
    state,
    timed,
  };
  log(
    "ready. Read-only first:\n" +
      "  await trim.scrapeCost();\n" +
      "  await trim.scrapeAlternatives();\n" +
      "  await trim.formReuse();\n" +
      "  await trim.resolveStability();\n" +
      "then the two that write (1 add+delete, 1 audit):\n" +
      "  await trim.addCost();\n" +
      "  await trim.submitCost();\n" +
      "  trim.summary();\n" +
      "then prove it end to end (1 audit + 1 add/delete per run):\n" +
      "  await trim.timeTrimmedPreview(undefined, 3);",
  );
})();
