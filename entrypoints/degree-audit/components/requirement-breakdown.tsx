import Button from "@/entrypoints/components/common/button";
import Dropdown, {
	DropdownContent,
	DropdownHeader,
} from "@/entrypoints/components/common/dropdown";
import { HStack, VStack } from "@/entrypoints/components/common/helperdivs";
import ProgressBar from "@/entrypoints/components/common/progress-bar";
import { RequirementBreakdownProps } from "@/lib/general-types";
import { PlusCircleIcon } from "@phosphor-icons/react";
import CourseCard from "./course-card";

const RequirementBreakdown = (props: RequirementBreakdownProps) => {
	const { title, hours, credits, courses } = props;

	const Header = () => {
		return (
			<HStack fill x="between" y="middle">
				<VStack gap={1}>
					<div className="text-lg font-bold">{title}</div>
					<div className="text-sm text-gray-500">
						{hours.current.toString().padStart(2, "0")} /{" "}
						{hours.total.toString().padStart(2, "0")} hours
					</div>
				</VStack>
				<ProgressBar
					current={hours.current}
					total={hours.total}
					className="w-[200px]"
				/>
			</HStack>
		);
	};

	return (
		<Dropdown>
			<DropdownHeader>
				<Header />
			</DropdownHeader>
			<DropdownContent className="w-full">
				<VStack gap={2}>
					{courses.map((course) => (
						<CourseCard key={course.name} {...course} />
					))}
					<Button
						color="black"
						fill="solid"
						className="w-full text-lg font-bold py-4 px-6 mt-5"
					>
						<PlusCircleIcon className="w-6 h-6 ml-2" />
						Add Hypothetical Course
					</Button>
				</VStack>
			</DropdownContent>
		</Dropdown>
	);
};

export default RequirementBreakdown;
