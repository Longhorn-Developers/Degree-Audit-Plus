import {
  calculateWeightedDegreeCompletion,
  CurrentAuditProgress,
} from "@/lib/audit-calculations";
import { Course, RequirementSection } from "@/lib/general-types";
import { getAuditData, getAuditHistory } from "@/lib/storage";
import { createContext, useContext, useEffect, useState } from "react";

// Context for sharing audit data betw sidebar and main

interface AuditContextType {
  sections: RequirementSection[];
  allCourses: Course[];
  currentAuditId: string | null;
  setCurrentAuditId: (id: string | null) => void;
  progresses: CurrentAuditProgress;
  completion: number;
}

const AuditContext = createContext<AuditContextType | null>(null);

export const AuditContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [sections, setSections] = useState<RequirementSection[]>([]);
  const [completion, setCompletion] = useState<number>(0);
  const [currentAuditId, setCurrentAuditId] = useState<string | null>(
    new URLSearchParams(window.location.search).get("auditId"), // look at broswer
  );

  const progresses = calculateWeightedDegreeCompletion(sections ?? []);
  console.log("progresses", progresses);

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

  // Load audit data from cache (scraped upfront when user visits UT Direct)
  useEffect(() => {
    if (!currentAuditId) {
      console.log("[Main] No audit ID provided");
      return;
    }

    async function loadAudit() {
      console.log(`[Main] Loading audit data for: ${currentAuditId}`);

      // Get completion from audit history
      const history = await getAuditHistory();
      const matchingAudit = history?.audits.find(
        (a) => a.auditId === currentAuditId,
      );
      if (matchingAudit?.percentage) setCompletion(matchingAudit.percentage);

      // Load requirements from cache
      const cached = await getAuditData(currentAuditId!);
      if (cached) setSections(cached.requirements);
      else console.warn(`[Main] Audit ${currentAuditId} not in cache.`);
    }

    loadAudit();
  }, [currentAuditId]);

  return (
    <AuditContext.Provider
      value={{
        sections,
        allCourses,
        currentAuditId,
        setCurrentAuditId,
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
