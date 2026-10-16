// fills the catalog into add-all.template.js and prints the paste-ready snippet
// usage: bun scripts/planner/build-add-all.ts | pbcopy
import { readFile } from "node:fs/promises";
import type { CatalogCourse } from "../../domain/catalog";

const catalogPath = new URL("../../assets/ut-courses.json", import.meta.url);
const templatePath = new URL("./add-all.template.js", import.meta.url);

const courses: CatalogCourse[] = JSON.parse(
  await readFile(catalogPath, "utf8"),
);
const template = await readFile(templatePath, "utf8");
console.log(
  template.replace(
    "const CATALOG = {};",
    `const CATALOG = ${JSON.stringify(numbersByDepartment(courses))};`,
  ),
);

// { "C S": ["312", "314", ...] } with each course number once, sorted
function numbersByDepartment(
  courses: CatalogCourse[],
): Record<string, string[]> {
  const byDept = new Map<string, Set<string>>();
  for (const course of courses) {
    const dept = course.department.trim();
    if (!byDept.has(dept)) byDept.set(dept, new Set());
    byDept.get(dept)!.add(course.number.trim().toUpperCase());
  }
  const sorted = [...byDept.keys()].sort();
  return Object.fromEntries(
    sorted.map((dept) => [dept, [...byDept.get(dept)!].sort()]),
  );
}
