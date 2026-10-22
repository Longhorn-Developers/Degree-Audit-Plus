import Button from "@/components/ui/button";
import SelectDropdown from "@/components/ui/select-dropdown";
import type { CatalogCourse } from "@/domain/catalog";
import {
  dedupeCatalogCoursesByCode,
  mapCatalogCourseToPreview,
} from "@/features/catalog/catalog-course-mappers";
import {
  getCatalogDepartmentNames,
  searchCatalogCourses,
} from "@/features/catalog/catalog-db";
import { cn } from "@/lib/utils";
import {
  CaretLeftIcon,
  ChalkboardTeacherIcon,
  CircleNotchIcon,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import CourseCard from "./course-card";
import { useCourseModalContext } from "./course-modal-provider";

interface CourseSearchData {
  searchQuery: string;
  department: string;
  lowerDivision: boolean;
  upperDivision: boolean;
}

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

interface CourseSearchContentProps {
  onSearchSubmit?: (formData: CourseSearchData) => void | Promise<void>;
  isLoading?: boolean;
  departments: string[];
  isLoadingDepartments: boolean;
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
  departments,
  isLoadingDepartments,
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
  const hasDepartment = formData.department.length > 0;

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
    !hasDepartment ||
    (!formData.lowerDivision && !formData.upperDivision) ||
    isSearching ||
    isLoadingDepartments;

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
        <div className="mb-5">
          <label className="block text-sm font-semibold text-text mb-2">
            Department
          </label>
          <SelectDropdown
            icon={<ChalkboardTeacherIcon size={28} />}
            placeholder={
              isLoadingDepartments
                ? "Loading local catalog..."
                : "Select a department"
            }
            options={departments}
            value={formData.department}
            onChange={(value) =>
              setFormData((previous) => ({
                ...previous,
                department: value,
              }))
            }
            disabled={isSearching || isLoadingDepartments}
          />
        </div>

        <div
          className={cn(
            "transition-opacity duration-200",
            !hasDepartment && "opacity-50",
          )}
        >
          <label className="block text-sm font-semibold text-text mb-2">
            Find courses in this department
          </label>
          <input
            type="text"
            name="searchQuery"
            value={formData.searchQuery}
            onChange={handleInputChange}
            placeholder="Course number, title, or instructor"
            disabled={isSearching || !hasDepartment}
            className="w-full px-4 py-2 mb-4 border border-dap-border rounded-md text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-dap-orange focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />

          <div className="space-y-3 mb-6">
            <DivisionToggle
              checked={formData.lowerDivision}
              disabled={isSearching || !hasDepartment}
              label="Lower Division Courses"
              onToggle={() => handleToggle("lowerDivision")}
            />
            <DivisionToggle
              checked={formData.upperDivision}
              disabled={isSearching || !hasDepartment}
              label="Upper Division Courses"
              onToggle={() => handleToggle("upperDivision")}
            />
          </div>
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
            "View courses"
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
      <div>
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
    </div>
  );
}

export function CourseSearchPanel() {
  const [showResults, setShowResults] = useState(false);
  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);

  useEffect(() => {
    let active = true;

    void getCatalogDepartmentNames()
      .then((catalogDepartments) => {
        if (active) setDepartments(catalogDepartments);
      })
      .catch((error: unknown) => {
        console.error("[Course search] Failed to read local catalog:", error);
      })
      .finally(() => {
        if (active) setIsLoadingDepartments(false);
      });

    return () => {
      active = false;
    };
  }, []);

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
      departments={departments}
      isLoadingDepartments={isLoadingDepartments}
    />
  );
}
