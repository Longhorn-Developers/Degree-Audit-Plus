import { rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import type { ScrapedCatalogCourse } from "../../domain/catalog";
import {
  CourseCatalogScraper,
  parseCourseDescription,
} from "../../features/catalog/scraping/catalog-parser";
import { DEPARTMENT_MAP } from "../../features/catalog/department-map";
import { validateCatalog } from "./validate-catalog";

const catalogPath = fileURLToPath(
  new URL("../../assets/ut-courses.json", import.meta.url),
);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchAndScrapeCourses(
  semester: string,
  department: string,
  level: "U" | "L",
  fetchImpl: typeof fetch = fetch,
  descriptionDelayMs = 100,
): Promise<ScrapedCatalogCourse[]> {
  const url = `https://utdirect.utexas.edu/apps/registrar/course_schedule/${semester}/results/?fos_fl=${encodeURIComponent(department)}&level=${level}&search_type_main=FIELD`;
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const document = new JSDOM(await response.text(), { url }).window.document;
  const rows = Array.from(document.querySelectorAll("table tbody tr"));
  const courses = new CourseCatalogScraper(document, url)
    .scrape(rows)
    .flatMap(({ course }) => (course ? [course] : []));

  for (const course of courses) {
    if (course.status === "CANCELLED") continue;

    const id = String(course.uniqueId).padStart(5, "0");
    const detailUrl = `https://utdirect.utexas.edu/apps/registrar/course_schedule/${semester}/${id}/`;
    try {
      const detailResponse = await fetchImpl(detailUrl);
      if (detailResponse.ok) {
        const detailDocument = new JSDOM(await detailResponse.text(), {
          url: detailUrl,
        }).window.document;
        course.description = parseCourseDescription(detailDocument);
      } else {
        course.description = [];
      }
    } catch {
      course.description = [];
    }
    if (descriptionDelayMs > 0) await wait(descriptionDelayMs);
  }

  return courses;
}

export async function refreshCatalog(options: {
  semester: string;
  departments: string[];
  outputPath?: string;
  fetchImpl?: typeof fetch;
  descriptionDelayMs?: number;
}) {
  const courses = new Map<number, ScrapedCatalogCourse>();
  const failures: string[] = [];

  for (const department of options.departments) {
    for (const level of ["L", "U"] as const) {
      try {
        const scraped = await fetchAndScrapeCourses(
          options.semester,
          department,
          level,
          options.fetchImpl,
          options.descriptionDelayMs,
        );
        scraped.forEach((course) => courses.set(course.uniqueId, course));
      } catch (error) {
        failures.push(
          `${department}/${level}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(`Catalog refresh failed:\n${failures.join("\n")}`);
  }

  const catalog: unknown = [...courses.values()];
  validateCatalog(catalog, options.semester);

  const outputPath = options.outputPath ?? catalogPath;
  const temporaryPath = `${outputPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(catalog, null, 2)}\n`);
  await rename(temporaryPath, outputPath);
  return catalog;
}

if (import.meta.main) {
  const [semester, ...selectedDepartments] = process.argv.slice(2);
  if (!/^\d{5}$/.test(semester ?? "")) {
    throw new Error(
      'Usage: bun run catalog:refresh -- <semester> [department ...], for example: 20269 "C S"',
    );
  }

  const departments =
    selectedDepartments.length > 0
      ? selectedDepartments
      : Object.keys(DEPARTMENT_MAP);
  const catalog = await refreshCatalog({ semester, departments });
  console.log(`Wrote ${catalog.length} courses to ${catalogPath}.`);
}
