import type {
  AuditHistoryData,
  CachedAuditData,
  CachedCompositeAudit,
  CompositeAuditData,
} from "@/domain/audit";
import { browser } from "wxt/browser";
import { getAuditData, getAuditHistory } from "./audit-storage";

const COMPOSITES_KEY = "compositeAudits";

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
        name: card?.title ?? card?.majors?.join("; ") ?? id,
      };
    }),
  );

  return {
    audits: audits.filter((audit) => audit !== null),
  };
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
