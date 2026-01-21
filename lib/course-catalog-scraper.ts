/**
 * Course Catalog Scraper
 * Scrapes course data from UT Austin's course schedule pages.
 *
 * URL: https://utdirect.utexas.edu/apps/registrar/course_schedule/{semester}/results/
 */

// --- Types ---

export type InstructionMode = "Online" | "In Person" | "Hybrid";
export type StatusType = "OPEN" | "CLOSED" | "WAITLISTED" | "CANCELLED";

export interface Semester {
  year: number;
  season: "Fall" | "Spring" | "Summer";
  code: string;
}

export interface Instructor {
  fullName: string;
  firstName?: string;
  lastName?: string;
  middleInitial?: string;
}

export interface CourseMeeting {
  days: string;
  hours: string;
  location: string;
}

export interface ScrapedCourse {
  uniqueId: number;
  fullName: string;
  courseName: string;
  department: string;
  number: string;
  creditHours: number;
  status: StatusType;
  isReserved: boolean;
  instructionMode: InstructionMode;
  instructors: Instructor[];
  schedule: CourseMeeting[];
  flags: string[];
  core: string[];
  url: string;
  registerURL?: string;
  description: string[];
  semester?: Semester;
  scrapedAt: number;
}

export interface ScrapedRow {
  element: Element;
  course: ScrapedCourse | null;
}

// --- Selectors ---

const TableDataSelector = {
  COURSE_HEADER: "td.course_header",
  UNIQUE_ID: 'td[data-th="Unique"]',
  REGISTER_URL: 'td[data-th="Add"] a',
  INSTRUCTORS: 'td[data-th="Instructor"] span',
  INSTRUCTION_MODE: 'td[data-th="Instruction Mode"]',
  STATUS: 'td[data-th="Status"]',
  SCHEDULE_DAYS: 'td[data-th="Days"]>span',
  SCHEDULE_HOURS: 'td[data-th="Hour"]>span',
  SCHEDULE_LOCATION: 'td[data-th="Room"]>span',
  FLAGS: 'td[data-th="Flags"] ul li',
  CORE_CURRICULUM: 'td[data-th="Core"] ul li',
} as const;

const DetailsSelector = {
  COURSE_NAME: "#details h2",
  COURSE_DESCRIPTION: "#details p",
} as const;

// --- Scraper Class ---

export class CourseCatalogScraper {
  private doc: Document;
  private url: string;

  constructor(doc: Document, url = "") {
    this.doc = doc;
    this.url = url;
  }

  /**
   * Scrape courses from table rows
   * @param rows - Table rows from the course catalog
   * @param keepHeaders - Whether to include header rows in output (for UI injection)
   */
  scrape(rows: Element[], keepHeaders = false): ScrapedRow[] {
    const results: ScrapedRow[] = [];
    let fullName = this.getFullName();

    for (const row of rows) {
      // Header row - contains course name like "C S 314 DATA STRUCTURES"
      if (this.isHeaderRow(row)) {
        fullName = this.getFullName(row);
        if (keepHeaders) {
          results.push({ element: row, course: null });
        }
        continue;
      }

      if (!fullName) {
        throw new Error("Course name not found");
      }

      fullName = fullName.replace(/\s\s+/g, " ").trim();

      const [courseName, department, number] =
        CourseCatalogScraper.separateCourseName(fullName);
      const [status, isReserved] = this.getStatus(row);

      const course: ScrapedCourse = {
        uniqueId: this.getUniqueId(row),
        fullName,
        courseName,
        department,
        number,
        creditHours: this.getCreditHours(number),
        status,
        isReserved,
        instructionMode: this.getInstructionMode(row),
        instructors: this.getInstructors(row),
        schedule: this.getSchedule(row),
        flags: this.getFlags(row),
        core: this.getCore(row),
        url: this.getURL(row),
        registerURL: this.getRegisterURL(row),
        description: this.getDescription(),
        semester: this.getSemester(),
        scrapedAt: Date.now(),
      };

      results.push({ element: row, course });
    }

    return results;
  }

  /**
   * Separate "C S 314H DATA STRUCTURES" into ["DATA STRUCTURES", "C S", "314H"]
   */
  static separateCourseName(courseFullName: string): [string, string, string] {
    const courseNumberIndex = courseFullName.search(/\w?\d/);
    if (courseNumberIndex === -1) {
      throw new Error("Course name doesn't have a course number");
    }

    const department = courseFullName.substring(0, courseNumberIndex).trim();
    const number = courseFullName
      .substring(
        courseNumberIndex,
        courseFullName.indexOf(" ", courseNumberIndex),
      )
      .trim();
    const courseName = courseFullName
      .substring(courseFullName.indexOf(" ", courseNumberIndex))
      .trim();

    return [courseName, department, number];
  }

  private isHeaderRow(row: Element): boolean {
    return row.querySelector(TableDataSelector.COURSE_HEADER) !== null;
  }

  private getFullName(row?: Element): string {
    if (!row) {
      return (
        this.doc.querySelector(DetailsSelector.COURSE_NAME)?.textContent || ""
      );
    }
    return (
      row.querySelector(TableDataSelector.COURSE_HEADER)?.textContent || ""
    );
  }

  private getUniqueId(row: Element): number {
    const cell = row.querySelector(TableDataSelector.UNIQUE_ID);
    if (!cell) throw new Error("Unique ID not found");
    return Number(cell.textContent) || 0;
  }

  private getURL(row: Element): string {
    const link = row.querySelector<HTMLAnchorElement>(
      `${TableDataSelector.UNIQUE_ID} a`,
    );
    return link?.href || this.url;
  }

  private getRegisterURL(row: Element): string | undefined {
    const link = row.querySelector<HTMLAnchorElement>(
      TableDataSelector.REGISTER_URL,
    );
    return link?.href;
  }

  private getStatus(row: Element): [StatusType, boolean] {
    const cell = row.querySelector(TableDataSelector.STATUS);
    if (!cell) throw new Error("Status not found");

    const text = (cell.textContent || "").trim().toLowerCase();
    if (!text) throw new Error("Status not found");

    const isReserved = text.includes("reserved");

    if (text.includes("open")) return ["OPEN", isReserved];
    if (text.includes("closed")) return ["CLOSED", isReserved];
    if (text.includes("waitlisted")) return ["WAITLISTED", isReserved];
    if (text.includes("cancelled")) return ["CANCELLED", isReserved];

    throw new Error(`Unknown status: ${text}`);
  }

  private getInstructionMode(row: Element): InstructionMode {
    const text = (
      row.querySelector(TableDataSelector.INSTRUCTION_MODE)?.textContent || ""
    ).toLowerCase();
    if (text.includes("internet")) return "Online";
    if (text.includes("hybrid")) return "Hybrid";
    return "In Person";
  }

  private getInstructors(row: Element): Instructor[] {
    const spans = row.querySelectorAll(TableDataSelector.INSTRUCTORS);
    return Array.from(spans)
      .map((span) => span.textContent?.trim())
      .filter(Boolean)
      .map((name) => {
        const [lastName, rest = ""] = name!.split(",").map((s) => s.trim());
        const [firstName, middleInitial] = rest.split(" ");
        return { fullName: name!, firstName, lastName, middleInitial };
      });
  }

  private getCreditHours(courseNumber: string): number {
    let hours = Number(courseNumber[0]) || 3;
    const suffix = courseNumber.slice(-1);
    if (["A", "B"].includes(suffix)) hours /= 2;
    if (["X", "Y", "Z"].includes(suffix)) hours /= 3;
    return hours;
  }

  private getSchedule(row: Element): CourseMeeting[] {
    const days = row.querySelectorAll(TableDataSelector.SCHEDULE_DAYS);
    const hours = row.querySelectorAll(TableDataSelector.SCHEDULE_HOURS);
    const rooms = row.querySelectorAll(TableDataSelector.SCHEDULE_LOCATION);

    if (days.length !== hours.length) {
      throw new Error("Schedule data is malformed");
    }

    const meetings: CourseMeeting[] = [];
    for (let i = 0; i < days.length; i++) {
      meetings.push({
        days: days[i]?.textContent || "",
        hours: hours[i]?.textContent || "",
        location: rooms[i]?.textContent || "",
      });
    }
    return meetings;
  }

  private getFlags(row: Element): string[] {
    const items = row.querySelectorAll(TableDataSelector.FLAGS);
    return Array.from(items)
      .map((el) => el.textContent || "")
      .filter(Boolean);
  }

  private getCore(row: Element): string[] {
    const items = row.querySelectorAll(TableDataSelector.CORE_CURRICULUM);
    return Array.from(items)
      .filter(
        (el) => el.getAttribute("title") !== " core curriculum requirement",
      )
      .map((el) => el.textContent || "")
      .filter(Boolean);
  }

  private getDescription(): string[] {
    const paragraphs = this.doc.querySelectorAll(
      DetailsSelector.COURSE_DESCRIPTION,
    );
    return Array.from(paragraphs)
      .map((p) => p.textContent || "")
      .map((text) => text.replace(/\s\s+/g, " ").trim())
      .filter(Boolean);
  }

  private getSemester(): Semester | undefined {
    if (!this.url) return undefined;
    try {
      const code = new URL(this.url).pathname.split("/")[4];
      if (!code || code.length < 5) return undefined;

      const year = Number(code.substring(0, 4));
      const seasonCode = Number(code.substring(4));
      const seasons: Record<number, Semester["season"]> = {
        2: "Spring",
        6: "Summer",
        9: "Fall",
      };

      return seasons[seasonCode]
        ? { year, season: seasons[seasonCode], code }
        : undefined;
    } catch {
      return undefined;
    }
  }
}

// --- Fetch & Scrape ---

/**
 * Fetch HTML from UT course catalog and scrape courses
 * @param semester - Semester code like "20259" (Fall 2025)
 * @param department - Department code like "C S"
 * @param level - "U" for undergraduate, "G" for graduate
 */
export async function fetchAndScrapeCourses(
  semester: string,
  department: string,
  level: "U" | "G" = "U",
): Promise<ScrapedCourse[]> {
  const url = `https://utdirect.utexas.edu/apps/registrar/course_schedule/${semester}/results/?fos_fl=${encodeURIComponent(department)}&level=${level}&search_type_main=FIELD`;

  console.log(`Fetching: ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch: ${response.status} ${response.statusText}`,
    );
  }

  const html = await response.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const scraper = new CourseCatalogScraper(doc, url);
  const rows = Array.from(doc.querySelectorAll("table tbody tr")) as Element[];
  const results = scraper.scrape(rows);

  return results
    .filter((r) => r.course !== null)
    .map((r) => r.course as ScrapedCourse);
}

// --- CLI Runner ---

const semester = "20259"; // Fall 2025
const department = "C S";

console.log(`Scraping ${department} courses for semester ${semester}...\n`);

fetchAndScrapeCourses(semester, department)
  .then((courses) => {
    // console.log(`Found ${courses.length} courses:\n`);
    // console.log(JSON.stringify(courses, null, 2));
  })
  .catch((err) => {
    console.error("Error:", err.message);
    console.log("\nNote: UT course catalog may require authentication.");
  });
