/**
 * Audit Scraper - Functions for parsing audit data from DOM
 */

import type {
  CourseStatus,
  RequirementRule,
  RequirementSection,
} from "./general-types";

// --- Helper Functions ---

export function parseHours(text: string): number {
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

export function parseGPA(text: string): number {
  // Extract decimal number including digits after decimal point
  const match = text.match(/\d+\.?\d+/);
  return match ? parseFloat(match[0]) : 0;
}

export function parseCourseStatus(text: string): CourseStatus {
  if (text.includes("Applied")) return "Applied";
  if (text.includes("Planned")) return "Planned";
  if (text.includes("Progress")) return "In Progress";
  return "Unknown";
}

export function checkLoginRequired(doc: Document): boolean {
  return !!(
    doc.querySelector('form[action*="login"]') ||
    doc.querySelector('input[type="password"]')
  );
}

export function getRuleStatus(
  classList: DOMTokenList,
): "fulfilled" | "partial" | "unfulfilled" {
  if (classList.contains("fulfilled")) return "fulfilled";
  if (classList.contains("partial")) return "partial";
  return "unfulfilled";
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

/**
 * Scrape the coursework table
 */
export function scrapeCourseworkTable(table: Element): CourseworkData[] {
  const rows = table.querySelectorAll("tr:not(.alias)");
  const results: CourseworkData[] = [];

  for (const row of rows) {
    const cells = row.querySelectorAll("td");
    if (!cells.length) continue;

    results.push({
      course: cells[0]?.textContent?.trim(),
      title: cells[1]?.textContent?.trim(),
      grade: cells[2]?.textContent?.trim(),
      unique: cells[3]?.textContent?.trim(),
      type: cells[4]?.textContent?.trim(),
      creditHours: cells[5]?.textContent?.trim(),
      school: cells[6]?.textContent?.trim(),
    });
  }

  return results;
}

/**
 * Scrape requirement sections (#requirements table.results tbody.section)
 */
export function scrapeRequirementSections(
  sections: Element[],
): RequirementSection[] {
  const results: RequirementSection[] = [];

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

      // Check if this is a GPA section to use decimal parsing
      const isGPASection = title.toLowerCase().includes("gpa");

      const rule: RequirementRule = {
        text: (cells[2] as HTMLElement).innerText.trim(),
        requiredHours: isGPASection
          ? parseGPA((cells[3] as HTMLElement).innerText)
          : parseHours((cells[3] as HTMLElement).innerText),
        appliedHours: isGPASection
          ? parseGPA((cells[4] as HTMLElement).innerText)
          : parseHours((cells[4] as HTMLElement).innerText),
        remainingHours: isGPASection
          ? parseGPA((cells[5] as HTMLElement).innerText)
          : parseHours((cells[5] as HTMLElement).innerText),
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

          rule.courses.push({
            code: (courseCells[0] as HTMLElement).innerText.trim(),
            name: (courseCells[1] as HTMLElement).innerText.trim(),
            grade:
              (courseCells[2] as HTMLElement).innerText.trim() || undefined,
            semester: (courseCells[3] as HTMLElement).innerText.trim(),
            uniqueNumber: (courseCells[4] as HTMLElement).innerText.trim(),
            status: parseCourseStatus(
              (courseCells[courseCells.length - 1] as HTMLElement).innerText,
            ),
            hours:
              parseInt(
                (courseCells[courseCells.length - 2] as HTMLElement).innerText,
                10,
              ) || undefined,
          });
        }
      }

      rules.push(rule);
    }

    if (rules.length > 0) {
      results.push({ title, rules });
    }
  }

  return results;
}
