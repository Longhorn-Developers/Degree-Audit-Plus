import type { SemesterSeason, Year } from "./course";

export type CatalogInstructionMode = "Online" | "In Person" | "Hybrid";
export type CatalogStatus = "OPEN" | "CLOSED" | "WAITLISTED" | "CANCELLED";

export interface CatalogSemester {
  year: Year;
  season: SemesterSeason;
  code: string;
}

export interface CatalogInstructor {
  fullName: string;
  firstName?: string;
  lastName?: string;
  middleInitial?: string;
}

export interface CatalogCourseScheduleEntry {
  days: string;
  hours: string;
  location: string;
}

export interface CatalogCourse {
  uniqueId: number;
  fullName: string;
  courseName: string;
  department: string;
  number: string;
  creditHours: number;
  status: CatalogStatus;
  isReserved: boolean;
  instructionMode: CatalogInstructionMode;
  instructors: CatalogInstructor[];
  schedule: CatalogCourseScheduleEntry[];
  flags: string[];
  core: string[];
  url: string;
  registerURL?: string;
  description: string[];
  semester: CatalogSemester;
  scrapedAt: number;
}

export type ScrapedCatalogCourse = Omit<CatalogCourse, "semester"> & {
  semester?: CatalogSemester;
};
