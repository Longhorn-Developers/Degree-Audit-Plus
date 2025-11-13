// This file provides functions for interacting with the browser's local storage
// to save, retrieve, and clear the user's degree audit history.

import { browser } from "wxt/browser";
import type { AuditHistoryData, DegreeAuditCardProps } from "./general-types";

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
