import Button from "@/components/ui/button";
import SelectDropdown from "@/components/ui/select-dropdown";
import type { CatalogCourse } from "@/domain/catalog";
import {
  dedupeCatalogCoursesByCode,
  mapCatalogCourseToPreview,
} from "@/features/catalog/catalog-course-mappers";
import { searchCatalogCourses } from "@/features/catalog/catalog-db";
import { DEPARTMENT_MAP } from "@/features/catalog/department-map";
import { cn } from "@/lib/utils";
import {
  CaretLeftIcon,
  ChalkboardTeacherIcon,
  CircleNotchIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import CourseCard from "./course-card";
import { useCourseModalContext } from "./course-modal-provider";

interface CourseSearchData {
  searchQuery: string;
  department: string;
  lowerDivision: boolean;
  upperDivision: boolean;
}

const DEPARTMENTS = [...new Set(Object.values(DEPARTMENT_MAP))].sort();

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

interface CourseSearchContentProps {
  onSearchSubmit?: (formData: CourseSearchData) => void | Promise<void>;
  isLoading?: boolean;
}

type DivisionField = "lowerDivision" | "upperDivision";

function DivisionToggle({
  checked,
  disabled,
  label,
  onToggle,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
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
  onSearchSubmit,
  isLoading = false,
}: CourseSearchContentProps) {
  const { recommendedCourses } = useCourseModalContext();
  const displayedRecommendedCourses =
    dedupeCatalogCoursesByCode(recommendedCourses);
  const [formData, setFormData] = useState<CourseSearchData>({
    searchQuery: "",
    department: "",
    lowerDivision: true,
    upperDivision: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSearching = isLoading || isSubmitting;

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleToggle = (field: DivisionField) => {
    setFormData((previous) => ({
      ...previous,
      [field]: !previous[field],
    }));
  };

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!onSearchSubmit) return;

    try {
      setIsSubmitting(true);
      await waitForNextPaint();
      await onSearchSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSearchDisabled =
    (!formData.lowerDivision && !formData.upperDivision) || isSearching;

  return (
    <div>
      <div className="mb-6">
        <p className="font-semibold text-xl tracking-wide mb-3">Add Courses</p>
        <div className="space-y-2">
          {displayedRecommendedCourses.map((course) => (
            <CourseCard
              key={course.uniqueId}
              course={mapCatalogCourseToPreview(course)}
              type="add"
            />
          ))}
        </div>
      </div>

      <form onSubmit={handleSearch}>
        <input
          type="text"
          name="searchQuery"
          value={formData.searchQuery}
          onChange={handleInputChange}
          placeholder="Search for a specific course"
          disabled={isSearching}
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
              setFormData((previous) => ({
                ...previous,
                department: value,
              }))
            }
            disabled={isSearching}
          />
        </div>

        <div className="space-y-3 mb-6">
          <DivisionToggle
            checked={formData.lowerDivision}
            disabled={isSearching}
            label="Lower Division Courses"
            onToggle={() => handleToggle("lowerDivision")}
          />
          <DivisionToggle
            checked={formData.upperDivision}
            disabled={isSearching}
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
          {isSearching ? (
            <div className="flex items-center gap-2">
              <CircleNotchIcon className="h-5 w-5 animate-spin" />
              <span>Searching...</span>
            </div>
          ) : (
            "Search"
          )}
        </Button>
      </form>
    </div>
  );
}

function CourseSearchResults({
  courses,
  onBack,
}: {
  courses: CatalogCourse[];
  onBack: () => void;
}) {
  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center justify-start gap-1 text-dap-orange font-semibold text-[14px] uppercase tracking-wide mb-4 hover:underline rounded-lg transition-all duration-200 ease-in-out"
      >
        <CaretLeftIcon size={16} weight="bold" />
        Search Results
      </button>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {courses.map((course) => (
          <CourseCard
            key={course.uniqueId}
            course={mapCatalogCourseToPreview(course)}
            className="w-full"
            type="add"
          />
        ))}
      </div>
    </div>
  );
}

export function CourseSearchPanel() {
  const [showResults, setShowResults] = useState(false);
  const [courses, setCourses] = useState<CatalogCourse[]>([]);

  return showResults ? (
    <CourseSearchResults
      courses={courses}
      onBack={() => setShowResults(false)}
    />
  ) : (
    <CourseSearchContent
      onSearchSubmit={async (formData) => {
        const results = await searchCatalogCourses(formData);
        setCourses(results);
        setShowResults(true);
      }}
    />
  );
}
