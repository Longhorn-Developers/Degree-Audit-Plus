// runs in a content script on a ut page same as audit-runner so cookies
// come along for free and DOMParser exists
import type { CourseCode } from "@/domain/course";
import {
  ccyysToSemester,
  courseCodeToPlannerCourseId,
  PlannerError,
  plannerCourseIdToCode,
  REGULAR_COURSE_TYPE,
  type PlannerAddLink,
  type PlannerCourseRequest,
  type PlannedCourseRow,
  type PlannerResolution,
  type PlannerRowKey,
  type PlannerSyncTarget,
} from "@/domain/planner";
import { isLoginPage } from "@/features/session/login-page";

const PLANNER_VIEW_URL =
  "https://utdirect.utexas.edu/apps/degree/audits/planner/view_planner/";
const PLANNER_LISTING_URL =
  "https://utdirect.utexas.edu/apps/degree/audits/planner/ut_course/";

// a department listing is 40 courses per page, this just stops a broken
// next link from looping forever
const MAX_LISTING_PAGES = 10;

type ListingCache = Map<string, Document>;

// parallel planner writes silently drop rows so every write waits its turn
// this queue lives in one content script, two ut tabs can still race
let lastWrite: Promise<unknown> = Promise.resolve();

// ---------------------------------------------------------------- public api

export async function fetchPlannedCourses(): Promise<PlannedCourseRow[]> {
  const document = await fetchPlannerDocument(PLANNER_VIEW_URL);
  return parsePlannerPage(document);
}

export function resolveCourse(
  request: PlannerCourseRequest,
): Promise<PlannerResolution> {
  return resolveCourseUsing(request, new Map());
}

export function addCourse(link: PlannerAddLink): Promise<PlannedCourseRow> {
  return runOneAtATime(() => performAdd(link));
}

export function deleteCourse(key: PlannerRowKey): Promise<void> {
  return runOneAtATime(() => performDelete(key));
}

// make the planner match the target list one row at a time, never delete all
export function syncPlannerTo(
  targets: PlannerSyncTarget[],
): Promise<PlannedCourseRow[]> {
  return runOneAtATime(async () => {
    const wanted = new Map<string, PlannerSyncTarget>();
    for (const target of targets) {
      const id = targetId(target);
      if (wanted.has(id)) {
        throw new PlannerError("DUPLICATE_ROW");
      }
      wanted.set(id, target);
    }

    const rows = await fetchPlannedCourses();
    let changedAnything = false;

    const kept = new Set<string>();
    for (const row of rows) {
      const id = rowId(row);
      if (wanted.has(id) && !kept.has(id)) {
        kept.add(id);
        continue;
      }
      await performDelete(row.key);
      changedAnything = true;
    }

    const listings: ListingCache = new Map();
    for (const [id, target] of wanted) {
      if (kept.has(id)) continue;
      const link = await resolveForSync(target, listings);
      await performAdd(link);
      changedAnything = true;
    }

    if (!changedAnything) return rows;

    const after = await fetchPlannedCourses();
    for (const target of wanted.values()) {
      const courseId = courseCodeToPlannerCourseId(
        target.department,
        target.number,
      );
      if (countRows(after, courseId, target.ccyys) !== 1) {
        throw new PlannerError("WRITE_NOT_VERIFIED");
      }
    }
    if (after.length !== wanted.size) {
      throw new PlannerError("WRITE_NOT_VERIFIED");
    }
    return after;
  });
}

// ------------------------------------------------------------------- writes

async function resolveCourseUsing(
  request: PlannerCourseRequest,
  cache: ListingCache,
): Promise<PlannerResolution> {
  const params = new URLSearchParams();
  params.set("page", "3");
  params.set("course_ccyys", request.ccyys);
  params.set("course_pass_fail", "");
  params.set("s_pf", "");
  params.set("course_type", request.courseType ?? REGULAR_COURSE_TYPE);
  params.set("dpt", request.department);
  params.set("s_lvl", request.level ?? "A");

  const wantedNumber = normalizeNumber(request.number);
  const matches: PlannerAddLink[] = [];
  let nextUrl: string | null = PLANNER_LISTING_URL + "?" + params.toString();
  let pagesLeft = MAX_LISTING_PAGES;
  while (nextUrl) {
    if (pagesLeft === 0) {
      throw new PlannerError("PLANNER_PAGE_CHANGED");
    }
    pagesLeft--;

    const document = await fetchListingDocument(nextUrl, cache);
    const links = parsePlannerListing(document, nextUrl);
    for (const link of links) {
      if (normalizeNumber(link.number) === wantedNumber) {
        matches.push(link);
      }
    }

    // a topic course lists one link per topic and those can run past the
    // 40 row page break, so keep going while the page ends on our course
    const lastLink = links[links.length - 1];
    const courseContinues =
      lastLink !== undefined &&
      normalizeNumber(lastLink.number) === wantedNumber;
    if (matches.length > 0 && !courseContinues) break;

    nextUrl = parseNextListingUrl(document, nextUrl);
  }

  if (matches.length === 0) {
    throw new PlannerError("COURSE_NOT_FOUND");
  }
  if (matches.length === 1) {
    return { kind: "resolved", link: matches[0] };
  }
  return { kind: "topics", options: matches };
}

async function resolveForSync(
  target: PlannerSyncTarget,
  listings: ListingCache,
): Promise<PlannerAddLink> {
  const resolution = await resolveCourseUsing(target, listings);
  if (resolution.kind === "resolved") return resolution.link;
  for (const option of resolution.options) {
    if (option.topicId === target.topicId) return option;
  }
  throw new PlannerError("TOPIC_REQUIRED");
}

async function performAdd(link: PlannerAddLink): Promise<PlannedCourseRow> {
  const courseId = courseCodeToPlannerCourseId(link.department, link.number);

  const before = await fetchPlannedCourses();
  // ut happily adds the same course twice so we have to check ourselves
  if (findRow(before, courseId, link.ccyys)) {
    throw new PlannerError("DUPLICATE_ROW");
  }

  await sendPlannerWrite(link.href);

  const after = await fetchPlannedCourses();
  const newRows = rowsAddedBetween(before, after);
  if (newRows.length !== 1) {
    throw new PlannerError("WRITE_NOT_VERIFIED");
  }
  const newRow = newRows[0];
  if (newRow.key.courseId !== courseId || newRow.key.ccyys !== link.ccyys) {
    throw new PlannerError("WRITE_NOT_VERIFIED");
  }
  return newRow;
}

async function performDelete(key: PlannerRowKey): Promise<void> {
  const before = await fetchPlannedCourses();
  if (!hasRow(before, key)) {
    throw new PlannerError("ROW_NOT_FOUND");
  }

  const params = new URLSearchParams();
  params.set("key_course_id", key.courseId);
  params.set("key_course_ccyys", key.ccyys);
  params.set("key_course_seq", key.seq);
  params.set("action_code", "D");
  await sendPlannerWrite(PLANNER_VIEW_URL + "?" + params.toString());

  const after = await fetchPlannedCourses();
  const stillThere = hasRow(after, key);
  const removedCount = before.length - after.length;
  const somethingWasAdded = rowsAddedBetween(before, after).length > 0;
  if (stillThere || removedCount !== 1 || somethingWasAdded) {
    throw new PlannerError("WRITE_NOT_VERIFIED");
  }
}

function runOneAtATime<T>(work: () => Promise<T>): Promise<T> {
  const ourTurn = lastWrite.catch(() => undefined).then(work);
  lastWrite = ourTurn;
  return ourTurn;
}

// ---------------------------------------------------------------- row utils

function normalizeNumber(number: string): string {
  return number.trim().toUpperCase();
}

function targetId(target: PlannerSyncTarget): string {
  const courseId = courseCodeToPlannerCourseId(
    target.department,
    target.number,
  );
  return courseId + "|" + target.ccyys;
}

function rowId(row: PlannedCourseRow): string {
  return row.key.courseId + "|" + row.key.ccyys;
}

function isSameKey(a: PlannerRowKey, b: PlannerRowKey): boolean {
  return a.courseId === b.courseId && a.ccyys === b.ccyys && a.seq === b.seq;
}

function hasRow(rows: PlannedCourseRow[], key: PlannerRowKey): boolean {
  for (const row of rows) {
    if (isSameKey(row.key, key)) return true;
  }
  return false;
}

function findRow(
  rows: PlannedCourseRow[],
  courseId: string,
  ccyys: string,
): PlannedCourseRow | undefined {
  for (const row of rows) {
    if (row.key.courseId === courseId && row.key.ccyys === ccyys) return row;
  }
  return undefined;
}

function countRows(
  rows: PlannedCourseRow[],
  courseId: string,
  ccyys: string,
): number {
  let count = 0;
  for (const row of rows) {
    if (row.key.courseId === courseId && row.key.ccyys === ccyys) count++;
  }
  return count;
}

function rowsAddedBetween(
  before: PlannedCourseRow[],
  after: PlannedCourseRow[],
): PlannedCourseRow[] {
  const added: PlannedCourseRow[] = [];
  for (const row of after) {
    if (!hasRow(before, row.key)) added.push(row);
  }
  return added;
}

// ------------------------------------------------------------------ fetching

// we dont follow redirects, if youre logged out sso bounces you and that
// shows up as an opaqueredirect
// dont use response.redirected for auth, planner writes redirect on success
async function plannerFetch(url: string): Promise<Response> {
  try {
    return await fetch(url, { credentials: "include", redirect: "manual" });
  } catch {
    throw new PlannerError("PLANNER_FETCH_FAILED");
  }
}

function parseHtml(text: string): Document {
  return new DOMParser().parseFromString(text, "text/html");
}

async function fetchPlannerDocument(url: string): Promise<Document> {
  const response = await plannerFetch(url);
  if (response.type === "opaqueredirect") {
    throw new PlannerError("AUTH_REQUIRED");
  }
  if (!response.ok) {
    throw new PlannerError("PLANNER_FETCH_FAILED");
  }
  const document = parseHtml(await response.text());
  if (isLoginPage(document)) {
    throw new PlannerError("AUTH_REQUIRED");
  }
  return document;
}

async function fetchListingDocument(
  url: string,
  cache: ListingCache,
): Promise<Document> {
  const cached = cache.get(url);
  if (cached) return cached;
  const document = await fetchPlannerDocument(url);
  cache.set(url, document);
  return document;
}

// the response never proves a write landed, add redirects on success and
// delete doesnt, so the planner reread afterwards is what decides
// the read before the write is the auth gate, so an opaqueredirect here is
// ut accepting not sso bouncing
async function sendPlannerWrite(url: string): Promise<void> {
  const response = await plannerFetch(url);
  if (response.type === "opaqueredirect") {
    return;
  }
  if (!response.ok) {
    throw new PlannerError("PLANNER_FETCH_FAILED");
  }
  const document = parseHtml(await response.text());
  if (isLoginPage(document)) {
    throw new PlannerError("AUTH_REQUIRED");
  }
}

// ------------------------------------------------------------------- parsing

// semester cell is blank after the first row of a group so we grab the term
// from the key instead
const CODE_CELL = 1;
const TITLE_CELL = 2;
const NOTES_CELL = 3;
const ACTIONS_CELL = 4;

// ut double encodes ampersands in course titles so one &amp; survives parsing
function collapseWhitespace(text: string | null | undefined): string {
  return (text ?? "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

function linkParams(link: Element, baseUrl: string): URLSearchParams {
  return new URL(link.getAttribute("href") ?? "", baseUrl).searchParams;
}

// throws if the page doesnt look like the planner anymore so a broken
// selector never gets mistaken for an empty planner
function assertPlannerPage(document: Document): void {
  for (const heading of document.querySelectorAll("h2")) {
    if (collapseWhitespace(heading.textContent) === "Student Planner") return;
  }
  throw new PlannerError("PLANNER_PAGE_CHANGED");
}

export function parsePlannerPage(document: Document): PlannedCourseRow[] {
  assertPlannerPage(document);

  const rows: PlannedCourseRow[] = [];
  for (const row of document.querySelectorAll("table tbody tr")) {
    const parsed = parsePlannerRow(row);
    if (parsed) rows.push(parsed);
  }
  return rows;
}

function parsePlannerRow(row: Element): PlannedCourseRow | null {
  const deleteLink = row.querySelector('a[href*="action_code=D"]');
  if (!deleteLink) return null;

  const cells = row.querySelectorAll("td");
  if (cells.length <= ACTIONS_CELL) {
    throw new PlannerError("PLANNER_PAGE_CHANGED");
  }

  const params = linkParams(deleteLink, PLANNER_VIEW_URL);
  const courseId = params.get("key_course_id");
  const ccyys = params.get("key_course_ccyys");
  const seq = params.get("key_course_seq");
  if (!courseId || !ccyys || !seq) {
    throw new PlannerError("PLANNER_PAGE_CHANGED");
  }
  const semester = ccyysToSemester(ccyys);
  if (!semester) throw new PlannerError("PLANNER_PAGE_CHANGED");

  const modifyLink = row.querySelector('a[href*="action_code=M"]');
  const courseType = modifyLink
    ? linkParams(modifyLink, PLANNER_VIEW_URL).get("key_course_type")
    : null;

  // ut wraps the course code in parentheses when the term has passed
  // only the code cell counts, plenty of real titles have parentheses
  const expired = collapseWhitespace(cells[CODE_CELL].textContent).startsWith(
    "(",
  );
  const notes = collapseWhitespace(cells[NOTES_CELL].textContent);

  return {
    key: { courseId, ccyys, seq },
    courseType,
    code: plannerCourseIdToCode(courseId),
    title: collapseWhitespace(cells[TITLE_CELL].textContent),
    notes,
    // the notes cell says "taken pass/fail" when the row is pass/fail
    passFail: /pass\/fail/i.test(notes),
    semester,
    expired,
  };
}

// every page=4 link on a page=3 listing, hrefs are relative so they get
// resolved against the listing url and kept verbatim otherwise
export function parsePlannerListing(
  document: Document,
  listingUrl: string,
): PlannerAddLink[] {
  assertPlannerPage(document);

  const links: PlannerAddLink[] = [];
  for (const anchor of document.querySelectorAll('a[href*="page=4"]')) {
    const url = new URL(anchor.getAttribute("href") ?? "", listingUrl);
    const department = url.searchParams.get("dpt");
    const number = url.searchParams.get("course_num");
    const ccyys = url.searchParams.get("course_ccyys");
    if (!department || !number || !ccyys) {
      throw new PlannerError("PLANNER_PAGE_CHANGED");
    }

    // the first cell has the code as ut prints it, fall back to building it
    let code = `${department} ${number}` as CourseCode;
    const firstCell = anchor.closest("tr")?.querySelector("td");
    if (firstCell) {
      code = collapseWhitespace(firstCell.textContent) as CourseCode;
    }

    links.push({
      href: url.toString(),
      department,
      number,
      ccyys,
      topicId: url.searchParams.get("course_topic_id") || null,
      code,
      title: collapseWhitespace(anchor.textContent),
    });
  }
  return links;
}

// ut shows 40 courses per listing page and links the rest as "Next courses"
export function parseNextListingUrl(
  document: Document,
  listingUrl: string,
): string | null {
  for (const anchor of document.querySelectorAll('a[href*="page=3"]')) {
    if (collapseWhitespace(anchor.textContent) === "Next courses") {
      return new URL(anchor.getAttribute("href") ?? "", listingUrl).toString();
    }
  }
  return null;
}
