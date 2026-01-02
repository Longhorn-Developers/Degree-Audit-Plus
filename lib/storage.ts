// This file provides functions for interacting with the browser's local storage
// to save, retrieve, and clear the user's degree audit history.

import { browser } from "wxt/browser";
import type { AuditHistoryData, DegreeAuditCardProps, RequirementSection } from "./general-types";

const STORAGE_KEY = "auditHistory";

// save audit history to broswer.
export async function saveAuditHistory(
  audits: DegreeAuditCardProps[],
  error?: string
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

// Save scraped audit data (requirements + courses) to cache
export async function saveAuditData(
  auditId: string,
  data: CachedAuditData
): Promise<void> {
  try {
    const key = `${AUDIT_DATA_PREFIX}${auditId}`;
    console.log(`[Storage] Saving audit data for key: ${key}`);
    console.log(`[Storage] Data to save: ${data.requirements?.length || 0} requirements, ${data.courses?.length || 0} courses`);
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
  auditId: string
): Promise<CachedAuditData | null> {
  try {
    const key = `${AUDIT_DATA_PREFIX}${auditId}`;
    console.log(`[Storage] Getting audit data for key: ${key}`);
    const result = await browser.storage.local.get(key);
    const data = result[key] || null;
    console.log(`[Storage] Retrieved for ${key}:`, data ? `Found (${data.requirements?.length || 0} requirements, ${data.courses?.length || 0} courses)` : "NOT FOUND");
    return data;
  } catch (e) {
    console.error("Failed to get audit data from storage:", e);
    return null;
  }
}

// Get list of audit IDs that are not yet cached
export async function getUncachedAuditIds(auditIds: string[]): Promise<string[]> {
  const uncached: string[] = [];
  for (const id of auditIds) {
    const cached = await getAuditData(id);
    if (!cached) uncached.push(id);
  }
  return uncached;
}
