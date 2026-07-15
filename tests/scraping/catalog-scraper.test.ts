import { describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import {
  CourseCatalogScraper,
  parseCourseDescription,
} from "../../features/catalog/scraping/catalog-parser";
import type { ScrapedCatalogCourse } from "../../domain/catalog";

const catalogUrl =
  "https://utdirect.utexas.edu/apps/registrar/course_schedule/20259/results/?fos_fl=C%20S&level=U";

async function loadDocument(fixture: string, url?: string): Promise<Document> {
  const fixtureUrl = new URL(
    `../fixtures/scraping/${fixture}`,
    import.meta.url,
  );
  const html = await Bun.file(fixtureUrl).text();
  return new JSDOM(html, url ? { url } : undefined).window.document;
}

function scrapeCourses(document: Document): ScrapedCatalogCourse[] {
  const rows = Array.from(document.querySelectorAll("table tbody > tr"));
  const scraper = new CourseCatalogScraper(document, catalogUrl);
  return scraper.scrape(rows).flatMap(({ course }) => (course ? [course] : []));
}

// scrapedAt is Date.now(); replace it so snapshots stay stable across runs.
function normalizeCourses(courses: ScrapedCatalogCourse[]) {
  return courses.map(({ scrapedAt: _scrapedAt, ...course }) => ({
    ...course,
    scrapedAt: "normalized",
  }));
}

describe("course catalog scraper", () => {
  test("creates stable catalog course objects from a results page", async () => {
    const document = await loadDocument("catalog-results.html", catalogUrl);
    expect(normalizeCourses(scrapeCourses(document))).toMatchSnapshot();
  });

  test("parses a real UT results page capture", async () => {
    const document = await loadDocument(
      "catalog-results-real.html",
      catalogUrl,
    );
    const courses = scrapeCourses(document);

    // Guards against silent selector drift on the real markup.
    expect(courses.length).toBeGreaterThan(0);
    // A real results page has no #details block, so descriptions come from the
    // separate detail-page fetch — every course here should be description-less.
    expect(courses.every((c) => c.description.length === 0)).toBe(true);

    expect(normalizeCourses(courses)).toMatchSnapshot();
  });

  test("parses course descriptions from a real detail-page capture", async () => {
    const document = await loadDocument("catalog-course-details.html");
    const description = parseCourseDescription(document);

    expect(description.length).toBeGreaterThan(0);
    expect(description).toMatchSnapshot();
  });
});
