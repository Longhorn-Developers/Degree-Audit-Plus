// paste into devtools on any utdirect.utexas.edu planner page
// adds every catalog course (first topic only) to the planner for TERM
(async () => {
  const TERM = "20272";
  const ONLY = ["C S"]; // [] = every department
  const DRY_RUN = false; // true = list what would be added, write nothing
  const CATALOG = {}; // filled in by build-add-all.ts

  const BASE = "https://utdirect.utexas.edu/apps/degree/audits/planner/";
  const report = { added: [], alreadyPlanned: [], notFound: [], failed: [] };
  const log = (...args) => console.log("[add-all]", ...args);

  // main: read planner once, then per department walk the listing and add each course
  const planned = await plannedIds();
  const departments = ONLY.length ? ONLY : Object.keys(CATALOG);
  for (const dept of departments) {
    const links = await listingLinks(dept);
    log(
      `${dept}: ${links.size} courses on ut listing, ${CATALOG[dept].length} in catalog`,
    );
    for (const number of CATALOG[dept]) {
      const code = `${dept} ${number}`;
      const href = links.get(number);
      if (!href) {
        report.notFound.push(code);
        continue;
      }
      if (planned.has(courseId(dept, number))) {
        report.alreadyPlanned.push(code);
        continue;
      }
      if (DRY_RUN) {
        report.added.push(code);
        continue;
      }
      try {
        await addCourse(href);
        report.added.push(code);
        log(`added ${code} (${report.added.length})`);
      } catch (error) {
        report.failed.push(`${code}: ${error.message}`);
        log(`FAILED ${code}: ${error.message}`);
      }
    }
  }

  // reread the planner once so "added" means ut actually saved it
  if (!DRY_RUN) {
    const after = await plannedIds();
    const missing = report.added.filter((c) => !after.has(courseIdFromCode(c)));
    report.failed.push(...missing.map((c) => `${c}: not on planner after add`));
    report.added = report.added.filter((c) => !missing.includes(c));
  }
  log(
    "done",
    Object.fromEntries(Object.entries(report).map(([k, v]) => [k, v.length])),
  );
  log("not found:", report.notFound);
  log("failed:", report.failed);
  window.addAllReport = report;

  // ------------------------------------------------------------ helpers

  // fetch a planner page as a document, stop on a login bounce
  async function fetchPage(url) {
    const response = await fetch(url, {
      credentials: "include",
      redirect: "manual",
    });
    if (response.type === "opaqueredirect")
      throw new Error("logged out, log in and rerun");
    const doc = new DOMParser().parseFromString(
      await response.text(),
      "text/html",
    );
    const isPlanner = [...doc.querySelectorAll("h2")].some(
      (h) => h.textContent.trim() === "Student Planner",
    );
    if (!isPlanner) throw new Error(`not a planner page: ${url}`);
    return doc;
  }

  // planner course ids already in TERM
  async function plannedIds() {
    const doc = await fetchPage(BASE + "view_planner/");
    const ids = new Set();
    for (const a of doc.querySelectorAll('a[href*="action_code=D"]')) {
      const params = new URL(a.getAttribute("href"), BASE).searchParams;
      if (params.get("key_course_ccyys") === TERM)
        ids.add(params.get("key_course_id"));
    }
    return ids;
  }

  // number -> first add link, walking every "Next courses" page of the listing
  async function listingLinks(dept) {
    const params = new URLSearchParams({
      page: "3",
      course_ccyys: TERM,
      course_pass_fail: "",
      s_pf: "",
      course_type: "1",
      dpt: dept,
      s_lvl: "A",
    });
    const links = new Map();
    let url = BASE + "ut_course/?" + params;
    for (let page = 0; url && page < 30; page++) {
      const doc = await fetchPage(url);
      for (const a of doc.querySelectorAll('a[href*="page=4"]')) {
        const href = new URL(a.getAttribute("href"), url).toString();
        const number = new URL(href).searchParams
          .get("course_num")
          .trim()
          .toUpperCase();
        if (!links.has(number)) links.set(number, href);
      }
      const next = [...doc.querySelectorAll('a[href*="page=3"]')].find(
        (a) => a.textContent.trim() === "Next courses",
      );
      url = next ? new URL(next.getAttribute("href"), url).toString() : null;
    }
    return links;
  }

  // following the page=4 link is the add, ut redirects on success
  async function addCourse(href) {
    const response = await fetch(href, {
      credentials: "include",
      redirect: "manual",
    });
    if (response.type !== "opaqueredirect" && !response.ok)
      throw new Error(`http ${response.status}`);
  }

  // ut's key_course_id: department padded to 3 chars + number
  function courseId(dept, number) {
    return dept.padEnd(3) + number;
  }

  function courseIdFromCode(code) {
    const at = code.lastIndexOf(" ");
    return courseId(code.slice(0, at), code.slice(at + 1));
  }
})();
