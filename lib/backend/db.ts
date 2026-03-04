import Dexie from "dexie";
import { Course } from "../general-types";
export class UTDatabase extends Dexie {
  courses!: Dexie.Table<Course, number>;

  constructor() {
    super("UTCoursesDB");
    this.version(2).stores({
      courses: "uniqueId, department, number, fullName, semester.code",
    });
  }
}

export const db = new UTDatabase();
