/**
 * The one link 5.1 never verified: does adding a planner course actually
 * CHANGE the audit result?
 *
 * 5.1 proved the row lands in the planner and that planned-inclusive audits
 * run. It never compared two audits, so "UT applies the planned course to a
 * requirement" is still an assumption. This checks it end to end:
 *
 *   baseline audit (no planned course)
 *     -> add course to planner
 *     -> planned-inclusive audit
 *     -> diff the two results
 *     -> delete the course
 *
 * A real diff proves the feature's premise. An identical pair means UT either
 * ignored the course or applied it somewhere invisible — which 5.4 must handle
 * (the design calls that `unappliedCourses`).
 *
 * Mutates: one planner add + delete, and TWO real audits per run.
 * Requires planner-poc.js loaded first.
 */
(() => {
  const BASE = "https://utdirect.utexas.edu/apps/degree/audits";
  const HISTORY = `${BASE}/submissions/history/`;
  const PLANNER_VIEW = `${BASE}/planner/view_planner/`;
  const PLANNER_LIST = `${BASE}/planner/ut_course/`;
  const NEW_AUDIT = `${BASE}/submissions/student_individual/`;

  const now = () => performance.now();
  const log = (...a) => console.log("%c[effect]", "color:#bf5700", ...a);
  const warn = (...a) => console.warn("%c[effect]", "color:#bf5700", ...a);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function bust(url) {
    const u = new URL(url);
    u.searchParams.set("_poc", String(Math.random()).slice(2));
    return u.toString();
  }

  async function get(url) {
    const r = await fetch(url, {
      credentials: "include",
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    const t = await r.text();
    return { r, text: t, doc: new DOMParser().parseFromString(t, "text/html") };
  }

  function historyRows(doc) {
    const rows = [];
    for (const tr of doc.querySelectorAll("table tbody tr")) {
      const c = tr.querySelectorAll("td");
      if (c.length < 8) continue;
      const a = c[6].querySelector("a");
      rows.push({
        key: [...c]
          .slice(0, 6)
          .map((x) => x.textContent.trim())
          .join("|"),
        auditId: a?.textContent?.trim() ?? null,
        linked: Boolean(a),
      });
    }
    return rows;
  }

  function plannerKeys(doc) {
    const keys = [];
    for (const link of doc.querySelectorAll('a[href*="action_code=D"]')) {
      const p = new URL(link.getAttribute("href"), PLANNER_VIEW).searchParams;
      if (!p.get("key_course_id")) continue;
      keys.push(
        [
          p.get("key_course_id"),
          p.get("key_course_ccyys"),
          p.get("key_course_seq"),
        ].join("|"),
      );
    }
    return keys;
  }

  /** Submit an audit. includePlanned toggles incl_planned_crswk. */
  async function submitAudit(includePlanned) {
    const page = await get(bust(NEW_AUDIT));
    const form = [...page.doc.querySelectorAll("form")].find(
      (f) =>
        /test_profile_button/.test(f.getAttribute("action") ?? "") ||
        f.querySelector('[name="incl_planned_crswk"]'),
    );
    if (!form) throw new Error("default-degree audit form not found");

    const params = new URLSearchParams();
    for (const el of form.elements)
      if (el.name && !el.disabled) params.append(el.name, el.value ?? "");
    // " " (a space) is UT's "off" value for this field.
    params.set("incl_planned_crswk", includePlanned ? "Y" : " ");

    const action = new URL(
      form.getAttribute("action") || "",
      NEW_AUDIT,
    ).toString();
    const csrf = params.get("csrfmiddlewaretoken");
    const r = await fetch(action, {
      method: "POST",
      credentials: "include",
      redirect: "manual",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(csrf ? { "X-CSRFToken": csrf } : {}),
      },
      body: params,
    });
    if (r.type !== "opaqueredirect" && r.status !== 302 && r.status !== 200) {
      throw new Error(`submit rejected: type=${r.type} status=${r.status}`);
    }
    return r;
  }

  async function waitForNewAudit(beforeKeys, { windowMs = 90_000 } = {}) {
    const deadline = now() + windowMs;
    while (now() < deadline) {
      const page = await get(bust(HISTORY));
      const fresh = historyRows(page.doc).find((r) => !beforeKeys.has(r.key));
      if (fresh?.linked) return fresh.auditId;
      await sleep(150);
    }
    throw new Error("no new linked audit within 90 s");
  }

  /**
   * Fingerprint an audit page for comparison. Requirement blocks carry their
   * own status/hours text; we key each by its heading and keep the normalized
   * text so a diff shows WHAT changed, not just that something did.
   */
  /**
   * Course codes as UT writes them. Departments can be multi-word with the
   * separator dropped (`C S324E`, `AFR305`), so the department part is 1-3
   * letter groups, optionally space-separated, immediately before the number.
   * Normalized (spaces stripped, uppercased) so `C S 324E` == `C S324E`.
   */
  const COURSE_RE = /\b([A-Z]{1,3}(?:\s+[A-Z]{1,3})?)\s*(\d{3}[A-Z]?)\b/g;
  const normCourse = (s) => s.replace(/\s+/g, "").toUpperCase();

  function courseCodes(text) {
    const out = new Set();
    for (const m of text.matchAll(COURSE_RE)) out.add(normCourse(m[1] + m[2]));
    return out;
  }

  function fingerprint(doc) {
    const norm = (s) => (s ?? "").replace(/\s+/g, " ").trim();
    const reqs = new Map();
    // Key a requirement block by something STABLE across runs. Keying by the
    // block's own text breaks the moment the text changes — which is exactly
    // the case we are trying to detect — so key by a leading label and keep
    // the full text as the value to compare.
    let index = 0;
    for (const el of doc.querySelectorAll(
      "[class*='requirement'], [class*='subrequirement'], tr",
    )) {
      const text = norm(el.textContent);
      if (!text || text.length < 12) continue;
      // Leading words up to the first status/number token — stable-ish label.
      const label =
        text.match(/^[A-Za-z ,'&/-]{6,60}/)?.[0].trim() ?? `block-${index}`;
      const key = `${label}#${index++}`;
      reqs.set(key, { text, label });
    }
    // Join cell text with spaces rather than reading body.textContent: that
    // concatenates adjacent cells with no separator ("...completedC S324E"),
    // which makes \b anchor mid-word and yields "S324E" instead of "C S324E".
    const cellText = [...doc.querySelectorAll("td, th, li, p, span, div")]
      .map((el) => norm(el.textContent))
      .filter(Boolean)
      .join(" \n ");
    const body = (cellText || norm(doc.body?.textContent)).slice(0, 400000);
    return {
      reqs,
      courses: courseCodes(body),
      hours: body.match(/\b\d+\.?\d*\s*hours?\b/gi)?.slice(0, 50) ?? [],
      rowCount: doc.querySelectorAll("tr").length,
      bytes: body.length,
    };
  }

  function diff(base, next, courseCode) {
    const addedCourses = [...next.courses].filter((c) => !base.courses.has(c));
    const removedCourses = [...base.courses].filter(
      (c) => !next.courses.has(c),
    );

    // Compare by position AND by label, so a block whose text changed is
    // reported as changed rather than as a new block.
    const changedReqs = [];
    const baseByLabel = new Map();
    for (const v of base.reqs.values()) {
      if (!baseByLabel.has(v.label)) baseByLabel.set(v.label, v);
    }
    for (const [key, v] of next.reqs) {
      const b = base.reqs.get(key) ?? baseByLabel.get(v.label);
      if (!b) {
        changedReqs.push({
          requirement: v.label,
          change: "NEW",
          after: v.text.slice(0, 60),
        });
      } else if (b.text !== v.text) {
        changedReqs.push({
          requirement: v.label,
          before: b.text.slice(0, 60),
          after: v.text.slice(0, 60),
        });
      }
    }

    const target = normCourse(courseCode ?? "");
    const courseAppears = next.courses.has(target);
    const courseWasThereBefore = base.courses.has(target);

    return {
      identical: base.bytes === next.bytes && changedReqs.length === 0,
      rowCountDelta: next.rowCount - base.rowCount,
      byteDelta: next.bytes - base.bytes,
      courseAppearsInPlanned: courseAppears,
      courseWasAlreadyThere: courseWasThereBefore,
      addedCourses,
      removedCourses,
      changedRequirementCount: changedReqs.length,
      changedRequirements: changedReqs.slice(0, 15),
    };
  }

  /**
   * The full test. Pass a course NOT already on your record — one you haven't
   * taken and isn't already planned — or the diff will be empty for the boring
   * reason.
   */
  async function run(course = { dept: "C S", num: "324E", ccyys: "20272" }) {
    if (typeof poc === "undefined")
      throw new Error("Load planner-poc.js first.");
    const code = `${course.dept} ${course.num}`;
    log(`testing whether ${code} changes the audit result…`);

    const plannerBefore = plannerKeys((await get(bust(PLANNER_VIEW))).doc);
    if (plannerBefore.length) {
      warn(
        `planner already has ${plannerBefore.length} row(s). They will be in ` +
          "BOTH audits, so the diff still isolates this course — but a clean " +
          "planner makes the result easier to read.",
      );
    }

    let createdKey = null;
    try {
      // --- 1. baseline: planned courses EXCLUDED --------------------------
      log("1/4 baseline audit (planned excluded)…");
      let hKeys = new Set(
        historyRows((await get(bust(HISTORY))).doc).map((r) => r.key),
      );
      await submitAudit(false);
      const baseId = await waitForNewAudit(hKeys);
      const basePage = await get(bust(`${BASE}/results/${baseId}/`));
      const base = fingerprint(basePage.doc);
      log(
        `   baseline audit ${baseId} — ${base.rowCount} rows, ${base.courses.size} course codes`,
      );

      // --- 2. add the course ----------------------------------------------
      log(`2/4 adding ${code} to the planner…`);
      const { href } = await poc.resolveAddLink(course);
      await fetch(new URL(href, PLANNER_LIST).toString(), {
        credentials: "include",
        redirect: "manual",
      });
      const afterKeys = plannerKeys((await get(bust(PLANNER_VIEW))).doc);
      const created = afterKeys.filter((k) => !plannerBefore.includes(k));
      if (created.length !== 1)
        throw new Error(`expected 1 new planner row, got ${created.length}`);
      createdKey = created[0];
      log(`   planner row created: ${createdKey}`);

      // --- 3. planned-inclusive audit --------------------------------------
      log("3/4 audit with planned courses INCLUDED…");
      hKeys = new Set(
        historyRows((await get(bust(HISTORY))).doc).map((r) => r.key),
      );
      await submitAudit(true);
      const nextId = await waitForNewAudit(hKeys);
      const nextPage = await get(bust(`${BASE}/results/${nextId}/`));
      const next = fingerprint(nextPage.doc);
      log(
        `   planned audit ${nextId} — ${next.rowCount} rows, ${next.courses.size} course codes`,
      );

      // --- 4. diff ----------------------------------------------------------
      log("4/4 diffing…");
      const d = diff(base, next, code);
      console.table([
        {
          baselineAudit: baseId,
          plannedAudit: nextId,
          identical: d.identical,
          rowCountDelta: d.rowCountDelta,
          byteDelta: d.byteDelta,
          courseAppears: d.courseAppearsInPlanned,
          changedRequirements: d.changedRequirementCount,
        },
      ]);
      if (d.addedCourses.length)
        log("course codes added by the planned run:", d.addedCourses);
      if (d.changedRequirements.length) {
        log("requirement blocks that changed:");
        console.table(d.changedRequirements);
      }

      if (d.courseWasAlreadyThere) {
        warn(
          `${code} already appeared in the BASELINE audit — you may have taken ` +
            "it or it was already planned. Pick a different course.",
        );
      } else if (d.courseAppearsInPlanned && d.changedRequirementCount > 0) {
        log(
          `✅ PROVEN: ${code} appears in the planned audit and changed ${d.changedRequirementCount} requirement block(s).`,
        );
      } else if (d.courseAppearsInPlanned) {
        warn(
          `${code} appears in the planned audit but no requirement block changed — it may be listed as unapplied. Inspect ${BASE}/results/${nextId}/`,
        );
      } else if (d.identical) {
        warn(
          `the two audits are IDENTICAL — UT did not apply ${code}. Either the planned flag didn't take, or the course fulfills nothing.`,
        );
      } else {
        warn(
          `audits differ but ${code} is not visible in the planned one — inspect both pages manually.`,
        );
      }
      return { baseId, nextId, diff: d };
    } finally {
      if (createdKey) {
        const [id, ccyys, seq] = createdKey.split("|");
        log("cleaning up the planner row…");
        await get(
          `${PLANNER_VIEW}?key_course_id=${encodeURIComponent(id)}` +
            `&key_course_ccyys=${encodeURIComponent(ccyys)}` +
            `&key_course_seq=${encodeURIComponent(seq)}&action_code=D`,
        );
        const left = plannerKeys((await get(bust(PLANNER_VIEW))).doc);
        if (left.includes(createdKey))
          warn("row survived delete — run poc.cleanup()");
        else log(`planner restored (${left.length} row(s))`);
      }
    }
  }

  globalThis.effect = { run, submitAudit, fingerprint, diff };
  log(
    "ready. Creates TWO audits + one planner add/delete:\n" +
      '  await effect.run({ dept: "C S", num: "324E", ccyys: "20272" });\n' +
      "Pick a course you have NOT taken and is NOT already planned.",
  );
})();
