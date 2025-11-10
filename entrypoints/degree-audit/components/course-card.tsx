import Dropdown, {
	DropdownContent,
	DropdownHeader,
} from "@/entrypoints/components/common/dropdown";
import { HStack, VStack } from "@/entrypoints/components/common/helperdivs";
import { Course } from "@/lib/general-types";
import { cn } from "@/lib/utils";

const StatusChip = (props: { status: Course["status"] }) => {
	const { status } = props;

	return (
		<div
			className={cn("px-2 py-1 border-2 rounded-full text-sm", {
				"border-green-500 text-green-500": status === "Completed",
				"border-yellow-500 text-yellow-500": status === "In Progress",
				"border-red-500 text-red-500": status === "Not Started",
			})}
		>
			{status}
		</div>
	);
};

const CourseCard = (props: Course) => {
	return (
		<Dropdown>
			<DropdownHeader>
				<HStack x="between" y="middle" fill>
					<VStack gap={-0.5}>
						<div className="text-lg font-bold">{props.code}</div>
						<div className="text-base font-medium">{props.name}</div>
						<div className="text-sm text-gray-500">
							{props.semester}: {props.grade}
						</div>
					</VStack>
					<StatusChip status={props.status} />
				</HStack>
			</DropdownHeader>
			<DropdownContent>
				<VStack>
					<div className="text-sm text-gray-500">Hours: {props.hours}</div>
					<div>{props.credits}</div>
				</VStack>
			</DropdownContent>
		</Dropdown>
	);
};

export default CourseCard;
