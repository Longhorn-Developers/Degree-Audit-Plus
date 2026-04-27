import { CourseSearchContent } from "@/entrypoints/components/course-add-modal";
import { searchCatalogCourses } from "@/lib/backend/db";
import type { CatalogCourse } from "@/lib/general-types";
import {
  CaretLeftIcon,
  DotsSixVerticalIcon,
  PlusCircleIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { useRef, useState } from "react";

// Placeholder for the future fulfillment check when the course is added.
const try_add_course = async (_course: CatalogCourse): Promise<string | null> =>
  null;

export default function CourseAddPanel() {
  const [results, setResults] = useState<CatalogCourse[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [fulfillmentMessage, setFulfillmentMessage] = useState<string | null>(
    null,
  );
  const [isFulfillmentLoading, setIsFulfillmentLoading] = useState(false);
  const fulfillmentRequestId = useRef(0);

  // Mark the course as selected, then ask whether it satisfies a requirement.
  const selectCourse = async (course: CatalogCourse) => {
    const requestId = fulfillmentRequestId.current + 1;
    fulfillmentRequestId.current = requestId;
    setSelectedId(course.uniqueId);
    setFulfillmentMessage(null);
    setIsFulfillmentLoading(true);

    const message = await try_add_course(course);
    if (fulfillmentRequestId.current !== requestId) return;

    setFulfillmentMessage(message);
    setIsFulfillmentLoading(false);
  };

  if (results === null) {
    return (
      <CourseSearchContent
        // Search submits populate the list and reset any prior selection state.
        onSearchSubmit={async (formData) => {
          const found = await searchCatalogCourses(formData);
          setResults(found);
          setSelectedId(null);
          setFulfillmentMessage(null);
          setIsFulfillmentLoading(false);
        }}
      />
    );
  }

  // Keep the selected course in sync with the current search results.
  const selectedCourse = results.find(
    (course) => course.uniqueId === selectedId,
  );
  // Show the fulfillment message only while loading or after the check finishes.
  const showFulfillment = isFulfillmentLoading || fulfillmentMessage;

  return (
    <div className="flex flex-col">
      <p className="font-bold text-2xl mb-4">Add courses</p>
      <button
        type="button"
        onClick={() => {
          fulfillmentRequestId.current += 1;
          setResults(null);
          setSelectedId(null);
          setFulfillmentMessage(null);
          setIsFulfillmentLoading(false);
        }}
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

      {/* This block appears only after selection and can be used for requirement feedback. */}
      {showFulfillment ? (
        <div className="mt-7 rounded-md border border-[#63B031] bg-[#F4FFE6] px-5 py-5 text-sm text-black">
          {isFulfillmentLoading
            ? "Checking requirement fit..."
            : fulfillmentMessage}
        </div>
      ) : null}

      <div className={`${showFulfillment ? "mt-8" : "mt-7"} flex justify-end`}>
        <button
          type="button"
          onClick={() => selectedCourse && void selectCourse(selectedCourse)}
          disabled={selectedId === null}
          className="flex h-14 items-center justify-center gap-2 rounded-md bg-[#579D42] px-7 text-xl font-bold text-white transition-colors hover:bg-[#4C8F3B] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlusIcon size={28} weight="light" />
          Add Course
        </button>
      </div>
    </div>
  );
}
