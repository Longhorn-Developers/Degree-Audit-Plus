import Dexie from "dexie";
import type { CatalogCourse } from "../general-types";

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
