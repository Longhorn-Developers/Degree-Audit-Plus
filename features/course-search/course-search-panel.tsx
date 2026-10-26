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
import { useEffect, useMemo, useState } from "react";
import CourseCard from "./course-card";
import { useCourseModalContext } from "./course-modal-provider";

interface CourseSearchData {
  department: string;
  courseLevel: CourseLevel;
}

type CourseLevel =
  | "undergraduate"
  | "lowerDivision"
  | "upperDivision"
  | "graduate";

const COURSE_LEVEL_OPTIONS: Array<{
  value: CourseLevel;
  label: string;
  description: string;
}> = [
  {
    value: "undergraduate",
    label: "All undergraduate courses",
    description: "301–379",
  },
  {
    value: "lowerDivision",
    label: "Only lower-division courses",
    description: "301–319",
  },
  {
    value: "upperDivision",
    label: "Only upper-division courses",
    description: "320–379",
  },
  {
    value: "graduate",
    label: "All graduate courses",
    description: "380 and above",
  },
];

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

function CourseLevelOption({
  checked,
  disabled,
  label,
  description,
  onSelect,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 rounded-lg px-3 py-2 transition-colors",
        disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:bg-hover-bg",
      )}
    >
      <input
        className="mt-1 h-4 w-4 accent-dap-orange"
        checked={checked}
        disabled={disabled}
        name="courseLevel"
        onChange={onSelect}
        type="radio"
      />
      <span className="flex flex-col">
        <span className="text-sm font-semibold text-text">{label}</span>
        <span className="text-xs text-gray-500">{description}</span>
      </span>
    </label>
  );
}

function SearchResultsToolbar({
  courses,
  onBack,
}: {
  courses: CatalogCourse[];
  onBack: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"code" | "title">("code");

  const visibleCourses = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const matchingCourses = normalizedQuery
      ? courses.filter((course) => {
          const instructorNames = course.instructors
            .map((instructor) => instructor.fullName)
            .join(" ");
          return [
            course.fullName,
            course.courseName,
            course.department,
            course.number,
            instructorNames,
          ].some((value) => value.toLowerCase().includes(normalizedQuery));
        })
      : courses;

    return [...matchingCourses].sort((left, right) => {
      if (sortBy === "title") {
        return left.courseName.localeCompare(right.courseName);
      }
      return left.fullName.localeCompare(right.fullName, undefined, {
        numeric: true,
      });
    });
  }, [courses, searchQuery, sortBy]);

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="flex items-center justify-start gap-1 text-dap-orange font-semibold text-[14px] uppercase tracking-wide mb-4 hover:underline rounded-lg transition-all duration-200 ease-in-out"
      >
        <CaretLeftIcon size={16} weight="bold" />
        Search results
      </button>
      <div className="mb-4 space-y-3">
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Filter results by course number, title, or instructor"
          className="w-full px-4 py-2 border border-dap-border rounded-md text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-dap-orange focus:border-transparent transition-all"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-500" aria-live="polite">
            {visibleCourses.length}{" "}
            {visibleCourses.length === 1 ? "course" : "courses"}
          </p>
          <select
            aria-label="Sort results"
            value={sortBy}
            onChange={(event) =>
              setSortBy(event.target.value as "code" | "title")
            }
            className="border border-dap-border rounded-md bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-dap-orange"
          >
            <option value="code">Sort: course number</option>
            <option value="title">Sort: course title</option>
          </select>
        </div>
      </div>
      {visibleCourses.length === 0 ? (
        <p className="rounded-lg border border-dap-border px-4 py-5 text-sm text-gray-500">
          No courses match this filter. Try a different course number, title, or
          instructor.
        </p>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {visibleCourses.map((course) => (
            <CourseCard
              key={course.uniqueId}
              course={mapCatalogCourseToPreview(course)}
              className="w-full"
              type="add"
            />
          ))}
        </div>
      )}
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
    department: "",
    courseLevel: "undergraduate",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSearching = isLoading || isSubmitting;
  const hasDepartment = formData.department.length > 0;

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
    !hasDepartment || isSearching || isLoadingDepartments;

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
            Area of study
          </label>
          <SelectDropdown
            icon={<ChalkboardTeacherIcon size={28} />}
            placeholder={
              isLoadingDepartments
                ? "Loading local catalog..."
                : "Select an area of study"
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
          <p className="block text-sm font-semibold text-text mb-2">
            Choose course level
          </p>
          <div className="space-y-1 mb-6">
            {COURSE_LEVEL_OPTIONS.map((option) => (
              <CourseLevelOption
                key={option.value}
                checked={formData.courseLevel === option.value}
                disabled={isSearching || !hasDepartment}
                label={option.label}
                description={option.description}
                onSelect={() =>
                  setFormData((previous) => ({
                    ...previous,
                    courseLevel: option.value,
                  }))
                }
              />
            ))}
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
            "Search courses"
          )}
        </Button>
      </form>
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
    <SearchResultsToolbar
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
