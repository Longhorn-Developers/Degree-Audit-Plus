import {
  getSuggestedCoreCourses,
  getSuggestedCoursesForRequirement,
} from "./course-recommendations";
import type { CatalogCourse } from "@/domain/catalog";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuditContext } from "../providers/audit-provider";

// Context for sharing audit data betw sidebar and main
export type RecommendationScope = {
  requirementTitle?: string;
  ruleTitle?: string;
};

interface CourseModalContextType {
  isOpen: boolean;
  recommendedCourses: CatalogCourse[];
  recommendationScope: RecommendationScope | null;
  isLoadingRecommendedCourses: boolean;
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
    if (!isOpen) return;
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
    isOpen,
    sections,
    recommendationScope?.requirementTitle,
    recommendationScope?.ruleTitle,
  ]);

  const openModal = useCallback((scope?: RecommendationScope) => {
    setRecommendedCourses([]);
    setRecommendationScope(scope ?? null);
    setIsOpen(true);
  }, []);
  const closeModal = useCallback(() => {
    setIsOpen(false);
    setRecommendationScope(null);
  }, []);

  const value = useMemo<CourseModalContextType>(
    () => ({
      isOpen,
      recommendedCourses,
      recommendationScope,
      isLoadingRecommendedCourses,
      openModal,
      closeModal,
    }),
    [
      isOpen,
      recommendedCourses,
      recommendationScope,
      isLoadingRecommendedCourses,
      openModal,
      closeModal,
    ],
  );

  return (
    <CourseModalContext.Provider value={value}>
      {children}
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
