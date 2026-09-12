// runs in a content script on a ut page same as audit-runner so cookies
// come along for free and DOMParser exists
import {
  courseCodeToPlannerCourseId,
  PlannerError,
  semesterToCcyys,
  type PlannerAddLink,
  type PlannerCourseRequest,
  type PlannedCourseRow,
  type PlannerModifyChanges,
  type PlannerResolution,
  type PlannerRowKey,
  type PlannerSyncTarget,
} from "@/domain/planner";
import { isLoginPage } from "@/features/session/session";
import {
  parseNextListingUrl,
  parsePlannerListing,
} from "./planner-listing-parser";
import { parsePlannerPage } from "./planner-page-parser";

const PLANNER_BASE_URL =
  "https://utdirect.utexas.edu/apps/degree/audits/planner/";
const PLANNER_VIEW_URL = PLANNER_BASE_URL + "view_planner/";
const PLANNER_LISTING_URL = PLANNER_BASE_URL + "ut_course/";
const PLANNER_MODIFY_URL = PLANNER_BASE_URL + "modify_planned_course/";

// a department listing is 40 courses per page, this just stops a broken
// next link from looping forever
const MAX_LISTING_PAGES = 10;

// parallel planner writes silently drop rows so every write waits its turn
// this only covers one content script, cross tab ordering is 5.3's job
let lastWrite: Promise<unknown> = Promise.resolve();

export async function fetchPlannedCourses(): Promise<PlannedCourseRow[]> {
  const document = await fetchPlannerDocument(PLANNER_VIEW_URL);
  return parsePlannerPage(document);
}

export function resolveCourse(
  request: PlannerCourseRequest,
): Promise<PlannerResolution> {
  return resolveCourseUsing(request, new Map());
}

// one listing fetch per dept + term + type, a sync that adds several courses
// from the same dept reuses the pages it already pulled
type ListingCache = Map<string, Document>;

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

async function resolveCourseUsing(
  request: PlannerCourseRequest,
  cache: ListingCache,
): Promise<PlannerResolution> {
  const params = new URLSearchParams();
  params.set("page", "3");
  params.set("course_ccyys", request.ccyys);
  params.set("course_pass_fail", "");
  params.set("s_pf", "");
  params.set("course_type", request.courseType ?? "1");
  params.set("dpt", request.department);
  params.set("s_lvl", request.level ?? "A");
  let listingUrl: string | null = PLANNER_LISTING_URL + "?" + params.toString();

  const wantedNumber = request.number.trim().toUpperCase();
  const matches: PlannerAddLink[] = [];
  for (let page = 0; page < MAX_LISTING_PAGES && listingUrl; page++) {
    const document = await fetchListingDocument(listingUrl, cache);
    for (const link of parsePlannerListing(document, listingUrl)) {
      if (link.number.trim().toUpperCase() === wantedNumber) {
        matches.push(link);
      }
    }
    if (matches.length > 0) break;
    listingUrl = parseNextListingUrl(document, listingUrl);
  }

  if (matches.length === 0) {
    throw new PlannerError("COURSE_NOT_FOUND");
  }
  if (matches.length === 1) {
    return { kind: "resolved", link: matches[0] };
  }
  return { kind: "topics", options: matches };
}

export function addCourse(link: PlannerAddLink): Promise<PlannedCourseRow> {
  return runOneAtATime(() => performAdd(link));
}

export function deleteCourse(key: PlannerRowKey): Promise<void> {
  return runOneAtATime(() => performDelete(key));
}

// make the planner match the target list, one row at a time
// used to clean up after a failed preview delete, never uses delete all
export function syncPlannerTo(
  targets: PlannerSyncTarget[],
): Promise<PlannedCourseRow[]> {
  return runOneAtATime(async () => {
    const wanted = new Map<string, PlannerSyncTarget>();
    for (const target of targets) {
      wanted.set(targetId(target), target);
    }

    const rows = await fetchPlannedCourses();
    let changedAnything = false;

    // delete rows we dont want, and second copies of rows we do
    const kept = new Set<string>();
    for (const row of rows) {
      const id = row.key.courseId + "|" + row.key.ccyys;
      if (wanted.has(id) && !kept.has(id)) {
        kept.add(id);
        continue;
      }
      await performDelete(row.key);
      changedAnything = true;
    }

    // add whats missing
    const listings: ListingCache = new Map();
    for (const [id, target] of wanted) {
      if (kept.has(id)) continue;
      const link = await resolveForSync(target, listings);
      await performAdd(link);
      changedAnything = true;
    }

    if (!changedAnything) return rows;

    const after = await fetchPlannedCourses();
    for (const id of wanted.keys()) {
      const [courseId, ccyys] = id.split("|");
      if (countRows(after, courseId, ccyys) !== 1) {
        throw new PlannerError("WRITE_NOT_VERIFIED");
      }
    }
    if (after.length !== wanted.size) {
      throw new PlannerError("WRITE_NOT_VERIFIED");
    }
    return after;
  });
}

function targetId(target: PlannerSyncTarget): string {
  const courseId = courseCodeToPlannerCourseId(
    target.department,
    target.number,
  );
  return courseId + "|" + target.ccyys;
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

export function modifyCourse(
  row: PlannedCourseRow,
  changes: PlannerModifyChanges,
): Promise<PlannedCourseRow> {
  return runOneAtATime(async () => {
    const before = await fetchPlannedCourses();
    if (!hasRow(before, row.key)) {
      throw new PlannerError("ROW_NOT_FOUND");
    }

    // ut only accepts the modify submit if the referer is its own modify page
    // add and delete dont care, this one does
    const entryParams = new URLSearchParams();
    entryParams.set("key_course_id", row.key.courseId);
    entryParams.set("key_course_ccyys", row.key.ccyys);
    entryParams.set("key_course_seq", row.key.seq);
    entryParams.set("key_course_type", row.courseType ?? "1");
    entryParams.set("action_code", "M");
    const entryUrl = PLANNER_MODIFY_URL + "?" + entryParams.toString();

    let targetCcyys = row.key.ccyys;
    if (changes.semester) {
      targetCcyys = semesterToCcyys(changes.semester);
    }
    const passFail = changes.passFail ?? row.passFail;
    const department = row.key.courseId.slice(0, 3).trim();
    const number = row.key.courseId.slice(3).trim();
    const year = targetCcyys.slice(0, 4);
    const seasonDigit = targetCcyys.slice(4);

    // param names here dont match the modify links, and fos + course show up
    // twice because thats what the real form sends
    const params = new URLSearchParams();
    params.append("action", "M");
    params.append("course_type", row.courseType ?? "1");
    params.append("course", number);
    params.append("fos", department);
    params.append("seq", row.key.seq);
    params.append("key_ccyys", row.key.ccyys);
    params.append("fos", department);
    params.append("course", number);
    params.append("semester", seasonDigit);
    params.append("year", year);
    // ut ignores the whole submit if pass_fail is missing, always send it
    params.append("pass_fail", passFail ? "Y" : "N");
    // modify_planned_course only validates, then redirects to view_planner
    // with action_code=M and thats the request that actually writes, so this
    // one has to follow the redirect
    await sendPlannerWrite(PLANNER_MODIFY_URL + "?" + params.toString(), {
      referrer: entryUrl,
      redirect: "follow",
    });

    // seq survives a modify, so our row is the one with the same seq in the
    // target term, and its notes have to show the pass/fail we asked for
    // otherwise a same term change that ut ignored would look like a success
    const after = await fetchPlannedCourses();
    const updatedRow = findRow(
      after,
      row.key.courseId,
      targetCcyys,
      row.key.seq,
    );
    if (!updatedRow || updatedRow.passFail !== passFail) {
      throw new PlannerError("WRITE_NOT_VERIFIED");
    }
    const termChanged = targetCcyys !== row.key.ccyys;
    if (termChanged && hasRow(after, row.key)) {
      throw new PlannerError("WRITE_NOT_VERIFIED");
    }
    return updatedRow;
  });
}

function runOneAtATime<T>(work: () => Promise<T>): Promise<T> {
  // wait for the previous write even if it failed, then run ours
  const ourTurn = lastWrite.catch(() => undefined).then(work);
  lastWrite = ourTurn;
  return ourTurn;
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
  seq?: string,
): PlannedCourseRow | undefined {
  for (const row of rows) {
    if (row.key.courseId !== courseId || row.key.ccyys !== ccyys) continue;
    if (seq !== undefined && row.key.seq !== seq) continue;
    return row;
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

// we dont follow redirects, if youre logged out sso bounces you and that
// shows up as an opaqueredirect
// dont use response.redirected for this, planner writes redirect on success
type PlannerFetchOptions = { referrer?: string; redirect?: RequestRedirect };

async function plannerFetch(
  url: string,
  options: PlannerFetchOptions = {},
): Promise<Response> {
  try {
    return await fetch(url, {
      credentials: "include",
      redirect: "manual",
      ...options,
    });
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

// the response never proves a write landed, add redirects on success and
// delete doesnt, so the planner reread afterwards is what decides
// the read before the write is the auth gate, so an opaqueredirect here is
// ut accepting not sso bouncing
async function sendPlannerWrite(
  url: string,
  options: PlannerFetchOptions = {},
): Promise<void> {
  const response = await plannerFetch(url, options);
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
