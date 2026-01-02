import Dropdown, {
	DropdownContent,
	DropdownHeader,
} from "@/entrypoints/components/common/dropdown";
import { HStack, VStack } from "@/entrypoints/components/common/helperdivs";
import { CourseRowData } from "@/lib/general-types";
import { cn } from "@/lib/utils";

const StatusChip = (props: { status: CourseRowData["status"] }) => {
	const { status } = props;

	return (
		<div
			className={cn("px-2 py-1 border-2 rounded-full text-sm", {
				"border-green-500 text-green-500": status === "Completed",
				"border-yellow-500 text-yellow-500": status === "InProgress",
				"border-red-500 text-red-500": status === "Planned",
			})}
		>
			{status}
		</div>
	);
};

const CourseCard = (props: CourseRowData) => {
	return (
		<Dropdown>
			<DropdownHeader>
				<HStack x="between" y="middle" fill>
					<VStack gap={-0.5}>
						<div className="text-lg font-bold">{props.code}</div>
						<div className="text-base font-medium">{props.name}</div>
						<div className="text-sm text-gray-500">
							{props.semester}{props.grade ? `: ${props.grade}` : ""}
						</div>
					</VStack>
					<StatusChip status={props.status} />
				</HStack>
			</DropdownHeader>
			<DropdownContent>
				<VStack>
					{props.uniqueNumber && (
						<div className="text-sm text-gray-500">
							Unique Number: {props.uniqueNumber}
						</div>
					)}
				</VStack>
			</DropdownContent>
		</Dropdown>
	);
};

export default CourseCard;
