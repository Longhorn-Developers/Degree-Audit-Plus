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
  removePlannedCourse as removeCourse,
  wipePlannedCourses,
} from "./audit-mutations";

type SemesterInfo = Record<StringSemester, Course[]>;

interface AuditContextValue {
  sections: AuditRequirement[];
  history: AuditHistoryData;
  currentAuditId: string;
  currentAudit: AuditHistoryEntry;
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

  const currentAudit = useMemo(
    () =>
      history?.audits.find((audit) => audit.auditId === currentAuditId) ?? {},
    [currentAuditId, history],
  );
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

  async function persist(
    auditId: string,
    updated: CachedAuditData,
  ): Promise<void> {
    await saveAuditData(auditId, updated);
    setAuditData(updated);
  }

  async function addPlannedCourse(
    course: PlannedCourseOutline,
    requirementTitle: string,
    ruleTitle: string,
  ): Promise<CourseId | null> {
    if (!auditData || !currentAuditId) return null;
    const result = addCourse(auditData, course, requirementTitle, ruleTitle);
    if (!result) return null;
    await persist(currentAuditId, result.audit);
    return result.courseId;
  }

  async function removePlannedCourse(courseId: CourseId): Promise<boolean> {
    if (!auditData || !currentAuditId) return false;
    const updated = removeCourse(auditData, courseId);
    if (!updated) return false;
    await persist(currentAuditId, updated);
    return true;
  }

  async function wipeAllPlannedCourses(): Promise<number> {
    if (!auditData || !currentAuditId) return 0;
    const result = wipePlannedCourses(auditData);
    if (result.removed) await persist(currentAuditId, result.audit);
    return result.removed;
  }

  async function moveCourseToNewSemester(
    courseId: CourseId,
    semester: StringSemester,
  ): Promise<boolean> {
    if (!auditData || !currentAuditId) return false;
    const updated = moveCourseToSemester(auditData, courseId, semester);
    if (!updated) return false;
    await persist(currentAuditId, updated);
    return true;
  }

  async function renameAuditTitle(
    auditId: string,
    title: string,
  ): Promise<boolean> {
    const cleanTitle = title.trim();
    if (!cleanTitle) return false;
    const updatedHistory = await renameAudit(auditId, cleanTitle);
    if (!updatedHistory) return false;
    setHistory(updatedHistory);
    return true;
  }

  if (!loaded || !currentAuditId || !history) return <LoadingPage />;

  return (
    <AuditContext.Provider
      value={{
        sections,
        history,
        semesters,
        currentAuditId,
        currentAudit,
        setCurrentAuditId: (id) => {
          window.history.pushState({}, "", `?auditId=${id}`);
          setCurrentAuditIdState(id);
          updateLastAuditId(id);
        },
        renameAuditTitle,
        moveCourseToNewSemester,
        progresses,
        getCourseById: (id) => {
          const course = courseMap[id];
          if (!course) throw new Error(`Course ${id} not found`);
          return course;
        },
        courseMap,
        addPlannedCourse,
      }}
    >
      {children}
    </AuditContext.Provider>
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
