import { CourseSearchContent } from "@/entrypoints/components/course-add-modal";
import { searchCatalogCourses } from "@/lib/backend/db";
import type {
  CatalogCourse,
  CourseRequirementFit,
  PlanRequirementValidationState,
} from "@/lib/general-types";
import {
  isCourseRequirementFulfilled,
  isValidationChecking,
} from "@/lib/general-types";
import {
  CaretLeftIcon,
  DotsSixVerticalIcon,
  PlusCircleIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { useRef, useState } from "react";

// Placeholder for the future fulfillment check when the course is added.
const try_add_course = async (
  _course: CatalogCourse,
): Promise<CourseRequirementFit> => ({
  kind: "no-match",
  message: "Requirement check not yet implemented.",
});

export default function CourseAddPanel() {
  const [results, setResults] = useState<CatalogCourse[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [validationState, setValidationState] =
    useState<PlanRequirementValidationState>({ status: "idle" });
  const fulfillmentRequestId = useRef(0);

  // Mark the course as selected, then ask whether it satisfies a requirement.
  const selectCourse = async (course: CatalogCourse) => {
    const requestId = ++fulfillmentRequestId.current;
    setSelectedId(course.uniqueId);
    setValidationState({ status: "checking" });

    const result = await try_add_course(course);
    if (fulfillmentRequestId.current !== requestId) return;

    setValidationState({ status: "resolved", result });
  };

  const resetState = () => {
    fulfillmentRequestId.current += 1;
    setResults(null);
    setSelectedId(null);
    setValidationState({ status: "idle" });
  };

  if (results === null) {
    return (
      <CourseSearchContent
        // Search submits populate the list and reset any prior selection state.
        onSearchSubmit={async (formData) => {
          const found = await searchCatalogCourses(formData);
          setResults(found);
          setSelectedId(null);
          setValidationState({ status: "idle" });
        }}
      />
    );
  }

  const selectedCourse = results.find(
    (course) => course.uniqueId === selectedId,
  );
  const canAddCourse =
    validationState.status === "resolved" &&
    isCourseRequirementFulfilled(validationState.result);

  const fulfillmentText = isValidationChecking(validationState)
    ? "Checking requirement fit..."
    : validationState.status === "resolved"
      ? validationState.result.kind === "fulfills"
        ? validationState.result.message
        : validationState.result.kind === "no-match"
          ? validationState.result.message
          : validationState.result.reason
      : null;

  return (
    <div className="flex flex-col">
      <p className="font-bold text-2xl mb-4">Add courses</p>
      <button
        type="button"
        onClick={resetState}
        className="flex items-center gap-1 text-dap-orange font-semibold text-[13px] uppercase tracking-wide mb-4 hover:underline"
      >
        <CaretLeftIcon size={16} weight="bold" />
        Search Results
      </button>

      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {results.map((course) => {
          const code = `${course.department} ${course.number}`;
          const isSelected = course.uniqueId === selectedId;

          return (
            <button
              key={course.uniqueId}
              type="button"
              onClick={() => void selectCourse(course)}
              className={`w-full min-h-[70px] grid grid-cols-[22px_1fr_44px] items-stretch overflow-hidden rounded-md border bg-white text-left transition-colors ${
                isSelected
                  ? "border-2 border-[#579D42]"
                  : "border-[#E5E1DA] hover:border-gray-300"
              }`}
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
                  {code}
                </p>
                <p className="mt-1 text-sm font-medium text-black leading-tight uppercase">
                  {course.fullName}
                </p>
              </div>
              <div className="flex items-center justify-center">
                <PlusCircleIcon size={24} className="text-gray-700" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-7 min-h-[62px]">
        {fulfillmentText !== null ? (
          <div className="rounded-md border border-[#63B031] bg-[#F4FFE6] px-5 py-5 text-sm text-black">
            {fulfillmentText}
          </div>
        ) : null}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={() => selectedCourse && void selectCourse(selectedCourse)}
          disabled={!canAddCourse}
          className="flex h-14 items-center justify-center gap-2 rounded-md bg-[#579D42] px-7 text-xl font-bold text-white transition-colors hover:bg-[#4C8F3B] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlusIcon size={28} weight="light" />
          Add Course
        </button>
      </div>
    </div>
  );
}
