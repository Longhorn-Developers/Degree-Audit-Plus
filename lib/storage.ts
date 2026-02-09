// This file provides functions for interacting with the browser's local storage
// to save, retrieve, and clear the user's degree audit history.

import { browser } from "wxt/browser";
import type {
  AuditHistoryData,
  CourseRowData,
  DegreeAuditCardProps,
  RequirementSection,
} from "./general-types";

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
 * @param course - The course to add to the audit history.
 * @param requirementTitle - The title of the requirement to add the course to.
 * @param ruleTitle - The title of the rule to add the course to.
 * @returns True if the course was added successfully, false otherwise.
 */
export async function addCourse(
  auditId: string,
  course: CourseRowData,
  requirementTitle: string,
  ruleTitle: string,
): Promise<boolean> {
  course.status = "Planned"; // force status to planned to avoid being unable to remove
  try {
    // Get the correct rule's courses and error handle along the way
    const auditData = await getAuditData(auditId);
    if (!auditData) {
      console.error("Audit data not found for auditId:", auditId);
      return false;
    }
    const requirement = auditData.requirements.find(
      (requirement) => requirement.title === requirementTitle,
    );
    if (!requirement) {
      console.error("Requirement not found for auditId:", auditId);
      return false;
    }
    const rule = requirement.rules.find((rule) => rule.text === ruleTitle);
    if (!rule) {
      console.error("Rule not found for auditId:", auditId);
      return false;
    }

    // Add the course to the rule's courses
    rule.courses.push(course);
    await saveAuditData(auditId, auditData);
    return true;
  } catch (e) {
    console.error("Failed to add course to audit history:", e);
    return false;
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
export async function removeCourse(
  auditId: string,
  course: CourseRowData,
  requirementTitle: string,
  ruleTitle: string,
): Promise<boolean> {
  try {
    // Get the correct rule's courses and error handle along the way
    const auditData = await getAuditData(auditId);
    if (!auditData) {
      console.error("Audit data not found for auditId:", auditId);
      return false;
    }
    const requirement = auditData.requirements.find(
      (requirement) => requirement.title === requirementTitle,
    );
    if (!requirement) {
      console.error("Requirement not found for auditId:", auditId);
      return false;
    }
    const rule = requirement.rules.find((rule) => rule.text === ruleTitle);
    if (!rule) {
      console.error("Rule not found for auditId:", auditId);
      return false;
    }

    // Remove the course from the rule's courses
    const sizeBefore = rule.courses.length;
    rule.courses = rule.courses.filter(
      (c) => c.code !== course.code && c.status === "Planned",
    );

    // If no course was removed, return false
    const sizeAfter = rule.courses.length;
    if (sizeBefore === sizeAfter) {
      console.error(
        "Course either not found or not planned and therefore cannot be removed for auditId:",
        auditId,
        course,
      );
      return false;
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
    let totalRemoved = 0;
    for (const requirement of auditData.requirements) {
      for (const rule of requirement.rules) {
        const sizeBefore = rule.courses.length;
        rule.courses = rule.courses.filter((c) => c.status !== "Planned");
        totalRemoved += sizeBefore - rule.courses.length;
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

export interface CachedAuditData {
  requirements: RequirementSection[];
  courses: any[]; // Raw course data from scraper
}

export async function addPlannedCourse(
  auditId: string,
  data: CachedAuditData,
  course: CourseRowData,
  requirementTitle: string,
  ruleTitle: string,
): Promise<void> {
  try {
    data.requirements
      .find((requirement) => requirement.title === requirementTitle)
      ?.rules.find((rule) => rule.text === ruleTitle)
      ?.courses?.push(course);
    await saveAuditData(auditId, data);
  } catch (e) {
    console.error("Failed to save audit data to storage:", e);
  }
}

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
