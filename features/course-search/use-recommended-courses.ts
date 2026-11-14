import type { CatalogCourse } from "@/domain/catalog";
import { useAuditContext } from "@/features/audit/audit-provider";
import { useCallback, useEffect, useState } from "react";
import {
  getSuggestedCoreCourses,
  getSuggestedCoursesForRequirement,
} from "./course-recommendations";

function useLoadedCourses(load: () => Promise<CatalogCourse[]>) {
  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    load()
      .catch((error: unknown) => {
        console.error("[Recommended Courses] Failed to load:", error);
        return [];
      })
      .then((loaded) => {
        if (isCancelled) return;
        setCourses(loaded);
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [load]);

  return { courses, isLoading };
}

export function useCoreCourseSuggestions() {
  const { sections } = useAuditContext();
  const load = useCallback(() => getSuggestedCoreCourses(sections), [sections]);
  return useLoadedCourses(load);
}

export function useFulfillingCourses(
  requirementTitle: string,
  ruleTitle: string,
) {
  const load = useCallback(
    () => getSuggestedCoursesForRequirement(requirementTitle, ruleTitle),
    [requirementTitle, ruleTitle],
  );
  return useLoadedCourses(load);
}
