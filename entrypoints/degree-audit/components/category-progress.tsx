import { VStack } from "@/entrypoints/components/common/helperdivs";
import CourseCard from "@/entrypoints/components/course-card";
import { CaretDownIcon } from "@phosphor-icons/react";
import { useState } from "react";

export type CategoryProgressProps = {
	title: string; // e.g., "FALL 2026"
	hours: number; // e.g., 15
	courses?: Array<{
		code: string; // e.g., "HIS 315K"
		name: string; // e.g., "THE UNITED STATES, 1492-1865"
		color?: "orange" | "indigo";
	}>;
};

const CategoryProgress = ({ title, hours, courses = [] }: CategoryProgressProps) => {
	const [isExpanded, setIsExpanded] = useState(true);

	return (
		<div
			className="flex flex-col rounded-lg border"
			style={{
				width: "322px",
				height: "392px",
				backgroundColor: "#FAFAF9",
				borderColor: "#EAE8E1",
				borderWidth: "1px",
				borderRadius: "8px",
				padding: "28px", // spacing/spacing-7 - typically 28px (1.75rem) in design systems
				gap: "24px",
			}}
		>
			{/* Header with title, hours, and dropdown */}
			<button
				onClick={() => setIsExpanded(!isExpanded)}
				className="flex items-center justify-between w-full text-left hover:opacity-80 transition-opacity"
			>
				<span className="font-semibold text-base text-gray-900">{title}</span>
				<div className="flex items-center gap-2">
					<span className="text-sm text-gray-600">{hours} hours</span>
					<CaretDownIcon
						className={`w-4 h-4 text-gray-400 transition-transform ${
							isExpanded ? "rotate-180" : ""
						}`}
					/>
				</div>
			</button>

			{/* Course cards list */}
			{isExpanded && (
				<VStack gap={3} className="flex-1 overflow-y-auto">
					{courses.length === 0 ? (
						<div className="text-sm text-gray-400 text-center py-4">
							No courses added
						</div>
					) : (
						courses.map((course, index) => (
							<CourseCard
								key={`${course.code}-${index}`}
								fullName={course.code}
								courseName={course.name}
								color={course.color || "orange"}
							/>
						))
					)}
				</VStack>
			)}
		</div>
	);
};

export default CategoryProgress;
