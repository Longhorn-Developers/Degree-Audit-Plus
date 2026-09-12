// Reads and mutates the UT Direct course planner ("Planned Courses").
//
// Ported from the DAP-115 spike harness (scripts/spike/planner-poc.js) after
// it was verified against a live session on 2026-08-16. The constraints below
// are findings, not style choices — see docs/hypothetical-courses-design.md.
//
//   - page=4 (add) and action_code=D (delete) are state-changing GETs. The add
//     link is always parsed off the page=3 listing and followed verbatim;
//     never prefetched, never hand-constructed.
//   - action_code=A (Delete All) is never issued. Per-row deletes only.
//   - Add and delete BOTH redirect on success, so `response.redirected` cannot
//     mean "logged out" here. Outcomes are decided by re-reading the planner.
//   - Writes are serialized by the caller: two concurrent adds race on the
//     seq counter and one silently overwrites the other.
//
// Runs in a content script on a UT audits page — same origin, so session
// cookies ride along and DOMParser exists.
import { isLoginPage } from "@/features/session/session";

const PLANNER_BASE = "https://utdirect.utexas.edu/apps/degree/audits/planner/";
const PLANNER_LIST = `${PLANNER_BASE}ut_course/`;
const PLANNER_VIEW = `${PLANNER_BASE}view_planner/`;

export interface PlannerRow {
  keyCourseId: string;
  keyCourseCcyys: string | null;
  keyCourseSeq: string | null;
  // UT parenthesizes rows for terms that have closed. They don't apply to
  // audits, so they're unusable as preview inputs.
  expired: boolean;
  rowText: string;
}

export interface CourseRef {
  dept: string;
  num: string;
  ccyys: string;
  courseType?: string;
  level?: string;
}

export class PlannerAuthError extends Error {
  constructor(message = "Not logged in to UT Direct") {
    super(message);
    this.name = "PlannerAuthError";
  }
}

export function plannerRowKey(row: PlannerRow): string {
  return `${row.keyCourseId}|${row.keyCourseCcyys}|${row.keyCourseSeq}`;
}

interface PlannerPage {
  response: Response;
  document: Document;
}

async function getPlannerPage(url: string): Promise<PlannerPage> {
  const response = await fetch(url, { credentials: "include" });
  const document = new DOMParser().parseFromString(
    await response.text(),
    "text/html",
  );
  return { response, document };
}

/**
 * Definitive logged-out evidence: UT bounced us to SSO, or served a login
 * form. Deliberately does NOT consider `response.redirected` — the planner's
 * own add and delete endpoints redirect when they *succeed*, so testing that
 * aborts mid-mutation and strands a row UT already wrote.
 */
function looksLoggedOut({ response, document }: PlannerPage): boolean {
  return (
    /\b(login|signin|idp\.utexas|shib|sso)\b/i.test(response.url) ||
    response.status === 401 ||
    response.status === 403 ||
    isLoginPage(document)
  );
}

/** Reads the current Planned Courses rows. The source of truth for outcomes. */
export async function readPlanner(): Promise<PlannerRow[]> {
  const page = await getPlannerPage(PLANNER_VIEW);
  if (looksLoggedOut(page)) throw new PlannerAuthError();

  const rows: PlannerRow[] = [];
  for (const link of page.document.querySelectorAll<HTMLAnchorElement>(
    'a[href*="action_code=D"]',
  )) {
    const href = link.getAttribute("href");
    if (!href) continue;
    const { searchParams } = new URL(href, PLANNER_VIEW);
    const keyCourseId = searchParams.get("key_course_id");
    if (!keyCourseId) continue;

    const rowText = link.closest("tr")?.textContent?.trim() ?? "";
    rows.push({
      keyCourseId,
      keyCourseCcyys: searchParams.get("key_course_ccyys"),
      keyCourseSeq: searchParams.get("key_course_seq"),
      expired: /\(.*\)/.test(rowText),
      rowText: rowText.replace(/\s+/g, " "),
    });
  }
  return rows;
}

/**
 * Finds the exact `page=4` add link UT renders for a course. Returns every
 * match: more than one means a topic course, and the caller must choose rather
 * than have one picked silently.
 */
export async function resolveAddLinks({
  dept,
  num,
  ccyys,
  courseType = "1",
  level = "U",
}: CourseRef): Promise<string[]> {
  const listUrl =
    `${PLANNER_LIST}?page=3&course_ccyys=${encodeURIComponent(ccyys)}` +
    `&course_pass_fail=&s_pf=&course_type=${encodeURIComponent(courseType)}` +
    `&dpt=${encodeURIComponent(dept)}&s_lvl=${encodeURIComponent(level)}`;

  const page = await getPlannerPage(listUrl);
  if (looksLoggedOut(page)) throw new PlannerAuthError();

  return [
    ...page.document.querySelectorAll<HTMLAnchorElement>('a[href*="page=4"]'),
  ]
    .filter((link) => {
      const href = link.getAttribute("href");
      if (!href) return false;
      const linkNum = new URL(href, PLANNER_LIST).searchParams.get(
        "course_num",
      );
      return linkNum?.trim() === num.trim();
    })
    .map((link) =>
      new URL(link.getAttribute("href")!, PLANNER_LIST).toString(),
    );
}

export interface AddResult {
  row: PlannerRow;
  /** >1 means a topic course; the first link was used. */
  candidateCount: number;
  elapsedMs: number;
}

/**
 * Adds one course to the planner and confirms it landed by diffing the planner
 * before and after. The add response itself is not evidence — it redirects on
 * success and can also redirect to SSO.
 *
 * Callers must serialize this: concurrent adds race on UT's seq counter.
 */
export async function addPlannedCourse(course: CourseRef): Promise<AddResult> {
  const links = await resolveAddLinks(course);
  if (!links.length) {
    throw new Error(
      `No add link for ${course.dept} ${course.num} in ${course.ccyys}`,
    );
  }

  const before = await readPlanner();
  const beforeKeys = new Set(before.map(plannerRowKey));

  const startedAt = performance.now();
  // Follow UT's own link verbatim — this is the state-changing GET.
  await getPlannerPage(links[0]);
  const after = await readPlanner();
  const elapsedMs = performance.now() - startedAt;

  const added = after.filter((row) => !beforeKeys.has(plannerRowKey(row)));
  if (added.length !== 1) {
    throw new Error(
      `Add did not produce exactly one new row (got ${added.length}). ` +
        `Planner went from ${before.length} to ${after.length} rows.`,
    );
  }

  return { row: added[0], candidateCount: links.length, elapsedMs };
}

export interface DeleteResult {
  removed: number;
  targetGone: boolean;
  elapsedMs: number;
}

/** Deletes one planner row, confirmed by re-reading the planner. */
export async function deletePlannedCourse(
  row: PlannerRow,
): Promise<DeleteResult> {
  const url =
    `${PLANNER_VIEW}?key_course_id=${encodeURIComponent(row.keyCourseId)}` +
    `&key_course_ccyys=${encodeURIComponent(row.keyCourseCcyys ?? "")}` +
    `&key_course_seq=${encodeURIComponent(row.keyCourseSeq ?? "")}` +
    `&action_code=D`;

  const before = await readPlanner();
  const startedAt = performance.now();
  await getPlannerPage(url);
  const after = await readPlanner();
  const elapsedMs = performance.now() - startedAt;

  const targetKey = plannerRowKey(row);
  return {
    removed: before.length - after.length,
    targetGone: !after.some((r) => plannerRowKey(r) === targetKey),
    elapsedMs,
  };
}
