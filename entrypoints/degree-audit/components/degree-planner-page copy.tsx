import {
	HStack,
	VStack,
	Wrap,
} from "@/entrypoints/components/common/helperdivs";
import Title from "@/entrypoints/components/common/text";
import "@/entrypoints/styles/content.css";
import { Course } from "@/lib/general-types";
import SemesterCard from "./semester-card";

const DUMBY_COURSES = [
	{
		code: "CS 303E",
		name: "Introduction to Computer Science",
		hours: 3,
		credits: 3,
		semester: "2025F",
		grade: "A",
		status: "Completed",
	},
] satisfies Course[];

const DegreePlannerPage = () => {
	return (
		<HStack fill x="between" className="h-full">
			<VStack fill className="w-full">
				<Title text="Degree Planner" />
				<Wrap maxCols={2}>
					<SemesterCard
						semester={{ year: 2025, season: "Fall", code: "2025F" }}
						courses={DUMBY_COURSES}
					/>
					<SemesterCard
						semester={{ year: 2025, season: "Fall", code: "2025F" }}
						courses={[]}
					/>
					<SemesterCard
						semester={{ year: 2025, season: "Fall", code: "2025F" }}
						courses={[]}
					/>
					<SemesterCard
						semester={{ year: 2025, season: "Fall", code: "2025F" }}
						courses={[]}
					/>
					<SemesterCard
						semester={{ year: 2025, season: "Fall", code: "2025F" }}
						courses={[]}
					/>
				</Wrap>
			</VStack>
			<VStack fill className="h-full">
				{/* <Title text="TBD SIDE PANEL" /> */}
			</VStack>
		</HStack>
	);
};

export default DegreePlannerPage;
