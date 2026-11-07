import {
  dedupeCatalogCoursesByCode,
  filterCatalogCourses,
} from "@/features/catalog/catalog-course-mappers";
import { CircleNotchIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useCourseModalContext } from "./course-modal-provider";
import CoursePreviewList from "./course-preview-list";

// Lives inside the modal so the search box resets each time the modal opens.
function FulfillingCoursesContent() {
  const { recommendedCourses, isLoadingRecommendedCourses: isLoading } =
    useCourseModalContext();
  const [query, setQuery] = useState("");

  const filteredCourses = filterCatalogCourses(
    dedupeCatalogCoursesByCode(recommendedCourses),
    query,
  );
  const hasSearchQuery = query.trim().length > 0;

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search fulfilling courses"
        className="w-full h-12 px-4 mb-4 border border-dap-border rounded-md text-base font-semibold placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-dap-orange focus:border-transparent transition-all"
      />

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted">
          <CircleNotchIcon className="h-5 w-5 animate-spin" />
          <span>Loading fulfilling courses...</span>
        </div>
      ) : filteredCourses.length > 0 ? (
        <CoursePreviewList
          courses={filteredCourses}
          className="max-h-[45vh] overflow-y-auto -mr-3 pr-5"
        />
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
        className="bg-background rounded-md border border-dap-border shadow-2xl w-full max-w-[550px] max-h-[90vh] mx-4 transform transition-all duration-200 overflow-y-auto scale-100 opacity-100"
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
