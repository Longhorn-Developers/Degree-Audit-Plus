import type {
  AuditHistoryData,
  AuditHistoryEntry,
  CachedAuditData,
} from "@/domain/audit";
import { browser } from "wxt/browser";

const AUDIT_HISTORY_KEY = "auditHistory";
const AUDIT_DATA_PREFIX = "auditData_";

export async function saveAuditHistory(
  audits: AuditHistoryEntry[],
  error?: string,
): Promise<void> {
  const data: AuditHistoryData = { audits, timestamp: Date.now(), error };
  await browser.storage.local.set({ [AUDIT_HISTORY_KEY]: data });
}

export async function getAuditHistory(): Promise<AuditHistoryData | null> {
  const result = await browser.storage.local.get(AUDIT_HISTORY_KEY);
  return (result[AUDIT_HISTORY_KEY] as AuditHistoryData | undefined) ?? null;
}

export async function renameAudit(
  auditId: string,
  title: string,
): Promise<AuditHistoryData | null> {
  const history = await getAuditHistory();
  if (!history) return null;

  const updatedHistory = {
    ...history,
    audits: history.audits.map((audit) =>
      audit.auditId === auditId ? { ...audit, title } : audit,
    ),
    timestamp: Date.now(),
  };
  await browser.storage.local.set({ [AUDIT_HISTORY_KEY]: updatedHistory });
  return updatedHistory;
}

export function saveAuditData(
  auditId: string,
  data: CachedAuditData,
): Promise<void> {
  return browser.storage.local.set({
    [`${AUDIT_DATA_PREFIX}${auditId}`]: data,
  });
}

export async function getAuditData(
  auditId: string,
): Promise<CachedAuditData | null> {
  const key = `${AUDIT_DATA_PREFIX}${auditId}`;
  const result = await browser.storage.local.get(key);
  return (result[key] as CachedAuditData | undefined) ?? null;
}

export async function getUncachedAuditIds(
  auditIds: string[],
): Promise<string[]> {
  const cached = await Promise.all(auditIds.map(getAuditData));
  return auditIds.filter((_, index) => !cached[index]);
}
