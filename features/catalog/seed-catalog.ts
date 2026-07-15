import coursesUrl from "@/assets/ut-courses.json?url";
import type { CatalogCourse } from "@/domain/catalog";
import { db } from "./catalog-db";

const STORAGE_KEY = "db_seed_version";
const CURRENT_VERSION = coursesUrl;

export async function seedDatabase() {
  const lastSeededVersion = localStorage.getItem(STORAGE_KEY);
  const dbCount = await db.courses.count();

  if (lastSeededVersion !== CURRENT_VERSION || dbCount === 0) {
    try {
      const response = await fetch(coursesUrl);
      if (!response.ok) {
        throw new Error(
          `Catalog request failed with status ${response.status}`,
        );
      }
      const courses = (await response.json()) as CatalogCourse[];

      await db.courses.clear();
      await db.courses.bulkPut(courses);
      localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    } catch (error) {
      console.error("[DB] Seeding failed:", error);
    }
  }
}
