import type {
  AuditHistoryData,
  AuditHistoryEntry,
  AuditRequirement,
  CachedAuditData,
  CompositeAuditData,
} from "@/domain/audit";
import type {
  Course,
  CourseId,
  PlannedCourseOutline,
  StringSemester,
} from "@/domain/course";
import type { CurrentAuditProgress } from "@/domain/progress";
import { usePreferences } from "@/features/preferences/preferences-provider";
import {
  calculateWeightedDegreeCompletion,
  getCompositeAuditRequirements,
} from "@/lib/audit-calculations";
import { formatMajorLabel } from "@/lib/utils";
import {
  getAuditData,
  getAuditHistory,
  renameAudit,
  saveAuditData,
} from "@/lib/storage/audit-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import LoadingPage from "./components/loading-page";
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

function getAuditDisplayName(
  audit: AuditHistoryEntry | undefined,
  auditId: string,
): string {
  return audit?.title ?? audit?.majors?.join("; ") ?? auditId;
}

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
    currentAudit.majors?.map(formatMajorLabel).join("; ") ??
    currentAudit.title ??
    "Degree Requirements";
  const compositeAuditData = useMemo<CompositeAuditData>(
    () =>
      auditData && currentAuditId
        ? {
            audits: [
              {
                ...auditData,
                name: getAuditDisplayName(currentAudit, currentAuditId),
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
  const courseMap = auditData?.courses ?? {};
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
    let cancelled = false;
    setLoaded(false);

    async function loadAudit() {
      try {
        const storedHistory = await getAuditHistory();
        if (!storedHistory || cancelled) return;
        setHistory(storedHistory);

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
  }, [currentAuditId]);

  const value = useMemo<AuditContextValue>(() => {
    const persist = async (auditId: string, updated: CachedAuditData) => {
      await saveAuditData(auditId, updated);
      setAuditData(updated);
    };

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
        await persist(currentAuditId, updated);
        return true;
      },
      addPlannedCourse: async (course, requirementTitle, ruleTitle) => {
        if (!auditData || !currentAuditId) return null;
        const result = addCourse(auditData, course, requirementTitle, ruleTitle);
        if (!result) return null;
        await persist(currentAuditId, result.audit);
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

  if (!loaded || !currentAuditId || !history) return <LoadingPage />;

  return <AuditContext.Provider value={value}>{children}</AuditContext.Provider>;
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
