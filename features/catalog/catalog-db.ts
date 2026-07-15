import Dexie from "dexie";
import type { CatalogCourse } from "@/domain/catalog";
import type { CoreArea } from "@/domain/course";
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
  const seenCourseCodes = new Set<string>();

  return courses
    .filter((course) => {
      const courseCode = `${course.department} ${course.number}`;
      if (seenCourseCodes.has(courseCode)) {
        return false;
      }

      seenCourseCodes.add(courseCode);
      return true;
    })
    .slice(0, limit);
}

function getDepartmentCodesByName(departmentName: string): string[] {
  return Object.entries(DEPARTMENT_MAP)
    .filter(([, name]) => name === departmentName)
    .map(([code]) => code);
}

// Searches catalog courses by text, department, and lower/upper division filters.
export function searchCatalogCourses(filters: {
  searchQuery: string;
  department: string;
  lowerDivision: boolean;
  upperDivision: boolean;
}): Promise<CatalogCourse[]> {
  // Normalize the search inputs once before filtering the collection.
  const normalizedQuery = filters.searchQuery.trim().toLowerCase();
  const departmentCodes = filters.department
    ? getDepartmentCodesByName(filters.department)
    : [];

  return db.courses
    .toCollection()
    .filter((course) => {
      // Match the search text against the catalog title fields.
      const matchesQuery =
        normalizedQuery.length === 0 ||
        course.fullName.toLowerCase().includes(normalizedQuery) ||
        course.courseName.toLowerCase().includes(normalizedQuery);

      // Match the selected department name against the stored department codes.
      const matchesDepartment =
        departmentCodes.length === 0 ||
        departmentCodes.includes(course.department);

      // Split lower vs upper division by the first digit in the course number.
      const courseLevel = Number(course.number[0]);
      const matchesDivision =
        filters.lowerDivision === filters.upperDivision ||
        (filters.lowerDivision && courseLevel >= 1 && courseLevel <= 3) ||
        (filters.upperDivision && courseLevel >= 4 && courseLevel <= 6);

      return matchesQuery && matchesDepartment && matchesDivision;
    })
    .toArray();
}
