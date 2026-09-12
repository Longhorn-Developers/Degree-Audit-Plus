// Lets non-UT extension surfaces (popup, degree-audit page, background) drive
// the planner. The actual work happens in a content script on a UT audits tab —
// see planner-client.ts for why it can't run in the service worker.
import {
  sendMessageResponse,
  sendTabMessage,
  type ExtensionMessage,
  type PlannerCourseRef,
  type PlannerRowPayload,
  type PlannerResult,
} from "@/lib/browser/messages";

const UT_AUDITS_URL = "https://utdirect.utexas.edu/apps/degree/audits/";

async function findOrOpenAuditsTab(): Promise<number> {
  const tabs = await browser.tabs.query({
    url: "https://utdirect.utexas.edu/apps/degree/audits/*",
  });
  const existing = tabs.find((tab) => tab.id !== undefined);
  if (existing?.id !== undefined) return existing.id;

  const tab = await browser.tabs.create({ url: UT_AUDITS_URL, active: false });
  if (tab.id === undefined) throw new Error("Failed to open a UT audits tab");

  const tabId = tab.id;
  await new Promise<void>((resolve) => {
    const listener = (
      updatedTabId: number,
      changeInfo: Browser.tabs.OnUpdatedInfo,
    ) => {
      if (updatedTabId !== tabId || changeInfo.status !== "complete") return;
      browser.tabs.onUpdated.removeListener(listener);
      resolve();
    };
    browser.tabs.onUpdated.addListener(listener);
  });
  return tabId;
}

function unwrap<T>(result: PlannerResult<T> | undefined): T {
  if (!result) throw new Error("No response from the UT tab");
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function readPlannerViaTab() {
  const tabId = await findOrOpenAuditsTab();
  return unwrap(await sendTabMessage(tabId, { type: "PLANNER_READ" }));
}

export async function addPlannedCourseViaTab(course: PlannerCourseRef) {
  const tabId = await findOrOpenAuditsTab();
  return unwrap(await sendTabMessage(tabId, { type: "PLANNER_ADD", course }));
}

export async function deletePlannedCourseViaTab(row: PlannerRowPayload) {
  const tabId = await findOrOpenAuditsTab();
  return unwrap(await sendTabMessage(tabId, { type: "PLANNER_DELETE", row }));
}

/**
 * Background-side handler for planner requests from extension pages (the
 * degree-audit page, popup). Those pages are not same-origin with UT, so the
 * work is routed to a UT tab; only the background can find or open one.
 */
export function registerPlannerBridgeHandlers(): void {
  browser.runtime.onMessage.addListener(
    (message: ExtensionMessage, _sender, sendResponse) => {
      if (
        message.type !== "PLANNER_READ_VIA_BG" &&
        message.type !== "PLANNER_ADD_VIA_BG" &&
        message.type !== "PLANNER_DELETE_VIA_BG"
      ) {
        return;
      }

      const work = async () => {
        if (message.type === "PLANNER_READ_VIA_BG") {
          return { ok: true as const, data: await readPlannerViaTab() };
        }
        if (message.type === "PLANNER_ADD_VIA_BG") {
          return {
            ok: true as const,
            data: await addPlannedCourseViaTab(message.course),
          };
        }
        return {
          ok: true as const,
          data: await deletePlannedCourseViaTab(message.row),
        };
      };

      void work().then(
        (result) => sendMessageResponse(message, sendResponse, result),
        (error) =>
          sendMessageResponse(message, sendResponse, {
            ok: false as const,
            error: error instanceof Error ? error.message : String(error),
          }),
      );
      return true;
    },
  );
}
