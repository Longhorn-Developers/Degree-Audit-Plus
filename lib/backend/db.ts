import Dexie from "dexie";
import type { AuditRequirement, CatalogCourse, CoreArea } from "../general-types";
import { DEPARTMENT_MAP } from "../examples/data/department-map";

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

const CORE_CODE_TO_NAME: Partial<Record<string, CoreArea>> = {
  "090": "First-Year Signature Course",
  "010": "Communication",
  "040": "Humanities",
  "070": "American and Texas Government",
  "060": "U.S. History",
  "080": "Social and Behavioral Sciences",
  "020": "Mathematics",
  "030": "Natural Science and Technology, Part I",
  "093": "Natural Science and Technology, Part II",
  "050": "Visual and Performing Arts",
};

export function getCoreAreaFromRequirementRule(
  requirementTitle: string,
  ruleText: string,
): CoreArea | null {
  if (requirementTitle !== "Core Curriculum") {
    return null;
  }

  const coreCode = ruleText.match(/CORE \((\d{3})\)/)?.[1];
  return coreCode ? (CORE_CODE_TO_NAME[coreCode] ?? null) : null;
}

export function getMissingCoreRequirements(
  sections: AuditRequirement[],
): Partial<Record<CoreArea, number>> {
  const coreSection = sections.find(
    (section) => section.title === "Core Curriculum",
  );
  if (!coreSection) {
    return {};
  }

  return coreSection.rules.reduce<Partial<Record<CoreArea, number>>>(
    (missing, rule) => {
      const coreArea = getCoreAreaFromRequirementRule(coreSection.title, rule.text);

      if (coreArea && rule.remainingHours > 0) {
        missing[coreArea] = rule.remainingHours;
      }

      return missing;
    },
    {},
  );
}

export async function getSuggestedCoreCourses(
  sections: AuditRequirement[],
  maxSuggestions = 3,
): Promise<CatalogCourse[]> {
  const suggestionCount = Math.max(0, Math.floor(maxSuggestions));
  const missingCoreEntries = Object.entries(getMissingCoreRequirements(sections))
    .filter((entry): entry is [CoreArea, number] => entry[1] > 0)
    .sort((a, b) => b[1] - a[1]);

  if (suggestionCount === 0 || missingCoreEntries.length === 0) {
    return [];
  }

  const courseBuckets = await Promise.all(
    missingCoreEntries.map(([core]) => searchCores(suggestionCount, core)),
  );

  const suggestions: CatalogCourse[] = [];
  const seenCourseIds = new Set<number>();

  while (
    suggestions.length < suggestionCount &&
    courseBuckets.some((bucket) => bucket.length > 0)
  ) {
    for (const bucket of courseBuckets) {
      while (bucket.length > 0 && seenCourseIds.has(bucket[0].uniqueId)) {
        bucket.shift();
      }

      if (bucket.length === 0) {
        continue;
      }

      const nextCourse = bucket.shift()!;
      suggestions.push(nextCourse);
      seenCourseIds.add(nextCourse.uniqueId);

      if (suggestions.length === suggestionCount) {
        break;
      }
    }
  }

  return suggestions;
}

export function getSuggestedCoursesForRequirement(
  requirementTitle: string,
  ruleTitle: string,
  maxSuggestions = 3,
): Promise<CatalogCourse[]> {
  const coreArea = getCoreAreaFromRequirementRule(requirementTitle, ruleTitle);

  if (!coreArea) {
    return Promise.resolve([]);
  }

  return searchCores(maxSuggestions, coreArea);
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
