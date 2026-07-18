import {
  type AuditHistoryData,
  type AuditHistoryEntry,
  type CachedAuditData,
  type CachedCompositeAudit,
  type CompositeAuditData,
  getAuditDisplayName,
} from "@/domain/audit";
import { browser } from "wxt/browser";
import { storage } from "wxt/utils/storage";

const AUDIT_DATA_PREFIX = "auditData_";
const COMPOSITES_KEY = "compositeAudits";

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

export function observeAuditHistory(
  listener: (history: AuditHistoryData | null) => void,
  onError?: (error: unknown) => void,
): () => void {
  let active = true;
  let receivedUpdate = false;
  const unwatch = watchAuditHistory((history) => {
    receivedUpdate = true;
    if (active) listener(history);
  });

  void getAuditHistory()
    .then((history) => {
      if (active && !receivedUpdate) listener(history);
    })
    .catch((error: unknown) => {
      if (active && !receivedUpdate) onError?.(error);
    });

  return () => {
    active = false;
    unwatch();
  };
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

export function watchAuditData(
  auditId: string,
  listener: (audit: CachedAuditData | null) => void,
): () => void {
  return storage.watch<CachedAuditData>(
    `local:${AUDIT_DATA_PREFIX}${auditId}`,
    listener,
  );
}

export async function getUncachedAuditIds(
  auditIds: string[],
): Promise<string[]> {
  const keys = auditIds.map((id) => `${AUDIT_DATA_PREFIX}${id}`);
  const cached = await browser.storage.local.get(keys);
  return auditIds.filter((id) => cached[`${AUDIT_DATA_PREFIX}${id}`] == null);
}

export async function loadCompositeAuditData(
  auditIds: string[],
  options?: {
    getData?: (id: string) => Promise<CachedAuditData | null>;
    getHistory?: () => Promise<AuditHistoryData | null>;
  },
): Promise<CompositeAuditData> {
  const readData = options?.getData ?? getAuditData;
  const history = await (options?.getHistory ?? getAuditHistory)();
  const audits = await Promise.all(
    auditIds.map(async (id) => {
      const data = await readData(id);
      if (!data) return null;
      const card = history?.audits.find((audit) => audit.auditId === id);
      return {
        ...data,
        name: getAuditDisplayName(card) ?? id,
      };
    }),
  );

  return { audits: audits.filter((audit) => audit !== null) };
}

export async function getCachedComposites(): Promise<CachedCompositeAudit[]> {
  const result = await browser.storage.local.get(COMPOSITES_KEY);
  return (result[COMPOSITES_KEY] as CachedCompositeAudit[] | undefined) ?? [];
}

function setCachedComposites(
  composites: CachedCompositeAudit[],
): Promise<void> {
  return browser.storage.local.set({ [COMPOSITES_KEY]: composites });
}

export async function createComposite(
  name: string,
  auditIds: string[],
): Promise<{ saved: CachedCompositeAudit; composite: CompositeAuditData }> {
  const saved = { id: crypto.randomUUID(), name, auditIds };
  await setCachedComposites([...(await getCachedComposites()), saved]);
  return { saved, composite: await loadCompositeAuditData(auditIds) };
}

export async function updateCachedComposite(
  id: string,
  patch: Partial<Pick<CachedCompositeAudit, "name" | "auditIds">>,
): Promise<CachedCompositeAudit | null> {
  const composites = await getCachedComposites();
  const existing = composites.find((composite) => composite.id === id);
  if (!existing) return null;

  const updated = { ...existing, ...patch, id };
  await setCachedComposites(
    composites.map((composite) => (composite.id === id ? updated : composite)),
  );
  return updated;
}

export async function deleteCachedComposite(id: string): Promise<boolean> {
  const composites = await getCachedComposites();
  const remaining = composites.filter((composite) => composite.id !== id);
  if (remaining.length === composites.length) return false;
  await setCachedComposites(remaining);
  return true;
}

export async function loadCompositeAudit(
  id: string,
): Promise<CompositeAuditData | null> {
  const composite = (await getCachedComposites()).find(
    (candidate) => candidate.id === id,
  );
  return composite ? loadCompositeAuditData(composite.auditIds) : null;
}
