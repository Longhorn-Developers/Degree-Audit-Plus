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

const UT_LOGIN_HOST = "enterprise.login.utexas.edu";

// Every later request would hit the same login wall, so this stops the whole
// refresh instead of counting as one failed department
export class NotLoggedInError extends Error {
  constructor() {
    super(
      "Not logged in / session expired. Log in to UT Direct and set a fresh UT_COOKIE.",
    );
    this.name = "NotLoggedInError";
  }
}

// Fetches a UT page with the session cookie. Redirects aren't followed, so the
// cookie never goes to another host and a login redirect can't pass as a page
async function fetchUtPage(
  url: string,
  fetchImpl: typeof fetch,
  cookie?: string,
): Promise<Document> {
  const response = await fetchImpl(url, {
    headers: cookie ? { Cookie: cookie } : {},
    redirect: "manual",
  });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location") ?? "";
    if (new URL(location, url).hostname === UT_LOGIN_HOST) {
      throw new NotLoggedInError();
    }
    throw new Error(`Unexpected redirect (${response.status})`);
  }
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const document = new JSDOM(await response.text(), { url }).window.document;
  // same check as isLoginPage in features/session/session.ts
  if (
    document.querySelector('form[action*="login"]') ||
    document.querySelector('input[type="password"]')
  ) {
    throw new NotLoggedInError();
  }
  return document;
}

export async function fetchAndScrapeCourses(
  semester: string,
  department: string,
  level: "U" | "L",
  fetchImpl: typeof fetch = fetch,
  descriptionDelayMs = 100,
  cookie?: string,
): Promise<ScrapedCatalogCourse[]> {
  const courses: ScrapedCatalogCourse[] = [];
  const visited = new Set<string>();
  let url: string | null =
    `https://utdirect.utexas.edu/apps/registrar/course_schedule/${semester}/results/?fos_fl=${encodeURIComponent(department)}&level=${level}&search_type_main=FIELD`;

  // UT splits long results into pages linked by "Next page"
  while (url) {
    if (visited.has(url)) throw new Error("Results pages loop");
    visited.add(url);

    const document = await fetchUtPage(url, fetchImpl, cookie);
    const rows = Array.from(document.querySelectorAll("table tbody tr"));
    courses.push(
      ...new CourseCatalogScraper(document, url)
        .scrape(rows)
        .flatMap(({ course }) => (course ? [course] : [])),
    );
    url =
      document.querySelector<HTMLAnchorElement>("#next_nav_link")?.href ?? null;
  }

  for (const course of courses) {
    if (course.status === "CANCELLED") continue;

    const id = String(course.uniqueId).padStart(5, "0");
    const detailUrl = `https://utdirect.utexas.edu/apps/registrar/course_schedule/${semester}/${id}/`;
    try {
      course.description = parseCourseDescription(
        await fetchUtPage(detailUrl, fetchImpl, cookie),
      );
    } catch (error) {
      if (error instanceof NotLoggedInError) throw error;
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
  cookie?: string;
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
          options.cookie,
        );
        scraped.forEach((course) => courses.set(course.uniqueId, course));
      } catch (error) {
        if (error instanceof NotLoggedInError) throw error;
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
  // read from the environment only
  const cookie = process.env.UT_COOKIE;
  if (!cookie) {
    throw new Error(
      "Set UT_COOKIE to your UT Direct cookies (copy the Cookie header from a logged-in course schedule request)",
    );
  }

  const departments =
    selectedDepartments.length > 0
      ? selectedDepartments
      : Object.keys(DEPARTMENT_MAP);
  const catalog = await refreshCatalog({ semester, departments, cookie });
  console.log(`Wrote ${catalog.length} courses to ${catalogPath}.`);
}
