import coursesData from "@/assets/ut-courses.json";
import type { CatalogCourse } from "@/domain/catalog";
import { db } from "./catalog-db";

const STORAGE_KEY = "db_seed_version";
const courses = coursesData as CatalogCourse[];
const CURRENT_VERSION = `${courses[0]?.semester.code ?? "empty"}:${courses.length}:${courses.reduce(
  (latest, course) => Math.max(latest, course.scrapedAt),
  0,
)}`;

export async function seedDatabase() {
  // Check if we've already seeded this version
  const lastSeededVersion = localStorage.getItem(STORAGE_KEY);
  const dbCount = await db.courses.count();

  // Condition: Seed if version changed OR database is somehow empty
  if (lastSeededVersion !== CURRENT_VERSION || dbCount === 0) {
    try {
      await db.courses.clear();
      await db.courses.bulkPut(courses);
      localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    } catch (err) {
      console.error("[DB] Seeding failed:", err);
    }
  }
}
