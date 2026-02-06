import { CaretLeft, GraduationCap } from "@phosphor-icons/react";
import React, { useState } from "react";
import type { CatalogCourse } from "~/lib/general-types";
import { cn } from "~/lib/utils";
import Button from "./common/button";
import SelectDropdown from "./common/select-dropdown";
import CourseCard from "./course-card";

interface CourseAddModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSearch: (searchData: CourseSearchData) => void;
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

const RECOMMENDED_COURSES = [
	{
		fullName: "HIS 315K - Fourmy",
		courseName: "MWF 9:00 am – 10:00 am, UTC 2.102A",
		color: "orange" as const,
	},
	{
		fullName: "DES 374 - Garmon",
		courseName: "MWF 3:00pm – 4:00pm, BUR 2.112",
		color: "indigo" as const,
	},
];

function SearchCourses(searchData: CourseSearchData) {
	// TODO: Implement course search logic
}

export default function CourseAddModal({
	isOpen,
	onClose,
	onSearch,
	isLoading = false,
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
	const [view, setView] = useState<boolean>(false); // false = search, true = results.
	const [courses, setCourses] = useState<CatalogCourse[]>([
		{
			uniqueId: 1,
			fullName: "HIS 314K",
			courseName: "HISTORY OF MEXICAN AMERS IN US",
			department: "HIS",
			number: "314K",
			creditHours: 3,
			status: "Open",
			isReserved: false,
			instructionMode: "Face to Face",
			instructors: [],
			schedule: [],
			flags: [],
			core: [],
			url: "",
			description: [],
			scrapedAt: 0,
		},
		{
			uniqueId: 2,
			fullName: "HIS 315G",
			courseName: "INTRO TO AMERICAN STUDIES",
			department: "HIS",
			number: "315G",
			creditHours: 3,
			status: "Open",
			isReserved: false,
			instructionMode: "Face to Face",
			instructors: [],
			schedule: [],
			flags: [],
			core: [],
			url: "",
			description: [],
			scrapedAt: 0,
		},
		{
			uniqueId: 3,
			fullName: "HIS 315K",
			courseName: "THE UNITED STATES, 1492-1865",
			department: "HIS",
			number: "315K",
			creditHours: 3,
			status: "Open",
			isReserved: false,
			instructionMode: "Face to Face",
			instructors: [],
			schedule: [],
			flags: [],
			core: [],
			url: "",
			description: [],
			scrapedAt: 0,
		},
		{
			uniqueId: 4,
			fullName: "HIS 315L",
			courseName: "THE UNITED STATES SINCE 1865",
			department: "HIS",
			number: "315L",
			creditHours: 3,
			status: "Open",
			isReserved: false,
			instructionMode: "Face to Face",
			instructors: [],
			schedule: [],
			flags: [],
			core: [],
			url: "",
			description: [],
			scrapedAt: 0,
		},
	]);
	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleToggle = (field: "lowerDivision" | "upperDivision") => {
		setFormData((prev) => ({ ...prev, [field]: !prev[field] }));
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.lowerDivision && !formData.upperDivision) {
			setValidationError(
				"Please select at least one course division (Lower or Upper)"
			);
			return;
		}
		setView(true);
		setValidationError("");
		// onSearch(formData);
	};

	const isSearchDisabled =
		(!formData.lowerDivision && !formData.upperDivision) || isLoading;

	if (!isOpen) return null;

	return (
		<div
			className={cn(
				"fixed inset-0 z-50 flex items-center justify-center transition-all duration-200",
				isOpen ? "bg-black/50 opacity-100" : "opacity-0 pointer-events-none"
			)}
			onClick={onClose}
		>
			<div
				className={cn(
					"bg-white rounded-md border-2 border-dap-border shadow-2xl w-full max-w-[400px] mx-4 transform transition-all duration-200",
					isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
				)}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="px-6 pt-6 pb-6">
					{/* Header */}
					<h2 className="text-2xl font-bold text-gray-900 mb-3">Add courses</h2>
					{/* Search for Courses view */}
					{!view && (
						<div>
							{/* Recommended Section */}
							<div className="mb-6">
								<p className="text-dap-orange font-semibold text-sm uppercase tracking-wide mb-3">
									Recommended
								</p>
								<div className="space-y-2">
									{RECOMMENDED_COURSES.map((course, index) => (
										<CourseCard
											key={index}
											fullName={course.fullName}
											courseName={course.courseName}
											color={course.color}
										/>
									))}
								</div>
							</div>

							{/* Search Section */}
							<form onSubmit={handleSearch}>
								<p className="text-dap-orange font-semibold text-sm uppercase tracking-wide mb-3">
									Search
								</p>

								{/* Search Input */}
								<input
									type="text"
									name="searchQuery"
									value={formData.searchQuery}
									onChange={handleInputChange}
									placeholder="Search with name or unique"
									disabled={isLoading}
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
										icon={<GraduationCap size={28} />}
										placeholder="Department"
										options={DEPARTMENTS}
										value={formData.department}
										onChange={(value) =>
											setFormData((prev) => ({ ...prev, department: value }))
										}
										disabled={isLoading}
									/>
								</div>

								{/* Toggle Switches */}
								<div className="space-y-3 mb-6">
									{/* Lower Division Toggle */}
									<div className="flex items-center gap-3">
										<button
											type="button"
											onClick={() => handleToggle("lowerDivision")}
											disabled={isLoading}
											className={cn(
												"w-12 h-7 rounded-full transition-colors duration-200 relative disabled:opacity-50 disabled:cursor-not-allowed",
												formData.lowerDivision ? "bg-[#4A7C59]" : "bg-gray-200"
											)}
										>
											<div
												className={cn(
													"w-5 h-5 rounded-full transform transition-transform duration-200 absolute top-1/2 -translate-y-1/2 bg-white",
													formData.lowerDivision
														? "translate-x-[24px]"
														: "translate-x-1"
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
											disabled={isLoading}
											className={cn(
												"w-12 h-7 rounded-full transition-colors duration-200 relative disabled:opacity-50 disabled:cursor-not-allowed",
												formData.upperDivision ? "bg-[#4A7C59]" : "bg-gray-200"
											)}
										>
											<div
												className={cn(
													"w-5 h-5 rounded-full transform transition-transform duration-200 absolute top-1/2 -translate-y-1/2 bg-white",
													formData.upperDivision
														? "translate-x-[24px]"
														: "translate-x-1"
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
							</form>
						</div>
					)}
					{/* Search Results View */}
					{view && (
						<div>
							<button
								onClick={() => setView(false)}
								className="flex items-center justify-start gap-1 text-dap-orange font-semibold text-[14px] uppercase tracking-wide mb-4 hover:underline rounded-lg transition-all duration-200 ease-in-out"
							>
								<CaretLeft size={16} weight="bold" />
								Search Results
							</button>
							<div className="space-y-2">
								{courses.map((course) => (
									<CourseCard
										key={course.uniqueId}
										fullName={course.fullName}
										courseName={course.courseName}
									/>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
