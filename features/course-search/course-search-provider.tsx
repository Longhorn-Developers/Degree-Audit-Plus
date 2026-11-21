import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { getCoreAreaFromRequirementRule } from "./core-area-from-rule";
import {
  type CourseSearchData,
  EMPTY_FORM,
  useSessionState,
} from "./course-search-state";

export type RecommendationScope = {
  requirementTitle: string;
  ruleTitle: string;
};

interface CourseSearchContextType {
  formData: CourseSearchData;
  resultsQuery: string;

  submittedSearch: CourseSearchData | null;
  setFormData: (formData: CourseSearchData) => void;
  setResultsQuery: (query: string) => void;
  setSubmittedSearch: (search: CourseSearchData | null) => void;

  // bumps on each fulfilling-courses request so the panel can scroll and highlight
  fulfillingRequestId: number;
  showFulfillingCourses: (scope: RecommendationScope) => void;
}

const CourseSearchContext = createContext<CourseSearchContextType | null>(null);

export const CourseSearchContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [formData, setFormData] = useSessionState(
    "courseSearchForm",
    EMPTY_FORM,
  );
  const [resultsQuery, setResultsQuery] = useSessionState(
    "courseSearchFilter",
    "",
  );
  const [submittedSearch, setSubmittedSearch] =
    useSessionState<CourseSearchData | null>("courseSearchSubmitted", null);
  const [fulfillingRequestId, setFulfillingRequestId] = useState(0);

  const showFulfillingCourses = useCallback(
    ({ requirementTitle, ruleTitle }: RecommendationScope) => {
      const core = getCoreAreaFromRequirementRule(requirementTitle, ruleTitle);
      if (!core) return;
      setResultsQuery("");
      setSubmittedSearch({ ...EMPTY_FORM, core });
      setFulfillingRequestId((id) => id + 1);
    },
    [setResultsQuery, setSubmittedSearch],
  );

  const value = useMemo<CourseSearchContextType>(
    () => ({
      formData,
      resultsQuery,
      submittedSearch,
      setFormData,
      setResultsQuery,
      setSubmittedSearch,
      fulfillingRequestId,
      showFulfillingCourses,
    }),
    [
      formData,
      resultsQuery,
      submittedSearch,
      setFormData,
      setResultsQuery,
      setSubmittedSearch,
      fulfillingRequestId,
      showFulfillingCourses,
    ],
  );

  return (
    <CourseSearchContext.Provider value={value}>
      {children}
    </CourseSearchContext.Provider>
  );
};

export function useCourseSearchContext(): CourseSearchContextType {
  const context = useContext(CourseSearchContext);
  if (!context) {
    throw new Error(
      "useCourseSearchContext must be used within a CourseSearchContextProvider",
    );
  }
  return context;
}

export default CourseSearchContextProvider;
