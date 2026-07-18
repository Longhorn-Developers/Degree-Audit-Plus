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

  test("captures the GPA summary sentence, not course-rule previews", async () => {
    const document = await loadAuditDocument("audit-results-real.html");
    const log = spyOn(console, "log").mockImplementation(() => {});

    try {
      const { requirements } = parseAuditPage(document);
      const rules = requirements.flatMap((requirement) => requirement.rules);

      const summaries = rules
        .map((rule) => rule.summary)
        .filter((summary): summary is string => summary !== undefined);

      // The GPA rules carry their calculation sentence...
      expect(summaries.length).toBeGreaterThan(0);
      // ...and every captured summary is that sentence — never a course preview
      // or other trailing-cell content.
      for (const summary of summaries) {
        expect(summary).toMatch(
          /^\d+(?:\.\d+)? hours for a total of \d+(?:\.\d+)? points/,
        );
      }
    } finally {
      log.mockRestore();
    }
  });
});
