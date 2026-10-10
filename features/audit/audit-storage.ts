import {
  type AuditHistoryData,
  type AuditHistoryEntry,
  type CachedAuditData,
  type CachedCompositeAudit,
  type AcceptedCourse,
  type CompositeAuditData,
  type PendingPreview,
  getAuditDisplayName,
} from "@/domain/audit";
import {
  isRowFor,
  splitPlannerCourseId,
  type PlannedCourseRow,
  type PlannerRowKey,
} from "@/domain/course";
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

// The user's renames and pins by auditId. Kept apart from the history so a
// sync from UT, which rebuilds every entry, can't wipe them.
type AuditPrefs = Record<string, Pick<AuditHistoryEntry, "title" | "pinned">>;

const createAuditPrefsItem = () =>
  storage.defineItem<AuditPrefs>("local:auditPrefs", { defaultValue: {} });
let auditPrefsItem: ReturnType<typeof createAuditPrefsItem> | undefined;

function getAuditPrefsItem() {
  return (auditPrefsItem ??= createAuditPrefsItem());
}

export async function hasUserEdits(auditId: string): Promise<boolean> {
  const prefs = (await getAuditPrefsItem().getValue())[auditId];
  return prefs?.title !== undefined || Boolean(prefs?.pinned);
}

// The audit each degree's last Add to plan or Remove made, by degree.
const createPlanAuditsItem = () =>
  storage.defineItem<Record<string, string>>("local:planAudits", {
    defaultValue: {},
  });
let planAuditsItem: ReturnType<typeof createPlanAuditsItem> | undefined;

function getPlanAuditsItem() {
  return (planAuditsItem ??= createPlanAuditsItem());
}

export async function getPlanAudit(
  degree: string,
): Promise<string | undefined> {
  return (await getPlanAuditsItem().getValue())[degree];
}

export async function savePlanAudit(
  degree: string,
  auditId: string,
): Promise<void> {
  const planAudits = await getPlanAuditsItem().getValue();
  await getPlanAuditsItem().setValue({ ...planAudits, [degree]: auditId });
}

// Saves UT's history with the user's renames and pins layered on top.
export async function saveAuditHistory(
  audits: AuditHistoryEntry[],
  error?: string,
): Promise<void> {
  const prefs = await getAuditPrefsItem().getValue();
  const data: AuditHistoryData = {
    audits: audits.map((audit) => ({
      ...audit,
      ...prefs[audit.auditId ?? ""],
    })),
    timestamp: Date.now(),
    error,
  };
  return getAuditHistoryItem().setValue(data);
}

export function getAuditHistory(): Promise<AuditHistoryData | null> {
  return getAuditHistoryItem().getValue();
}

export function renameAudit(
  auditId: string,
  title: string,
): Promise<AuditHistoryData | null> {
  return editAudit(auditId, () => ({ title }));
}

export function togglePinAudit(
  auditId: string,
): Promise<AuditHistoryData | null> {
  return editAudit(auditId, (audit) => ({ pinned: !audit.pinned }));
}

// Applies a user edit to the stored history and remembers it in prefs so the
// next sync keeps it. Returns the updated history, or null if the audit is gone.
async function editAudit(
  auditId: string,
  getEdit: (audit: AuditHistoryEntry) => AuditPrefs[string],
): Promise<AuditHistoryData | null> {
  const history = await getAuditHistory();
  const audit = history?.audits.find((entry) => entry.auditId === auditId);
  if (!history || !audit) return null;

  const edit = getEdit(audit);
  const prefs = await getAuditPrefsItem().getValue();
  await getAuditPrefsItem().setValue({
    ...prefs,
    [auditId]: { ...prefs[auditId], ...edit },
  });

  const updatedHistory = {
    ...history,
    audits: history.audits.map((entry) =>
      entry.auditId === auditId ? { ...entry, ...edit } : entry,
    ),
    timestamp: Date.now(),
  };
  await getAuditHistoryItem().setValue(updatedHistory);
  return updatedHistory;
}

// The UT tab writes it while planning the course, so a cancelled run still
// leaves a record.
const createPendingPreviewItem = () =>
  storage.defineItem<PendingPreview | null>("local:pendingPreview", {
    defaultValue: null,
  });
let pendingPreviewItem: ReturnType<typeof createPendingPreviewItem> | undefined;

function getPendingPreviewItem() {
  return (pendingPreviewItem ??= createPendingPreviewItem());
}

export function getPendingPreview(): Promise<PendingPreview | null> {
  return getPendingPreviewItem().getValue();
}

export function savePendingPreview(
  preview: PendingPreview | null,
): Promise<void> {
  return getPendingPreviewItem().setValue(preview);
}

// The courses the user added to their plan, kept apart from auditData_ since
// a re-scrape rewrites that.
const createAcceptedCoursesItem = () =>
  storage.defineItem<AcceptedCourse[]>("local:acceptedCourses", {
    defaultValue: [],
  });
let acceptedCoursesItem:
  | ReturnType<typeof createAcceptedCoursesItem>
  | undefined;

function getAcceptedCoursesItem() {
  return (acceptedCoursesItem ??= createAcceptedCoursesItem());
}

export async function acceptPendingPreview(): Promise<AcceptedCourse | null> {
  const pending = await getPendingPreview();
  if (!pending) return null;

  const accepted: AcceptedCourse = { ...pending, acceptedAt: Date.now() };
  const others = (await getAcceptedCoursesItem().getValue()).filter(
    ({ course }) =>
      course.department !== pending.course.department ||
      course.number !== pending.course.number ||
      course.ccyys !== pending.course.ccyys,
  );
  await getAcceptedCoursesItem().setValue([...others, accepted]);
  await savePendingPreview(null);
  return accepted;
}

export async function syncAcceptedCourses(
  rows: PlannedCourseRow[],
): Promise<AcceptedCourse[]> {
  const kept: AcceptedCourse[] = [];
  for (const accepted of await getAcceptedCoursesItem().getValue()) {
    const row = rows.find((row) => isRowFor(row.key, accepted.course));
    if (row) kept.push({ ...accepted, row: row.key });
  }
  await getAcceptedCoursesItem().setValue(kept);
  return kept;
}

export async function updateAcceptedCourses(
  keep: PlannerRowKey[],
  remove: PlannerRowKey[],
): Promise<void> {
  const accepted = (await getAcceptedCoursesItem().getValue()).filter(
    (course) => !remove.some((key) => isRowFor(key, course.course)),
  );
  for (const key of keep) {
    if (accepted.some((course) => isRowFor(key, course.course))) continue;
    accepted.push({
      course: { ...splitPlannerCourseId(key.courseId), ccyys: key.ccyys },
      row: key,
      acceptedAt: Date.now(),
    });
  }
  await getAcceptedCoursesItem().setValue(accepted);
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

export function deleteAuditData(auditIds: string[]): Promise<void> {
  const keys = auditIds.map((id) => `${AUDIT_DATA_PREFIX}${id}`);
  return browser.storage.local.remove(keys);
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

/**
 * Observe a single audit's data: an initial read plus a subsequent storage
 * watch behind one cleanup function. A delayed initial read never overwrites a
 * newer watched update (mirrors {@link observeAuditHistory}). This is the single
 * writer of audit data in the provider — callers should not also read directly.
 */
export function observeAuditData(
  auditId: string,
  listener: (audit: CachedAuditData | null) => void,
  onError?: (error: unknown) => void,
): () => void {
  let active = true;
  let receivedUpdate = false;
  const unwatch = watchAuditData(auditId, (audit) => {
    receivedUpdate = true;
    if (active) listener(audit);
  });

  void getAuditData(auditId)
    .then((audit) => {
      if (active && !receivedUpdate) listener(audit);
    })
    .catch((error: unknown) => {
      if (active && !receivedUpdate) onError?.(error);
    });

  return () => {
    active = false;
    unwatch();
  };
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
