// the planner client only works from a ut tab, this is how everything else
// reaches it: ui -> background -> ut tab -> planner-client
import { PlannerError } from "@/domain/planner";
import {
  sendMessageResponse,
  type ExtensionMessage,
  type PlannerData,
  type PlannerMessage,
  type PlannerResult,
} from "@/lib/browser/messages";
import {
  addCourse,
  deleteCourse,
  fetchPlannedCourses,
  resolveCourse,
  syncPlannerTo,
} from "./planner-client";

type PlannerResponse<M extends PlannerMessage> = PlannerResult<
  PlannerData[M["type"]]
>;

export function isPlannerMessage(
  message: ExtensionMessage,
): message is PlannerMessage {
  return message.type.startsWith("PLANNER_");
}

// ---------------------------------------------------------- ut tab side

export async function handlePlannerMessage<M extends PlannerMessage>(
  message: M,
): Promise<PlannerResponse<M>> {
  try {
    const data = (await runPlannerMessage(message)) as PlannerData[M["type"]];
    return { ok: true, data };
  } catch (error) {
    if (error instanceof PlannerError) return { ok: false, code: error.code };
    console.error(`${message.type} failed:`, error);
    return { ok: false, code: "PLANNER_FETCH_FAILED" };
  }
}

async function runPlannerMessage(
  message: PlannerMessage,
): Promise<PlannerData[PlannerMessage["type"]]> {
  switch (message.type) {
    case "PLANNER_READ":
      return fetchPlannedCourses();
    case "PLANNER_RESOLVE":
      return resolveCourse(message.course);
    case "PLANNER_ADD":
      return addCourse(message.link);
    case "PLANNER_DELETE":
      await deleteCourse(message.key);
      return null;
    case "PLANNER_SYNC":
      return syncPlannerTo(message.targets);
  }
}

// ------------------------------------------------------- background side

export interface PlannerBridgeDependencies {
  getAuditPageTab: () => Promise<{ tabId: number; created: boolean }>;
  sendToTab: (
    tabId: number,
    message: PlannerMessage,
  ) => Promise<PlannerResult<unknown> | undefined>;
  closeTab: (tabId: number) => Promise<void>;
}

// runs a planner message in a ut tab and gives back the data, throwing a
// PlannerError with the tab's code if it failed
export function createPlannerTabCaller(deps: PlannerBridgeDependencies) {
  return async function callPlannerInTab<M extends PlannerMessage>(
    message: M,
  ): Promise<PlannerData[M["type"]]> {
    const { tabId, created } = await deps.getAuditPageTab();
    try {
      const result = await deps.sendToTab(tabId, message);
      if (!result) throw new PlannerError("PLANNER_FETCH_FAILED");
      if (!result.ok) throw new PlannerError(result.code);
      return result.data as PlannerData[M["type"]];
    } finally {
      // a tab we opened just for this call has nothing else to do
      if (created) await deps.closeTab(tabId).catch(() => undefined);
    }
  };
}

export function registerPlannerBridge(deps: PlannerBridgeDependencies): void {
  const callPlannerInTab = createPlannerTabCaller(deps);
  browser.runtime.onMessage.addListener(
    (message: ExtensionMessage, _sender, sendResponse) => {
      if (!isPlannerMessage(message)) return;
      void callPlannerInTab(message).then(
        (data) =>
          sendMessageResponse(message, sendResponse, { ok: true, data }),
        (error: unknown) =>
          sendMessageResponse(message, sendResponse, {
            ok: false,
            code:
              error instanceof PlannerError
                ? error.code
                : "PLANNER_FETCH_FAILED",
          }),
      );
      return true;
    },
  );
}
