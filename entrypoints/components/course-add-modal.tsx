import { searchCatalogCourses } from "@/lib/backend/db";
import { getCurrentSemester } from "@/lib/backend/audit-scraper";
import type {
  CatalogCourse,
  CourseCode,
  PlannedCourseOutline,
} from "@/lib/general-types";
import {
  CaretLeftIcon,
  ChalkboardTeacherIcon,
  CircleNotchIcon,
  DotsSixVerticalIcon,
  GraduationCapIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import React, { useEffect, useState } from "react";
import { cn } from "~/lib/utils";
import { useAuditContext } from "../degree-audit/providers/audit-provider";
import { useCourseModalContext } from "../degree-audit/providers/course-modal-provider";
import Button from "./common/button";
import SelectDropdown from "./common/select-dropdown";
import CourseCard from "./course-card";

type RecommendationScope = {
  requirementTitle?: string;
  ruleTitle?: string;
};

interface CourseAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendedCourses?: CatalogCourse[];
  recommendationScope?: RecommendationScope | null;
  isLoading?: boolean;
}

export interface CourseSearchData {
  searchQuery: string;
  requirement: string;
  catalogYear: string;
  department: string;
  lowerDivision: boolean;
  upperDivision: boolean;
}

const DEPARTMENTS = [
  "Computer Science",
  "Mathematics",
  "Engineering",
  "Biology",
  "Chemistry",
  "Physics",
  "English",
  "History",
];

async function SearchCourses(
  searchData: CourseSearchData,
): Promise<CatalogCourse[]> {
  // Pass the modal form data into the DB search helper and return the results.
  return searchCatalogCourses(searchData);
}

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

interface CourseSearchContentProps {
  recommendedCourses?: CatalogCourse[];
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
          checked ? "bg-[#4A7C59]" : "bg-gray-200",
        )}
      >
        <div
          className={cn(
            "w-5 h-5 rounded-full transform transition-transform duration-200 absolute top-1/2 -translate-y-1/2 bg-white",
            checked ? "translate-x-[24px]" : "translate-x-1",
          )}
        />
      </button>
      <span className="text-base text-gray-900">{label}</span>
    </div>
  );
}

function mapCatalogCourseToPreview(course: CatalogCourse) {
  return {
    code: `${course.department} ${course.number}`,
    name: course.fullName,
  };
}

function dedupeCatalogCoursesByCode(courses: CatalogCourse[]): CatalogCourse[] {
  const seenCourseCodes = new Set<string>();

  return courses.filter((course) => {
    const courseCode = `${course.department} ${course.number}`.trim();
    if (seenCourseCodes.has(courseCode)) {
      return false;
    }

    seenCourseCodes.add(courseCode);
    return true;
  });
}

function catalogCourseToPlannedCourse(
  course: CatalogCourse,
): PlannedCourseOutline {
  return {
    code: `${course.department} ${course.number}` as CourseCode,
    name: course.fullName,
    hours: course.creditHours,
    semester: getCurrentSemester(),
    status: "Planned",
    type: "In-Residence",
  };
}

function filterFulfillingCourses(courses: CatalogCourse[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return courses;
  }

  return courses.filter((course) => {
    const courseCode = `${course.department} ${course.number}`;
    const instructorNames = course.instructors
      .map((instructor) => instructor.fullName)
      .join(" ");

    return [
      courseCode,
      course.fullName,
      course.courseName,
      instructorNames,
    ].some((value) => value.toLowerCase().includes(normalizedQuery));
  });
}

export function CourseSearchContent({
  recommendedCourses,
  onSearchSubmit,
  isLoading = false,
}: CourseSearchContentProps) {
  const { recommendedCourses: sharedRecommendedCourses } =
    useCourseModalContext();
  const displayedRecommendedCourses = dedupeCatalogCoursesByCode(
    recommendedCourses ?? sharedRecommendedCourses,
  );
  const [formData, setFormData] = useState<CourseSearchData>({
    searchQuery: "",
    requirement: "",
    catalogYear: "",
    department: "",
    lowerDivision: true,
    upperDivision: true,
  });
  const [validationError, setValidationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSearching = isLoading || isSubmitting;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggle = (field: DivisionField) => {
    setFormData((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lowerDivision && !formData.upperDivision) {
      setValidationError(
        "Please select at least one course division (Lower or Upper)",
      );
      return;
    }
    setValidationError("");
    if (!onSearchSubmit) {
      return;
    }

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
      {/* Recommended Section */}
      <div className="mb-6">
        <p className="font-semibold text-xl tracking-wide mb-3">Add Courses</p>
        <div className="space-y-2">
          {displayedRecommendedCourses.map((course) => (
            <CourseCard
              key={course.uniqueId}
              previewCourse={mapCatalogCourseToPreview(course)}
              type="add"
            />
          ))}
        </div>
      </div>

      {/* Search Section */}
      <form onSubmit={handleSearch}>
        {/* Search Input */}
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

        {/* Requirement Dropdown */}
        <div className="mb-4">
          <SelectDropdown
            icon={<GraduationCapIcon size={28} />}
            placeholder="Requirement"
            options={DEPARTMENTS}
            value={formData.department}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, department: value }))
            }
            disabled={isSearching}
          />
        </div>

        {/* Department Dropdown */}
        <div className="mb-4">
          <SelectDropdown
            icon={<ChalkboardTeacherIcon size={28} />}
            placeholder="Department"
            options={DEPARTMENTS}
            value={formData.department}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, department: value }))
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

        {/* Validation Error */}
        {validationError && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl mb-4">
            <svg
              className="w-5 h-5 text-red-600 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-sm text-red-700">{validationError}</p>
          </div>
        )}

        {/* Search Button */}
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

interface FulfillingCoursesContentProps {
  courses: CatalogCourse[];
  recommendationScope?: RecommendationScope | null;
  isLoading?: boolean;
  onClose: () => void;
}

function FulfillingCoursesContent({
  courses,
  recommendationScope,
  isLoading = false,
  onClose,
}: FulfillingCoursesContentProps) {
  const { addPlannedCourse } = useAuditContext();
  const displayedCourses = dedupeCatalogCoursesByCode(courses);
  const [query, setQuery] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSelectedCourseId(displayedCourses[0]?.uniqueId ?? null);
  }, [displayedCourses[0]?.uniqueId]);

  const filteredCourses = filterFulfillingCourses(displayedCourses, query);
  const hasSearchQuery = query.trim().length > 0;

  useEffect(() => {
    const selectedCourseIsVisible = filteredCourses.some(
      (course) => course.uniqueId === selectedCourseId,
    );

    if (!selectedCourseIsVisible) {
      setSelectedCourseId(filteredCourses[0]?.uniqueId ?? null);
    }
  }, [filteredCourses.length, filteredCourses[0]?.uniqueId, selectedCourseId]);

  const selectedCourse =
    filteredCourses.find((course) => course.uniqueId === selectedCourseId) ??
    null;
  const canAddCourse =
    Boolean(
      selectedCourse &&
      recommendationScope?.requirementTitle &&
      recommendationScope?.ruleTitle,
    ) && !isAdding;

  const handleAddPlannedCourse = async () => {
    if (
      !selectedCourse ||
      !recommendationScope?.requirementTitle ||
      !recommendationScope?.ruleTitle
    ) {
      return;
    }

    try {
      setIsAdding(true);
      setError("");
      const courseId = await addPlannedCourse(
        catalogCourseToPlannedCourse(selectedCourse),
        recommendationScope.requirementTitle,
        recommendationScope.ruleTitle,
      );

      if (!courseId) {
        setError("Could not add this course. Please try again.");
        return;
      }

      onClose();
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search fulfilling courses"
        className="w-full h-12 px-4 border border-[#E5E1DA] rounded-md text-base font-semibold placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#579D42] focus:border-transparent transition-all"
      />

      <div className="mt-4 space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-600">
            <CircleNotchIcon className="h-5 w-5 animate-spin" />
            <span>Loading fulfilling courses...</span>
          </div>
        ) : filteredCourses.length > 0 ? (
          filteredCourses.map((course) => {
            const courseCode = `${course.department} ${course.number}`;
            const isSelected = course.uniqueId === selectedCourseId;

            return (
              <button
                type="button"
                key={course.uniqueId}
                onClick={() => setSelectedCourseId(course.uniqueId)}
                className={cn(
                  "w-full min-h-[70px] grid grid-cols-[22px_1fr] items-stretch overflow-hidden rounded-md border bg-white text-left transition-colors",
                  isSelected
                    ? "border-2 border-[#579D42]"
                    : "border-[#E5E1DA] hover:border-gray-300",
                )}
              >
                <div className="bg-dap-orange flex items-center justify-center">
                  <DotsSixVerticalIcon
                    size={16}
                    weight="bold"
                    className="text-white"
                  />
                </div>
                <div className="px-3 py-3">
                  <p className="text-base font-semibold text-gray-900 leading-tight">
                    {courseCode}
                  </p>
                  <p className="mt-2 text-sm font-medium text-black leading-tight">
                    {course.fullName}
                  </p>
                </div>
              </button>
            );
          })
        ) : (
          <div className="min-h-[180px] rounded-md border border-dashed border-[#E5E1DA] bg-[#FAFAF9] px-6 py-8 flex flex-col items-center justify-center text-center">
            <p className="text-lg font-semibold text-gray-900">
              {hasSearchQuery
                ? "No matching fulfilling courses"
                : "No fulfilling courses found"}
            </p>
            <p className="mt-2 text-sm text-gray-600">
              {hasSearchQuery
                ? "Try a different course number, title, or instructor."
                : "This requirement does not have any catalog matches yet."}
            </p>
          </div>
        )}
      </div>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      <div className="mt-8 flex justify-end">
        <Button
          type="button"
          fill="solid"
          disabled={!canAddCourse}
          onClick={handleAddPlannedCourse}
          className="w-[310px] h-14 bg-[#579D42] hover:bg-[#4C8F3B] text-white border-none rounded-md text-xl font-bold flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAdding ? (
            <>
              <CircleNotchIcon className="h-6 w-6 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <PlusIcon size={30} weight="light" />
              Add Planned Course
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

interface CourseSearchResultsProps {
  courses: CatalogCourse[];
  onBack: () => void;
}

export function CourseSearchResults({
  courses,
  onBack,
}: CourseSearchResultsProps) {
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
            previewCourse={mapCatalogCourseToPreview(course)}
            className="w-full"
            type="add"
          />
        ))}
      </div>
    </div>
  );
}

export function CourseSearchPanel() {
  const [view, setView] = useState(false);
  const [courses, setCourses] = useState<CatalogCourse[]>([]);

  return view ? (
    <CourseSearchResults courses={courses} onBack={() => setView(false)} />
  ) : (
    <CourseSearchContent
      onSearchSubmit={async (formData) => {
        const results = await SearchCourses(formData);
        setCourses(results);
        setView(true);
      }}
    />
  );
}

export default function CourseAddModal({
  isOpen,
  onClose,
  recommendedCourses = [],
  recommendationScope,
  isLoading = false,
}: CourseAddModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center transition-all duration-200",
        isOpen ? "bg-black/50 opacity-100" : "opacity-0 pointer-events-none",
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          "bg-white rounded-md border border-dap-border shadow-2xl w-full max-w-[550px] max-h-[90vh] mx-4 transform transition-all duration-200 overflow-hidden",
          isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-7 pt-7 pb-7">
          <h2 className="text-3xl leading-none font-bold text-gray-900 mb-8">
            Fulfilling courses
          </h2>
          <FulfillingCoursesContent
            courses={recommendedCourses}
            recommendationScope={recommendationScope}
            isLoading={isLoading}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}
