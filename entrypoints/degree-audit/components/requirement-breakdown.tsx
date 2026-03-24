import Button from "@/entrypoints/components/common/button";
import { HStack, VStack } from "@/entrypoints/components/common/helperdivs";
import {
  Course,
  PlannableStatus,
  Progress,
  RequirementRule,
  Status,
} from "@/lib/general-types";
import { cn } from "@/lib/utils";
import {
  CaretDownIcon,
  CaretUpIcon,
  PlusCircleIcon,
} from "@phosphor-icons/react";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr";
import { CheckIcon } from "lucide-react";
import { useState } from "react";
import { FramedStatusIcon } from "./gpa-credit-cards";
import { useAuditContext } from "../providers/audit-provider";
import { useCourseModalContext } from "../providers/course-modal-provider";

type RequirementCompletionState = "completed" | "not-started" | "in-progress";

const getRequirementCompletionState = (
  current: number,
  total: number,
): RequirementCompletionState => {
  if (total > 0 && current >= total) {
    return "completed";
  }
  if (current <= 0) {
    return "not-started";
  }
  return "in-progress";
};

const StatusIcon = ({
  current,
  total,
}: {
  current: number;
  total: number;
}) => {
  const state = getRequirementCompletionState(current, total);

  return <FramedStatusIcon state={state} />;
};

// Hours badge component
const HoursBadge = ({ current, total }: { current: number; total: number }) => {
  const isComplete = current >= total;
  const formatHours = (h: number) => `${h} hour${h === 1 ? '' : 's'}`;
  return (
    <span className="text-sm text-gray-600 border border-gray-300 rounded-full px-3 py-1">
      {isComplete ? formatHours(total) : `${current} / ${formatHours(total)}`}
    </span>
  );
};

const statusIcons = {
  Completed: {
    icon: (
      <CheckIcon className="-ml-1 text-white w-5 h-5 bg-green-500 rounded-full p-1" />
    ),
    color: "bg-lime-100 border-lime-200",
  },
  Planned: {
    icon: (
      <CalendarBlankIcon className="-ml-1 text-white w-5 h-5 bg-blue-500 rounded-full p-1" />
    ),
    color: "bg-[var(--color-course-applied)] border-gray-200",
  },
  "In Progress": {
    icon: null, 
    color: "bg-[var(--color-course-in-progress)] border-gray-200",
  },
// TODO: make sure this is valid
  "Not Started": {
    icon: null, 
    color: "bg-[var(--color-course-unknown)] border-gray-200",
  },
} as const satisfies Record<
  PlannableStatus,
  { icon: React.ReactNode | null; color: string }
>;

// Course pill component matching Figma design
const CoursePill = ({ course }: { course: Course }) => {
  const isApplied = course.status === "Completed";
  const isValidSemester = course.semester && course.semester.length < 30;

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3 rounded-lg text-sm w-full border",
        statusIcons[course.status].color,
      )}
    >
      <span className="font-semibold flex-1 text-left">{course.code}</span>
      <span className="flex-1 text-center font-medium">
        {course.name}
      </span>
      <span className="flex-1 text-right text-gray-800">
        {isValidSemester ? course.semester : ''}
        {isApplied && course.grade ? ` - Grade: ${course.grade}` : ''}
      </span>
    </div>
  );
};

// Parse code from requirement text (e.g., "CORE (010): description" -> "CORE (010)")
const parseRequirementCode = (
  text: string,
): { code: string; description: string } => {
  const colonIndex = text.indexOf(":");
  if (colonIndex > 0) {
    return {
      code: text.slice(0, colonIndex).trim(),
      description: text.slice(colonIndex + 1).trim(),
    };
  }
  return { code: text, description: "" };
};

// Individual requirement row with expandable courses
const RequirementRow = ({ requirement }: { requirement: RequirementRule }) => {
  const { getCourseById } = useAuditContext();
  const { openModal } = useCourseModalContext();
  
  const courses = requirement.courses.map((courseId) =>
    getCourseById(courseId),
  );
  const { code, description } = parseRequirementCode(requirement.text);
  const [isExpanded, setIsExpanded] = useState(
    requirement.status === "In Progress" ||
      courses.some((course) => course.status === "In Progress"),
  );

  return (
    <div className="border border-gray-200 rounded-lg mb-3 last:mb-0 overflow-hidden">
      {/* Requirement header */}
      <button
        className="w-full py-3 px-2 flex items-start gap-3 hover:bg-gray-50 transition-colors bg-white"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <StatusIcon
          current={requirement.appliedHours}
          total={requirement.requiredHours}
        />
        <VStack gap={0} className="flex-1 text-left">
          <span className="font-bold text-base">{code}</span>
          <span className="text-sm text-gray-500">{description}</span>
        </VStack>
        <HStack y="middle" gap={2}>
          <HoursBadge
            current={requirement.appliedHours}
            total={requirement.requiredHours}
          />
          {isExpanded ? (
            <CaretUpIcon className="w-5 h-5 text-gray-400" />
          ) : (
            <CaretDownIcon className="w-5 h-5 text-gray-400" />
          )}
        </HStack>
      </button>

      {/* Expanded courses and add button */}
      {isExpanded && requirement.courses.length > 0 &&(
        <div className="flex flex-col items-center gap-3 px-4 pb-4 bg-white">
          {courses.map((course, idx) => (
            <CoursePill key={`${course.code}-${idx}`} course={course} />
          ))}
          
          <Button
            fill="solid"
            className="bg-[var(--color-dap-orange)] hover:opacity-90 text-white border-none w-max px-6 py-2 rounded-md font-semibold flex items-center justify-center gap-2 mt-2"
            onClick={openModal}
          >
            <PlusCircleIcon className="w-5 h-5" />
            Add Planned Course
          </Button>
        </div>
      )}
    </div>
  );
};

export const CATEGORY_COLORS = [
  {
    name: "orange",
    tailwind: "var(--color-dap-orange)",
    rgb: "rgb(191, 87, 0)",
  },
  { name: "teal", tailwind: "var(--color-dap-teal)", rgb: "rgb(0, 169, 183)" },
  {
    name: "yellow",
    tailwind: "var(--color-dap-yellow)",
    rgb: "rgb(255, 214, 0)",
  },
  {
    name: "indigo",
    tailwind: "var(--color-dap-indigo)",
    rgb: "rgb(99, 102, 241)",
  },
  { name: "pink", tailwind: "var(--color-dap-pink)", rgb: "rgb(236, 72, 153)" },
  {
    name: "green",
    tailwind: "var(--color-dap-green)",
    rgb: "rgb(5, 150, 105)",
  },
] as const satisfies { name: string; tailwind: string; rgb: string }[];

// Progress bar for the header showing hours
const ProgressBar = ({
  current,
  total,
  colorIndex = 0,
}: {
  current: number;
  total: number;
  colorIndex?: number;
}) => {
  const color = CATEGORY_COLORS[colorIndex % CATEGORY_COLORS.length];
  const percentage = Math.min((current / total) * 100, 100);

  return (
    <div className="w-40 h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${percentage}%`, backgroundColor: color.tailwind }}
      />
    </div>
  );
};

type RequirementBreakdownProps = {
  title: string;
  hours: Progress;
  requirements: RequirementRule[];
  colorIndex?: number;
};
const RequirementBreakdown = (props: RequirementBreakdownProps) => {
  const { title, hours, requirements, colorIndex = 0 } = props;
  const [isOpen, setIsOpen] = useState(false);
  const borderColor = CATEGORY_COLORS[colorIndex % CATEGORY_COLORS.length];

  return (
    <div
      className="w-full bg-white rounded-md border border-gray-200 overflow-hidden border-l-8"
      style={{ borderLeftColor: borderColor.tailwind }}
    >
      {/* Main header */}
      <button
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors bg-white" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <VStack gap={1}>
          <span className="font-bold text-lg">{title}</span>
          <ProgressBar
            current={hours.current}
            total={hours.total}
            colorIndex={colorIndex}
          />
        </VStack>
        <HStack y="middle" gap={2}>
          <span className="text-gray-600">
            {hours.current.toString().padStart(2, "0")} / {hours.total} hours
          </span>
          {isOpen ? (
            <CaretUpIcon className="w-5 h-5 text-gray-400" />
          ) : (
            <CaretDownIcon className="w-5 h-5 text-gray-400" />
          )}
        </HStack>
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div className="bg-white">
          {/* Requirement rows */}
          <div className="px-4 py-4">
            {requirements.map((requirement, idx) => (
              <RequirementRow
                key={`${requirement.text.slice(0, 20)}-${idx}`}
                requirement={requirement}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RequirementBreakdown;