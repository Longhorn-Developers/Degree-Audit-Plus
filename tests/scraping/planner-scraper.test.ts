import { describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import {
  ccyysToSemester,
  courseCodeToPlannerCourseId,
  PlannerError,
  plannerCourseIdToCode,
  semesterToCcyys,
} from "../../domain/planner";
import {
  parseNextListingUrl,
  parsePlannerListing,
} from "../../features/audit-scraping/planner-listing-parser";
import { parsePlannerPage } from "../../features/audit-scraping/planner-page-parser";

const LISTING_URL =
  "https://utdirect.utexas.edu/apps/degree/audits/planner/ut_course/?page=3&course_ccyys=20272&course_pass_fail=&s_pf=&course_type=1&dpt=ADV&s_lvl=U";

async function loadFixture(name: string): Promise<Document> {
  const fixtureUrl = new URL(`../fixtures/scraping/${name}`, import.meta.url);
  return new JSDOM(await Bun.file(fixtureUrl).text()).window.document;
}

const loadPlannerDocument = () => loadFixture("planner-view-courses.html");
const loadListingDocument = () => loadFixture("planner-course-listing.html");

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

  test("does not treat parentheses in a title as expired", () => {
    const rows = parsePlannerPage(
      plannerDocument(
        rowHtml({
          code: "E 314L",
          title: "CONTEMP POETRY (1945-PRESENT)",
          notes: "Planned residence (see advisor)",
          courseId: "E  314L",
          ccyys: "20272",
          seq: "999",
        }),
      ),
    );
    expect(rows[0].expired).toBe(false);
  });

  test("reads pass/fail from the notes cell", () => {
    const rows = parsePlannerPage(
      plannerDocument(
        rowHtml({
          code: "ADV305",
          title: "FUNDAMENTALS OF ADVERTISING",
          notes: "Planned residence taken pass/fail",
          courseId: "ADV305",
          ccyys: "20279",
          seq: "998",
        }) +
          rowHtml({
            code: "M  110C",
            title: "CONFERENCE COURSE",
            courseId: "M  110C",
            ccyys: "20272",
            seq: "997",
          }),
      ),
    );
    expect(rows.map((row) => row.passFail)).toEqual([true, false]);
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

describe("planner course listing parser", () => {
  test("parses a real UT listing capture", async () => {
    expect(
      parsePlannerListing(await loadListingDocument(), LISTING_URL),
    ).toMatchSnapshot();
  });

  test("resolves relative add links against the listing URL verbatim", async () => {
    const links = parsePlannerListing(await loadListingDocument(), LISTING_URL);
    const adv303 = links.find((link) => link.number === "303");
    expect(adv303?.href).toBe(
      "https://utdirect.utexas.edu/apps/degree/audits/planner/ut_course/?page=4&course_ccyys=20272&course_pass_fail=&course_type=1&dpt=ADV&course_num=303&course_topic_id=",
    );
    expect(adv303?.topicId).toBeNull();
    expect(String(adv303?.code)).toBe("ADV 303");
  });

  test("finds the next-page link on a full listing page", async () => {
    expect(parseNextListingUrl(await loadListingDocument(), LISTING_URL)).toBe(
      "https://utdirect.utexas.edu/apps/degree/audits/planner/ut_course/?page=3&course_ccyys=20272&course_pass_fail=&s_pf=&course_type=1&dpt=ADV&course_num=350S&s_lvl=A",
    );
  });

  test("returns null when the listing has no next page", () => {
    const document = new JSDOM(
      `<h2>Student Planner</h2><a href="../ut_course/?page=2&amp;cls=U">Back</a>`,
    ).window.document;
    expect(parseNextListingUrl(document, LISTING_URL)).toBeNull();
  });

  test("decodes UT's double-encoded ampersands in titles", async () => {
    const links = parsePlannerListing(await loadListingDocument(), LISTING_URL);
    const adv303 = links.find((link) => link.number === "303");
    expect(adv303?.title).toBe("ADVERTISING & POPULAR CULTURE");
  });

  test("keeps a topic id when the add link carries one", () => {
    const document = new JSDOM(`
      <h2>Student Planner</h2>
      <table><tbody><tr>
        <td>C S 378</td>
        <td><a href="../ut_course/?page=4&amp;course_ccyys=20272&amp;course_type=1&amp;dpt=C+S&amp;course_num=378&amp;course_topic_id=7">TOPIC A</a></td>
      </tr></tbody></table>`).window.document;
    const [link] = parsePlannerListing(document, LISTING_URL);
    expect(link.department).toBe("C S");
    expect(link.topicId).toBe("7");
  });

  test("throws when the page no longer looks like the planner", () => {
    const document = new JSDOM("<h2>Sign in</h2>").window.document;
    expect(() => parsePlannerListing(document, LISTING_URL)).toThrow(
      "PLANNER_PAGE_CHANGED",
    );
  });
});

describe("planner domain helpers", () => {
  test("converts UT term codes to semesters", () => {
    expect(ccyysToSemester("20272")).toBe("Spring 2027");
    expect(ccyysToSemester("20266")).toBe("Summer 2026");
    expect(ccyysToSemester("20259")).toBe("Fall 2025");
    expect(() => ccyysToSemester("20271")).toThrow("PLANNER_PAGE_CHANGED");
  });

  test("converts semesters back to UT term codes", () => {
    expect(semesterToCcyys("Spring 2027")).toBe("20272");
    expect(semesterToCcyys("Summer 2026")).toBe("20266");
    expect(semesterToCcyys("Fall 2025")).toBe("20259");
  });

  test("pads the department to three characters when building a course id", () => {
    expect(courseCodeToPlannerCourseId("ARA", "601C")).toBe("ARA601C");
    expect(courseCodeToPlannerCourseId("M", "110C")).toBe("M  110C");
    expect(courseCodeToPlannerCourseId("C S", "324E")).toBe("C S324E");
  });

  test("splits planner course ids at the three-character department field", () => {
    const codes = ["ARA601C", "M  110C", "C S324E"].map((id) =>
      String(plannerCourseIdToCode(id)),
    );
    expect(codes).toEqual(["ARA 601C", "M 110C", "C S 324E"]);
  });
});
