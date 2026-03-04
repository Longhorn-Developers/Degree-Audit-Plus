/**
 * Audit Scraper - Functions for parsing audit data from DOM
 */

import type {
  AuditRequirement,
  Course,
  CourseCompletionMethod,
  CourseId,
  PlannableStatus,
  RequirementRule,
  Status,
  StringSemester,
} from "../general-types";

// --- Helper Functions ---

export function parseHours(text: string): number {
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

export function getCurrentSemester(): StringSemester {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  if (currentMonth < 5) return `${currentYear - 1} Spring` as StringSemester;
  if (currentMonth >= 8) return `${currentYear} Fall` as StringSemester;
  return `${currentYear} Summer` as StringSemester;
}

export function isCurrentSemester(semester: StringSemester): boolean {
  return semester === getCurrentSemester();
}

export function parseCourseStatus(text: string): PlannableStatus {
  if (text.includes("Applied")) return "Completed";
  if (text.includes("Planned")) return "Planned";
  if (text.includes("Progress")) return "In Progress";
  return "Not Started";
}

export function checkLoginRequired(doc: Document): boolean {
  return !!(
    doc.querySelector('form[action*="login"]') ||
    doc.querySelector('input[type="password"]')
  );
}

export function getRuleStatus(classList: DOMTokenList): Status {
  if (classList.contains("fulfilled")) return "Completed";
  if (classList.contains("partial")) return "In Progress";
  return "Not Started";
}

// --- Main Scraping Functions ---

/** Coursework row data from #coursework table */
export interface CourseworkData {
  course?: string;
  title?: string;
  grade?: string;
  unique?: string;
  type?: string;
  creditHours?: string;
  school?: string;
}

// Remove the word "Courses" from the header
function parseSemesterFromHeader(header: string): StringSemester {
  return header.trim().split(" ").slice(0, 2).join(" ") as StringSemester;
}

function getStatus(cell: HTMLTableCellElement): PlannableStatus {
  // The status of the course is specified by the icon and it has an alt text that matches the status.
  if (cell.querySelector("img[alt='In Progress icon']")) return "In Progress";

  if (
    cell.querySelector("img[alt='Future icon']") || // Might not be what I think it is
    cell.querySelector("img[alt='Planned icon']")
  )
    return "Planned";

  return "Completed";
}

/**
 * Scrape the coursework table. This is where the courses are assigned their UUIDs
 */
export function scrapeCourseworkTable(
  table: Element,
): Record<CourseId, Course> {
  const rows = table.querySelectorAll("tr:not(.alias)");
  const results: Record<CourseId, Course> = {};

  let currentSemester: StringSemester = parseSemesterFromHeader(
    rows[0].querySelector("th.section_title")!.textContent!.trim(),
  );
  for (const row of rows) {
    const possibleSemesterHeader = row.querySelector("th.section_title");
    if (possibleSemesterHeader) {
      currentSemester = parseSemesterFromHeader(
        possibleSemesterHeader.textContent!.trim(),
      );
    }
    const cells = row.querySelectorAll("td");
    if (!cells.length) continue;

    // A NEW custom UUID for the course
    const courseId = crypto.randomUUID();
    results[courseId] = {
      id: courseId,
      status: getStatus(cells[0]),
      code: cells[0]?.textContent?.trim(),
      name: cells[1]?.textContent?.trim(),
      grade: cells[2]?.textContent?.trim(),
      type: cells[4]?.textContent?.trim() as CourseCompletionMethod,
      hours: parseInt((cells[5] as HTMLElement).innerText, 10),
      semester: currentSemester!,
    };
  }

  console.log("[Scraper] Scraped courses:", results);
  return results;
}

/**
 * Scrape requirement sections (#requirements table.results tbody.section)
 */
export function scrapeRequirementSections(
  sections: Element[],
  courses: Record<CourseId, Course>, // Required since have to share UUID between course and requirement rule
): AuditRequirement[] {
  const results: AuditRequirement[] = [];
  const coursesArr = Object.values(courses);

  for (const section of sections) {
    // Extract section title from the preceding thead
    let title = "Unknown Section";
    const parentTable = section.closest("table.results");
    if (parentTable) {
      const titleTh = parentTable.querySelector("thead th.section_title");
      if (titleTh) {
        // Try to get title from <a> tag first, fall back to direct th text
        const titleLink = titleTh.querySelector("a");
        title =
          (titleLink?.textContent || titleTh.textContent)?.trim() ||
          "Unknown Section";
      }
    }

    const rules: RequirementRule[] = [];
    const rows = Array.from(section.querySelectorAll("tr"));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.classList.contains("rule")) continue;

      const cells = row.querySelectorAll("td");
      if (cells.length < 6) continue;

      const rule: RequirementRule = {
        text: (cells[2] as HTMLElement).innerText.trim(),
        requiredHours: parseHours((cells[3] as HTMLElement).innerText),
        appliedHours: parseHours((cells[4] as HTMLElement).innerText),
        remainingHours: parseHours((cells[5] as HTMLElement).innerText),
        status: getRuleStatus(row.classList),
        courses: [],
      };

      // Parse details row (courses)
      const detailsRow = row.nextElementSibling;
      if (detailsRow?.classList.contains("details")) {
        const courseRows = detailsRow.querySelectorAll("table tbody tr");

        for (const courseRow of courseRows) {
          const courseCells = courseRow.querySelectorAll("td");
          if (courseCells.length < 6) continue;

          // ASSUMES THE COURSE CODE IS RELATIVELY UNIQUE
          console.log("[Scraper] Course arr:", coursesArr);
          const courseCode = (courseCells[0] as HTMLElement).innerText.trim();
          const courseId = coursesArr.find((c) => c.code === courseCode)?.id;
          if (courseId) {
            rule.courses.push(courseId);
          }
        }
      }

      rules.push(rule);
    }

    if (rules.length > 0) {
      results.push({ title, rule: rules });
    }
  }

  return results;
}
