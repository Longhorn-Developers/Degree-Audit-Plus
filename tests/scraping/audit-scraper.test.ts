import { describe, expect, spyOn, test } from "bun:test";
import { JSDOM } from "jsdom";
import { parseAuditPage } from "../../features/audit-scraping/audit-page-parser";
import type { CachedAuditData } from "../../domain/audit";

async function loadAuditDocument(
  fixture = "audit-results.html",
): Promise<Document> {
  const fixtureUrl = new URL(
    `../fixtures/scraping/${fixture}`,
    import.meta.url,
  );
  const html = await Bun.file(fixtureUrl).text();
  const dom = new JSDOM(html);
  Object.defineProperty(dom.window.HTMLElement.prototype, "innerText", {
    get() {
      return this.textContent ?? "";
    },
  });
  return dom.window.document;
}

function normalizeCourseIds(audit: CachedAuditData) {
  const courses = Object.values(audit.courses);
  const stableIds = new Map(
    courses.map((course, index) => [String(course.id), `course-${index + 1}`]),
  );

  return {
    courses: Object.fromEntries(
      courses.map((course) => {
        const id = stableIds.get(String(course.id))!;
        return [id, { ...course, id }];
      }),
    ),
    requirements: audit.requirements.map((requirement) => ({
      ...requirement,
      rules: requirement.rules.map((rule) => ({
        ...rule,
        courses: rule.courses.map((id) => stableIds.get(String(id))!),
      })),
    })),
  };
}

describe("degree audit scraper", () => {
  test("creates stable cached audit data from an audit page", async () => {
    const document = await loadAuditDocument();
    const log = spyOn(console, "log").mockImplementation(() => {});

    try {
      expect(normalizeCourseIds(parseAuditPage(document))).toMatchSnapshot();
    } finally {
      log.mockRestore();
    }
  });

  test("parses a real UT audit page capture", async () => {
    const document = await loadAuditDocument("audit-results-real.html");
    const log = spyOn(console, "log").mockImplementation(() => {});

    try {
      const { courses, requirements } = parseAuditPage(document);

      // Guards against silent selector drift on the real markup.
      expect(Object.keys(courses).length).toBeGreaterThan(0);
      expect(requirements.length).toBeGreaterThan(0);

      expect(normalizeCourseIds({ courses, requirements })).toMatchSnapshot();
    } finally {
      log.mockRestore();
    }
  });
});
