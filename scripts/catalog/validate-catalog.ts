import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { CatalogCourse } from "../../domain/catalog";

const defaultCatalogPath = fileURLToPath(
  new URL("../../assets/ut-courses.json", import.meta.url),
);
const statuses = new Set(["OPEN", "CLOSED", "WAITLISTED", "CANCELLED"]);
const instructionModes = new Set(["Online", "In Person", "Hybrid"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

export function validateCatalog(
  value: unknown,
  expectedSemester?: string,
): asserts value is CatalogCourse[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Catalog must contain at least one course");
  }

  const uniqueIds = new Set<number>();
  value.forEach((course, index) => {
    if (!isRecord(course)) throw new Error(`Course ${index} is not an object`);

    const requiredStrings = [
      "fullName",
      "courseName",
      "department",
      "number",
      "url",
    ] as const;
    if (requiredStrings.some((field) => typeof course[field] !== "string")) {
      throw new Error(`Course ${index} has an invalid required string field`);
    }
    if (
      typeof course.uniqueId !== "number" ||
      course.uniqueId <= 0 ||
      uniqueIds.has(course.uniqueId)
    ) {
      throw new Error(`Course ${index} has an invalid or duplicate uniqueId`);
    }
    uniqueIds.add(course.uniqueId);

    if (
      typeof course.creditHours !== "number" ||
      typeof course.isReserved !== "boolean" ||
      typeof course.scrapedAt !== "number" ||
      !statuses.has(String(course.status)) ||
      !instructionModes.has(String(course.instructionMode)) ||
      !isStringArray(course.flags) ||
      !isStringArray(course.core) ||
      !isStringArray(course.description) ||
      !Array.isArray(course.instructors) ||
      !course.instructors.every(
        (instructor) =>
          isRecord(instructor) && typeof instructor.fullName === "string",
      ) ||
      !Array.isArray(course.schedule) ||
      !course.schedule.every(
        (meeting) =>
          isRecord(meeting) &&
          typeof meeting.days === "string" &&
          typeof meeting.hours === "string" &&
          typeof meeting.location === "string",
      )
    ) {
      throw new Error(`Course ${index} has an invalid catalog shape`);
    }

    if (
      !isRecord(course.semester) ||
      typeof course.semester.year !== "number" ||
      typeof course.semester.season !== "string" ||
      typeof course.semester.code !== "string" ||
      (expectedSemester && course.semester.code !== expectedSemester)
    ) {
      throw new Error(`Course ${index} has invalid semester data`);
    }
  });
}

export async function validateCatalogFile(path = defaultCatalogPath) {
  const catalog: unknown = JSON.parse(await readFile(path, "utf8"));
  validateCatalog(catalog);
  return catalog;
}

if (import.meta.main) {
  const catalog = await validateCatalogFile(process.argv[2]);
  console.log(`Validated ${catalog.length} catalog courses.`);
}
