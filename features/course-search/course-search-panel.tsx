import Button from "@/components/ui/button";
import SelectDropdown from "@/components/ui/select-dropdown";
import type { CatalogCourse } from "@/domain/catalog";
import {
  catalogCourseToPlannedCourse,
  dedupeCatalogCoursesByCode,
  mapCatalogCourseToPreview,
  matchesCatalogQuery,
} from "@/features/catalog/catalog-course-mappers";
import {
  getCatalogDepartmentNames,
  searchCatalogCourses,
} from "@/features/catalog/catalog-db";
import { cn } from "@/lib/utils";
import {
  CaretDownIcon,
  CaretLeftIcon,
  ChalkboardTeacherIcon,
  CircleNotchIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import CourseCard from "./course-card";
import { useCourseModalContext } from "./course-modal-provider";
import { useAuditContext } from "@/features/audit/audit-provider";

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

function PlannerSwitch({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "relative h-6 w-10 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-dap-orange disabled:opacity-50",
        checked ? "bg-dap-plan-green" : "bg-gray-300",
      )}
    >
      <span
        className={cn(
          "absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-5" : "translate-x-1",
        )}
      />
    </button>
  );
}

function SearchResultsToolbar({
  courses,
  onBack,
  onAddCourse,
  isCoursePlanned,
}: {
  courses: CatalogCourse[];
  onBack: () => void;
  onAddCourse: (course: CatalogCourse) => Promise<boolean>;
  isCoursePlanned: (course: CatalogCourse) => boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"code" | "title">("code");
  const [addingCourseId, setAddingCourseId] = useState<number | null>(null);
  const [addedCourseIds, setAddedCourseIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [addError, setAddError] = useState("");

  const visibleCourses = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const matchingCourses = courses.filter((course) =>
      matchesCatalogQuery(course, normalizedQuery),
    );

    return [...matchingCourses].sort((left, right) => {
      if (sortBy === "title") {
        return left.courseName.localeCompare(right.courseName);
      }
      return left.fullName.localeCompare(right.fullName, undefined, {
        numeric: true,
      });
    });
  }, [courses, searchQuery, sortBy]);

  const handleAddCourse = async (course: CatalogCourse) => {
    setAddingCourseId(course.uniqueId);
    setAddError("");
    try {
      if (!(await onAddCourse(course))) {
        setAddError(
          "Could not add this course to your planner. Please try again.",
        );
        return;
      }
      setAddedCourseIds((previous) => new Set(previous).add(course.uniqueId));
    } catch (error) {
      console.error("[Course search] Failed to add course to planner:", error);
      setAddError(
        "Could not add this course to your planner. Please try again.",
      );
    } finally {
      setAddingCourseId(null);
    }
  };

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
          {visibleCourses.map((course) => {
            const isPlanned =
              isCoursePlanned(course) || addedCourseIds.has(course.uniqueId);
            const isAdding = addingCourseId === course.uniqueId;

            return (
              <button
                key={course.uniqueId}
                type="button"
                disabled={isPlanned || isAdding}
                onClick={() => void handleAddCourse(course)}
                aria-label={`Add ${course.department} ${course.number} to planner`}
                className="block w-full rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-dap-orange disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CourseCard
                  course={mapCatalogCourseToPreview(course)}
                  className="w-full"
                  type="add"
                />
                <span className="sr-only">
                  {isAdding
                    ? "Adding course"
                    : isPlanned
                      ? "Already in planner"
                      : "Add to planner"}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {addError ? (
        <p className="mt-3 text-sm text-red-700">{addError}</p>
      ) : null}
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
  const [showPlannedCourses, setShowPlannedCourses] = useState(true);

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
      <div className="mb-7">
        <h2 className="text-[26px] font-semibold leading-tight tracking-tight text-text">
          Add Planned Courses
        </h2>
        <div className="mt-4 flex items-center justify-between text-[18px] text-ut-charcoal">
          <span>Show Planned Courses</span>
          <PlannerSwitch
            checked={showPlannedCourses}
            disabled={isSearching}
            onChange={() => setShowPlannedCourses((show) => !show)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-[25px] font-semibold leading-tight tracking-tight text-text">
          Add UT Courses
        </h2>
        <CaretDownIcon size={24} weight="fill" className="text-dap-primary" />
      </div>

      <div className="mt-5">
        <p className="text-base font-semibold uppercase tracking-tight text-dap-primary">
          Recommended
        </p>
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

      <form className="mt-7" onSubmit={handleSearch}>
        <p className="text-base font-semibold uppercase tracking-tight text-dap-primary">
          Search
        </p>
        <div className="mt-3 grid grid-cols-2 gap-10">
          <select
            aria-label="Semester"
            defaultValue=""
            className="h-11 rounded-md border border-dap-border bg-background px-3 text-base text-gray-500 focus:outline-none focus:ring-2 focus:ring-dap-orange"
          >
            <option value="">Semester</option>
            <option>Spring</option>
            <option>Summer</option>
            <option>Fall</option>
          </select>
          <input
            inputMode="numeric"
            maxLength={4}
            placeholder="4-Digit Year"
            className="h-11 min-w-0 rounded-md border border-dap-border px-3 text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-dap-orange"
          />
        </div>
        <input
          type="search"
          placeholder="Search for a specific course"
          className="mt-4 h-11 w-full rounded-md border border-dap-border px-3 text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-dap-orange"
        />
        <div className="mt-6 mb-5">
          <SelectDropdown
            icon={<ChalkboardTeacherIcon size={28} />}
            placeholder={
              isLoadingDepartments ? "Loading local catalog..." : "Department"
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
          <div className="space-y-2 mb-6">
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

        <div className="mb-7 flex items-center justify-between text-[25px] font-semibold tracking-tight text-text">
          <span>Add Transfer Courses</span>
          <CaretDownIcon size={24} weight="fill" className="text-dap-primary" />
        </div>

        <Button
          type="submit"
          color="orange"
          fill="solid"
          disabled={isSearchDisabled}
          className="rounded-md px-5 py-2 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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

export function CourseSearchPanel() {
  const { courseMap, addUnassignedPlannedCourse } = useAuditContext();
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
      isCoursePlanned={(course) =>
        Object.values(courseMap).some(
          (plannedCourse) =>
            plannedCourse.status === "Planned" &&
            plannedCourse.code === `${course.department} ${course.number}`,
        )
      }
      onAddCourse={async (course) =>
        Boolean(
          await addUnassignedPlannedCourse(
            catalogCourseToPlannedCourse(course),
          ),
        )
      }
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
