import Dexie from "dexie";
import type { CatalogCourse, CoreArea } from "../general-types";

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
