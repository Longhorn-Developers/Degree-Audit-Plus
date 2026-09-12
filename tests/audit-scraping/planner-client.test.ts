import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import { PlannerError, type PlannerAddLink } from "../../domain/planner";
import {
  addCourse,
  deleteCourse,
  fetchPlannedCourses,
  modifyCourse,
  resolveCourse,
  syncPlannerTo,
} from "../../features/audit-scraping/planner-client";

const PLANNER_BASE = "https://utdirect.utexas.edu/apps/degree/audits/planner/";
const VIEW_URL = `${PLANNER_BASE}view_planner/`;

interface RowSpec {
  courseId: string;
  ccyys: string;
  seq: string;
  expired?: boolean;
}

const ARA: RowSpec = { courseId: "ARA601C", ccyys: "20272", seq: "999" };
const M110: RowSpec = { courseId: "M  110C", ccyys: "20272", seq: "998" };
const ARA_FALL: RowSpec = { courseId: "ARA601C", ccyys: "20279", seq: "999" };

function plannerHtml(rows: RowSpec[]): string {
  const body = rows
    .map(
      ({ courseId, ccyys, seq, expired }) => `
      <tr>
        <td></td><td>${expired ? `(${courseId})` : courseId}</td><td>TITLE</td><td>Planned residence</td>
        <td>
          <a href="/apps/degree/audits/planner/view_planner/?key_course_id=${courseId}&amp;key_course_ccyys=${ccyys}&amp;key_course_seq=${seq}&amp;action_code=D">Delete</a>
          <a href="/apps/degree/audits/planner/modify_planned_course/?key_course_id=${courseId}&amp;key_course_ccyys=${ccyys}&amp;key_course_seq=${seq}&amp;key_course_type=1&amp;action_code=M">Modify</a>
        </td>
      </tr>`,
    )
    .join("");
  return `<h2>Student Planner</h2><table><tbody>${body}</tbody></table>`;
}

function listingHtml(
  courses: { dpt: string; num: string; topic?: string }[],
  nextHref?: string,
) {
  const next = nextHref ? `<p><a href="${nextHref}">Next courses</a></p>` : "";
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
  return `<h2>Student Planner</h2><table><tbody>${body}</tbody></table>${next}`;
}

const LOGIN_HTML = `<form action="/login/"><input type="password"></form>`;

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

type Step = (url: string) => Response | Promise<Response>;

const originalFetch = globalThis.fetch;
const originalDOMParser = globalThis.DOMParser;
let requests: { url: string; init?: RequestInit }[] = [];
let script: Step[] = [];

// each planner call is scripted in order, an unexpected extra call fails loudly
function scriptFetch(steps: Step[]): void {
  script = [...steps];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    requests.push({ url, init });
    const step = script.shift();
    if (!step) throw new Error(`unexpected fetch: ${url}`);
    return step(url);
  }) as typeof fetch;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(() => {
  requests = [];
  globalThis.DOMParser = new JSDOM("").window.DOMParser;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.DOMParser = originalDOMParser;
  expect(script).toHaveLength(0);
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

const ARA_LINK: PlannerAddLink = {
  href: `${PLANNER_BASE}ut_course/?page=4&course_ccyys=20272&course_pass_fail=&course_type=1&dpt=ARA&course_num=601C&course_topic_id=`,
  department: "ARA",
  number: "601C",
  ccyys: "20272",
  topicId: null,
  code: "ARA 601C",
  title: "INTENSIVE ARABIC I",
};

describe("fetchPlannedCourses", () => {
  test("fetches View Courses with credentials and without following redirects", async () => {
    scriptFetch([() => html(plannerHtml([ARA]))]);

    const rows = await fetchPlannedCourses();

    expect(rows).toHaveLength(1);
    expect(rows[0].key).toEqual(ARA);
    expect(requests).toEqual([
      { url: VIEW_URL, init: { credentials: "include", redirect: "manual" } },
    ]);
  });

  test("reports AUTH_REQUIRED when UT's SSO redirects the request", async () => {
    scriptFetch([() => opaqueRedirect()]);
    await expectPlannerError(fetchPlannedCourses(), "AUTH_REQUIRED");
  });

  test("reports AUTH_REQUIRED when UT serves a login page directly", async () => {
    scriptFetch([() => html(LOGIN_HTML)]);
    await expectPlannerError(fetchPlannedCourses(), "AUTH_REQUIRED");
  });

  test("reports PLANNER_FETCH_FAILED on a server error", async () => {
    scriptFetch([() => html("Server Error", 500)]);
    await expectPlannerError(fetchPlannedCourses(), "PLANNER_FETCH_FAILED");
  });

  test("reports PLANNER_FETCH_FAILED when the network request throws", async () => {
    scriptFetch([
      () => {
        throw new TypeError("Failed to fetch");
      },
    ]);
    await expectPlannerError(fetchPlannedCourses(), "PLANNER_FETCH_FAILED");
  });

  test("reports PLANNER_PAGE_CHANGED when the markup drifts", async () => {
    scriptFetch([() => html("<h2>Degree Audits</h2>")]);
    await expectPlannerError(fetchPlannedCourses(), "PLANNER_PAGE_CHANGED");
  });
});

describe("resolveCourse", () => {
  const request = { department: "ARA", number: "601C", ccyys: "20272" };

  test("fetches the page=3 listing for the department and term", async () => {
    scriptFetch([() => html(listingHtml([{ dpt: "ARA", num: "601C" }]))]);

    const result = await resolveCourse(request);

    expect(requests[0].url).toBe(
      `${PLANNER_BASE}ut_course/?page=3&course_ccyys=20272&course_pass_fail=&s_pf=&course_type=1&dpt=ARA&s_lvl=A`,
    );
    expect(result.kind).toBe("resolved");
    if (result.kind === "resolved") {
      expect(result.link.href).toBe(ARA_LINK.href);
    }
  });

  test("matches the course number case-insensitively and ignores other courses", async () => {
    scriptFetch([
      () =>
        html(
          listingHtml([
            { dpt: "ARA", num: "601C" },
            { dpt: "ARA", num: "601D" },
          ]),
        ),
    ]);

    const result = await resolveCourse({ ...request, number: " 601c " });
    expect(result.kind).toBe("resolved");
    if (result.kind === "resolved") expect(result.link.number).toBe("601C");
  });

  test("reports COURSE_NOT_FOUND when the listing has no link for it", async () => {
    scriptFetch([() => html(listingHtml([{ dpt: "ARA", num: "601D" }]))]);
    await expectPlannerError(resolveCourse(request), "COURSE_NOT_FOUND");
  });

  test("follows Next courses links until it finds the course", async () => {
    const nextHref =
      "../ut_course/?page=3&course_ccyys=20272&course_pass_fail=&s_pf=&course_type=1&dpt=ARA&course_num=601C&s_lvl=A";
    scriptFetch([
      () => html(listingHtml([{ dpt: "ARA", num: "601D" }], nextHref)),
      () => html(listingHtml([{ dpt: "ARA", num: "601C" }])),
    ]);

    const result = await resolveCourse(request);

    expect(result.kind).toBe("resolved");
    expect(requests[1].url).toBe(
      `${PLANNER_BASE}ut_course/?page=3&course_ccyys=20272&course_pass_fail=&s_pf=&course_type=1&dpt=ARA&course_num=601C&s_lvl=A`,
    );
  });

  test("reports COURSE_NOT_FOUND after the last page", async () => {
    const nextHref = "../ut_course/?page=3&dpt=ARA&course_num=601D&s_lvl=A";
    scriptFetch([
      () => html(listingHtml([{ dpt: "ARA", num: "601B" }], nextHref)),
      () => html(listingHtml([{ dpt: "ARA", num: "601D" }])),
    ]);
    await expectPlannerError(resolveCourse(request), "COURSE_NOT_FOUND");
    expect(requests).toHaveLength(2);
  });

  test("returns every topic link instead of picking one", async () => {
    scriptFetch([
      () =>
        html(
          listingHtml([
            { dpt: "C S", num: "378", topic: "1" },
            { dpt: "C S", num: "378", topic: "2" },
          ]),
        ),
    ]);

    const result = await resolveCourse({
      department: "C S",
      number: "378",
      ccyys: "20272",
    });
    expect(result.kind).toBe("topics");
    if (result.kind === "topics") {
      expect(result.options.map((o) => o.topicId)).toEqual(["1", "2"]);
    }
  });
});

describe("addCourse", () => {
  test("reads, follows the link, rereads, and returns the new row", async () => {
    scriptFetch([
      () => html(plannerHtml([M110])),
      () => opaqueRedirect(),
      () => html(plannerHtml([ARA, M110])),
    ]);

    const row = await addCourse(ARA_LINK);

    expect(row.key).toEqual(ARA);
    expect(requests.map((r) => r.url)).toEqual([
      VIEW_URL,
      ARA_LINK.href,
      VIEW_URL,
    ]);
    expect(requests[1].init).toEqual({
      credentials: "include",
      redirect: "manual",
    });
  });

  test("refuses to add a course that is already planned for that term", async () => {
    scriptFetch([() => html(plannerHtml([ARA]))]);
    await expectPlannerError(addCourse(ARA_LINK), "DUPLICATE_ROW");
  });

  test("allows the same course in a different term", async () => {
    scriptFetch([
      () => html(plannerHtml([ARA_FALL])),
      () => opaqueRedirect(),
      () => html(plannerHtml([ARA_FALL, ARA])),
    ]);
    const row = await addCourse(ARA_LINK);
    expect(row.key).toEqual(ARA);
  });

  test("reports WRITE_NOT_VERIFIED when the row never lands", async () => {
    scriptFetch([
      () => html(plannerHtml([M110])),
      () => opaqueRedirect(),
      () => html(plannerHtml([M110])),
    ]);
    await expectPlannerError(addCourse(ARA_LINK), "WRITE_NOT_VERIFIED");
  });

  test("reports WRITE_NOT_VERIFIED when UT re-renders the page instead of redirecting", async () => {
    scriptFetch([
      () => html(plannerHtml([M110])),
      () => html(listingHtml([])),
      () => html(plannerHtml([M110])),
    ]);
    await expectPlannerError(addCourse(ARA_LINK), "WRITE_NOT_VERIFIED");
  });

  test("never writes when the session is already dead", async () => {
    scriptFetch([() => opaqueRedirect()]);
    await expectPlannerError(addCourse(ARA_LINK), "AUTH_REQUIRED");
    expect(requests).toHaveLength(1);
  });

  test("reports AUTH_REQUIRED when the write comes back as a login page", async () => {
    scriptFetch([() => html(plannerHtml([M110])), () => html(LOGIN_HTML)]);
    await expectPlannerError(addCourse(ARA_LINK), "AUTH_REQUIRED");
  });
});

describe("deleteCourse", () => {
  test("hits the row's delete URL and confirms only that row is gone", async () => {
    scriptFetch([
      () => html(plannerHtml([ARA, M110])),
      () => html(plannerHtml([M110])),
      () => html(plannerHtml([M110])),
    ]);

    await deleteCourse(ARA);

    expect(requests[1].url).toBe(
      `${VIEW_URL}?key_course_id=ARA601C&key_course_ccyys=20272&key_course_seq=999&action_code=D`,
    );
  });

  test("encodes padded course ids in the delete URL", async () => {
    scriptFetch([
      () => html(plannerHtml([M110])),
      () => html(plannerHtml([])),
      () => html(plannerHtml([])),
    ]);
    await deleteCourse(M110);
    expect(requests[1].url).toContain("key_course_id=M++110C");
  });

  test("reports ROW_NOT_FOUND for a key that is not in the planner", async () => {
    scriptFetch([() => html(plannerHtml([M110]))]);
    await expectPlannerError(deleteCourse(ARA), "ROW_NOT_FOUND");
    expect(requests).toHaveLength(1);
  });

  test("reports WRITE_NOT_VERIFIED when the row is still there", async () => {
    scriptFetch([
      () => html(plannerHtml([ARA])),
      () => html(plannerHtml([ARA])),
      () => html(plannerHtml([ARA])),
    ]);
    await expectPlannerError(deleteCourse(ARA), "WRITE_NOT_VERIFIED");
  });

  test("reports WRITE_NOT_VERIFIED when more than the target row disappeared", async () => {
    scriptFetch([
      () => html(plannerHtml([ARA, M110])),
      () => html(plannerHtml([])),
      () => html(plannerHtml([])),
    ]);
    await expectPlannerError(deleteCourse(ARA), "WRITE_NOT_VERIFIED");
  });
});

describe("modifyCourse", () => {
  async function currentRow(spec: RowSpec) {
    scriptFetch([() => html(plannerHtml([spec]))]);
    const [row] = await fetchPlannedCourses();
    requests = [];
    return row;
  }

  test("submits the modify form shape and returns the moved row", async () => {
    const row = await currentRow(ARA);
    scriptFetch([
      () => html(plannerHtml([ARA])),
      () => html(plannerHtml([ARA_FALL])),
      () => html(plannerHtml([ARA_FALL])),
    ]);

    const moved = await modifyCourse(row, {
      semester: "Fall 2027",
      passFail: true,
    });

    expect(moved.key).toEqual(ARA_FALL);
    expect(requests[1].url).toBe(
      `${PLANNER_BASE}modify_planned_course/?action=M&course_type=1&course=601C&fos=ARA&seq=999&key_ccyys=20272&fos=ARA&course=601C&semester=9&year=2027&pass_fail=Y`,
    );
    expect(requests[1].init).toEqual({
      credentials: "include",
      redirect: "follow",
      referrer: `${PLANNER_BASE}modify_planned_course/?key_course_id=ARA601C&key_course_ccyys=20272&key_course_seq=999&key_course_type=1&action_code=M`,
    });
  });

  test("keeps the current term and pass/fail when not asked to change them", async () => {
    const row = await currentRow(M110);
    scriptFetch([
      () => html(plannerHtml([M110])),
      () => html(plannerHtml([M110])),
      () => html(plannerHtml([M110])),
    ]);

    await modifyCourse(row, {});

    const url = new URL(requests[1].url);
    expect(url.searchParams.getAll("fos")).toEqual(["M", "M"]);
    expect(url.searchParams.get("semester")).toBe("2");
    expect(url.searchParams.get("year")).toBe("2027");
    expect(url.searchParams.get("pass_fail")).toBe("N");
  });

  test("always sends pass_fail, as N when turning it off", async () => {
    const row = await currentRow(ARA);
    scriptFetch([
      () => html(plannerHtml([ARA])),
      () => html(plannerHtml([ARA])),
      () => html(plannerHtml([ARA])),
    ]);

    await modifyCourse(row, { passFail: false });

    expect(new URL(requests[1].url).searchParams.get("pass_fail")).toBe("N");
  });

  test("reports WRITE_NOT_VERIFIED when the old row lingers after a term change", async () => {
    const row = await currentRow(ARA);
    scriptFetch([
      () => html(plannerHtml([ARA])),
      () => html(plannerHtml([ARA])),
      () => html(plannerHtml([ARA, ARA_FALL])),
    ]);
    await expectPlannerError(
      modifyCourse(row, { semester: "Fall 2027" }),
      "WRITE_NOT_VERIFIED",
    );
  });

  test("reports ROW_NOT_FOUND when the row is gone before the write", async () => {
    const row = await currentRow(ARA);
    scriptFetch([() => html(plannerHtml([]))]);
    await expectPlannerError(
      modifyCourse(row, { semester: "Fall 2027" }),
      "ROW_NOT_FOUND",
    );
  });
});

describe("syncPlannerTo", () => {
  const ARA_TARGET = { department: "ARA", number: "601C", ccyys: "20272" };
  const ARA_DUP: RowSpec = { ...ARA, seq: "997" };
  const ARA_EXPIRED: RowSpec = { ...ARA, expired: true };

  test("does nothing when the planner already matches", async () => {
    scriptFetch([() => html(plannerHtml([ARA]))]);

    const rows = await syncPlannerTo([ARA_TARGET]);

    expect(rows.map((r) => r.key)).toEqual([ARA]);
    expect(requests).toHaveLength(1);
  });

  test("deletes rows that are not in the target", async () => {
    scriptFetch([
      () => html(plannerHtml([ARA, M110])),
      () => html(plannerHtml([ARA, M110])),
      () => html(plannerHtml([ARA])),
      () => html(plannerHtml([ARA])),
      () => html(plannerHtml([ARA])),
    ]);

    const rows = await syncPlannerTo([ARA_TARGET]);

    expect(rows.map((r) => r.key)).toEqual([ARA]);
    expect(requests[2].url).toContain("key_course_id=M++110C");
    expect(requests[2].url).toContain("action_code=D");
  });

  test("keeps one copy of a duplicated course and deletes the rest", async () => {
    scriptFetch([
      () => html(plannerHtml([ARA, ARA_DUP])),
      () => html(plannerHtml([ARA, ARA_DUP])),
      () => html(plannerHtml([ARA])),
      () => html(plannerHtml([ARA])),
      () => html(plannerHtml([ARA])),
    ]);

    const rows = await syncPlannerTo([ARA_TARGET]);

    expect(rows.map((r) => r.key)).toEqual([ARA]);
    expect(requests[2].url).toContain("key_course_seq=997");
  });

  test("resolves and adds courses that are missing", async () => {
    scriptFetch([
      () => html(plannerHtml([])),
      () => html(listingHtml([{ dpt: "ARA", num: "601C" }])),
      () => html(plannerHtml([])),
      () => opaqueRedirect(),
      () => html(plannerHtml([ARA])),
      () => html(plannerHtml([ARA])),
    ]);

    const rows = await syncPlannerTo([ARA_TARGET]);

    expect(rows.map((r) => r.key)).toEqual([ARA]);
    expect(requests[3].url).toBe(ARA_LINK.href);
  });

  test("picks the add link whose topic matches the target", async () => {
    const CS378: RowSpec = { courseId: "C S378", ccyys: "20272", seq: "999" };
    scriptFetch([
      () => html(plannerHtml([])),
      () =>
        html(
          listingHtml([
            { dpt: "C S", num: "378", topic: "1" },
            { dpt: "C S", num: "378", topic: "2" },
          ]),
        ),
      () => html(plannerHtml([])),
      () => opaqueRedirect(),
      () => html(plannerHtml([CS378])),
      () => html(plannerHtml([CS378])),
    ]);

    await syncPlannerTo([
      { department: "C S", number: "378", ccyys: "20272", topicId: "2" },
    ]);

    expect(requests[3].url).toContain("course_topic_id=2");
  });

  test("reports TOPIC_REQUIRED instead of guessing a topic", async () => {
    scriptFetch([
      () => html(plannerHtml([])),
      () =>
        html(
          listingHtml([
            { dpt: "C S", num: "378", topic: "1" },
            { dpt: "C S", num: "378", topic: "2" },
          ]),
        ),
    ]);

    await expectPlannerError(
      syncPlannerTo([{ department: "C S", number: "378", ccyys: "20272" }]),
      "TOPIC_REQUIRED",
    );
    expect(requests).toHaveLength(2);
  });

  test("leaves an expired row alone when it is in the target", async () => {
    scriptFetch([() => html(plannerHtml([ARA_EXPIRED]))]);

    const rows = await syncPlannerTo([ARA_TARGET]);

    expect(rows[0].expired).toBe(true);
    expect(requests).toHaveLength(1);
  });

  test("stops and reports AUTH_REQUIRED when the session dies mid-run", async () => {
    scriptFetch([() => html(plannerHtml([ARA, M110])), () => opaqueRedirect()]);

    await expectPlannerError(syncPlannerTo([ARA_TARGET]), "AUTH_REQUIRED");
  });

  test("reports WRITE_NOT_VERIFIED when the final planner does not match", async () => {
    scriptFetch([
      () => html(plannerHtml([])),
      () => html(listingHtml([{ dpt: "ARA", num: "601C" }])),
      () => html(plannerHtml([])),
      () => opaqueRedirect(),
      () => html(plannerHtml([ARA])),
      () => html(plannerHtml([ARA, M110])),
    ]);

    await expectPlannerError(syncPlannerTo([ARA_TARGET]), "WRITE_NOT_VERIFIED");
  });

  test("holds the write queue for the whole run", async () => {
    const firstRead = deferred<Response>();
    scriptFetch([
      () => firstRead.promise,
      () => html(plannerHtml([ARA])),
      () => opaqueRedirect(),
      () => html(plannerHtml([ARA, M110])),
    ]);
    const m110Link: PlannerAddLink = {
      ...ARA_LINK,
      department: "M",
      number: "110C",
      href: `${PLANNER_BASE}ut_course/?page=4&dpt=M&course_num=110C`,
    };

    const sync = syncPlannerTo([ARA_TARGET]);
    const add = addCourse(m110Link);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(requests).toHaveLength(1);

    firstRead.resolve(html(plannerHtml([ARA])));
    await sync;
    await add;

    expect(requests.map((r) => r.url)).toEqual([
      VIEW_URL,
      VIEW_URL,
      m110Link.href,
      VIEW_URL,
    ]);
  });
});

describe("write serialization", () => {
  test("a second write waits for the first to finish verifying", async () => {
    const firstWrite = deferred<Response>();
    scriptFetch([
      () => html(plannerHtml([])),
      () => firstWrite.promise,
      () => html(plannerHtml([ARA])),
      () => html(plannerHtml([ARA])),
      () => html(plannerHtml([ARA])),
      () => opaqueRedirect(),
      () => html(plannerHtml([ARA, M110])),
    ]);
    const secondLink: PlannerAddLink = {
      ...ARA_LINK,
      department: "M",
      number: "110C",
      href: `${PLANNER_BASE}ut_course/?page=4&dpt=M&course_num=110C`,
    };

    const first = addCourse(ARA_LINK);
    const second = deleteCourse(M110).catch(() => undefined);
    const third = addCourse(secondLink);
    await new Promise((resolve) => setTimeout(resolve, 0));
    // first add is stuck on its write, nothing else has started
    expect(requests.map((r) => r.url)).toEqual([VIEW_URL, ARA_LINK.href]);

    firstWrite.resolve(opaqueRedirect());
    await first;
    await second;
    await third;

    expect(requests.map((r) => r.url)).toEqual([
      VIEW_URL,
      ARA_LINK.href,
      VIEW_URL,
      VIEW_URL,
      VIEW_URL,
      secondLink.href,
      VIEW_URL,
    ]);
  });
});
