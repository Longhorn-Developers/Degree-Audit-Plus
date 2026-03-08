// This file provides functions for interacting with the browser's local storage
// to save, retrieve, and clear the user's degree audit history.

import { browser } from "wxt/browser";
import type {
  AuditHistoryData,
  CachedAuditData,
  CourseId,
  DegreeAuditCardProps,
  PlannedCourseOutline,
} from "../general-types";

const STORAGE_KEY = "auditHistory";

// save audit history to broswer.
export async function saveAuditHistory(
  audits: DegreeAuditCardProps[],
  error?: string,
): Promise<void> {
  const data: AuditHistoryData = {
    audits,
    timestamp: Date.now(),
    error,
  };

  try {
    await browser.storage.local.set({ [STORAGE_KEY]: data });
  } catch (e) {
    console.error("Failed to save audit history to storage:", e);
    throw e;
  }
}

/**
 * Adds a course to the audit history.
 * @param auditId - The ID of the audit to add the course to.
 * @param course - A course with the status "Planned" and no id.
 * @param requirementTitle - The title of the requirement to add the course to.
 * @param ruleTitle - The title of the rule to add the course to.
 * @returns True if the course was added successfully, false otherwise.
 */
export async function addPlannedCourse(
  auditId: string,
  course: PlannedCourseOutline,
  requirementTitle: string,
  ruleTitle: string,
): Promise<CourseId | null> {
  try {
    // Get the correct rule's courses and error handle along the way
    const auditData = await getAuditData(auditId);
    if (!auditData) {
      console.error("Audit data not found for auditId:", auditId);
      return null;
    }
    const { courses, requirements } = auditData;

    const requirement = requirements.find(
      (requirement) => requirement.title === requirementTitle,
    );
    if (!requirement) {
      console.error("Requirement not found for auditId:", auditId);
      return null;
    }
    const rule = requirement.rules.find((rule) => rule.text === ruleTitle);
    if (!rule) {
      console.error("Rule not found for auditId:", auditId);
      return null;
    }

    // Add the course to the rule's courses
    const courseId = crypto.randomUUID();
    rule.courses.push(courseId);
    courses[courseId] = { ...course, id: courseId };
    await saveAuditData(auditId, auditData);
    return courseId;
  } catch (e) {
    console.error("Failed to add course to audit history:", e);
    return null;
  }
}

/**
 * Removes a PLANNED course from the audit history.
 *
 * @param auditId - The ID of the audit to remove the course from.
 * @param course - The course to remove from the audit history.
 * @param requirementTitle - The title of the requirement to remove the course from.
 * @param ruleTitle - The title of the rule to remove the course from.
 * @returns True if the course was removed successfully, false otherwise.
 */
// TODO: Implement with new course, sections dynamic
export async function removePlannedCourse(
  auditId: string,
  courseId: CourseId,
): Promise<boolean> {
  try {
    // Get the correct rule's courses and error handle along the way
    const auditData = await getAuditData(auditId);
    if (!auditData) {
      console.error("Audit data not found for auditId:", auditId);
      return false;
    }
    const { courses, requirements } = auditData;
    const course = courses[courseId];
    if (!course || course.status !== "Planned") {
      console.error(
        "Course not found or not planned for courseId:",
        courseId,
        course,
      );
      return false;
    }
    delete courses[courseId];

    for (const requirement of requirements) {
      for (const rule of requirement.rules) {
        rule.courses = rule.courses.filter((c) => c !== courseId);
      }
    }
    await saveAuditData(auditId, auditData);
    return true;
  } catch (e) {
    console.error("Failed to add course to audit history:", e);
    return false;
  }
}

/**
 * Wipes all planned courses from the audit history.
 *
 * @param auditId - The ID of the audit to wipe the courses from.
 * @returns The number of courses wiped successfully.
 */
export async function wipeAllPlannedCourses(auditId: string): Promise<number> {
  try {
    const auditData = await getAuditData(auditId);
    if (!auditData) {
      console.error("Audit data not found for auditId:", auditId);
      return 0;
    }
    const { courses, requirements } = auditData;
    let totalRemoved = 0;
    for (const course of Object.values(courses)) {
      if (course.status === "Planned") {
        delete courses[course.id];
        totalRemoved++;
      }
    }

    for (const requirement of requirements) {
      for (const rule of requirement.rules) {
        // Remove all course ids that are not in the courses object (the ones that just got removed)
        rule.courses = rule.courses.filter((c) => courses[c]);
      }
    }
    await saveAuditData(auditId, auditData);
    return totalRemoved;
  } catch (e) {
    console.error("Failed to access audit data for auditId:", auditId, e);
    return 0;
  }
}

// if in history, get
export async function getAuditHistory(): Promise<AuditHistoryData | null> {
  try {
    const result = await browser.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || null;
  } catch (e) {
    console.error("Failed to get audit history from storage:", e);
    return null;
  }
}

// clears broswer history (for later)
export async function clearAuditHistory(): Promise<void> {
  try {
    await browser.storage.local.remove(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear audit history from storage:", e);
    throw e;
  }
}

// ---- Audit Data Cache (per auditId) ----
const AUDIT_DATA_PREFIX = "auditData_";
// TODO: Reimplement with new course, sections dynamic
// export async function addPlannedCourse(
//   auditId: string,
//   data: CachedAuditData,
//   course: Course,
//   requirementTitle: string,
//   ruleTitle: string,
// ): Promise<void> {
//   try {
//     data.requirements
//       .find((requirement) => requirement.title === requirementTitle)
//       ?.rules.find((rule) => rule.text === ruleTitle)
//       ?.courses?.push(course);
//     await saveAuditData(auditId, data);
//   } catch (e) {
//     console.error("Failed to save audit data to storage:", e);
//   }
// }

// Save scraped audit data (requirements + courses) to cache
export async function saveAuditData(
  auditId: string,
  data: CachedAuditData,
): Promise<void> {
  try {
    const key = `${AUDIT_DATA_PREFIX}${auditId}`;
    console.log(`[Storage] Saving audit data for key: ${key}`);
    console.log(
      `[Storage] Data to save: ${data.requirements?.length || 0} requirements, ${data.courses?.length || 0} courses`,
      data,
    );
    await browser.storage.local.set({
      [key]: data,
    });
    console.log(`[Storage] Successfully saved audit data for: ${auditId}`);

    // Verify it was saved
    const verify = await browser.storage.local.get(key);
    console.log(`[Storage] Verification - data exists: ${!!verify[key]}`);
  } catch (e) {
    console.error("Failed to save audit data to storage:", e);
  }
}

// Get cached audit data (returns null if not cached)
export async function getAuditData(
  auditId: string,
): Promise<CachedAuditData | null> {
  try {
    const key = `${AUDIT_DATA_PREFIX}${auditId}`;
    console.log(`[Storage] Getting audit data for key: ${key}`);
    const result = await browser.storage.local.get(key);
    const data = result[key] || null;
    console.log(
      `[Storage] Retrieved for ${key}:`,
      data
        ? `Found (${data.requirements?.length || 0} requirements, ${data.courses?.length || 0} courses)`
        : "NOT FOUND",
    );
    return data;
  } catch (e) {
    console.error("Failed to get audit data from storage:", e);
    return null;
  }
}

// Get list of audit IDs that are not yet cached
export async function getUncachedAuditIds(
  auditIds: string[],
): Promise<string[]> {
  const uncached: string[] = [];
  for (const id of auditIds) {
    const cached = await getAuditData(id);
    if (!cached) uncached.push(id);
  }
  return uncached;
}
