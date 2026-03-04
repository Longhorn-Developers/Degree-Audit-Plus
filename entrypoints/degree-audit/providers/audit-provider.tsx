import { usePreferences } from "@/entrypoints/degree-audit/providers/preferences-provider";
import { calculateWeightedDegreeCompletion } from "@/lib/audit-calculations";
import { getAuditData, getAuditHistory } from "@/lib/backend/storage";
import {
  AuditHistoryData,
  AuditRequirement,
  Course,
  CourseId,
  CurrentAuditProgress,
  StringSemester,
} from "@/lib/general-types";
import { createContext, useContext, useEffect, useState } from "react";
import LoadingPage from "../components/loading-page";

// Context for sharing audit data betw sidebar and main
type SemesterInfo = Record<StringSemester, Course[]>;

interface AuditContextType {
  sections: AuditRequirement[];
  courses: Course[];
  history: AuditHistoryData;
  currentAuditId: string | null;
  setCurrentAuditId: (id: string) => void;
  progresses: CurrentAuditProgress;
  completion: number;
  semesters: SemesterInfo;
  getCourseById: (id: CourseId) => Course;
  courseMap: Record<CourseId, Course>;
  // moveCourseWithinSemester: (activeId: CourseId, overId: CourseId) => void;
  moveCourseToNewSemester: (
    activeId: CourseId,
    newSemester: StringSemester,
  ) => void;
}

const AuditContext = createContext<AuditContextType | null>(null);

export const AuditContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [loaded, setLoaded] = useState(false);
  const { lastAuditId, updateLastAuditId } = usePreferences();
  const [courseDict, setCourseDict] = useState<Record<CourseId, Course>>({});
  const [sections, setSections] = useState<AuditRequirement[]>([]);
  const [history, setHistory] = useState<AuditHistoryData>();
  const [completion, setCompletion] = useState(0);
  const [currentAuditId, setCurrentAuditId] = useState<string | null>(
    new URLSearchParams(window.location.search).get("auditId") ?? lastAuditId, // look at broswer
  );
  const progresses = useMemo(
    () => calculateWeightedDegreeCompletion(sections ?? []),
    [sections],
  );
  const courses = useMemo(() => Object.values(courseDict), [courseDict]);

  const semesters = useMemo(() => {
    return Object.values(courses).reduce((acc, course) => {
      acc[course.semester] = [...(acc[course.semester] ?? []), course];
      return acc;
    }, {} as SemesterInfo);
  }, [courses]);

  const moveCourseToNewSemester = (
    activeId: CourseId,
    newSemester: StringSemester,
  ) => {
    const activeCourse = courseDict[activeId];
    if (!activeCourse) return;

    activeCourse.semester = newSemester;
    setCourseDict((prev) => ({ ...prev, [activeId]: activeCourse }));
  };

  // Load audit data from cache (scraped upfront when user visits UT Direct)
  useEffect(() => {
    setLoaded(false);

    async function loadAudit() {
      console.log(`[Main] Loading audit data for: ${currentAuditId}`);

      // Get completion from audit history
      const history = await getAuditHistory();
      if (!history) {
        console.error(`[Main] Audit history not found`);
        return;
      }
      if (
        !currentAuditId ||
        !history.audits.find((a) => a.auditId === currentAuditId)
      ) {
        setCurrentAuditId(history.audits[0].auditId!);
        updateLastAuditId(history.audits[0].auditId!);
      }
      console.log(`[Main] Audit history found`, history);
      setHistory(history);
      const matchingAudit = history?.audits.find(
        (a) => a.auditId === currentAuditId,
      );
      if (matchingAudit?.percentage) setCompletion(matchingAudit.percentage);

      // Load requirements from cache
      const cached = await getAuditData(currentAuditId!);
      if (cached) {
        setSections(
          cached.requirements.map((section) => ({
            ...section,
            rules: section.rule.map((rule) => ({
              ...rule,
              courses: rule.courses,
            })),
          })),
        );
        console.log("[Main] courses", cached.courses);
        setCourseDict(cached.courses);
      } else console.warn(`[Main] Audit ${currentAuditId} not in cache.`);

      setLoaded(true);
    }

    loadAudit();
  }, [currentAuditId]);

  if (!loaded) {
    return <LoadingPage />;
  }

  console.log("[Main] Current audit ID:", currentAuditId);
  return (
    <AuditContext.Provider
      value={{
        sections,
        courses,
        history: history!,
        semesters,
        currentAuditId,
        setCurrentAuditId: (id) => {
          window.history.pushState({}, "", `?auditId=${id}`);
          setCurrentAuditId(id);
          updateLastAuditId(id);
        },
        moveCourseToNewSemester,
        progresses,
        completion,
        getCourseById: (id) => {
          const course = courseDict[id];
          if (!course) {
            throw new Error(`🚫 [Main] Course ${id} not found`);
          }
          return course;
        },
        courseMap: courseDict,
      }}
    >
      {children}
    </AuditContext.Provider>
  );
};

export function useAuditContext(): AuditContextType {
  const context = useContext(AuditContext);
  if (!context) {
    throw new Error("useAuditContext must be used within a AuditProvider");
  }
  return context;
}

export default AuditContextProvider;
