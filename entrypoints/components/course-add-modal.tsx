import React, { useState } from "react";
import {
  X,
  GraduationCap,
  CalendarBlank,
  IdentificationCard,
} from "@phosphor-icons/react";
import Button from "./common/button";
import { cn } from "~/lib/utils";

// Props for CourseAddModal component - called from DegreeAuditPage in main.tsx
interface CourseAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (searchData: CourseSearchData) => void;
  isLoading?: boolean; // Shows spinner on Search button, disables form
  hasSearched?: boolean; // Used with resultsCount to show empty state
  resultsCount?: number; // Number of results from search, 0 shows empty state
}

// Data returned to parent via onSearch callback
export interface CourseSearchData {
  searchQuery: string;
  requirement: string;
  catalogYear: string;
  department: string;
  lowerDivision: boolean;
  upperDivision: boolean;
}

const REQUIREMENTS = [
  "Major Requirements",
  "Core Curriculum",
  "General Education",
  "Electives",
  "Minor Requirements",
];

const CATALOG_YEARS = [
  "2024-2025",
  "2023-2024",
  "2022-2023",
  "2021-2022",
  "2020-2021",
];

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

// Modal for searching courses - displays over DegreeAuditPage with search filters
export default function CourseAddModal({
  isOpen,
  onClose,
  onSearch,
  isLoading = false,
  hasSearched = false,
  resultsCount = 0,
}: CourseAddModalProps) {
  const [formData, setFormData] = useState<CourseSearchData>({
    searchQuery: "",
    requirement: "",
    catalogYear: "",
    department: "",
    lowerDivision: true,
    upperDivision: true,
  });
  const [validationError, setValidationError] = useState<string>("");

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggle = (field: "lowerDivision" | "upperDivision") => {
    setFormData((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lowerDivision && !formData.upperDivision) {
      setValidationError(
        "Please select at least one course division (Lower or Upper)",
      );
      return;
    }
    setValidationError("");
    onSearch(formData);
  };

  const isSearchDisabled =
    (!formData.lowerDivision && !formData.upperDivision) || isLoading;
  const showEmptyState = hasSearched && resultsCount === 0 && !isLoading;

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
          "bg-white rounded-3xl shadow-2xl w-full max-w-[500px] mx-4 transform transition-all duration-200",
          isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-[32px] font-bold text-[var(--color-dap-dark)] leading-tight">
            Search for courses
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X size={28} className="text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
          {/* Search Input */}
          <div>
            <input
              type="text"
              name="searchQuery"
              value={formData.searchQuery}
              onChange={handleInputChange}
              placeholder="Search for a specific course"
              disabled={isLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-dap-primary)] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Requirement Dropdown */}
          <div className="flex items-center gap-3">
            <GraduationCap size={28} className="text-[var(--color-dap-dark)]" />
            <select
              name="requirement"
              value={formData.requirement}
              onChange={handleInputChange}
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl text-base text-gray-500 bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-dap-primary)] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 1.5rem center",
                backgroundSize: "20px",
              }}
            >
              <option value="">Requirement</option>
              {REQUIREMENTS.map((req) => (
                <option key={req} value={req}>
                  {req}
                </option>
              ))}
            </select>
          </div>

          {/* Catalog Year Dropdown */}
          <div className="flex items-center gap-3">
            <CalendarBlank size={28} className="text-[var(--color-dap-dark)]" />
            <select
              name="catalogYear"
              value={formData.catalogYear}
              onChange={handleInputChange}
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl text-base text-gray-500 bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-dap-primary)] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 1.5rem center",
                backgroundSize: "20px",
              }}
            >
              <option value="">Catalog Year</option>
              {CATALOG_YEARS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Department Dropdown */}
          <div className="flex items-center gap-3">
            <IdentificationCard
              size={28}
              className="text-[var(--color-dap-dark)]"
            />
            <select
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl text-base text-gray-500 bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-dap-primary)] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 1.5rem center",
                backgroundSize: "20px",
              }}
            >
              <option value="">Department</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Switches */}
          <div className="space-y-3 pt-1">
            {/* Lower Division Toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleToggle("lowerDivision")}
                disabled={isLoading}
                className={cn(
                  "w-14 h-8 rounded-full transition-colors duration-200 relative disabled:opacity-50 disabled:cursor-not-allowed",
                  formData.lowerDivision ? "bg-[#6B8E23]" : "bg-gray-300",
                )}
              >
                <div
                  className={cn(
                    "w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-200 absolute top-1",
                    formData.lowerDivision ? "translate-x-7" : "translate-x-1",
                  )}
                />
              </button>
              <span className="text-[18px] text-[var(--color-dap-dark)]">
                Lower Division Courses
              </span>
            </div>

            {/* Upper Division Toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleToggle("upperDivision")}
                disabled={isLoading}
                className={cn(
                  "w-14 h-8 rounded-full transition-colors duration-200 relative disabled:opacity-50 disabled:cursor-not-allowed",
                  formData.upperDivision ? "bg-[#6B8E23]" : "bg-gray-300",
                )}
              >
                <div
                  className={cn(
                    "w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-200 absolute top-1",
                    formData.upperDivision ? "translate-x-7" : "translate-x-1",
                  )}
                />
              </button>
              <span className="text-[18px] text-[var(--color-dap-dark)]">
                Upper Division Courses
              </span>
            </div>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl">
              <svg
                className="w-6 h-6 text-red-600 flex-shrink-0"
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
              <p className="text-base text-red-700">{validationError}</p>
            </div>
          )}

          {/* Empty State */}
          {showEmptyState && (
            <div className="flex flex-col items-center gap-3 px-6 py-8 bg-gray-50 border border-gray-200 rounded-2xl">
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-700 mb-1">
                  No courses found
                </p>
                <p className="text-base text-gray-500">
                  Try adjusting your search criteria or filters
                </p>
              </div>
            </div>
          )}

          {/* Search Button */}
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              color="orange"
              fill="solid"
              disabled={isSearchDisabled}
              className="px-10 py-2.5 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Searching...</span>
                </div>
              ) : (
                "Search"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
