import Dropdown, {
	DropdownContent,
	DropdownHeader,
} from "@/entrypoints/components/common/dropdown";
import { HStack, VStack } from "@/entrypoints/components/common/helperdivs";
import CourseCard from "@/entrypoints/components/course-card";
import { Course } from "@/lib/general-types";

export interface SemesterCardProps {
	semester: string;
	courses: Course[];
}

const SemesterCard = ({ semester, courses }: SemesterCardProps) => {
	const totalHours = courses.reduce((acc, course) => acc + course.hours, 0);

	return (
		<Dropdown
			className="w-sm p-6 rounded-lg border border-gray-200 bg-[#FAFAF9]"
			gap={6}
		>
			<DropdownHeader>
				<HStack y="middle" x="between" fill>
					<h2 className="text-lg text-dap-orange font-bold">{semester}</h2>
					<h2 className="text-sm">{`${totalHours} hours`}</h2>
				</HStack>
			</DropdownHeader>
			<DropdownContent className="w-full max-h-86 overflow-y-auto">
				<VStack fill className="w-full" gap={4}>
					{courses.length > 0 ? (
						courses.map((course) => (
							<CourseCard
								className="w-full"
								key={course.code}
								fullName={course.name}
								courseName={course.code}
								color="orange"
							/>
						))
					) : (
						<VStack
							centered
							className="max-h-[16.5rem] text-ut-charcoal/50 h-[16.5rem] text-lg font-bold border-dashed border border-black rounded-md py-4 px-6 bg-white"
							fillWidth
						>
							Drag and drop courses here
						</VStack>
					)}
				</VStack>
			</DropdownContent>
		</Dropdown>
	);
};

export default SemesterCard;
