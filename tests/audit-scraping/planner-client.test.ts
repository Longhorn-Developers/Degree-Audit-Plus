import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import { PlannerError, type PlannerAddLink } from "../../domain/planner";
import {
  addCourse,
  deleteCourse,
  fetchPlannedCourses,
  resolveCourse,
  syncPlannerTo,
} from "../../features/audit-scraping/planner-client";

const PLANNER_BASE = "https://utdirect.utexas.edu/apps/degree/audits/planner/";
const VIEW_URL = `${PLANNER_BASE}view_planner/`;
const LOGIN_HTML = `<form action="/login/"><input type="password"></form>`;

interface Row {
  courseId: string;
  ccyys: string;
  seq: string;
  passFail?: boolean;
}

interface Course {
  dpt: string;
  num: string;
  topic?: string;
}

const ARA: Row = { courseId: "ARA601C", ccyys: "20272", seq: "999" };
const M110: Row = { courseId: "M  110C", ccyys: "20272", seq: "998" };
const ARA_FALL: Row = { ...ARA, ccyys: "20279" };
const ARA_COURSE: Course = { dpt: "ARA", num: "601C" };
const ARA_TARGET = { department: "ARA", number: "601C", ccyys: "20272" };
const CS378_TOPICS: Course[] = [
  { dpt: "C S", num: "378", topic: "1" },
  { dpt: "C S", num: "378", topic: "2" },
];
const CS378_TARGET = { department: "C S", number: "378", ccyys: "20272" };

function plannerHtml(rows: Row[]): string {
  const body = rows
    .map(
      ({ courseId, ccyys, seq, passFail }) => `
      <tr>
        <td></td><td>${courseId}</td><td>TITLE</td>
        <td>Planned residence${passFail ? " taken pass/fail" : ""}</td>
        <td>
          <a href="/apps/degree/audits/planner/view_planner/?key_course_id=${courseId}&amp;key_course_ccyys=${ccyys}&amp;key_course_seq=${seq}&amp;action_code=D">Delete</a>
          <a href="/apps/degree/audits/planner/modify_planned_course/?key_course_id=${courseId}&amp;key_course_ccyys=${ccyys}&amp;key_course_seq=${seq}&amp;key_course_type=1&amp;action_code=M">Modify</a>
        </td>
      </tr>`,
    )
    .join("");
  return `<h2>Student Planner</h2><table><tbody>${body}</tbody></table>`;
}

function listingHtml(courses: Course[], nextHref?: string): string {
  const body = courses
    .map(
      ({ dpt, num, topic = "" }) => `
      <tr>
        <td>${dpt} ${num}</td>
        <td><a href="../ut_course/?page=4&amp;course_ccyys=20272&amp;course_pass_fail=&amp;course_type=1&amp;dpt=${encodeURIComponent(dpt)}&amp;course_num=${num}&amp;course_topic_id=${topic}">TITLE ${num}</a></td>
        <td></td>
      </tr>`,
    )
    .join("");
  const next = nextHref ? `<p><a href="${nextHref}">Next courses</a></p>` : "";
  return `<h2>Student Planner</h2><table><tbody>${body}</tbody></table>${next}`;
}

function html(markup: string, status = 200): Response {
  return new Response(markup, { status });
}

function opaqueRedirect(): Response {
  const response = new Response(null, { status: 200 });
  Object.defineProperty(response, "type", { value: "opaqueredirect" });
  Object.defineProperty(response, "status", { value: 0 });
  Object.defineProperty(response, "ok", { value: false });
  return response;
}

type Request = { url: string; init?: RequestInit };
type Override = (url: string, init?: RequestInit) => Response | undefined;

// an in memory ut planner that answers the same way the real one does
class FakeUT {
  rows: Row[];
  courses: Course[];
  pageSize = Infinity;
  loggedIn = true;
  requests: Request[] = [];
  override: Override = () => undefined;
  private gate: Promise<void> | null = null;

  constructor(rows: Row[] = [], courses: Course[] = []) {
    this.rows = rows.map((row) => ({ ...row }));
    this.courses = courses;
  }

  // the next request waits until release() is called
  pauseNextRequest(): () => void {
    let release!: () => void;
    this.gate = new Promise((resolve) => (release = resolve));
    return release;
  }

  urls(): string[] {
    return this.requests.map((r) => r.url);
  }

  async handle(url: string, init?: RequestInit): Promise<Response> {
    this.requests.push({ url, init });
    if (this.gate) {
      const gate = this.gate;
      this.gate = null;
      await gate;
    }
    const custom = this.override(url, init);
    if (custom) return custom;
    if (!this.loggedIn) return opaqueRedirect();

    const { pathname, searchParams: q } = new URL(url);
    if (pathname.endsWith("/view_planner/")) {
      if (q.get("action_code") === "D") this.delete(q);
      return html(plannerHtml(this.rows));
    }
    if (pathname.endsWith("/ut_course/") && q.get("page") === "3") {
      return html(this.listing(q));
    }
    if (pathname.endsWith("/ut_course/") && q.get("page") === "4") {
      this.add(q);
      return opaqueRedirect();
    }
    throw new Error(`fake UT got an unexpected url: ${url}`);
  }

  private nextSeq(): string {
    if (this.rows.length === 0) return "999";
    return String(Math.min(...this.rows.map((r) => Number(r.seq))) - 1);
  }

  private add(q: URLSearchParams): void {
    const courseId = `${q.get("dpt")!.padEnd(3)}${q.get("course_num")}`;
    this.rows.push({
      courseId,
      ccyys: q.get("course_ccyys")!,
      seq: this.nextSeq(),
    });
  }

  private delete(q: URLSearchParams): void {
    this.rows = this.rows.filter(
      (r) =>
        r.courseId !== q.get("key_course_id") ||
        r.ccyys !== q.get("key_course_ccyys") ||
        r.seq !== q.get("key_course_seq"),
    );
  }

  private listing(q: URLSearchParams): string {
    const forDept = this.courses.filter((c) => c.dpt === q.get("dpt"));
    const start = Number(q.get("start") ?? 0);
    const page = forDept.slice(start, start + this.pageSize);
    const more = start + this.pageSize < forDept.length;
    const nextHref = more
      ? `../ut_course/?page=3&dpt=${encodeURIComponent(q.get("dpt")!)}&s_lvl=A&start=${start + this.pageSize}`
      : undefined;
    return listingHtml(page, nextHref);
  }
}

const originalFetch = globalThis.fetch;
const originalDOMParser = globalThis.DOMParser;
let ut: FakeUT;

function useFakeUT(rows: Row[] = [], courses: Course[] = []): FakeUT {
  ut = new FakeUT(rows, courses);
  globalThis.fetch = ((url: string, init?: RequestInit) =>
    ut.handle(url, init)) as typeof fetch;
  return ut;
}

beforeEach(() => {
  globalThis.DOMParser = new JSDOM("").window.DOMParser;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.DOMParser = originalDOMParser;
});

async function expectPlannerError(
  promise: Promise<unknown>,
  code: PlannerError["code"],
): Promise<void> {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(PlannerError);
  expect((error as PlannerError).code).toBe(code);
}

async function resolvedLink(course = ARA_TARGET): Promise<PlannerAddLink> {
  const result = await resolveCourse(course);
  if (result.kind !== "resolved") throw new Error("expected a resolved link");
  return result.link;
}

describe("fetchPlannedCourses", () => {
  test("fetches View Courses with credentials and without following redirects", async () => {
    useFakeUT([ARA]);

    const rows = await fetchPlannedCourses();

    expect(rows[0].key).toEqual(ARA);
    expect(ut.requests).toEqual([
      { url: VIEW_URL, init: { credentials: "include", redirect: "manual" } },
    ]);
  });

  test("reports AUTH_REQUIRED when UT's SSO redirects the request", async () => {
    useFakeUT().loggedIn = false;
    await expectPlannerError(fetchPlannedCourses(), "AUTH_REQUIRED");
  });

  test("reports AUTH_REQUIRED when UT serves a login page directly", async () => {
    useFakeUT().override = () => html(LOGIN_HTML);
    await expectPlannerError(fetchPlannedCourses(), "AUTH_REQUIRED");
  });

  test("reports PLANNER_FETCH_FAILED on a server error or a dead network", async () => {
    useFakeUT().override = () => html("Server Error", 500);
    await expectPlannerError(fetchPlannedCourses(), "PLANNER_FETCH_FAILED");

    ut.override = () => {
      throw new TypeError("Failed to fetch");
    };
    await expectPlannerError(fetchPlannedCourses(), "PLANNER_FETCH_FAILED");
  });

  test("reports PLANNER_PAGE_CHANGED when the markup drifts", async () => {
    useFakeUT().override = () => html("<h2>Degree Audits</h2>");
    await expectPlannerError(fetchPlannedCourses(), "PLANNER_PAGE_CHANGED");
  });
});

describe("resolveCourse", () => {
  test("fetches the page=3 listing for the department and term", async () => {
    useFakeUT([], [ARA_COURSE]);

    const link = await resolvedLink();

    expect(ut.urls()[0]).toBe(
      `${PLANNER_BASE}ut_course/?page=3&course_ccyys=20272&course_pass_fail=&s_pf=&course_type=1&dpt=ARA&s_lvl=A`,
    );
    expect(link.href).toBe(
      `${PLANNER_BASE}ut_course/?page=4&course_ccyys=20272&course_pass_fail=&course_type=1&dpt=ARA&course_num=601C&course_topic_id=`,
    );
  });

  test("matches the course number case-insensitively and ignores other courses", async () => {
    useFakeUT([], [ARA_COURSE, { dpt: "ARA", num: "601D" }]);
    const link = await resolvedLink({ ...ARA_TARGET, number: " 601c " });
    expect(link.number).toBe("601C");
  });

  test("reports COURSE_NOT_FOUND when the listing has no link for it", async () => {
    useFakeUT([], [{ dpt: "ARA", num: "601D" }]);
    await expectPlannerError(resolveCourse(ARA_TARGET), "COURSE_NOT_FOUND");
  });

  test("follows Next courses links until it finds the course", async () => {
    useFakeUT([], [{ dpt: "ARA", num: "601D" }, ARA_COURSE]).pageSize = 1;

    await resolvedLink();

    expect(ut.urls()).toHaveLength(2);
    expect(ut.urls()[1]).toContain("start=1");
  });

  test("keeps reading pages while the course's topics continue past the page break", async () => {
    useFakeUT(
      [],
      [{ dpt: "C S", num: "377" }, ...CS378_TOPICS, { dpt: "C S", num: "379" }],
    ).pageSize = 2;

    const result = await resolveCourse(CS378_TARGET);

    expect(result.kind).toBe("topics");
    if (result.kind === "topics") {
      expect(result.options.map((o) => o.topicId)).toEqual(["1", "2"]);
    }
    expect(ut.urls()).toHaveLength(2);
  });

  test("reports PLANNER_PAGE_CHANGED when next links never end", async () => {
    let page = 0;
    useFakeUT().override = () =>
      html(
        listingHtml(
          [{ dpt: "ARA", num: "601D" }],
          `../ut_course/?page=3&dpt=ARA&s_lvl=A&p=${page++}`,
        ),
      );

    await expectPlannerError(resolveCourse(ARA_TARGET), "PLANNER_PAGE_CHANGED");
    expect(ut.urls()).toHaveLength(10);
  });

  test("reports COURSE_NOT_FOUND after the last page", async () => {
    useFakeUT(
      [],
      [
        { dpt: "ARA", num: "601B" },
        { dpt: "ARA", num: "601D" },
      ],
    ).pageSize = 1;
    await expectPlannerError(resolveCourse(ARA_TARGET), "COURSE_NOT_FOUND");
    expect(ut.urls()).toHaveLength(2);
  });
});

describe("addCourse", () => {
  test("reads, follows the link, rereads, and returns the new row", async () => {
    useFakeUT([M110], [ARA_COURSE]);
    const link = await resolvedLink();
    ut.requests = [];

    const row = await addCourse(link);

    expect(row.key).toEqual({
      courseId: "ARA601C",
      ccyys: "20272",
      seq: "997",
    });
    expect(ut.rows).toHaveLength(2);
    expect(ut.urls()).toEqual([VIEW_URL, link.href, VIEW_URL]);
    expect(ut.requests[1].init).toEqual({
      credentials: "include",
      redirect: "manual",
    });
  });

  test("refuses to add a course that is already planned for that term", async () => {
    useFakeUT([ARA], [ARA_COURSE]);
    const link = await resolvedLink();

    await expectPlannerError(addCourse(link), "DUPLICATE_ROW");
    expect(ut.rows).toEqual([ARA]);
  });

  test("allows the same course in a different term", async () => {
    useFakeUT([ARA_FALL], [ARA_COURSE]);
    const link = await resolvedLink();

    const row = await addCourse(link);

    expect(row.key.ccyys).toBe("20272");
    expect(ut.rows).toHaveLength(2);
  });

  test("reports WRITE_NOT_VERIFIED when the row never lands", async () => {
    useFakeUT([M110], [ARA_COURSE]);
    const link = await resolvedLink();

    ut.override = (url) => (url === link.href ? opaqueRedirect() : undefined);
    await expectPlannerError(addCourse(link), "WRITE_NOT_VERIFIED");

    // ut re-rendering the form instead of redirecting is a silent reject
    ut.override = (url) =>
      url === link.href ? html(listingHtml([])) : undefined;
    await expectPlannerError(addCourse(link), "WRITE_NOT_VERIFIED");
  });

  test("never writes when the session is already dead", async () => {
    useFakeUT([M110], [ARA_COURSE]);
    const link = await resolvedLink();
    ut.loggedIn = false;

    await expectPlannerError(addCourse(link), "AUTH_REQUIRED");
    expect(ut.urls().at(-1)).toBe(VIEW_URL);
  });
});

describe("deleteCourse", () => {
  test("hits the row's delete URL and confirms only that row is gone", async () => {
    useFakeUT([ARA, M110]);

    await deleteCourse(ARA);

    expect(ut.rows).toEqual([M110]);
    expect(ut.urls()[1]).toBe(
      `${VIEW_URL}?key_course_id=ARA601C&key_course_ccyys=20272&key_course_seq=999&action_code=D`,
    );

    await deleteCourse(M110);

    expect(ut.rows).toEqual([]);
    expect(ut.urls()[4]).toContain("key_course_id=M++110C");
  });

  test("reports ROW_NOT_FOUND for a key that is not in the planner", async () => {
    useFakeUT([M110]);
    await expectPlannerError(deleteCourse(ARA), "ROW_NOT_FOUND");
    expect(ut.urls()).toEqual([VIEW_URL]);
  });

  test("reports WRITE_NOT_VERIFIED when the row is still there", async () => {
    useFakeUT([ARA]).override = (url) =>
      url.includes("action_code=D") ? html(plannerHtml([ARA])) : undefined;
    await expectPlannerError(deleteCourse(ARA), "WRITE_NOT_VERIFIED");
  });

  test("reports WRITE_NOT_VERIFIED when more than the target row disappeared", async () => {
    useFakeUT([ARA, M110]).override = (url) => {
      if (!url.includes("action_code=D")) return undefined;
      ut.rows = [];
      return html(plannerHtml([]));
    };
    await expectPlannerError(deleteCourse(ARA), "WRITE_NOT_VERIFIED");
  });
});

describe("syncPlannerTo", () => {
  test("does nothing when the planner already matches", async () => {
    useFakeUT([ARA]);

    const rows = await syncPlannerTo([ARA_TARGET]);

    expect(rows.map((r) => r.key)).toEqual([ARA]);
    expect(ut.urls()).toEqual([VIEW_URL]);
  });

  test("deletes rows that are not in the target", async () => {
    useFakeUT([ARA, M110]);

    const rows = await syncPlannerTo([ARA_TARGET]);

    expect(rows.map((r) => r.key)).toEqual([ARA]);
    expect(ut.rows).toEqual([ARA]);
  });

  test("keeps one copy of a duplicated course and deletes the rest", async () => {
    useFakeUT([ARA, { ...ARA, seq: "997" }]);

    await syncPlannerTo([ARA_TARGET]);

    expect(ut.rows).toEqual([ARA]);
    expect(ut.urls().find((u) => u.includes("action_code=D"))).toContain(
      "key_course_seq=997",
    );
  });

  test("resolves and adds courses that are missing", async () => {
    useFakeUT([], [ARA_COURSE]);

    const rows = await syncPlannerTo([ARA_TARGET]);

    expect(rows.map((r) => r.key)).toEqual([ARA]);
    expect(ut.rows).toEqual([ARA]);
  });

  test("fetches a department listing once when adding several courses", async () => {
    useFakeUT([], [ARA_COURSE, { dpt: "ARA", num: "601D" }]);

    await syncPlannerTo([
      ARA_TARGET,
      { department: "ARA", number: "601D", ccyys: "20272" },
    ]);

    expect(ut.rows.map((r) => r.courseId)).toEqual(["ARA601C", "ARA601D"]);
    expect(ut.urls().filter((u) => u.includes("page=3"))).toHaveLength(1);
  });

  test("picks the add link whose topic matches the target", async () => {
    useFakeUT([], CS378_TOPICS);

    await syncPlannerTo([{ ...CS378_TARGET, topicId: "2" }]);

    expect(ut.urls().find((u) => u.includes("page=4"))).toContain(
      "course_topic_id=2",
    );
  });

  test("reports TOPIC_REQUIRED instead of guessing a topic", async () => {
    useFakeUT([], CS378_TOPICS);

    await expectPlannerError(syncPlannerTo([CS378_TARGET]), "TOPIC_REQUIRED");
    expect(ut.rows).toEqual([]);
  });

  test("refuses two targets for the same course and term", async () => {
    useFakeUT();
    await expectPlannerError(
      syncPlannerTo([ARA_TARGET, { ...ARA_TARGET, topicId: "2" }]),
      "DUPLICATE_ROW",
    );
    expect(ut.urls()).toEqual([]);
  });

  test("stops and reports AUTH_REQUIRED when the session dies mid-run", async () => {
    useFakeUT([ARA, M110]).override = () => {
      if (ut.requests.length > 1) ut.loggedIn = false;
      return undefined;
    };

    await expectPlannerError(syncPlannerTo([ARA_TARGET]), "AUTH_REQUIRED");
    expect(ut.rows).toEqual([ARA, M110]);
  });

  test("reports WRITE_NOT_VERIFIED when the final planner does not match", async () => {
    useFakeUT([], [ARA_COURSE]).override = (url) => {
      if (url.includes("page=4")) ut.rows.push(M110);
      return undefined;
    };

    await expectPlannerError(syncPlannerTo([ARA_TARGET]), "WRITE_NOT_VERIFIED");
  });

  test("holds the write queue for the whole run", async () => {
    useFakeUT([ARA], [{ dpt: "M", num: "110C" }]);
    const link = await resolvedLink({
      department: "M",
      number: "110C",
      ccyys: "20272",
    });
    ut.requests = [];
    const release = ut.pauseNextRequest();

    const sync = syncPlannerTo([ARA_TARGET]);
    const add = addCourse(link);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(ut.urls()).toEqual([VIEW_URL]);

    release();
    await sync;
    await add;

    expect(ut.urls()).toEqual([VIEW_URL, VIEW_URL, link.href, VIEW_URL]);
  });
});

describe("write serialization", () => {
  test("a second write waits for the first to finish verifying", async () => {
    useFakeUT([], [ARA_COURSE, { dpt: "M", num: "110C" }]);
    const first = await resolvedLink();
    const second = await resolvedLink({
      department: "M",
      number: "110C",
      ccyys: "20272",
    });
    ut.requests = [];
    await fetchPlannedCourses();
    ut.requests = [];
    const release = ut.pauseNextRequest();

    const addFirst = addCourse(first);
    const addSecond = addCourse(second);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(ut.urls()).toEqual([VIEW_URL]);

    release();
    await addFirst;
    await addSecond;

    expect(ut.urls()).toEqual([
      VIEW_URL,
      first.href,
      VIEW_URL,
      VIEW_URL,
      second.href,
      VIEW_URL,
    ]);
    expect(ut.rows.map((r) => r.seq)).toEqual(["999", "998"]);
  });
});
