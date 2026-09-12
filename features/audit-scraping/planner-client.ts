// runs in a content script on a ut page same as audit-runner so cookies
// come along for free and DOMParser exists
import { PlannerError, type PlannedCourseRow } from "@/domain/planner";
import { isLoginPage } from "@/features/session/session";
import { parsePlannerPage } from "./planner-page-parser";

const PLANNER_VIEW_URL =
  "https://utdirect.utexas.edu/apps/degree/audits/planner/view_planner/";

export async function fetchPlannedCourses(): Promise<PlannedCourseRow[]> {
  const document = await fetchPlannerDocument(PLANNER_VIEW_URL);
  return parsePlannerPage(document);
}

// we dont follow redirects, if youre logged out sso bounces you and that
// shows up as an opaqueredirect
// dont use response.redirected for this, planner writes redirect on success
async function fetchPlannerDocument(url: string): Promise<Document> {
  let response: Response;
  try {
    response = await fetch(url, {
      credentials: "include",
      redirect: "manual",
    });
  } catch {
    throw new PlannerError("PLANNER_FETCH_FAILED");
  }
  if (response.type === "opaqueredirect") {
    throw new PlannerError("AUTH_REQUIRED");
  }
  if (!response.ok) throw new PlannerError("PLANNER_FETCH_FAILED");

  const document = new DOMParser().parseFromString(
    await response.text(),
    "text/html",
  );
  if (isLoginPage(document)) throw new PlannerError("AUTH_REQUIRED");
  return document;
}
