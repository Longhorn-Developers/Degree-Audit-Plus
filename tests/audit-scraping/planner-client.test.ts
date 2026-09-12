import { afterEach, beforeEach, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import {
  addPlannedCourse,
  deletePlannedCourse,
  PlannerAuthError,
  plannerRowKey,
  readPlanner,
} from "../../features/audit-scraping/planner-client";

const VIEW =
  "https://utdirect.utexas.edu/apps/degree/audits/planner/view_planner/";

function deleteHref(id: string, ccyys = "20272", seq = "1") {
  return `${VIEW}?key_course_id=${id}&key_course_ccyys=${ccyys}&key_course_seq=${seq}&action_code=D`;
}

function plannerHtml(rows: { id: string; text: string; seq?: string }[]) {
  const trs = rows
    .map(
      (r) =>
        `<tr><td>${r.text}</td><td><a href="${deleteHref(r.id, "20272", r.seq ?? "1")}">Delete</a></td></tr>`,
    )
    .join("");
  return `<html><body><table>${trs}</table></body></html>`;
}

function listHtml(links: { num: string; topic?: string }[]) {
  const as = links
    .map(
      (l) =>
        `<a href="/apps/degree/audits/planner/ut_course/?page=4&course_ccyys=20272&dpt=C%20S&course_num=${l.num}&course_topic_id=${l.topic ?? ""}">Add</a>`,
    )
    .join("");
  return `<html><body>${as}</body></html>`;
}

// Queue of responses the stubbed fetch serves, in order.
let queue: { url: string; status?: number; html: string }[] = [];
let requested: string[] = [];

const originalFetch = globalThis.fetch;
const originalDomParser = globalThis.DOMParser;

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.DOMParser = originalDomParser;
});

beforeEach(() => {
  queue = [];
  requested = [];
  const dom = new JSDOM("<html></html>");
  globalThis.DOMParser = dom.window.DOMParser;
  globalThis.fetch = (async (input: string) => {
    requested.push(String(input));
    const next = queue.shift();
    if (!next) throw new Error(`Unexpected fetch: ${input}`);
    return {
      url: next.url,
      status: next.status ?? 200,
      ok: (next.status ?? 200) < 400,
      redirected: false,
      text: async () => next.html,
    } as Response;
  }) as typeof fetch;
});

test("readPlanner parses rows and flags expired terms", async () => {
  queue = [
    {
      url: VIEW,
      html: plannerHtml([
        { id: "AAA", text: "C S 331 Algorithms" },
        { id: "BBB", text: "(C S 429 Computer Organization)" },
      ]),
    },
  ];

  const rows = await readPlanner();

  expect(rows).toHaveLength(2);
  expect(rows[0].keyCourseId).toBe("AAA");
  expect(rows[0].expired).toBe(false);
  expect(rows[1].expired).toBe(true);
});

test("readPlanner rejects an SSO redirect target", async () => {
  queue = [
    { url: "https://idp.utexas.edu/idp/profile/SAML2", html: "<html></html>" },
  ];
  await expect(readPlanner()).rejects.toBeInstanceOf(PlannerAuthError);
});

test("readPlanner rejects a served login form", async () => {
  queue = [
    { url: VIEW, html: '<html><body><input type="password"></body></html>' },
  ];
  await expect(readPlanner()).rejects.toBeInstanceOf(PlannerAuthError);
});

// The spike's "Session died mid-add" bug: add and delete redirect on SUCCESS,
// so a redirect must never be read as a logged-out signal.
test("a redirected add still counts as success", async () => {
  globalThis.fetch = (async (input: string) => {
    requested.push(String(input));
    const next = queue.shift()!;
    return {
      url: next.url,
      status: 200,
      ok: true,
      redirected: true, // UT redirects on a successful write
      text: async () => next.html,
    } as Response;
  }) as typeof fetch;

  queue = [
    { url: "list", html: listHtml([{ num: "331" }]) },
    { url: VIEW, html: plannerHtml([]) },
    { url: VIEW, html: "<html></html>" },
    { url: VIEW, html: plannerHtml([{ id: "NEW", text: "C S 331" }]) },
  ];

  const result = await addPlannedCourse({
    dept: "C S",
    num: "331",
    ccyys: "20272",
  });
  expect(result.row.keyCourseId).toBe("NEW");
});

test("addPlannedCourse follows UT's link verbatim rather than rebuilding it", async () => {
  queue = [
    { url: "list", html: listHtml([{ num: "331", topic: "7" }]) },
    { url: VIEW, html: plannerHtml([]) },
    { url: VIEW, html: "<html></html>" },
    { url: VIEW, html: plannerHtml([{ id: "NEW", text: "C S 331" }]) },
  ];

  await addPlannedCourse({ dept: "C S", num: "331", ccyys: "20272" });

  const addRequest = requested[2];
  expect(addRequest).toContain("page=4");
  expect(addRequest).toContain("course_topic_id=7");
});

test("addPlannedCourse only matches the exact course number", async () => {
  queue = [
    { url: "list", html: listHtml([{ num: "3310" }, { num: "331" }]) },
    { url: VIEW, html: plannerHtml([]) },
    { url: VIEW, html: "<html></html>" },
    { url: VIEW, html: plannerHtml([{ id: "NEW", text: "C S 331" }]) },
  ];

  const result = await addPlannedCourse({
    dept: "C S",
    num: "331",
    ccyys: "20272",
  });
  expect(result.candidateCount).toBe(1);
  expect(requested[2]).toContain("course_num=331&");
});

test("addPlannedCourse reports topic courses instead of silently guessing", async () => {
  queue = [
    {
      url: "list",
      html: listHtml([
        { num: "331", topic: "1" },
        { num: "331", topic: "2" },
      ]),
    },
    { url: VIEW, html: plannerHtml([]) },
    { url: VIEW, html: "<html></html>" },
    { url: VIEW, html: plannerHtml([{ id: "NEW", text: "C S 331" }]) },
  ];

  const result = await addPlannedCourse({
    dept: "C S",
    num: "331",
    ccyys: "20272",
  });
  expect(result.candidateCount).toBe(2);
});

test("addPlannedCourse throws when no row appeared", async () => {
  queue = [
    { url: "list", html: listHtml([{ num: "331" }]) },
    { url: VIEW, html: plannerHtml([]) },
    { url: VIEW, html: "<html></html>" },
    { url: VIEW, html: plannerHtml([]) }, // UT wrote nothing
  ];

  await expect(
    addPlannedCourse({ dept: "C S", num: "331", ccyys: "20272" }),
  ).rejects.toThrow(/exactly one new row/);
});

test("addPlannedCourse throws when the course has no add link", async () => {
  queue = [{ url: "list", html: listHtml([{ num: "429" }]) }];
  await expect(
    addPlannedCourse({ dept: "C S", num: "331", ccyys: "20272" }),
  ).rejects.toThrow(/No add link/);
});

test("deletePlannedCourse confirms the target is gone", async () => {
  const row = {
    keyCourseId: "AAA",
    keyCourseCcyys: "20272",
    keyCourseSeq: "1",
    expired: false,
    rowText: "C S 331",
  };
  queue = [
    { url: VIEW, html: plannerHtml([{ id: "AAA", text: "C S 331" }]) },
    { url: VIEW, html: "<html></html>" },
    { url: VIEW, html: plannerHtml([]) },
  ];

  const result = await deletePlannedCourse(row);
  expect(result.targetGone).toBe(true);
  expect(result.removed).toBe(1);
  expect(requested[1]).toContain("action_code=D");
  // Delete All must never be issued.
  expect(requested.some((r) => r.includes("action_code=A"))).toBe(false);
});

test("deletePlannedCourse reports a delete that did not take", async () => {
  const row = {
    keyCourseId: "AAA",
    keyCourseCcyys: "20272",
    keyCourseSeq: "1",
    expired: false,
    rowText: "C S 331",
  };
  queue = [
    { url: VIEW, html: plannerHtml([{ id: "AAA", text: "C S 331" }]) },
    { url: VIEW, html: "<html></html>" },
    { url: VIEW, html: plannerHtml([{ id: "AAA", text: "C S 331" }]) },
  ];

  const result = await deletePlannedCourse(row);
  expect(result.targetGone).toBe(false);
  expect(result.removed).toBe(0);
});

test("plannerRowKey distinguishes same course in different terms", () => {
  const base = {
    keyCourseId: "AAA",
    keyCourseSeq: "1",
    expired: false,
    rowText: "",
  };
  expect(plannerRowKey({ ...base, keyCourseCcyys: "20272" })).not.toBe(
    plannerRowKey({ ...base, keyCourseCcyys: "20279" }),
  );
});
