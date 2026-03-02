import { usePreferences } from "@/entrypoints/providers/preferences-provider";
import {
  calculateWeightedDegreeCompletion,
  CurrentAuditProgress,
} from "@/lib/audit-calculations";
import {
  AuditHistoryData,
  Course,
  RequirementSection,
  StringSemester,
} from "@/lib/general-types";
import { getAuditData, getAuditHistory } from "@/lib/storage";
import { createContext, useContext, useEffect, useState } from "react";
import LoadingPage from "./loading-page";

// Context for sharing audit data betw sidebar and main
type SemesterInfo = Record<StringSemester, Course[]>;

interface AuditContextType {
  sections: RequirementSection[];
  allCourses: Course[];
  history: AuditHistoryData;
  currentAuditId: string | null;
  setCurrentAuditId: (id: string) => void;
  progresses: CurrentAuditProgress;
  completion: number;
  semesters: SemesterInfo;
}

const AuditContext = createContext<AuditContextType | null>(null);

export const AuditContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [loaded, setLoaded] = useState(false);
  const { lastAuditId, updateLastAuditId } = usePreferences();

  const [sections, setSections] = useState<RequirementSection[]>([]);
  const [history, setHistory] = useState<AuditHistoryData>();
  const [completion, setCompletion] = useState(0);
  const [currentAuditId, setCurrentAuditId] = useState<string | null>(
    new URLSearchParams(window.location.search).get("auditId") ?? lastAuditId, // look at broswer
  );
  const progresses = useMemo(
    () => calculateWeightedDegreeCompletion(sections ?? []),
    [sections],
  );

  // A simpler way to get all courses from the sections that comes prefiltered
  const allCourses = useMemo(
    () =>
      Array.from(
        new Map(
          sections
            .flatMap((section) => section.rules.flatMap((rule) => rule.courses))
            .map((course) => [course.code + "|" + course.semester, course]),
        ).values(),
      ) as Course[],
    [sections],
  );

  const semesters = useMemo(() => {
    return allCourses.reduce((acc, course) => {
      acc[course.semester] = [...(acc[course.semester] ?? []), course];
      return acc;
    }, {} as SemesterInfo);
  }, [allCourses]);

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
      if (cached)
        setSections(
          cached.requirements.map((section) => ({
            ...section,
            rules: section.rules.map((rule) => ({
              ...rule,
              courses: rule.courses.map((course) => ({
                ...course,
                id: course.code + "|" + course.uniqueNumber,
              })),
            })),
          })),
        );
      else console.warn(`[Main] Audit ${currentAuditId} not in cache.`);

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
        allCourses,
        history: history!,
        semesters,
        currentAuditId,
        setCurrentAuditId: (id) => {
          window.history.pushState({}, "", `?auditId=${id}`);
          setCurrentAuditId(id);
          updateLastAuditId(id);
        },
        progresses,
        completion,
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
