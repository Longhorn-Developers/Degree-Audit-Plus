import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import { PlannerError } from "../../domain/planner";
import {
  createPlannerTabCaller,
  handlePlannerMessage,
  isPlannerMessage,
  type PlannerBridgeDependencies,
} from "../../features/audit-scraping/planner-bridge";

const PLANNER_HTML = `
  <h2>Student Planner</h2>
  <table><tbody><tr>
    <td></td><td>ARA601C</td><td>INTENSIVE ARABIC I</td><td>Planned residence</td>
    <td><a href="/apps/degree/audits/planner/view_planner/?key_course_id=ARA601C&amp;key_course_ccyys=20272&amp;key_course_seq=999&amp;action_code=D">Delete</a></td>
  </tr></tbody></table>`;

const originalFetch = globalThis.fetch;
const originalDOMParser = globalThis.DOMParser;

beforeEach(() => {
  globalThis.DOMParser = new JSDOM("").window.DOMParser;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.DOMParser = originalDOMParser;
});

function stubFetch(respond: () => Response): void {
  globalThis.fetch = (async () => respond()) as unknown as typeof fetch;
}

function opaqueRedirect(): Response {
  const response = new Response(null, { status: 200 });
  Object.defineProperty(response, "type", { value: "opaqueredirect" });
  Object.defineProperty(response, "ok", { value: false });
  return response;
}

describe("isPlannerMessage", () => {
  test("picks out planner messages only", () => {
    expect(isPlannerMessage({ type: "PLANNER_READ" })).toBe(true);
    expect(isPlannerMessage({ type: "GET_SYNC_STATUS" })).toBe(false);
  });
});

describe("handlePlannerMessage (UT tab side)", () => {
  test("wraps client data in an ok result", async () => {
    stubFetch(() => new Response(PLANNER_HTML));

    const result = await handlePlannerMessage({ type: "PLANNER_READ" });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data[0].key.courseId).toBe("ARA601C");
  });

  test("sends back the PlannerError code instead of throwing", async () => {
    stubFetch(() => opaqueRedirect());

    const result = await handlePlannerMessage({ type: "PLANNER_READ" });

    expect(result).toEqual({ ok: false, code: "AUTH_REQUIRED" });
  });

  test("delete answers with null data", async () => {
    stubFetch(() => new Response(PLANNER_HTML));

    const result = await handlePlannerMessage({
      type: "PLANNER_DELETE",
      key: { courseId: "M  110C", ccyys: "20272", seq: "998" },
    });

    expect(result).toEqual({ ok: false, code: "ROW_NOT_FOUND" });
  });
});

describe("createPlannerTabCaller (background side)", () => {
  function deps(overrides: Partial<PlannerBridgeDependencies> = {}) {
    const closed: number[] = [];
    const sent: string[] = [];
    const bridge: PlannerBridgeDependencies = {
      getAuditPageTab: async () => ({ tabId: 7, created: false }),
      sendToTab: async (_tabId, message) => {
        sent.push(message.type);
        return { ok: true, data: [] };
      },
      closeTab: async (tabId) => {
        closed.push(tabId);
      },
      ...overrides,
    };
    return { bridge, closed, sent };
  }

  test("sends the message to the audits tab and returns its data", async () => {
    const { bridge, sent, closed } = deps();
    const call = createPlannerTabCaller(bridge);

    const rows = await call({ type: "PLANNER_READ" });

    expect(rows).toEqual([]);
    expect(sent).toEqual(["PLANNER_READ"]);
    expect(closed).toEqual([]);
  });

  test("closes a tab it had to open, even when the call fails", async () => {
    const { bridge, closed } = deps({
      getAuditPageTab: async () => ({ tabId: 9, created: true }),
      sendToTab: async () => ({ ok: false, code: "AUTH_REQUIRED" }),
    });
    const call = createPlannerTabCaller(bridge);

    const error = await call({ type: "PLANNER_READ" }).catch((e) => e);

    expect(error).toBeInstanceOf(PlannerError);
    expect((error as PlannerError).code).toBe("AUTH_REQUIRED");
    expect(closed).toEqual([9]);
  });

  test("treats no reply from the tab as a fetch failure", async () => {
    const { bridge } = deps({ sendToTab: async () => undefined });
    const call = createPlannerTabCaller(bridge);

    const error = await call({ type: "PLANNER_READ" }).catch((e) => e);

    expect((error as PlannerError).code).toBe("PLANNER_FETCH_FAILED");
  });
});
