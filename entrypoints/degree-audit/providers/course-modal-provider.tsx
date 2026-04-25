import CourseAddModal from "@/entrypoints/components/course-add-modal";
import {
  getSuggestedCoreCourses,
  getSuggestedCoursesForRequirement,
} from "@/lib/backend/db";
import type { CatalogCourse } from "@/lib/general-types";
import { createContext, useContext, useEffect, useState } from "react";
import { useAuditContext } from "./audit-provider";

// Context for sharing audit data betw sidebar and main
type RecommendationScope = {
  requirementTitle?: string;
  ruleTitle?: string;
};

interface CourseModalContextType {
  isOpen: boolean;
  recommendedCourses: CatalogCourse[];
  recommendationScope: RecommendationScope | null;
  isLoadingRecommendedCourses: boolean;
  toggleModal: () => void;
  openModal: (scope?: RecommendationScope) => void;
  closeModal: () => void;
}

const CourseModalContext = createContext<CourseModalContextType | null>(null);

export const CourseModalContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { sections } = useAuditContext();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [recommendedCourses, setRecommendedCourses] = useState<CatalogCourse[]>(
    [],
  );
  const [isLoadingRecommendedCourses, setIsLoadingRecommendedCourses] =
    useState(false);
  const [recommendationScope, setRecommendationScope] =
    useState<RecommendationScope | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadRecommendedCourses() {
      setIsLoadingRecommendedCourses(true);
      const courses =
        recommendationScope?.requirementTitle && recommendationScope?.ruleTitle
          ? await getSuggestedCoursesForRequirement(
              recommendationScope.requirementTitle,
              recommendationScope.ruleTitle,
            )
          : await getSuggestedCoreCourses(sections);

      if (!isCancelled) {
        setRecommendedCourses(courses);
        setIsLoadingRecommendedCourses(false);
      }
    }

    loadRecommendedCourses().catch((error) => {
      console.error(
        "[Course Modal Provider] Failed to load recommended courses:",
        error,
      );
      if (!isCancelled) {
        setRecommendedCourses([]);
        setIsLoadingRecommendedCourses(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [
    sections,
    recommendationScope?.requirementTitle,
    recommendationScope?.ruleTitle,
  ]);

  return (
    <CourseModalContext.Provider
      value={{
        isOpen,
        recommendedCourses,
        recommendationScope,
        isLoadingRecommendedCourses,
        toggleModal: () => setIsOpen(!isOpen),
        openModal: (scope) => {
          setRecommendedCourses([]);
          setRecommendationScope(scope ?? null);
          setIsOpen(true);
        },
        closeModal: () => {
          setIsOpen(false);
          setRecommendationScope(null);
        },
      }}
    >
      {children}

      <CourseAddModal
        isOpen={isOpen}
        recommendedCourses={recommendedCourses}
        recommendationScope={recommendationScope}
        isLoading={isLoadingRecommendedCourses}
        onClose={() => {
          setIsOpen(false);
          setRecommendationScope(null);
        }}
      />
    </CourseModalContext.Provider>
  );
};

export function useCourseModalContext(): CourseModalContextType {
  const context = useContext(CourseModalContext);
  if (!context) {
    throw new Error(
      "useCourseModalContext must be used within a CourseModalProvider",
    );
  }
  return context;
}

export default CourseModalContextProvider;
