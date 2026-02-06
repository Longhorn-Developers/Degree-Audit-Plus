import Button from "@/entrypoints/components/common/button";
import {
	HStack,
	Substack,
	VStack,
	Wrap,
} from "@/entrypoints/components/common/helperdivs";
import Title from "@/entrypoints/components/common/text";
import CourseCard from "@/entrypoints/components/course-card";
import "@/entrypoints/styles/content.css";
import { Course } from "@/lib/general-types";
import { Plus } from "lucide-react";
import { useAuditContext } from "./audit-provider";
import { SimpleDegreeCompletionDonut } from "./degree-completion-donut";
import SemesterCard from "./semester-card";

const CourseSuggestions = () => {
	return (
		<div className="w-sm p-6 rounded-lg border border-gray-200 bg-[#FAFAF9]">
			<VStack fillHeight fillWidth y="stretch">
				<Title text="Course Suggestions" className="m-0" />
				<Substack>
					<CourseCard
						className="w-full"
						fullName="Course Name"
						courseName="Course Code"
						color="orange"
					/>
					<CourseCard
						className="w-full"
						fullName="Course Name"
						courseName="Course Code"
						color="orange"
					/>
				</Substack>
			</VStack>
		</div>
	);
};

const SidePanel = () => {
	return (
		<VStack fill className="h-full" y="stretch" x="center">
			<SimpleDegreeCompletionDonut size={300} />
			<CourseSuggestions />
		</VStack>
	);
};

const MainContent = () => {
	const { allCourses } = useAuditContext();

	const semesters = useMemo(() => {
		return Object.entries(
			allCourses.reduce(
				(acc, course) => {
					acc[course.semester] = [...(acc[course.semester] || []), course];
					return acc;
				},
				{} as Record<string, Course[]>
			)
		).sort((a, b) => {
			const [yearA, seasonA] = a[0].split(" ");
			const [yearB, seasonB] = b[0].split(" ");
			return Number(yearA) - Number(yearB) || seasonA.localeCompare(seasonB);
		});
	}, [allCourses]);

	const AddSemesterButton = () => {
		return (
			<Button className="w-sm">
				<Plus />
				Add Future Semester
			</Button>
		);
	};

	return (
		<VStack fill className="w-full">
			<Title text="Degree Planner" />
			<Wrap maxCols={2}>
				{semesters.map((semester, index) => (
					<SemesterCard
						key={index}
						semester={semester[0]}
						courses={semester[1]}
					/>
				))}
				<AddSemesterButton />
			</Wrap>
		</VStack>
	);
};

const DegreePlannerPage = () => {
	return (
		<HStack fill x="between" className="h-full">
			<MainContent />
			<SidePanel />
		</HStack>
	);
};

export default DegreePlannerPage;
