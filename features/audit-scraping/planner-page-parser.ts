import {
  ccyysToSemester,
  PlannerError,
  plannerCourseIdToCode,
  type PlannedCourseRow,
  type PlannerRowKey,
} from "@/domain/planner";

const PLANNER_VIEW_URL =
  "https://utdirect.utexas.edu/apps/degree/audits/planner/view_planner/";

// semester cell is blank after the first row of a group so we grab the term
// from the key instead
const CODE_CELL = 1;
const TITLE_CELL = 2;
const NOTES_CELL = 3;
const ACTIONS_CELL = 4;

function collapseWhitespace(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function linkParams(link: Element): URLSearchParams {
  return new URL(link.getAttribute("href") ?? "", PLANNER_VIEW_URL)
    .searchParams;
}

function parseRowKey(deleteLink: Element): PlannerRowKey {
  const params = linkParams(deleteLink);
  const courseId = params.get("key_course_id");
  const ccyys = params.get("key_course_ccyys");
  const seq = params.get("key_course_seq");
  if (!courseId || !ccyys || !seq) {
    throw new PlannerError("PLANNER_PAGE_CHANGED");
  }
  return { courseId, ccyys, seq };
}

function parseRow(row: Element): PlannedCourseRow | null {
  const deleteLink = row.querySelector('a[href*="action_code=D"]');
  if (!deleteLink) return null;

  const cells = row.querySelectorAll("td");
  if (cells.length <= ACTIONS_CELL) {
    throw new PlannerError("PLANNER_PAGE_CHANGED");
  }

  const key = parseRowKey(deleteLink);
  const modifyLink = row.querySelector('a[href*="action_code=M"]');
  const courseType = modifyLink
    ? linkParams(modifyLink).get("key_course_type")
    : null;

  const descriptive = [CODE_CELL, TITLE_CELL, NOTES_CELL]
    .map((index) => collapseWhitespace(cells[index].textContent))
    .join(" ");

  return {
    key,
    courseType,
    code: plannerCourseIdToCode(key.courseId),
    title: collapseWhitespace(cells[TITLE_CELL].textContent),
    notes: collapseWhitespace(cells[NOTES_CELL].textContent),
    semester: ccyysToSemester(key.ccyys),
    expired: /\(/.test(descriptive),
  };
}

// throws if the page doesnt look like the planner anymore so a broken
// selector never gets mistaken for an empty planner
export function parsePlannerPage(document: Document): PlannedCourseRow[] {
  const heading = [...document.querySelectorAll("h2")].find(
    (element) => collapseWhitespace(element.textContent) === "Student Planner",
  );
  if (!heading) throw new PlannerError("PLANNER_PAGE_CHANGED");

  const rows: PlannedCourseRow[] = [];
  for (const row of document.querySelectorAll("table tbody tr")) {
    const parsed = parseRow(row);
    if (parsed) rows.push(parsed);
  }
  return rows;
}
