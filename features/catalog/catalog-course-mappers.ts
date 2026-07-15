import type { CatalogCourse } from "@/domain/catalog";
import {
  getCurrentSemester,
  type CourseCode,
  type PlannedCourseOutline,
} from "@/domain/course";

export function mapCatalogCourseToPreview(course: CatalogCourse) {
  return {
    code: `${course.department} ${course.number}`,
    name: course.fullName,
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

export function filterCatalogCourses(
  courses: CatalogCourse[],
  query: string,
): CatalogCourse[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return courses;

  return courses.filter((course) =>
    [
      `${course.department} ${course.number}`,
      course.fullName,
      course.courseName,
      course.instructors.map(({ fullName }) => fullName).join(" "),
    ].some((value) => value.toLowerCase().includes(normalizedQuery)),
  );
}
