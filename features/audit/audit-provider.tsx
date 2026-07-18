import {
  type AuditHistoryData,
  type AuditHistoryEntry,
  type AuditRequirement,
  type CachedAuditData,
  getAuditDisplayName,
} from "@/domain/audit";
import type {
  Course,
  CourseId,
  PlannedCourseOutline,
  StringSemester,
} from "@/domain/course";
import type { CurrentAuditProgress } from "@/domain/progress";
import LoadingPage from "@/components/loading-page";
import { calculateWeightedDegreeCompletion } from "./audit-calculations";
import {
  observeAuditData,
  observeAuditHistory,
  renameAudit,
  saveAuditData,
} from "./audit-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePreferences } from "@/features/preferences/preferences-provider";
import {
  addPlannedCourse as addCourse,
  moveCourseToSemester,
  removePlannedCourse as removeCourse,
} from "./audit-mutations";

type SemesterInfo = Record<StringSemester, Course[]>;

interface AuditContextValue {
  sections: AuditRequirement[];
  history: AuditHistoryData;
  currentAuditId: string;
  currentAudit: AuditHistoryEntry;
  currentAuditName: string;
  setCurrentAuditId: (id: string) => void;
  renameAuditTitle: (auditId: string, title: string) => Promise<boolean>;
  progresses: CurrentAuditProgress;
  semesters: SemesterInfo;
  getCourseById: (id: CourseId) => Course;
  courseMap: Record<CourseId, Course>;
  moveCourseToNewSemester: (
    courseId: CourseId,
    semester: StringSemester,
  ) => Promise<boolean>;
  addPlannedCourse: (
    course: PlannedCourseOutline,
    requirementTitle: string,
    ruleTitle: string,
  ) => Promise<CourseId | null>;
  removePlannedCourse: (courseId: CourseId) => Promise<boolean>;
}

const AuditContext = createContext<AuditContextValue | null>(null);

export function AuditContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { lastAuditId, updateLastAuditId } = usePreferences();
  const [loaded, setLoaded] = useState(false);
  const [currentAuditId, setCurrentAuditIdState] = useState<string | null>(
    new URLSearchParams(window.location.search).get("auditId") ?? lastAuditId,
  );
  const [auditData, setAuditData] = useState<CachedAuditData | null>(null);
  const [history, setHistory] = useState<AuditHistoryData | null>(null);

  const currentAudit = useMemo<AuditHistoryEntry>(
    () =>
      history?.audits.find((audit) => audit.auditId === currentAuditId) ?? {},
    [currentAuditId, history],
  );
  const currentAuditName =
    getAuditDisplayName(currentAudit) ?? "Degree Requirements";
  // Single-audit hot path reads requirements directly. The composite decorations
  // (per-audit names, duplicate-course flags) live in audit-calculations.ts
  // (getCompositeAuditRequirements) for the future multi-audit feature; no
  // single-audit UI reads them, so we don't compute them here.
  const sections = useMemo(() => auditData?.requirements ?? [], [auditData]);
  const courseMap = useMemo(() => auditData?.courses ?? {}, [auditData]);
  const progresses = useMemo(
    () => calculateWeightedDegreeCompletion(sections, courseMap),
    [courseMap, sections],
  );
  const semesters = useMemo(
    () =>
      Object.values(courseMap).reduce((grouped, course) => {
        grouped[course.semester] = [
          ...(grouped[course.semester] ?? []),
          course,
        ];
        return grouped;
      }, {} as SemesterInfo),
    [courseMap],
  );

  useEffect(() => {
    return observeAuditHistory(
      (storedHistory) => {
        if (storedHistory) setHistory(storedHistory);
      },
      (error) => console.error("Failed to load audit history:", error),
    );
  }, []);

  // Effect A (ids only): keep currentAuditId valid against history. If the
  // current id isn't a known audit, fall back to the first valid one. Never
  // touches auditData.
  useEffect(() => {
    if (!history) return;

    const isKnown = history.audits.some(
      ({ auditId }) => auditId === currentAuditId,
    );
    if (isKnown) return;

    const fallbackId = history.audits.find(({ auditId }) => auditId)?.auditId;
    if (fallbackId && fallbackId !== currentAuditId) {
      setCurrentAuditIdState(fallbackId);
      updateLastAuditId(fallbackId);
    }
  }, [currentAuditId, history, updateLastAuditId]);

  // Effect B (sole auditData writer): observe the selected audit. The watch wins
  // over a late initial read, so switching audits never flashes null — the
  // `loaded` gate shows LoadingPage until the observed data arrives.
  useEffect(() => {
    if (!currentAuditId) return;

    setLoaded(false);
    return observeAuditData(
      currentAuditId,
      (audit) => {
        setAuditData(audit);
        setLoaded(true);
      },
      (error) => {
        console.error("Failed to load audit:", error);
        setLoaded(true);
      },
    );
  }, [currentAuditId]);

  const value = useMemo<AuditContextValue>(() => {
    // currentAuditId and history are guaranteed non-null past the loading
    // guard below, which is the only path that renders this provider's value.
    return {
      sections,
      history: history as AuditHistoryData,
      semesters,
      currentAuditId: currentAuditId as string,
      currentAudit,
      currentAuditName,
      progresses,
      courseMap,
      getCourseById: (id) => {
        const course = courseMap[id];
        if (!course) throw new Error(`Course ${id} not found`);
        return course;
      },
      setCurrentAuditId: (id) => {
        window.history.pushState({}, "", `?auditId=${id}`);
        setCurrentAuditIdState(id);
        updateLastAuditId(id);
      },
      renameAuditTitle: async (auditId, title) => {
        const cleanTitle = title.trim();
        if (!cleanTitle) return false;
        const updatedHistory = await renameAudit(auditId, cleanTitle);
        if (!updatedHistory) return false;
        setHistory(updatedHistory);
        return true;
      },
      moveCourseToNewSemester: async (courseId, semester) => {
        if (!auditData || !currentAuditId) return false;
        const updated = moveCourseToSemester(auditData, courseId, semester);
        if (!updated) return false;
        await saveAuditData(currentAuditId, updated);
        return true;
      },
      addPlannedCourse: async (course, requirementTitle, ruleTitle) => {
        if (!auditData || !currentAuditId) return null;
        const result = addCourse(
          auditData,
          course,
          requirementTitle,
          ruleTitle,
        );
        if (!result) return null;
        await saveAuditData(currentAuditId, result.audit);
        return result.courseId;
      },
      removePlannedCourse: async (courseId) => {
        if (!auditData || !currentAuditId) return false;
        const updated = removeCourse(auditData, courseId);
        if (!updated) return false;
        await saveAuditData(currentAuditId, updated);
        return true;
      },
    };
  }, [
    sections,
    history,
    semesters,
    currentAuditId,
    currentAudit,
    currentAuditName,
    progresses,
    courseMap,
    auditData,
    updateLastAuditId,
  ]);

  if (!loaded || !currentAuditId || !history) {
    return <LoadingPage />;
  }

  return (
    <AuditContext.Provider value={value}>{children}</AuditContext.Provider>
  );
}

export function useAuditContext(): AuditContextValue {
  const context = useContext(AuditContext);
  if (!context) {
    throw new Error(
      "useAuditContext must be used within an AuditContextProvider",
    );
  }
  return context;
}

export default AuditContextProvider;
