import Button from "@/components/ui/button";
import SelectDropdown from "@/components/ui/select-dropdown";
import type { CatalogCourse } from "@/domain/catalog";
import {
  dedupeCatalogCoursesByCode,
  matchesCatalogQuery,
} from "@/features/catalog/catalog-course-mappers";
import { searchCatalogCourses } from "@/features/catalog/catalog-db";
import { DEPARTMENT_MAP } from "@/features/catalog/department-map";
import { cn } from "@/lib/utils";
import {
  CaretLeftIcon,
  ChalkboardTeacherIcon,
  CircleNotchIcon,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import CoursePreviewList from "./course-preview-list";
import PlannedCoursesModal from "./planned-courses-modal";
import { useCourseModalContext } from "./course-modal-provider";

interface CourseSearchData {
  searchQuery: string;
  department: string;
  lowerDivision: boolean;
  upperDivision: boolean;
}

const DEPARTMENTS = [...new Set(Object.values(DEPARTMENT_MAP))].sort();

const EMPTY_FORM: CourseSearchData = {
  searchQuery: "",
  department: "",
  lowerDivision: true,
  upperDivision: true,
};

// session storage so a refresh keeps the last search but a new tab starts empty
function useSessionState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const saved = sessionStorage.getItem(key);
    if (saved === null) return initial;
    return JSON.parse(saved) as T;
  });

  const setAndSave = (next: T) => {
    setValue(next);
    sessionStorage.setItem(key, JSON.stringify(next));
  };

  return [value, setAndSave];
}

interface CourseSearchContentProps {
  formData: CourseSearchData;
  setFormData: (formData: CourseSearchData) => void;
  onSearchSubmit: (formData: CourseSearchData) => void;
}

type DivisionField = "lowerDivision" | "upperDivision";

function DivisionToggle({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "w-12 h-7 rounded-full transition-colors duration-200 relative disabled:opacity-50 disabled:cursor-not-allowed",
          checked ? "bg-dap-plan-green-dark" : "bg-gray-200",
        )}
      >
        <div
          className={cn(
            "w-5 h-5 rounded-full transform transition-transform duration-200 absolute top-1/2 -translate-y-1/2 bg-background",
            checked ? "translate-x-[24px]" : "translate-x-1",
          )}
        />
      </button>
      <span className="text-base text-text">{label}</span>
    </div>
  );
}

function CourseSearchContent({
  formData,
  setFormData,
  onSearchSubmit,
}: CourseSearchContentProps) {
  const { recommendedCourses } = useCourseModalContext();
  const displayedRecommendedCourses =
    dedupeCatalogCoursesByCode(recommendedCourses);
  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleToggle = (field: DivisionField) => {
    setFormData({ ...formData, [field]: !formData[field] });
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    onSearchSubmit(formData);
  };

  const isSearchDisabled = !formData.lowerDivision && !formData.upperDivision;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-xl tracking-wide">Add Courses</p>
          <PlannedCoursesModal />
        </div>
        <CoursePreviewList courses={displayedRecommendedCourses} />
      </div>

      <form onSubmit={handleSearch}>
        <input
          type="text"
          name="searchQuery"
          value={formData.searchQuery}
          onChange={handleInputChange}
          placeholder="Search for a specific course"
          className="w-full px-4 py-2 border border-dap-border rounded-md text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-dap-orange focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        />

        <div className="flex items-center gap-3 my-4" />

        <div className="mb-4">
          <SelectDropdown
            icon={<ChalkboardTeacherIcon size={28} />}
            placeholder="Department"
            options={DEPARTMENTS}
            value={formData.department}
            onChange={(value) =>
              setFormData({ ...formData, department: value })
            }
          />
        </div>

        <div className="space-y-3 mb-6">
          <DivisionToggle
            checked={formData.lowerDivision}
            label="Lower Division Courses"
            onToggle={() => handleToggle("lowerDivision")}
          />
          <DivisionToggle
            checked={formData.upperDivision}
            label="Upper Division Courses"
            onToggle={() => handleToggle("upperDivision")}
          />
        </div>

        <Button
          type="submit"
          color="orange"
          fill="solid"
          disabled={isSearchDisabled}
          className="px-6 py-2 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
        >
          Search
        </Button>
      </form>
    </div>
  );
}

function CourseSearchResults({
  courses,
  onBack,
  isGeneric,
  searchQuery,
  setSearchQuery,
}: {
  courses: CatalogCourse[];
  onBack: () => void;
  isGeneric: boolean;
  searchQuery: string;
  setSearchQuery: (searchQuery: string) => void;
}) {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredCourses = isGeneric
    ? courses.filter((course) => matchesCatalogQuery(course, normalizedQuery))
    : courses;

  const handleSearchChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setSearchQuery(event.target.value);
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center justify-start gap-1 text-dap-orange font-semibold text-[14px] uppercase tracking-wide mb-4 hover:underline rounded-lg transition-all duration-200 ease-in-out"
      >
        <CaretLeftIcon size={16} weight="bold" />
        Search Results
      </button>
      <div>
        {isGeneric && (
          <input
            type="text"
            name="searchQuery"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search for a specific course"
            className="w-full px-4 py-2 mb-2 border border-dap-border rounded-md text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-dap-orange focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
        )}
        {filteredCourses.length > 0 ? (
          <CoursePreviewList
            courses={filteredCourses}
            className="max-h-[60vh] overflow-y-auto -mr-3 pr-5"
          />
        ) : (
          <div className="min-h-[180px] rounded-md border border-dashed border-dap-border bg-background px-6 py-8 flex flex-col items-center justify-center text-center">
            <p className="text-lg font-semibold text-text">No courses found</p>
            <p className="mt-2 text-sm text-muted">
              Try a different course code or title, or change the department and
              division filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function CourseSearchPanel() {
  const [formData, setFormData] = useSessionState(
    "courseSearchForm",
    EMPTY_FORM,
  );
  const [resultsQuery, setResultsQuery] = useSessionState(
    "courseSearchFilter",
    "",
  );
  // the search that is showing results, null when the form is showing
  const [submittedSearch, setSubmittedSearch] =
    useSessionState<CourseSearchData | null>("courseSearchSubmitted", null);
  const [courses, setCourses] = useState<CatalogCourse[] | null>(null);

  useEffect(() => {
    if (!submittedSearch) return;
    let isCurrent = true;
    void searchCatalogCourses(submittedSearch).then((results) => {
      if (isCurrent) setCourses(results);
    });
    return () => {
      isCurrent = false;
    };
  }, [submittedSearch]);

  if (!submittedSearch) {
    return (
      <CourseSearchContent
        formData={formData}
        setFormData={setFormData}
        onSearchSubmit={(search) => {
          setCourses(null);
          setResultsQuery("");
          setSubmittedSearch(search);
        }}
      />
    );
  }

  if (!courses) {
    return (
      <div className="flex justify-center py-8">
        <CircleNotchIcon className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const isGeneric = submittedSearch.searchQuery.trim().length === 0;

  return (
    <CourseSearchResults
      courses={courses}
      isGeneric={isGeneric}
      searchQuery={resultsQuery}
      setSearchQuery={setResultsQuery}
      onBack={() => setSubmittedSearch(null)}
    />
  );
}
