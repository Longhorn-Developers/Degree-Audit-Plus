import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import { PlannerError } from "../../domain/planner";
import { fetchPlannedCourses } from "../../features/audit-scraping/planner-client";

const PLANNER_HTML = `
  <h2>Student Planner</h2>
  <table><tbody>
    <tr>
      <td>Spring 2027</td><td>ARA601C</td><td>INTENSIVE ARABIC I</td><td>Planned residence</td>
      <td><a href="/apps/degree/audits/planner/view_planner/?key_course_id=ARA601C&amp;key_course_ccyys=20272&amp;key_course_seq=999&amp;action_code=D">Delete</a></td>
    </tr>
  </tbody></table>`;

const LOGIN_HTML = `<form action="/login/"><input type="password"></form>`;

type FetchStub = (url: string, init?: RequestInit) => Promise<Response>;

const originalFetch = globalThis.fetch;
const originalDOMParser = globalThis.DOMParser;
let requests: { url: string; init?: RequestInit }[] = [];

function stubFetch(handler: FetchStub): void {
  globalThis.fetch = ((url: string, init?: RequestInit) => {
    requests.push({ url, init });
    return handler(url, init);
  }) as typeof fetch;
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, { status });
}

function opaqueRedirect(): Response {
  const response = new Response(null, { status: 200 });
  Object.defineProperty(response, "type", { value: "opaqueredirect" });
  Object.defineProperty(response, "status", { value: 0 });
  Object.defineProperty(response, "ok", { value: false });
  return response;
}

beforeEach(() => {
  requests = [];
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

describe("fetchPlannedCourses", () => {
  test("fetches View Courses with credentials and without following redirects", async () => {
    stubFetch(async () => htmlResponse(PLANNER_HTML));

    const rows = await fetchPlannedCourses();

    expect(rows).toHaveLength(1);
    expect(rows[0].key).toEqual({
      courseId: "ARA601C",
      ccyys: "20272",
      seq: "999",
    });
    expect(requests).toEqual([
      {
        url: "https://utdirect.utexas.edu/apps/degree/audits/planner/view_planner/",
        init: { credentials: "include", redirect: "manual" },
      },
    ]);
  });

  test("reports AUTH_REQUIRED when UT's SSO redirects the request", async () => {
    stubFetch(async () => opaqueRedirect());
    await expectPlannerError(fetchPlannedCourses(), "AUTH_REQUIRED");
  });

  test("reports AUTH_REQUIRED when UT serves a login page directly", async () => {
    stubFetch(async () => htmlResponse(LOGIN_HTML));
    await expectPlannerError(fetchPlannedCourses(), "AUTH_REQUIRED");
  });

  test("reports PLANNER_FETCH_FAILED on a server error", async () => {
    stubFetch(async () => htmlResponse("Server Error", 500));
    await expectPlannerError(fetchPlannedCourses(), "PLANNER_FETCH_FAILED");
  });

  test("reports PLANNER_FETCH_FAILED when the network request throws", async () => {
    stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expectPlannerError(fetchPlannedCourses(), "PLANNER_FETCH_FAILED");
  });

  test("reports PLANNER_PAGE_CHANGED when the markup drifts", async () => {
    stubFetch(async () => htmlResponse("<h2>Degree Audits</h2>"));
    await expectPlannerError(fetchPlannedCourses(), "PLANNER_PAGE_CHANGED");
  });
});
