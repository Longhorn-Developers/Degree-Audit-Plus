import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import type { PlannerAddLink } from "../../domain/course";
import { handlePlannerMessage } from "../../features/audit-scraping/planner-bridge";
import {
  addCourse,
  deleteCourse,
  fetchPlannedCourses,
  parsePlannerListing,
  parsePlannerPage,
  resolveCourse,
  syncPlannerTo,
} from "../../features/audit-scraping/planner-client";

// walks a planner through add, delete, and sync against a fake ut and checks
// every step by parsing the page, plus the two real captures as snapshots

const LISTING_URL =
  "https://utdirect.utexas.edu/apps/degree/audits/planner/ut_course/?page=3&course_ccyys=20272&course_pass_fail=&s_pf=&course_type=1&dpt=ADV&s_lvl=U";

async function loadFixture(name: string): Promise<Document> {
  const fixtureUrl = new URL(`../fixtures/scraping/${name}`, import.meta.url);
  return new JSDOM(await Bun.file(fixtureUrl).text()).window.document;
}

const loadPlannerDocument = () => loadFixture("planner-view-courses.html");
const loadListingDocument = () => loadFixture("planner-course-listing.html");

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
const ARA_COURSE: Course = { dpt: "ARA", num: "601C" };
const ARA_TARGET = { department: "ARA", number: "601C", ccyys: "20272" };

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

async function resolvedLink(course = ARA_TARGET): Promise<PlannerAddLink> {
  const result = await resolveCourse(course);
  if (result.kind !== "resolved") throw new Error("expected a resolved link");
  return result.link;
}

describe("planner flow", () => {
  test("parses the real View Courses and listing captures", async () => {
    expect(parsePlannerPage(await loadPlannerDocument())).toMatchSnapshot();
    expect(
      parsePlannerListing(await loadListingDocument(), LISTING_URL),
    ).toMatchSnapshot();
  });

  test("add, read back, delete, and sync all land in the planner", async () => {
    useFakeUT([], [ARA_COURSE, { dpt: "M", num: "110C" }]);

    expect(await fetchPlannedCourses()).toEqual([]);

    const link = await resolvedLink();
    const added = await addCourse(link);
    expect(added.key).toEqual(ARA);

    const afterAdd = await fetchPlannedCourses();
    expect(afterAdd.map((row) => String(row.code))).toEqual(["ARA 601C"]);
    expect(afterAdd[0].semester).toBe("Spring 2027");

    await deleteCourse(added.key);
    expect(await fetchPlannedCourses()).toEqual([]);

    const synced = await syncPlannerTo([
      ARA_TARGET,
      { department: "M", number: "110C", ccyys: "20272" },
    ]);
    expect(synced.map((row) => row.key.courseId)).toEqual([
      "ARA601C",
      "M  110C",
    ]);

    expect(await syncPlannerTo([])).toEqual([]);
    expect(ut.rows).toEqual([]);
  });

  test("the same flow works through the bridge messages", async () => {
    useFakeUT([], [ARA_COURSE]);

    const resolved = await handlePlannerMessage({
      type: "PLANNER_RESOLVE",
      course: ARA_TARGET,
    });
    if (!resolved.ok || resolved.data.kind !== "resolved") {
      throw new Error("expected a resolved link");
    }

    const added = await handlePlannerMessage({
      type: "PLANNER_ADD",
      link: resolved.data.link,
    });
    expect(added.ok).toBe(true);

    const read = await handlePlannerMessage({ type: "PLANNER_READ" });
    if (!read.ok) throw new Error("expected rows");
    expect(read.data.map((row) => row.key)).toEqual([ARA]);

    const deleted = await handlePlannerMessage({
      type: "PLANNER_DELETE",
      key: ARA,
    });
    expect(deleted).toEqual({ ok: true, data: null });
    expect(ut.rows).toEqual([]);
  });
});
