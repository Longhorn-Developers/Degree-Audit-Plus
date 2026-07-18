import {
  type AuditHistoryData,
  type AuditHistoryEntry,
  type AuditRequirement,
  type CachedAuditData,
  type CompositeAuditData,
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
import {
  calculateWeightedDegreeCompletion,
  getCompositeAuditRequirements,
} from "./audit-calculations";
import {
  getAuditData,
  observeAuditHistory,
  renameAudit,
  saveAuditData,
  watchAuditData,
} from "./audit-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePreferences } from "@/features/preferences/preferences-provider";
import {
  addPlannedCourse as addCourse,
  moveCourseToSemester,
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
  const compositeAuditData = useMemo<CompositeAuditData>(
    () =>
      auditData && currentAuditId
        ? {
            audits: [
              {
                ...auditData,
                name: getAuditDisplayName(currentAudit) ?? currentAuditId,
              },
            ],
          }
        : { audits: [] },
    [auditData, currentAudit, currentAuditId],
  );
  const sections = useMemo(
    () => getCompositeAuditRequirements(compositeAuditData),
    [compositeAuditData],
  );
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

  useEffect(() => {
    if (!currentAuditId) return;

    setAuditData(null);
    return watchAuditData(currentAuditId, setAuditData);
  }, [currentAuditId]);

  useEffect(() => {
    if (!history) return;

    const storedHistory = history;
    let cancelled = false;
    setLoaded(false);

    async function loadAudit() {
      try {
        const selectedId = storedHistory.audits.some(
          ({ auditId }) => auditId === currentAuditId,
        )
          ? currentAuditId
          : storedHistory.audits.find(({ auditId }) => auditId)?.auditId;
        if (!selectedId) return;

        if (selectedId !== currentAuditId) {
          setCurrentAuditIdState(selectedId);
          updateLastAuditId(selectedId);
          return;
        }
        const storedAudit = await getAuditData(selectedId);
        if (!cancelled) setAuditData(storedAudit);
      } catch (error) {
        console.error("Failed to load audit:", error);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    void loadAudit();
    return () => {
      cancelled = true;
    };
  }, [currentAuditId, history, updateLastAuditId]);

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
