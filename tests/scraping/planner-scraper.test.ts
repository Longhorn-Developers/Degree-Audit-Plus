import { describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import {
  ccyysToSemester,
  PlannerError,
  plannerCourseIdToCode,
} from "../../domain/planner";
import { parsePlannerPage } from "../../features/audit-scraping/planner-page-parser";

async function loadPlannerDocument(): Promise<Document> {
  const fixtureUrl = new URL(
    "../fixtures/scraping/planner-view-courses.html",
    import.meta.url,
  );
  return new JSDOM(await Bun.file(fixtureUrl).text()).window.document;
}

function plannerDocument(rowsHtml: string): Document {
  return new JSDOM(`
    <h2>Student Planner</h2>
    <table>
      <thead><tr><td>Semester</td><th>Crse</th><th>Title</th><th>Notes</th><th></th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `).window.document;
}

function rowHtml({
  semester = "",
  code,
  title,
  notes = "Planned residence",
  courseId,
  ccyys,
  seq,
}: {
  semester?: string;
  code: string;
  title: string;
  notes?: string;
  courseId: string;
  ccyys: string;
  seq: string;
}): string {
  const key = `key_course_id=${courseId}&amp;key_course_ccyys=${ccyys}&amp;key_course_seq=${seq}`;
  return `
    <tr>
      <td>${semester}</td>
      <td>${code}</td>
      <td>${title}</td>
      <td>${notes}</td>
      <td>
        <a href="/apps/degree/audits/planner/view_planner/?${key}&amp;action_code=D">Delete</a>
        or
        <a href="/apps/degree/audits/planner/modify_planned_course/?${key}&amp;key_course_type=1&amp;action_code=M">Modify</a>
      </td>
    </tr>`;
}

describe("planner View Courses parser", () => {
  test("parses a real UT planner capture", async () => {
    expect(parsePlannerPage(await loadPlannerDocument())).toMatchSnapshot();
  });

  test("takes the term from the row key, not the grouped semester cell", async () => {
    const rows = parsePlannerPage(await loadPlannerDocument());
    expect(rows.map((row) => row.semester)).toEqual([
      "Spring 2027",
      "Spring 2027",
    ]);
  });

  test("returns an empty list for an empty planner", () => {
    expect(parsePlannerPage(plannerDocument(""))).toEqual([]);
  });

  // havent checked this against a real expired row yet
  test("flags parenthesized rows as expired", () => {
    const rows = parsePlannerPage(
      plannerDocument(
        rowHtml({
          semester: "Fall 2024",
          code: "(C S324E)",
          title: "(INTRO TO COMPUTER SYSTEMS)",
          courseId: "C S324E",
          ccyys: "20249",
          seq: "997",
        }) +
          rowHtml({
            code: "M  110C",
            title: "CONFERENCE COURSE",
            courseId: "M  110C",
            ccyys: "20272",
            seq: "998",
          }),
      ),
    );
    expect(rows.map((row) => [String(row.code), row.expired])).toEqual([
      ["C S 324E", true],
      ["M 110C", false],
    ]);
  });

  test("throws when the page no longer looks like the planner", () => {
    const document = new JSDOM("<h2>Sign in</h2>").window.document;
    expect(() => parsePlannerPage(document)).toThrow(PlannerError);
    expect(() => parsePlannerPage(document)).toThrow("PLANNER_PAGE_CHANGED");
  });

  test("throws when a row's delete link is missing part of its key", () => {
    const document = plannerDocument(`
      <tr>
        <td></td><td>ARA601C</td><td>INTENSIVE ARABIC I</td><td></td>
        <td><a href="/apps/degree/audits/planner/view_planner/?key_course_id=ARA601C&amp;action_code=D">Delete</a></td>
      </tr>`);
    expect(() => parsePlannerPage(document)).toThrow("PLANNER_PAGE_CHANGED");
  });
});

describe("planner domain helpers", () => {
  test("converts UT term codes to semesters", () => {
    expect(ccyysToSemester("20272")).toBe("Spring 2027");
    expect(ccyysToSemester("20266")).toBe("Summer 2026");
    expect(ccyysToSemester("20259")).toBe("Fall 2025");
    expect(() => ccyysToSemester("20271")).toThrow("PLANNER_PAGE_CHANGED");
  });

  test("splits planner course ids at the three-character department field", () => {
    const codes = ["ARA601C", "M  110C", "C S324E"].map((id) =>
      String(plannerCourseIdToCode(id)),
    );
    expect(codes).toEqual(["ARA 601C", "M 110C", "C S 324E"]);
  });
});
