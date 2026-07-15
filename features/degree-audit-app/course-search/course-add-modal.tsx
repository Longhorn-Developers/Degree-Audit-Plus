import Button from "@/components/ui/button";
import {
  catalogCourseToPlannedCourse,
  dedupeCatalogCoursesByCode,
  filterCatalogCourses,
} from "@/features/catalog/catalog-course-mappers";
import { cn } from "@/lib/utils";
import {
  CircleNotchIcon,
  DotsSixVerticalIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { useAuditContext } from "../providers/audit-provider";
import { useCourseModalContext } from "./course-modal-provider";

function FulfillingCoursesContent() {
  const { addPlannedCourse } = useAuditContext();
  const {
    recommendedCourses: courses,
    recommendationScope,
    isLoadingRecommendedCourses: isLoading,
    closeModal: onClose,
  } = useCourseModalContext();
  const displayedCourses = dedupeCatalogCoursesByCode(courses);
  const [query, setQuery] = useState("");
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");

  const filteredCourses = filterCatalogCourses(displayedCourses, query);
  const hasSearchQuery = query.trim().length > 0;

  // Prefer the user's visible selection, then fall back to the first result.
  const selectedCourse =
    filteredCourses.find((course) => course.uniqueId === pickedId) ??
    filteredCourses[0] ??
    null;
  const selectedCourseId = selectedCourse?.uniqueId ?? null;
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
        className="w-full h-12 px-4 border border-dap-border rounded-md text-base font-semibold placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-dap-orange focus:border-transparent transition-all"
      />

      <div className="mt-4 space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted">
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
                onClick={() => setPickedId(course.uniqueId)}
                className={cn(
                  "w-full min-h-[70px] grid grid-cols-[22px_1fr] items-stretch overflow-hidden rounded-md border bg-background text-left transition-colors",
                  isSelected
                    ? "border-2 border-dap-plan-green"
                    : "border-dap-border hover:border-gray-300",
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
                  <p className="text-base font-semibold leading-tight">
                    {courseCode}
                  </p>
                  <p className="mt-2 text-sm font-medium leading-tight">
                    {course.fullName}
                  </p>
                </div>
              </button>
            );
          })
        ) : (
          <div className="min-h-[180px] rounded-md border border-dashed border-dap-border bg-background px-6 py-8 flex flex-col items-center justify-center text-center">
            <p className="text-lg font-semibold text-text">
              {hasSearchQuery
                ? "No matching fulfilling courses"
                : "No fulfilling courses found"}
            </p>
            <p className="mt-2 text-sm text-muted">
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
          className="w-[310px] h-14 bg-dap-plan-green hover:bg-dap-plan-green-hover text-white border-none rounded-md text-xl font-bold flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default function CourseAddModal() {
  const { isOpen, closeModal } = useCourseModalContext();
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 bg-black/50 opacity-100"
      onClick={closeModal}
    >
      <div
        className="bg-background rounded-md border border-dap-border shadow-2xl w-full max-w-[550px] max-h-[90vh] mx-4 transform transition-all duration-200 overflow-hidden scale-100 opacity-100"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-7 pt-7 pb-7">
          <h2 className="text-3xl leading-none font-bold text-text mb-8">
            Fulfilling courses
          </h2>
          <FulfillingCoursesContent />
        </div>
      </div>
    </div>
  );
}
