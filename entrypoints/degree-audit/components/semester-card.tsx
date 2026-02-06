import Dropdown, {
	DropdownContent,
	DropdownHeader,
} from "@/entrypoints/components/common/dropdown";
import { HStack } from "@/entrypoints/components/common/helperdivs";
import CourseCard from "@/entrypoints/components/course-card";
import { Course, Semester } from "@/lib/general-types";

interface SemesterCardProps {
	semester: Semester;
	courses: Course[];
}

const SemesterCard = ({ semester, courses }: SemesterCardProps) => {
	const totalHours = courses.reduce((acc, course) => acc + course.hours, 0);

	return (
		<Dropdown
			className="w-lg p-6 rounded-lg border border-gray-200 bg-[#FAFAF9]"
			gap={6}
		>
			<DropdownHeader>
				<HStack y="middle" x="between" fill>
					<h2 className="text-lg text-dap-orange font-bold">{`${semester.season} ${semester.year}`}</h2>
					<h2 className="text-sm">{`${totalHours} hours`}</h2>
				</HStack>
			</DropdownHeader>
			<DropdownContent className="w-full pb-6">
				{courses.map((course) => (
					<CourseCard
						key={course.code}
						fullName={course.name}
						courseName={course.code}
						color="orange"
					/>
				))}
			</DropdownContent>
		</Dropdown>
	);
};

export default SemesterCard;
