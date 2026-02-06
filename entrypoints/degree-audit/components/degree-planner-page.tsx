import Button from "@/entrypoints/components/common/button";
import {
	HStack,
	VStack,
	Wrap,
} from "@/entrypoints/components/common/helperdivs";
import Title from "@/entrypoints/components/common/text";
import "@/entrypoints/styles/content.css";
import { Course } from "@/lib/general-types";
import { Plus } from "lucide-react";
import { useAuditContext } from "./audit-provider";
import SemesterCard from "./semester-card";

const DegreePlannerPage = () => {
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
			<Button className="w-lg">
				<Plus />
				Add Future Semester
			</Button>
		);
	};

	return (
		<HStack fill x="between" className="h-full">
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
			<VStack fill className="h-full">
				{/* <Title text="TBD SIDE PANEL" /> */}
			</VStack>
		</HStack>
	);
};

export default DegreePlannerPage;
