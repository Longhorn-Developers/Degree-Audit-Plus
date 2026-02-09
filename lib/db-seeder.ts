import { db } from "./db";
import coursesData from "@/assets/ut-courses.json";

const STORAGE_KEY = "db_seed_version";
const CURRENT_VERSION = "20259-v1"; // Incremented manually when json changes

export async function seedDatabase() {
  // Check if we've already seeded this version
  const lastSeededVersion = localStorage.getItem(STORAGE_KEY);
  const dbCount = await db.courses.count();

  // Condition: Seed if version changed OR database is somehow empty
  if (lastSeededVersion !== CURRENT_VERSION || dbCount === 0) {
    console.log(`[DB] Seeding database (Version: ${CURRENT_VERSION})...`);

    try {
      const courses = coursesData as any[];
      await db.courses.clear();
      await db.courses.bulkPut(courses);
      localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
      console.log(`[DB] Successfully seeded ${courses.length} courses!`);
    } catch (err) {
      console.error("[DB] Seeding failed:", err);
    }
  } else {
    console.log("[DB] Database is up to date.");
  }
}
