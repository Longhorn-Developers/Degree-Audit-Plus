import { searchCatalogCourses } from "@/lib/backend/db";
import type {
  CatalogCourse,
  Course,
  CourseCode,
  CourseId,
  StringSemester,
} from "@/lib/general-types";
import {
  CaretLeftIcon,
  ChalkboardTeacherIcon,
  CircleNotchIcon,
  GraduationCapIcon,
} from "@phosphor-icons/react";
import React, { useEffect, useState } from "react";
import { cn } from "~/lib/utils";
import { useAuditContext } from "../degree-audit/providers/audit-provider";
import Button from "./common/button";
import SelectDropdown from "./common/select-dropdown";
import CourseCard from "./course-card";

interface CourseAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (searchData: CourseSearchData) => void;
  recommendedCourses?: CatalogCourse[];
  isLoading?: boolean;
  hasSearched?: boolean;
  resultsCount?: number;
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

// const RECOMMENDED_COURSES = [
//   {
//     fullName: "HIS 315K - Fourmy",
//     courseName: "MWF 9:00 am – 10:00 am, UTC 2.102A",
//     color: "orange" as const,
//   },
//   {
//     fullName: "DES 374 - Garmon",
//     courseName: "MWF 3:00pm – 4:00pm, BUR 2.112",
//     color: "indigo" as const,
//   },
// ];

async function SearchCourses(
  searchData: CourseSearchData,
): Promise<CatalogCourse[]> {
  // Pass the modal form data into the DB search helper and return the results.
  return searchCatalogCourses(searchData);
}

interface CourseSearchContentProps {
  recommendedCourses?: CatalogCourse[];
  onSearchSubmit?: (formData: CourseSearchData) => void | Promise<void>;
  isLoading?: boolean;
}

function getCatalogCourseId(course: CatalogCourse): CourseId {
  return `catalog-course-${course.uniqueId}`;
}

function syncCatalogCourseForCard(
  courseMap: Record<CourseId, Course>,
  course: CatalogCourse,
): CourseId {
  const courseId = getCatalogCourseId(course);

  if (!courseMap[courseId]) {
    courseMap[courseId] = {
      id: courseId,
      code: `${course.department} ${course.number}` as CourseCode,
      name: course.fullName,
      hours: course.creditHours,
      semester:
        `${course.semester.season} ${course.semester.year}` as StringSemester,
      status: "Planned",
      type: "In-Residence",
    };
  }

  return courseId;
}

export function CourseSearchContent({
  recommendedCourses = [],
  onSearchSubmit,
  isLoading = false,
}: CourseSearchContentProps) {
  const { courseMap } = useAuditContext();
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

  const handleToggle = (field: "lowerDivision" | "upperDivision") => {
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
          {recommendedCourses.map((course) => (
            <CourseCard
              key={course.uniqueId}
              courseId={syncCatalogCourseForCard(courseMap, course)}
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

        {/* Toggle Switches */}
        <div className="space-y-3 mb-6">
          {/* Lower Division Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleToggle("lowerDivision")}
              disabled={isSearching}
              className={cn(
                "w-12 h-7 rounded-full transition-colors duration-200 relative disabled:opacity-50 disabled:cursor-not-allowed",
                formData.lowerDivision ? "bg-[#4A7C59]" : "bg-gray-200",
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full transform transition-transform duration-200 absolute top-1/2 -translate-y-1/2 bg-white",
                  formData.lowerDivision
                    ? "translate-x-[24px]"
                    : "translate-x-1",
                )}
              />
            </button>
            <span className="text-base text-gray-900">
              Lower Division Courses
            </span>
          </div>

          {/* Upper Division Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleToggle("upperDivision")}
              disabled={isSearching}
              className={cn(
                "w-12 h-7 rounded-full transition-colors duration-200 relative disabled:opacity-50 disabled:cursor-not-allowed",
                formData.upperDivision ? "bg-[#4A7C59]" : "bg-gray-200",
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full transform transition-transform duration-200 absolute top-1/2 -translate-y-1/2 bg-white",
                  formData.upperDivision
                    ? "translate-x-[24px]"
                    : "translate-x-1",
                )}
              />
            </button>
            <span className="text-base text-gray-900">
              Upper Division Courses
            </span>
          </div>
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

export function CourseSuggestionContent({
  recommendedCourses = [],
  onSearchSubmit,
  isLoading = false,
}: CourseSearchContentProps) {
  const { courseMap } = useAuditContext();
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

  const handleToggle = (field: "lowerDivision" | "upperDivision") => {
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
        <p className="text-dap-orange font-semibold text-sm uppercase tracking-wide mb-3">
          Recommended
        </p>
        <div className="space-y-2">
          {recommendedCourses.map((course) => (
            <CourseCard
              key={course.uniqueId}
              courseId={syncCatalogCourseForCard(courseMap, course)}
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
          placeholder="Search with name or unique"
          disabled={isSearching}
          className="w-full px-4 py-2 border border-dap-border rounded-md text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-dap-orange focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* Or Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-dap-border" />
          <span className="text-gray-400 text-sm">or</span>
          <div className="flex-1 h-px bg-dap-border" />
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

        {/* Toggle Switches */}
        <div className="space-y-3 mb-6">
          {/* Lower Division Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleToggle("lowerDivision")}
              disabled={isSearching}
              className={cn(
                "w-12 h-7 rounded-full transition-colors duration-200 relative disabled:opacity-50 disabled:cursor-not-allowed",
                formData.lowerDivision ? "bg-[#4A7C59]" : "bg-gray-200",
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full transform transition-transform duration-200 absolute top-1/2 -translate-y-1/2 bg-white",
                  formData.lowerDivision
                    ? "translate-x-[24px]"
                    : "translate-x-1",
                )}
              />
            </button>
            <span className="text-base text-gray-900">
              Lower Division Courses
            </span>
          </div>

          {/* Upper Division Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleToggle("upperDivision")}
              disabled={isSearching}
              className={cn(
                "w-12 h-7 rounded-full transition-colors duration-200 relative disabled:opacity-50 disabled:cursor-not-allowed",
                formData.upperDivision ? "bg-[#4A7C59]" : "bg-gray-200",
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full transform transition-transform duration-200 absolute top-1/2 -translate-y-1/2 bg-white",
                  formData.upperDivision
                    ? "translate-x-[24px]"
                    : "translate-x-1",
                )}
              />
            </button>
            <span className="text-base text-gray-900">
              Upper Division Courses
            </span>
          </div>
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
          className="px-6 py-2 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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

interface CourseSearchResultsProps {
  courses: CatalogCourse[];
  onBack: () => void;
}

export function CourseSearchResults({
  courses,
  onBack,
}: CourseSearchResultsProps) {
  const { courseMap } = useAuditContext();

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
            courseId={syncCatalogCourseForCard(courseMap, course)}
            className="w-full"
            type="add"
          />
        ))}
      </div>
    </div>
  );
}

export default function CourseAddModal({
  isOpen,
  onClose,
  onSearch,
  recommendedCourses = [],
  isLoading = false,
}: CourseAddModalProps) {
  const [view, setView] = useState<boolean>(false);
  const [courses, setCourses] = useState<CatalogCourse[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setView(false);
    }
  }, [isOpen]);

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
          "bg-white rounded-md border-2 border-dap-border shadow-2xl w-full max-w-[480px] max-h-[80vh] mx-4 transform transition-all duration-200",
          isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Add courses</h2>
          {!view ? (
            <CourseSuggestionContent
              recommendedCourses={recommendedCourses}
              isLoading={isLoading}
              onSearchSubmit={async (formData) => {
                const matchingCourses = await SearchCourses(formData);
                setCourses(matchingCourses);
                onSearch(formData);
                setView(true);
              }}
            />
          ) : (
            <CourseSearchResults
              courses={courses}
              onBack={() => setView(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
