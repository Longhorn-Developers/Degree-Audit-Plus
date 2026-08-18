/**
 * DAP-115 (5.1) POC harness — planner mechanics + preview timing.
 *
 * THROWAWAY SPIKE. Not imported by the extension, not typechecked, not shipped.
 * Delete once the findings land in docs/hypothetical-courses-design.md.
 *
 * Usage: open a logged-in https://utdirect.utexas.edu/apps/degree/audits/ tab,
 * paste this whole file into the DevTools console, then run (see RUNBOOK.md):
 *
 *   await poc.readPlanner()
 *   await poc.testAdd({ dept: "C S", num: "324E", ccyys: "20272" })
 *   await poc.testIdempotency({ dept: "C S", num: "324E", ccyys: "20272" })
 *   await poc.testParallelAdd([course1, course2, course3])
 *   await poc.testDelete(row)
 *   await poc.discoverModify()
 *   await poc.testExecutionContext()
 *   await poc.testAuthSignal()
 *   await poc.dumpAuditForm()   // inspect UT's audit forms
 *   await poc.timePreview(course, 5)
 *   poc.report()
 *   await poc.cleanup()
 *
 * Safety rules encoded here (from docs/hypothetical-courses-design.md):
 *   - page=4 is a state-changing GET. Never prefetched, never constructed by
 *     hand — always parsed from the page=3 listing.
 *   - action_code=A (Delete All) is never issued. Per-row deletes only —
 *     deleteAllCourses() wipes the planner via a per-row loop, so it stays
 *     inspectable and reports which rows resisted deletion.
 *   - Every mutation is recorded in poc.state.added so cleanup() can undo it.
 */

(() => {
  const BASE = "https://utdirect.utexas.edu/apps/degree/audits";
  const PLANNER_LIST = `${BASE}/planner/ut_course/`;
  const PLANNER_VIEW = `${BASE}/planner/view_planner/`;
  const HISTORY = `${BASE}/submissions/history/`;
  const NEW_AUDIT = `${BASE}/submissions/student_individual/`;

  const state = {
    added: [], // rows this session created, for cleanup()
    findings: {}, // question id -> answer, printed by report()
    timings: [], // one entry per timePreview() round trip
  };

  const log = (...args) => console.log("%c[poc]", "color:#bf5700", ...args);
  const warn = (...args) => console.warn("%c[poc]", "color:#bf5700", ...args);

  const now = () => performance.now();
  const record = (id, value) => {
    state.findings[id] = value;
    log(`finding ${id}:`, value);
    return value;
  };

  /**
   * Parse HTML where we can. MV3 service workers have no DOMParser (confirmed
   * 2026-08-16: `ReferenceError: DOMParser is not defined`), so there we fall
   * back to a regex-backed stub that answers only the selectors this harness
   * uses for auth/row detection. Enough for testExecutionContext() and
   * testAuthSignal(); the mutation helpers still need a real page.
   */
  function parseHtml(text) {
    if (typeof DOMParser !== "undefined") {
      return new DOMParser().parseFromString(text, "text/html");
    }
    const has = (re) => re.test(text);
    const stub = {
      title: (text.match(/<title[^>]*>([^<]*)/i) || [null, ""])[1].trim(),
      querySelector(sel) {
        if (/password/.test(sel)) {
          return has(/type=["']?password/i) ? {} : null;
        }
        if (/action_code=D/.test(sel)) return has(/action_code=D/) ? {} : null;
        return null;
      },
      querySelectorAll() {
        return [];
      },
      __stub: true,
    };
    return stub;
  }

  /** Credentialed GET returning a parsed document plus the raw response. */
  async function get(url) {
    const startedAt = now();
    const response = await fetch(url, { credentials: "include" });
    const text = await response.text();
    return {
      url,
      response,
      elapsedMs: now() - startedAt,
      doc: parseHtml(text),
      text,
    };
  }

  /**
   * Definitive logged-out evidence: UT bounced us to SSO, or served a login
   * form. Deliberately NOT `response.redirected` — the planner's own
   * page=4/action_code=D endpoints redirect on success, so treating any
   * redirect as logout aborts mid-mutation (it did: "Session died mid-add"
   * fired on a successful add).
   *
   * DAP-123 asks which signal is cheapest; `authSignals()` below reports all
   * of them per response so the answer comes from data, not from this guard.
   */
  function looksLoggedOut({ response, doc }) {
    const sso = /\b(login|signin|idp\.utexas|shib|sso)\b/i.test(response.url);
    return (
      sso ||
      response.status === 401 ||
      response.status === 403 ||
      Boolean(doc.querySelector('input[type="password"]'))
    );
  }

  /** Every candidate auth signal for one response — DAP-123's raw material. */
  function authSignals({ response, doc }) {
    return {
      status: response.status,
      ok: response.ok,
      redirected: response.redirected,
      finalUrl: response.url,
      ssoInUrl: /\b(login|signin|idp\.utexas|shib|sso)\b/i.test(response.url),
      hasPasswordInput: Boolean(doc.querySelector('input[type="password"]')),
      title: doc.title,
    };
  }

  // ---------------------------------------------------------------- read path

  /**
   * Parse View Courses into row keys. The row key is the triple the delete URL
   * needs: (key_course_id, key_course_ccyys, key_course_seq).
   */
  async function readPlanner() {
    const page = await get(PLANNER_VIEW);
    if (looksLoggedOut(page)) throw new Error("Not logged in — log in first.");

    const rows = [];
    for (const link of page.doc.querySelectorAll('a[href*="action_code=D"]')) {
      const params = new URL(link.getAttribute("href"), PLANNER_VIEW)
        .searchParams;
      const id = params.get("key_course_id");
      if (!id) continue;

      // UT parenthesizes expired rows; those don't apply to audits, so the
      // production client must reject them as preview inputs.
      const rowText = link.closest("tr")?.textContent?.trim() ?? "";
      rows.push({
        key_course_id: id,
        key_course_ccyys: params.get("key_course_ccyys"),
        key_course_seq: params.get("key_course_seq"),
        expired: /\(.*\)/.test(rowText),
        rowText: rowText.replace(/\s+/g, " "),
        deleteHref: link.getAttribute("href"),
      });
    }

    log(`planner has ${rows.length} row(s)`, rows);
    record("planner.rowCount", rows.length);
    record(
      "planner.seqValues",
      [...new Set(rows.map((r) => r.key_course_seq))].join(","),
    );
    return rows;
  }

  /**
   * Find the exact page=4 add link for a course on the page=3 listing.
   * Returns the href verbatim — never reconstructed.
   */
  async function resolveAddLink({
    dept,
    num,
    ccyys,
    courseType = "1",
    level = "U",
  }) {
    const listUrl =
      `${PLANNER_LIST}?page=3&course_ccyys=${encodeURIComponent(ccyys)}` +
      `&course_pass_fail=&s_pf=&course_type=${courseType}` +
      `&dpt=${encodeURIComponent(dept)}&s_lvl=${level}`;

    const page = await get(listUrl);
    if (looksLoggedOut(page)) throw new Error("Not logged in — log in first.");

    const candidates = [
      ...page.doc.querySelectorAll('a[href*="page=4"]'),
    ].filter((link) => {
      const linkNum = new URL(
        link.getAttribute("href"),
        PLANNER_LIST,
      ).searchParams.get("course_num");
      return linkNum?.trim() === num.trim();
    });

    if (!candidates.length) {
      throw new Error(`No page=4 link for ${dept} ${num} in ${ccyys}`);
    }
    // More than one match means a topic course; the design says never pick one
    // silently, so surface the choice instead of guessing.
    if (candidates.length > 1) {
      warn(
        `${dept} ${num} has ${candidates.length} add links (topic course?) — pick one manually`,
        candidates.map((c) => c.getAttribute("href")),
      );
    }

    return {
      href: candidates[0].getAttribute("href"),
      listElapsedMs: page.elapsedMs,
      candidateCount: candidates.length,
    };
  }

  // --------------------------------------------------------------- write path

  /**
   * Follow a parsed page=4 link. State-changing — only called deliberately.
   *
   * Never throws on a redirect: by the time this returns, UT may already have
   * written the row, so aborting here would strand a planner row the caller
   * doesn't know about. Whether the add worked is decided by re-reading the
   * planner (the caller's before/after diff), not by the response shape.
   */
  async function followAddLink(href) {
    const page = await get(new URL(href, PLANNER_LIST).toString());
    record("add.responseSignals", authSignals(page));

    if (looksLoggedOut(page)) {
      warn(
        "Add response looks like an SSO/login page — the row may or may not " +
          "have been written. Check View Courses before retrying.",
        authSignals(page),
      );
    }
    return page;
  }

  /**
   * DAP-122 steps 1: add a course and verify the row landed.
   * Records the new row so cleanup() can remove it.
   */
  async function testAdd(course) {
    const before = await readPlanner();
    const { href, candidateCount } = await resolveAddLink(course);
    log("resolved add link:", href);

    const startedAt = now();
    const addPage = await followAddLink(href);
    const after = await readPlanner();
    const addElapsedMs = now() - startedAt;

    const beforeKeys = new Set(before.map(rowKey));
    const newRows = after.filter((row) => !beforeKeys.has(rowKey(row)));

    record("add.works", newRows.length === 1);
    record("add.elapsedMs", Math.round(addElapsedMs));
    record("add.topicCandidates", candidateCount);
    record("add.responseStatus", addPage.response.status);

    state.added.push(...newRows);
    log(`add produced ${newRows.length} new row(s)`, newRows);

    if (!newRows.length) {
      warn(
        "Add wrote no new row. Either UT rejected it, or the course was " +
          "already in the planner (see add.idempotency). Response signals:",
        authSignals(addPage),
      );
    }
    return newRows[0];
  }

  /**
   * DAP-122 step 3: add the same course twice. Duplicate row or no-op?
   * Cleans up whatever the second add produced.
   */
  async function testIdempotency(course) {
    const before = await readPlanner();
    const { href } = await resolveAddLink(course);

    await followAddLink(href);
    const afterFirst = await readPlanner();
    await followAddLink(href);
    const afterSecond = await readPlanner();

    const delta1 = afterFirst.length - before.length;
    const delta2 = afterSecond.length - afterFirst.length;

    record(
      "add.idempotency",
      delta2 === 0
        ? "no-op (second add ignored)"
        : `duplicate row (+${delta2})`,
    );
    record("add.firstDelta", delta1);

    const beforeKeys = new Set(before.map(rowKey));
    const created = afterSecond.filter((row) => !beforeKeys.has(rowKey(row)));
    state.added.push(...created);
    return { delta1, delta2, created };
  }

  /**
   * Do concurrent adds work, or does UT need them serialized?
   *
   * The design doc assumes a serial queue ("sequential, fetch-before-write and
   * verify-after-write"). If parallel adds are safe, syncPlannerTo() could
   * fan out instead — worth knowing before 5.2 commits to serial.
   *
   * Watch for: rows silently dropped (fewer new rows than courses), duplicate
   * seq values, or interleaved seq assignment. Everything created is tracked
   * for cleanup().
   */
  async function testParallelAdd(courses) {
    if (!Array.isArray(courses) || courses.length < 2) {
      throw new Error("Pass at least 2 courses, e.g. [{dept,num,ccyys}, ...]");
    }

    // A missing row after a parallel run has two possible causes: a genuine
    // concurrency race, or UT rejecting that specific course on its own merits
    // (restricted, already taken, closed term). Those are indistinguishable
    // from the parallel run alone — so establish a serial baseline first and
    // only blame concurrency for courses that DO add one at a time.
    log("baseline: adding each course serially to see which UT accepts…");
    const baselineBefore = await readPlanner();
    const baselineKeys = new Set(baselineBefore.map(rowKey));
    const addsSerially = [];

    for (const course of courses) {
      const label = `${course.dept} ${course.num}`;
      try {
        const { href } = await resolveAddLink(course);
        await followAddLink(href);
        const rows = await readPlanner();
        const created = rows.filter((row) => !baselineKeys.has(rowKey(row)));
        state.added.push(...created);

        if (created.length) {
          addsSerially.push(label);
          // Undo immediately so the parallel phase starts from a clean slate.
          for (const row of created) {
            await testDelete(row);
            baselineKeys.delete(rowKey(row));
          }
        } else {
          warn(`${label} does not add even serially — UT rejects it`);
        }
      } catch (error) {
        warn(`${label} failed to resolve/add serially:`, error.message);
      }
    }
    record("add.serialBaseline", addsSerially);

    if (addsSerially.length < 2) {
      throw new Error(
        `Only ${addsSerially.length} of ${courses.length} courses add at all ` +
          `(${addsSerially.join(", ") || "none"}). Need >= 2 addable courses ` +
          "to test concurrency — pick different courses.",
      );
    }

    // Now the real test, restricted to courses proven to add serially.
    const testable = courses.filter((course) =>
      addsSerially.includes(`${course.dept} ${course.num}`),
    );
    log(`parallel phase: ${testable.length} course(s) known-addable`);

    const before = await readPlanner();
    const beforeKeys = new Set(before.map(rowKey));

    // Resolve first (read-only, safe to parallelize regardless) so the writes
    // fire as close together as possible — that's the race we're testing.
    const links = await Promise.all(testable.map((c) => resolveAddLink(c)));

    const startedAt = now();
    const settled = await Promise.allSettled(
      links.map(({ href }) => followAddLink(href)),
    );
    const elapsedMs = now() - startedAt;

    const after = await readPlanner();
    const created = after.filter((row) => !beforeKeys.has(rowKey(row)));
    state.added.push(...created);

    const seqValues = created.map((row) => row.key_course_seq);
    const result = {
      requested: testable.length,
      requestedCourses: testable.map((c) => `${c.dept} ${c.num}`),
      fulfilled: settled.filter((s) => s.status === "fulfilled").length,
      rowsCreated: created.length,
      allLanded: created.length === testable.length,
      duplicateSeq: seqValues.length !== new Set(seqValues).size,
      seqValues,
      elapsedMs: Math.round(elapsedMs),
    };
    record("add.parallel", result);

    if (!result.allLanded) {
      warn(
        `CONCURRENCY RACE: ${testable.length} courses that each add fine ` +
          `serially produced only ${created.length} rows in parallel. ` +
          "Planner writes must be serialized.",
      );
    } else if (result.duplicateSeq) {
      warn("Rows landed but seq values collided — writes must be serialized.");
    } else {
      log(
        `All ${created.length} parallel adds landed with distinct seq values. ` +
          "Re-run a couple of times before trusting this — races are flaky.",
      );
    }
    return result;
  }

  /** DAP-122 step 2: per-row delete. Never action_code=A. */
  async function testDelete(row) {
    if (!row) throw new Error("Pass a row from readPlanner()/testAdd().");

    const url =
      `${PLANNER_VIEW}?key_course_id=${encodeURIComponent(row.key_course_id)}` +
      `&key_course_ccyys=${encodeURIComponent(row.key_course_ccyys)}` +
      `&key_course_seq=${encodeURIComponent(row.key_course_seq)}` +
      `&action_code=D`;

    const before = await readPlanner();
    const startedAt = now();
    const page = await get(url);
    const after = await readPlanner();
    const elapsedMs = now() - startedAt;

    // Same reasoning as followAddLink: delete redirects on success, so the
    // planner diff decides the outcome, not the response shape.
    record("delete.responseSignals", authSignals(page));

    const removed = before.length - after.length;
    const targetGone = !after.some((r) => rowKey(r) === rowKey(row));

    record("delete.works", removed === 1 && targetGone);
    record("delete.elapsedMs", Math.round(elapsedMs));
    record("delete.removedExactlyOne", removed === 1);

    // Only forget the row once UT confirms it's gone — otherwise cleanup()
    // would lose track of a row still sitting in the planner.
    if (targetGone) {
      state.added = state.added.filter((r) => rowKey(r) !== rowKey(row));
    } else {
      warn("Delete did not remove the target row:", row, authSignals(page));
    }
    return { removed, targetGone };
  }

  /**
   * DAP-122 step 3: discover the Modify URL/form shape. Read-only — it only
   * reports the links/forms UT exposes for a row so we can name the params.
   */
  async function discoverModify() {
    const page = await get(PLANNER_VIEW);
    if (looksLoggedOut(page)) throw new Error("Not logged in — log in first.");

    const links = [...page.doc.querySelectorAll("a[href]")]
      .map((a) => a.getAttribute("href"))
      .filter((href) => /action_code=(?!D|A)|modify|page=5|page=6/i.test(href));

    const forms = [...page.doc.querySelectorAll("form")].map((form) => ({
      action: form.getAttribute("action"),
      method: form.getAttribute("method"),
      fields: [...form.elements].map((el) => ({
        name: el.name,
        type: el.type,
        value: el.value,
      })),
    }));

    record("modify.candidateLinks", links);
    record("modify.forms", forms);
    log("Inspect these, then follow the modify link manually in a tab.");
    return { links, forms };
  }

  // ------------------------------------------------- execution context + auth

  /**
   * DAP-123 step 4: does a planner GET work from the extension background
   * (no UT page origin) or only from a content script?
   *
   * Run this twice: once here (content-script/page context) and once from the
   * service-worker console (chrome://extensions → service worker → paste).
   * The two results together answer the ticket.
   */
  async function testExecutionContext() {
    const context =
      typeof window !== "undefined" && window.location?.hostname
        ? `page (${window.location.hostname})`
        : "worker/background";

    const page = await get(PLANNER_VIEW);
    const canParse = typeof DOMParser !== "undefined";
    const sawRows = Boolean(page.doc.querySelector('a[href*="action_code=D"]'));

    const result = {
      context,
      status: page.response.status,
      redirected: page.response.redirected,
      finalUrl: page.response.url,
      cookiesRodeAlong: !looksLoggedOut(page),
      domParserAvailable: canParse,
      parsedPlannerRows: sawRows,
    };
    record(`executionContext.${context}`, result);
    return result;
  }

  /** DAP-123 step 5: which signal detects logged-out most cheaply? */
  async function testAuthSignal() {
    const page = await get(HISTORY);
    const signals = {
      "response.redirected": page.response.redirected,
      "!response.ok": !page.response.ok,
      status: page.response.status,
      "response.url": page.response.url,
      "url !== requested": page.response.url !== HISTORY,
      "password input in DOM": Boolean(
        page.doc.querySelector('input[type="password"]'),
      ),
      elapsedMs: Math.round(page.elapsedMs),
      bytes: page.text.length,
    };
    record("auth.signalsWhileLoggedIn", signals);
    log(
      "Now log out (or open an incognito window) and re-run testAuthSignal() " +
        "to see which of these flips. The cheapest one that flips wins.",
    );
    return signals;
  }

  // ------------------------------------------------------------------- timing

  /** Raw history IDs, before the major+percentage dedupe the UI applies. */
  async function rawHistoryIds() {
    const page = await get(HISTORY);
    if (looksLoggedOut(page)) throw new Error("Not logged in — log in first.");

    const ids = [];
    for (const row of page.doc.querySelectorAll("table tbody tr")) {
      const cells = row.querySelectorAll("td");
      if (cells.length < 8) continue;
      const id = cells[6].querySelector("a")?.textContent?.trim();
      if (id) ids.push(id);
    }
    return { ids, elapsedMs: page.elapsedMs };
  }

  /**
   * Pick the audit form. The submit page carries several forms (site search,
   * nav); the first one is not the audit form — that mistake is why the
   * Planned Courses checkbox came up missing on the first run. Prefer the form
   * that owns the run button, then fall back to the one with the most fields.
   */
  function findAuditForm(doc) {
    const forms = [...doc.querySelectorAll("form")];
    if (!forms.length) throw new Error("No form on the audit submit page.");

    // Identify by contents, not by "has a submit button" — UT's site search
    // form also has one, and it sorts first. (That mistake produced
    // `checkboxCandidates: []`: the search form has no checkboxes at all.)
    //
    // The real audit form, confirmed 2026-08-05, carries a checkbox named
    // `planned` and a submit named `audit`. A sibling "test profile" form
    // shares some field names but has NO checkboxes, so requiring the
    // checkbox distinguishes them.
    const byPlannedCheckbox = forms.find((form) =>
      form.querySelector('input[type="checkbox"][name="planned"]'),
    );
    if (byPlannedCheckbox) return byPlannedCheckbox;

    const byAuditSubmit = forms.find((form) =>
      form.querySelector('[name="audit"][type="submit"]'),
    );
    if (byAuditSubmit) return byAuditSubmit;

    // Last resort: the form with the most checkboxes, since the audit form is
    // the only one on the page offering include-options.
    const byCheckboxCount = [...forms].sort(
      (a, b) =>
        b.querySelectorAll('input[type="checkbox"]').length -
        a.querySelectorAll('input[type="checkbox"]').length,
    )[0];
    if (byCheckboxCount?.querySelector('input[type="checkbox"]')) {
      return byCheckboxCount;
    }
    throw new Error(
      "Could not identify the audit form — run poc.dumpAuditForm() and check " +
        "whether UT changed the page.",
    );
  }

  /** Label text associated with a form control, however UT wired it up. */
  function labelFor(input, form) {
    return (
      input.closest("label")?.textContent ??
      (input.id
        ? form.querySelector(`label[for="${input.id}"]`)?.textContent
        : null) ??
      input.closest("td")?.parentElement?.textContent ??
      input.parentElement?.textContent ??
      ""
    );
  }

  /**
   * Diagnostic: dump every form on the audit submit page with its method,
   * action, and fields. Read-only. Run this to identify the Planned Courses
   * checkbox by name when auto-discovery misses it.
   */
  async function dumpAuditForm() {
    const page = await get(NEW_AUDIT);
    if (looksLoggedOut(page)) throw new Error("Not logged in — log in first.");

    const forms = [...page.doc.querySelectorAll("form")].map((form, index) => ({
      index,
      method: (form.getAttribute("method") || "GET").toUpperCase(),
      action: form.getAttribute("action"),
      fieldCount: form.elements.length,
      fields: [...form.elements].map((el) => ({
        name: el.name,
        type: el.type,
        value: el.value,
        checked: el.checked,
        label: labelFor(el, form).replace(/\s+/g, " ").trim().slice(0, 80),
      })),
    }));

    console.log(JSON.stringify(forms, null, 2));
    record("submit.formDump", forms);
    log(
      "Find the Planned Courses checkbox above, then pass its name:\n" +
        '  await poc.timePreview(course, 5, { plannedCheckboxName: "THE_NAME" })',
    );
    return forms;
  }

  /**
   * The default-degree "Run Audit" form — what UT's `.run_button` submits and
   * what the extension's background controller clicks (DAP-105).
   *
   * Found 2026-08-16 via dumpAuditForm(): form index 1 of 3, POST to
   * `/apps/degree/audits/requests/test_profile_button/`, all-hidden fields:
   * csrfmiddlewaretoken, student_eid, degree_plan, catalog, minor,
   * effective_ccyys, incl_current_crswk ("Y"), incl_future_crswk ("Y"),
   * incl_planned_crswk (" " = off). The visible `current/future/planned`
   * checkboxes belong to the *custom* audit form and only drive UI; posting
   * that form with its empty catalog/college/degree_plan selects makes UT
   * re-render it (200, no redirect) and queue nothing — which is why the first
   * timing runs never saw a new audit ID.
   */
  function findDefaultAuditForm(doc) {
    return [...doc.querySelectorAll("form")].find(
      (form) =>
        /test_profile_button/.test(form.getAttribute("action") ?? "") ||
        form.querySelector('[name="incl_planned_crswk"]'),
    );
  }

  /**
   * Submit a planned-inclusive audit for the student's default degree plan by
   * posting the same form UT's Run Audit button posts, with
   * `incl_planned_crswk=Y`. Returns when the submit response comes back —
   * generation continues server-side, so the caller polls history for the new
   * raw ID. On success UT redirects to `history/?submit_success=Y`; that's
   * recorded so a silent rejection (200, still on the submit page) is visible.
   */
  async function submitPlannedAudit({ plannedCheckboxName = "planned" } = {}) {
    const page = await get(NEW_AUDIT);
    if (looksLoggedOut(page)) throw new Error("Not logged in — log in first.");

    const defaultForm = findDefaultAuditForm(page.doc);
    if (defaultForm) {
      const params = new URLSearchParams();
      for (const el of defaultForm.elements) {
        if (!el.name || el.disabled) continue;
        params.append(el.name, el.value ?? "");
      }
      params.set("incl_planned_crswk", "Y");
      record("submit.form", "test_profile_button (default degree)");
      record("submit.plannedField", "incl_planned_crswk=Y");

      const action = new URL(
        defaultForm.getAttribute("action") || "",
        NEW_AUDIT,
      );
      const csrf = params.get("csrfmiddlewaretoken");
      const startedAt = now();
      const response = await fetch(action.toString(), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ...(csrf ? { "X-CSRFToken": csrf } : {}),
        },
        body: params,
      });
      const text = await response.text();
      const elapsedMs = now() - startedAt;

      if (response.status === 403 || /CSRF/i.test(text.slice(0, 2000))) {
        record("submit.csrfRejected", true);
        throw new Error(
          `Audit submit rejected (${response.status}) — likely CSRF. Run this ` +
            "from a console on the UT audit page itself so the Referer matches.",
        );
      }
      // Observed 2026-08-16: a successful post redirects to
      // `/apps/degree/audits/requests/history/` (no `submit_success=Y` on this
      // path). A silent rejection stays on the submit page instead.
      const accepted =
        response.redirected && /\/history\/?(\?|$)/.test(response.url);
      record("submit.acceptedRedirect", accepted);
      record("submit.landedOn", response.url);
      if (!accepted) {
        warn(
          "Submit did not redirect to a history page — UT probably rejected " +
            "it silently. Response landed on:",
          response.url,
        );
      }
      return {
        elapsedMs,
        status: response.status,
        method: "POST",
        submittedUrl: response.url,
        accepted,
      };
    }

    // Fallback (pre-2026-08-16 path): drive the custom audit form's checkbox.
    // Kept only so the harness still reports *something* if UT removes the
    // default-degree button; expect it to be rejected unless the catalog/
    // college/degree_plan selects are filled in.
    warn("default-degree form not found — falling back to custom audit form");
    const form = findAuditForm(page.doc);
    const method = (form.getAttribute("method") || "GET").toUpperCase();

    const params = new URLSearchParams();
    for (const el of form.elements) {
      if (!el.name || el.disabled) continue;
      if (el.type === "checkbox" || el.type === "radio") {
        if (el.checked) params.append(el.name, el.value || "on");
        continue;
      }
      // Named submit buttons are how Django tells which action fired, so the
      // form's own submit must be included — UT's is `audit=Submit Audit`.
      if (el.type === "submit") {
        if (el.name) params.append(el.name, el.value ?? "");
        continue;
      }
      if (el.type === "button") continue;
      params.append(el.name, el.value ?? "");
    }

    // The Planned Courses checkbox is unchecked by default; our runs must
    // always set it. Match by name first (UT calls it `planned`), then fall
    // back to label text for resilience if UT renames it.
    const checkboxes = [...form.querySelectorAll('input[type="checkbox"]')];
    const plannedInput =
      checkboxes.find((input) => input.name === plannedCheckboxName) ??
      checkboxes.find((input) => /planned/i.test(labelFor(input, form)));

    if (!plannedInput) {
      record("submit.plannedCheckboxFound", false);
      record(
        "submit.checkboxCandidates",
        checkboxes.map((input) => ({
          name: input.name,
          value: input.value,
          label: labelFor(input, form).replace(/\s+/g, " ").trim().slice(0, 80),
        })),
      );
      // Without the checkbox the run excludes planned courses, so the timing
      // would measure the wrong thing entirely. Refuse rather than mislead.
      throw new Error(
        "Planned Courses checkbox not found — run `await poc.dumpAuditForm()`, " +
          "then pass { plannedCheckboxName } to timePreview().",
      );
    }

    record("submit.plannedCheckboxFound", true);
    record("submit.plannedCheckboxName", plannedInput.name);
    record("submit.formMethod", method);
    // value="X" on UT's checkboxes — send exactly that, not "on".
    params.set(plannedInput.name, plannedInput.value || "on");

    // action="" means "post to this same URL", which `new URL("", base)`
    // already resolves correctly.
    const action = new URL(form.getAttribute("action") || "", NEW_AUDIT);

    const startedAt = now();
    let response;
    if (method === "GET") {
      action.search = params.toString();
      response = await fetch(action.toString(), { credentials: "include" });
    } else {
      // Django checks the CSRF token in a header as well as the body, and
      // rejects POSTs whose Referer doesn't match over HTTPS.
      const csrf = params.get("csrfmiddlewaretoken");
      response = await fetch(action.toString(), {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ...(csrf ? { "X-CSRFToken": csrf } : {}),
        },
        body: params,
      });
    }
    const text = await response.text();

    // A Django CSRF rejection comes back as 403 with an explanatory page, not
    // as a network error — surface it instead of silently polling for an
    // audit that was never queued.
    if (response.status === 403 || /CSRF/i.test(text.slice(0, 2000))) {
      record("submit.csrfRejected", true);
      throw new Error(
        `Audit submit rejected (${response.status}) — likely CSRF. Run this ` +
          "from a console on the UT audit page itself so the Referer matches.",
      );
    }
    return {
      elapsedMs: now() - startedAt,
      status: response.status,
      method,
      submittedUrl: response.url,
    };
  }

  /** Poll raw history until an ID appears that wasn't in `before`. */
  async function pollForNewAuditId(before, { windowMs = 90_000 } = {}) {
    const known = new Set(before);
    const startedAt = now();
    const deadline = startedAt + windowMs;

    while (now() < deadline) {
      const { ids } = await rawHistoryIds();
      const fresh = ids.find((id) => !known.has(id));
      if (fresh) return { auditId: fresh, elapsedMs: now() - startedAt };
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(`No new audit ID within ${windowMs}ms`);
  }

  async function scrapeAudit(auditId) {
    const startedAt = now();
    const page = await get(`${BASE}/results/${auditId}/`);
    if (looksLoggedOut(page)) throw new Error("Session died mid-scrape.");
    return {
      elapsedMs: now() - startedAt,
      // Rough proof the page really is an audit, without importing the parser.
      requirementRows: page.doc.querySelectorAll("tr").length,
    };
  }

  /**
   * DAP-124: one full preview round trip, per-stage. Adds the course, runs a
   * planned-inclusive audit, polls for the new raw ID, scrapes it, then
   * deletes the course again so the planner is left as found.
   */
  async function timeOnePreview(course, { plannedCheckboxName } = {}) {
    const t = {};
    const total = now();

    // Snapshot first: cleanup below must only ever touch rows THIS run created.
    // Matching by course number alone would delete a pre-existing row for the
    // same course, which the ticket explicitly forbids.
    const before = await readPlanner();
    const beforeKeys = new Set(before.map(rowKey));
    let created = [];

    try {
      const resolveStart = now();
      const { href } = await resolveAddLink(course);
      t.resolveMs = now() - resolveStart;

      const addStart = now();
      await followAddLink(href);
      const rows = await readPlanner();
      t.addMs = now() - addStart;

      created = rows.filter((row) => !beforeKeys.has(rowKey(row)));
      // Track immediately: if a later stage throws, cleanup() must still know
      // about this row. (Before this, a submit failure leaked a row per run.)
      state.added.push(...created);
      if (created.length !== 1) {
        warn(`expected exactly 1 new row, got ${created.length}`, created);
      }

      const beforeIds = (await rawHistoryIds()).ids;

      const submit = await submitPlannedAudit({ plannedCheckboxName });
      t.submitMs = submit.elapsedMs;

      const polled = await pollForNewAuditId(beforeIds);
      t.generateMs = polled.elapsedMs;

      const scraped = await scrapeAudit(polled.auditId);
      t.scrapeMs = scraped.elapsedMs;

      t.auditId = polled.auditId;
      t.requirementRows = scraped.requirementRows;
      t.totalMs = now() - total;
      state.timings.push(t);
      log("round trip", t);
      return t;
    } finally {
      // Always undo this run's planner write, however the round trip ended.
      // A failed run that leaves rows behind poisons every later measurement
      // and the planner itself.
      if (created.length === 1) {
        const added = created[0];
        const deleteStart = now();
        try {
          await get(
            `${PLANNER_VIEW}?key_course_id=${encodeURIComponent(added.key_course_id)}` +
              `&key_course_ccyys=${encodeURIComponent(added.key_course_ccyys)}` +
              `&key_course_seq=${encodeURIComponent(added.key_course_seq)}` +
              `&action_code=D`,
          );
          t.deleteMs = now() - deleteStart;

          const after = await readPlanner();
          if (after.some((row) => rowKey(row) === rowKey(added))) {
            warn("planner not restored — row survived delete", added);
          } else {
            state.added = state.added.filter(
              (row) => rowKey(row) !== rowKey(added),
            );
          }
        } catch (error) {
          warn("cleanup delete failed — run poc.cleanup()", error);
        }
      }
    }
  }

  /** Run N round trips back to back and print the p50/p95 table. */
  async function timePreview(course, runs = 5, options = {}) {
    let consecutiveFailures = 0;
    for (let i = 0; i < runs; i++) {
      log(`--- round trip ${i + 1}/${runs}`);
      try {
        await timeOnePreview(course, options);
        consecutiveFailures = 0;
      } catch (error) {
        warn(`round trip ${i + 1} failed:`, error);
        // Every run mutates the real planner and UT's audit log. If the first
        // two fail the same way, the rest will too — stop instead of grinding
        // through five identical failures (that's what produced an empty
        // timing table and a planner full of leftover rows).
        if (++consecutiveFailures >= 2) {
          warn(`stopping after ${consecutiveFailures} consecutive failures`);
          break;
        }
      }
    }
    return timingTable();
  }

  function percentile(values, p) {
    if (!values.length) return NaN;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(
      sorted.length - 1,
      Math.ceil((p / 100) * sorted.length) - 1,
    );
    return Math.round(sorted[index]);
  }

  function timingTable() {
    const stages = [
      "resolveMs",
      "addMs",
      "submitMs",
      "generateMs",
      "scrapeMs",
      "deleteMs",
      "totalMs",
    ];
    const table = {};
    for (const stage of stages) {
      const values = state.timings
        .map((t) => t[stage])
        .filter((v) => typeof v === "number");
      if (!values.length) continue;
      table[stage] = {
        n: values.length,
        p50: percentile(values, 50),
        p95: percentile(values, 95),
        min: Math.round(Math.min(...values)),
        max: Math.round(Math.max(...values)),
      };
    }
    console.table(table);

    const p95Total = table.totalMs?.p95;
    if (p95Total > 15_000) {
      warn(
        `p95 total ${p95Total}ms exceeds the 15s threshold — flag DAP-114; ` +
          "this reopens the eager-verify decision.",
      );
    }
    record("timing.table", table);
    return table;
  }

  // ------------------------------------------------------------------ cleanup

  const rowKey = (row) =>
    `${row.key_course_id}|${row.key_course_ccyys}|${row.key_course_seq}`;

  /** Delete every row this session added. Per-row only; never action_code=A. */
  async function cleanup() {
    if (!state.added.length) {
      log("nothing to clean up");
      return [];
    }
    const results = [];
    for (const row of [...state.added]) {
      try {
        results.push(await testDelete(row));
      } catch (error) {
        warn("cleanup failed for", row, error);
      }
    }
    const remaining = await readPlanner();
    log(`cleanup done — planner now has ${remaining.length} row(s)`);
    return results;
  }

  /**
   * Wipe every row via per-row deletes, after snapshotting what was there.
   *
   * Deliberately NOT `action_code=A`. Same end state, but UT's Delete All is a
   * single irreversible call with no record of what it removed; this loop
   * prints a restorable snapshot first and reports exactly which rows resisted
   * deletion. UT has no undo, so the snapshot is the only way back.
   *
   * Requires an explicit confirmation string so a stray paste can't fire it:
   *   await poc.deleteAllCourses("DELETE ALL")
   */
  async function deleteAllCourses(confirmation) {
    if (confirmation !== "DELETE ALL") {
      throw new Error(
        'Refusing: call poc.deleteAllCourses("DELETE ALL") to confirm. ' +
          "This removes every planner row, including ones you added by hand.",
      );
    }

    const before = await readPlanner();
    if (!before.length) {
      log("planner is already empty");
      return { deleted: [], failed: [], snapshot: [] };
    }

    // Print the restore list BEFORE touching anything — if a delete misfires,
    // this console output is the only record of what the planner held.
    const snapshot = before.map((row) => ({
      key_course_id: row.key_course_id,
      key_course_ccyys: row.key_course_ccyys,
      key_course_seq: row.key_course_seq,
      rowText: row.rowText,
    }));
    warn(
      `About to delete ${before.length} row(s). SNAPSHOT (save this to re-add ` +
        "them — UT has no undo):",
    );
    console.log(JSON.stringify(snapshot, null, 2));
    record("deleteAll.snapshot", snapshot);

    const deleted = [];
    const failed = [];
    for (const row of before) {
      try {
        const { targetGone } = await testDelete(row);
        (targetGone ? deleted : failed).push(row);
      } catch (error) {
        warn("delete failed for", row, error);
        failed.push(row);
      }
    }

    const after = await readPlanner();
    record("deleteAll.result", {
      requested: before.length,
      deleted: deleted.length,
      failed: failed.length,
      remaining: after.length,
    });
    if (failed.length) {
      warn(`${failed.length} row(s) could not be deleted:`, failed);
    }
    log(`delete-all done — ${deleted.length} removed, ${after.length} remain`);
    return { deleted, failed, snapshot };
  }

  /**
   * Re-add courses from a deleteAllCourses() snapshot. Best-effort recovery:
   * seq numbers are UT-assigned, so restored rows get new ones, and the
   * original term must still be open. Parses course id back into dept + number
   * (`C S324E` → dept `C S`, num `324E`).
   */
  async function restoreFromSnapshot(snapshot) {
    if (!Array.isArray(snapshot) || !snapshot.length) {
      throw new Error("Pass the snapshot array printed by deleteAllCourses().");
    }

    const restored = [];
    const failed = [];
    for (const entry of snapshot) {
      // Course numbers start at the first digit; everything before is the dept.
      const match = entry.key_course_id.match(/^(.*?)(\d.*)$/);
      if (!match) {
        failed.push({ entry, reason: "could not split dept/number" });
        continue;
      }
      const [, dept, num] = match;
      try {
        const { href } = await resolveAddLink({
          dept: dept.trim(),
          num,
          ccyys: entry.key_course_ccyys,
        });
        await followAddLink(href);
        restored.push(`${dept.trim()} ${num}`);
      } catch (error) {
        failed.push({ entry, reason: error.message });
      }
    }

    const after = await readPlanner();
    log(`restore: ${restored.length} re-added, ${failed.length} failed`);
    if (failed.length) warn("could not restore:", failed);
    return { restored, failed, rows: after };
  }

  function report() {
    log("=== DAP-115 findings ===");
    console.log(JSON.stringify(state.findings, null, 2));
    if (state.timings.length) timingTable();
    if (state.added.length) {
      warn(
        `${state.added.length} row(s) still in the planner from this session — ` +
          "run poc.cleanup()",
      );
    }
    return state.findings;
  }

  globalThis.poc = {
    state,
    readPlanner,
    resolveAddLink,
    testAdd,
    testIdempotency,
    testParallelAdd,
    testDelete,
    discoverModify,
    testExecutionContext,
    testAuthSignal,
    rawHistoryIds,
    dumpAuditForm,
    submitPlannedAudit,
    timeOnePreview,
    timePreview,
    timingTable,
    cleanup,
    deleteAllCourses,
    restoreFromSnapshot,
    report,
  };

  log(
    "ready — see scripts/spike/RUNBOOK.md. Start with: await poc.readPlanner()",
  );
})();
