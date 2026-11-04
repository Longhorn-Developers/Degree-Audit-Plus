import type { CatalogCourse } from "@/domain/catalog";
import {
  getCurrentSemester,
  type CourseCode,
  type PlannedCourseOutline,
} from "@/domain/course";

export function mapCatalogCourseToPreview(course: CatalogCourse) {
  return {
    code: `${course.department} ${course.number}`,
    name: course.courseName,
  };
}

export function dedupeCatalogCoursesByCode(
  courses: CatalogCourse[],
): CatalogCourse[] {
  const seen = new Set<string>();
  return courses.filter((course) => {
    const code = `${course.department} ${course.number}`.trim();
    if (seen.has(code)) return false;
    seen.add(code);
    return true;
  });
}

export function dedupeCatalogCoursesByCodeAndTitle(
  courses: CatalogCourse[],
): CatalogCourse[] {
  const coursesById = new Map<string, CatalogCourse>();
  for (const course of courses) {
    const courseId = `${course.department} ${course.number} ${course.courseName}`;
    const existing = coursesById.get(courseId);
    if (!existing) {
      coursesById.set(courseId, {
        ...course,
        instructors: [...course.instructors],
      });
      continue;
    }

    for (const instructor of course.instructors) {
      const isListed = existing.instructors.some(
        ({ fullName }) => fullName === instructor.fullName,
      );
      if (!isListed) existing.instructors.push(instructor);
    }
  }
  return [...coursesById.values()];
}

export function catalogCourseToPlannedCourse(
  course: CatalogCourse,
): PlannedCourseOutline {
  return {
    code: `${course.department} ${course.number}` as CourseCode,
    name: course.fullName,
    hours: course.creditHours,
    semester: getCurrentSemester(),
    status: "Planned",
    type: "In-Residence",
  };
}

// Matches a catalog course against an already-normalized (trimmed, lowercased)
// query across code, title, short name, and instructor names. Shared by the
// in-memory filter and the Dexie-backed search so both stay in sync.
export function matchesCatalogQuery(
  course: CatalogCourse,
  normalizedQuery: string,
): boolean {
  if (!normalizedQuery) return true;

  return [
    `${course.department} ${course.number}`,
    course.fullName,
    course.courseName,
    course.instructors.map(({ fullName }) => fullName).join(" "),
  ].some((value) => value.toLowerCase().includes(normalizedQuery));
}

export function filterCatalogCourses(
  courses: CatalogCourse[],
  query: string,
): CatalogCourse[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return courses;

  return courses.filter((course) =>
    matchesCatalogQuery(course, normalizedQuery),
  );
}
