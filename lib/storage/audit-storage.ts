import type {
  AuditHistoryData,
  AuditHistoryEntry,
  CachedAuditData,
} from "@/domain/audit";
import { browser } from "wxt/browser";
import { storage } from "wxt/utils/storage";

const AUDIT_DATA_PREFIX = "auditData_";

const createAuditHistoryItem = () =>
  storage.defineItem<AuditHistoryData>("local:auditHistory");
let auditHistoryItem: ReturnType<typeof createAuditHistoryItem> | undefined;

function getAuditHistoryItem() {
  // Avoid touching extension storage when consumers only import audit-data helpers.
  return (auditHistoryItem ??= createAuditHistoryItem());
}

export function watchAuditHistory(
  listener: (history: AuditHistoryData | null) => void,
): () => void {
  return getAuditHistoryItem().watch(listener);
}

export function saveAuditHistory(
  audits: AuditHistoryEntry[],
  error?: string,
): Promise<void> {
  const data: AuditHistoryData = { audits, timestamp: Date.now(), error };
  return getAuditHistoryItem().setValue(data);
}

export function getAuditHistory(): Promise<AuditHistoryData | null> {
  return getAuditHistoryItem().getValue();
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
  await getAuditHistoryItem().setValue(updatedHistory);
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
  const keys = auditIds.map((id) => `${AUDIT_DATA_PREFIX}${id}`);
  const cached = await browser.storage.local.get(keys);
  return auditIds.filter((id) => cached[`${AUDIT_DATA_PREFIX}${id}`] == null);
}
