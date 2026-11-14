import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

// Context for sharing audit data betw sidebar and main
export type RecommendationScope = {
  requirementTitle: string;
  ruleTitle: string;
};

interface CourseModalContextType {
  isOpen: boolean;
  recommendationScope: RecommendationScope | null;
  openModal: (scope: RecommendationScope) => void;
  closeModal: () => void;
}

const CourseModalContext = createContext<CourseModalContextType | null>(null);

export const CourseModalContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [recommendationScope, setRecommendationScope] =
    useState<RecommendationScope | null>(null);

  const openModal = useCallback((scope: RecommendationScope) => {
    setRecommendationScope(scope);
  }, []);
  const closeModal = useCallback(() => {
    setRecommendationScope(null);
  }, []);

  const value = useMemo<CourseModalContextType>(
    () => ({
      isOpen: recommendationScope !== null,
      recommendationScope,
      openModal,
      closeModal,
    }),
    [recommendationScope, openModal, closeModal],
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
