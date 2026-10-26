import Dexie from "dexie";
import type { CatalogCourse } from "@/domain/catalog";
import type { CoreArea } from "@/domain/course";
import {
  dedupeCatalogCoursesByCode,
  dedupeCatalogCoursesByCodeAndTitle,
} from "./catalog-course-mappers";
import { DEPARTMENT_MAP } from "./department-map";

export class UTDatabase extends Dexie {
  courses!: Dexie.Table<CatalogCourse, number>;

  constructor() {
    super("UTCoursesDB");
    // IndexedDB persists the full catalog record; this schema only defines indexes.
    this.version(3).stores({
      courses:
        "uniqueId, [department+number], fullName, courseName, department, number, creditHours, status, isReserved, instructionMode, *flags, *core, url, scrapedAt, semester.code",
    });
  }
}

export const db = new UTDatabase();

// Accepts one allowed core area string and returns a Promise<CatalogCourse[]> of all matching courses.
export function findCoursesByCore(core: CoreArea): Promise<CatalogCourse[]> {
  return db.courses.where("core").equals(core).toArray();
}

// Returns up to n catalog courses that satisfy the given core requirement.
export async function searchCores(
  n: number,
  core: CoreArea,
): Promise<CatalogCourse[]> {
  const limit = Math.max(0, Math.floor(n));
  if (limit === 0) {
    return [];
  }

  const courses = await findCoursesByCore(core);

  return dedupeCatalogCoursesByCode(courses).slice(0, limit);
}

function getDepartmentCodesByName(departmentName: string): string[] {
  const mappedCodes = Object.entries(DEPARTMENT_MAP)
    .filter(([, name]) => name === departmentName)
    .map(([code]) => code);

  // A catalog refresh can introduce a code before the display-name map is
  // updated. Keep that code searchable instead of accidentally matching every
  // department.
  return mappedCodes.length > 0 ? mappedCodes : [departmentName];
}

// Use the IndexedDB catalog as the source of truth for the search picker so
// users only choose departments that have locally available courses.
export async function getCatalogDepartmentNames(): Promise<string[]> {
  const departmentCodes = await db.courses.orderBy("department").uniqueKeys();

  return [
    ...new Set(
      departmentCodes.map(
        (code) => DEPARTMENT_MAP[String(code)] ?? String(code),
      ),
    ),
  ].sort((left, right) => left.localeCompare(right));
}

// Searches catalog courses by text, department, and lower/upper division filters.
export function searchCatalogCourses(filters: {
  department: string;
  courseLevel: "undergraduate" | "lowerDivision" | "upperDivision" | "graduate";
}): Promise<CatalogCourse[]> {
  const departmentCodes = filters.department
    ? getDepartmentCodesByName(filters.department)
    : [];

  return db.courses
    .toCollection()
    .filter((course) => {
      // Match the selected department name against the stored department codes.
      const matchesDepartment =
        departmentCodes.length === 0 ||
        departmentCodes.includes(course.department);

      // IDA Planner groups course levels by catalog number: 301-379 are
      // undergraduate (301-319 lower, 320-379 upper), while 380+ are graduate.
      const catalogNumber = Number(course.number.match(/\d{3}/)?.[0]);
      const matchesCourseLevel =
        (filters.courseLevel === "undergraduate" &&
          catalogNumber >= 301 &&
          catalogNumber <= 379) ||
        (filters.courseLevel === "lowerDivision" &&
          catalogNumber >= 301 &&
          catalogNumber <= 319) ||
        (filters.courseLevel === "upperDivision" &&
          catalogNumber >= 320 &&
          catalogNumber <= 379) ||
        (filters.courseLevel === "graduate" && catalogNumber >= 380);

      return matchesDepartment && matchesCourseLevel;
    })
    .toArray()
    .then(dedupeCatalogCoursesByCodeAndTitle);
}
