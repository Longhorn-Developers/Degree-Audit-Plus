import { usePreferences } from "@/entrypoints/degree-audit/providers/preferences-provider";
import { calculateWeightedDegreeCompletion } from "@/lib/audit-calculations";
import {
  addPlannedCourse as addPlannedCourseToStorage,
  getAuditData,
  getAuditHistory,
  removePlannedCourse as removePlannedCourseFromStorage,
  wipeAllPlannedCourses as wipeAllPlannedCoursesFromStorage,
} from "@/lib/backend/storage";
import {
  AuditHistoryData,
  AuditRequirement,
  Course,
  CourseId,
  CurrentAuditProgress,
  PlannedCourseOutline,
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
  currentAuditId: string;
  setCurrentAuditId: (id: string) => void;
  progresses: CurrentAuditProgress;
  semesters: SemesterInfo;
  getCourseById: (id: CourseId) => Course;
  courseMap: Record<CourseId, Course>;
  // moveCourseWithinSemester: (activeId: CourseId, overId: CourseId) => void;
  moveCourseToNewSemester: (
    activeId: CourseId,
    newSemester: StringSemester,
  ) => void;
  addPlannedCourse: (
    course: PlannedCourseOutline,
    requirementTitle: string,
    ruleTitle: string,
  ) => Promise<CourseId | null>;
  removePlannedCourse: (courseId: CourseId) => Promise<boolean>;
  wipeAllPlannedCourses: () => Promise<number>;
}

const AuditContext = createContext<AuditContextType | null>(null);

export const AuditContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { lastAuditId, updateLastAuditId } = usePreferences();
  const [loaded, setLoaded] = useState(false);
  const [currentAuditId, setCurrentAuditId] = useState<string | null>(
    new URLSearchParams(window.location.search).get("auditId") ?? lastAuditId,
  );

  const [courseDict, setCourseDict] = useState<Record<CourseId, Course>>({});
  const [sections, setSections] = useState<AuditRequirement[]>([]);
  const [history, setHistory] = useState<AuditHistoryData>();

  const progresses = useMemo(
    () => calculateWeightedDegreeCompletion(sections ?? [], courseDict),
    [sections],
  );
  const semesters = useMemo(() => {
    const a = Object.values(courseDict).reduce((acc, course) => {
      acc[course.semester] = [...(acc[course.semester] ?? []), course];
      return acc;
    }, {} as SemesterInfo);
    console.log("[Audit Provider] new semesters", a, courseDict);
    return a;
  }, [courseDict]);

  function removeCourseInternally(courseId: CourseId) {
    setCourseDict((prev) => {
      const next = { ...prev };
      delete next[courseId];
      return next;
    });
    setSections((prev) => {
      const next = [...prev];
      for (const section of next) {
        for (const rule of section.rules) {
          rule.courses = rule.courses.filter((c) => c !== courseId);
        }
      }
      console.log("[Audit Provider] new sections", next);
      return next;
    });
  }

  function addCourseInternally(
    course: Course,
    requirementTitle: string,
    ruleTitle: string,
  ) {
    setCourseDict((prev) => ({
      ...prev,
      [course.id]: course,
    }));
    setSections((prev) => {
      const next = [...prev];
      for (const section of next) {
        if (section.title === requirementTitle) {
          for (const rule of section.rules) {
            if (rule.text === ruleTitle) {
              rule.courses.push(course.id);
            }
          }
        }
      }
      return next;
    });
  }

  function moveCourseToNewSemester(
    activeId: CourseId,
    newSemester: StringSemester,
  ) {
    const activeCourse = courseDict[activeId];
    if (!activeCourse) return;

    console.log(
      "[Audit Provider] moving course to new semester",
      activeId,
      newSemester,
    );
    setCourseDict((prev) => ({
      ...prev,
      [activeId]: { ...activeCourse, semester: newSemester },
    }));
  }

  async function addPlannedCourse(
    course: PlannedCourseOutline,
    requirementTitle: string,
    ruleTitle: string,
  ) {
    const newCourseId = await addPlannedCourseToStorage(
      currentAuditId!,
      course,
      requirementTitle,
      ruleTitle,
    );
    if (newCourseId) {
      addCourseInternally(
        { ...course, id: newCourseId },
        requirementTitle,
        ruleTitle,
      );
      return newCourseId;
    }
    return null;
  }

  async function removePlannedCourse(courseId: CourseId) {
    const success = await removePlannedCourseFromStorage(
      currentAuditId!,
      courseId,
    );
    if (success) {
      removeCourseInternally(courseId);
      return true;
    }
    return false;
  }

  async function wipeAllPlannedCourses() {
    const numRemoved = await wipeAllPlannedCoursesFromStorage(currentAuditId!);
    for (const course of Object.values(courseDict)) {
      if (course.status === "Planned") {
        removeCourseInternally(course.id);
      }
    }
    return numRemoved;
  }

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

      // Load requirements from cache
      const cached = await getAuditData(currentAuditId!);
      if (cached) {
        setSections(
          cached.requirements.map((section) => ({
            ...section,
            rules: section.rules.map((rule) => ({
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

  if (!loaded || !currentAuditId) {
    return <LoadingPage />;
  }

  return (
    <AuditContext.Provider
      value={{
        sections,
        courses: Object.values(courseDict),
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
        getCourseById: (id) => {
          const course = courseDict[id];
          if (!course) {
            throw new Error(`🚫 [Main] Course ${id} not found`);
          }
          return course;
        },
        courseMap: courseDict,
        addPlannedCourse,
        removePlannedCourse,
        wipeAllPlannedCourses,
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
