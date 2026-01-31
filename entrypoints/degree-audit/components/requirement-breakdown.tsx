import Button from "@/entrypoints/components/common/button";
import { HStack, VStack } from "@/entrypoints/components/common/helperdivs";
import {
  CourseRowData,
  RequirementBreakdownComponentProps,
  RequirementRule,
} from "@/lib/general-types";
import { cn } from "@/lib/utils";
import {
  CaretDownIcon,
  CaretUpIcon,
  CheckCircleIcon,
  HourglassIcon,
  MinusCircleIcon,
  PlusCircleIcon,
  QuestionMarkIcon,
} from "@phosphor-icons/react";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr";
import { CheckIcon } from "lucide-react";
import { useState } from "react";

// Status icon component for requirements
const StatusIcon = ({ status }: { status: RequirementRule["status"] }) => {
  if (status === "fulfilled") {
    return <CheckCircleIcon weight="fill" className="w-6 h-6 text-green-600" />;
  }
  if (status === "unfulfilled") {
    return <MinusCircleIcon weight="fill" className="w-6 h-6 text-red-500" />;
  }
  return <MinusCircleIcon weight="fill" className="w-6 h-6 text-yellow-500" />;
};

// Hours badge component
const HoursBadge = ({ current, total }: { current: number; total: number }) => {
  const isComplete = current >= total;
  return (
    <span className="text-sm text-gray-600 border border-gray-300 rounded-full px-3 py-1">
      {isComplete ? `${total} hours` : `${current} / ${total} hours`}
    </span>
  );
};

const statusIcons = {
  Applied: {
    icon: (
      <CheckIcon className="-ml-1 text-white w-5 h-5 bg-green-500 rounded-full p-1" />
    ),
    color: "bg-[var(--color-course-applied)]",
  },
  Planned: {
    icon: (
      <CalendarBlankIcon className="-ml-1 text-white w-5 h-5 bg-blue-500 rounded-full p-1" />
    ),
    color: "bg-[var(--color-course-applied)]",
  },
  "In Progress": {
    icon: (
      <HourglassIcon
        weight="fill"
        className="-ml-1 text-white w-5 h-5 bg-yellow-500 rounded-full p-1"
      />
    ),
    color: "bg-[var(--color-course-in-progress)]",
  },
  Unknown: {
    icon: (
      <QuestionMarkIcon className="-ml-1 text-white w-5 h-5 bg-gray-500 rounded-full p-1" />
    ),
    color: "bg-[var(--color-course-unknown)]",
  },
} as const satisfies Record<
  CourseRowData["status"],
  { icon: React.ReactNode; color: string }
>;

// Course pill component matching Figma design
const CoursePill = ({ course }: { course: CourseRowData }) => {
  const isApplied = course.status === "Applied";

  return (
    <div
      className={cn(
        "flex items-center gap-6 px-4 py-3 rounded-lg text-sm w-[80%]",
        statusIcons[course.status].color,
      )}
    >
      {statusIcons[course.status].icon /* Chip specifying status of course */}
      <span className="font-semibold min-w-[80px]">{course.code}</span>
      <span className="flex-1">
        {course.name}
        {course.uniqueNumber && ` (${course.uniqueNumber})`}
      </span>
      <span className="text-gray-700">
        {course.semester}
        {isApplied && course.grade && ` - Grade: ${course.grade}`}
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
  const { code, description } = parseRequirementCode(requirement.text);
  const [isExpanded, setIsExpanded] = useState(
    requirement.status === "partial" ||
      requirement.courses.some((c) => c.status === "In Progress"),
  );

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      {/* Requirement header */}
      <button
        className="w-full py-3 px-2 flex items-start gap-3 hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <StatusIcon status={requirement.status} />
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

      {/* Expanded courses */}
      {isExpanded && requirement.courses.length > 0 && (
        <VStack gap={2} className="pl-11 pr-4 pb-3">
          {requirement.courses.map((course, idx) => (
            <CoursePill key={`${course.code}-${idx}`} course={course} />
          ))}
        </VStack>
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

const RequirementBreakdown = (
  props: RequirementBreakdownComponentProps & { colorIndex?: number },
) => {
  const { title, hours, requirements, onAddCourse, colorIndex = 0 } = props;
  const [isOpen, setIsOpen] = useState(false);
  const borderColor = CATEGORY_COLORS[colorIndex % CATEGORY_COLORS.length];

  return (
    <div
      className="w-full bg-gray-50 rounded-md border border-gray-200 overflow-hidden border-l-8"
      style={{ borderLeftColor: borderColor.tailwind }}
    >
      {/* Main header */}
      <button
        className={cn(
          "w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors",
          isOpen && "bg-gray-50",
        )}
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
        <div className="border-t border-gray-200">
          {/* Requirement rows */}
          <div className="px-4 py-2">
            {requirements.map((requirement, idx) => (
              <RequirementRow
                key={`${requirement.text.slice(0, 20)}-${idx}`}
                requirement={requirement}
              />
            ))}
          </div>

          {/* Add course button */}
          <div className="px-4 pb-4">
            <Button
              color="black"
              fill="solid"
              className="w-full text-base font-semibold py-3 px-6"
              onClick={onAddCourse}
            >
              <PlusCircleIcon className="w-5 h-5" />
              Add Hypothetical Course
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequirementBreakdown;

export type { RequirementBreakdownComponentProps };
