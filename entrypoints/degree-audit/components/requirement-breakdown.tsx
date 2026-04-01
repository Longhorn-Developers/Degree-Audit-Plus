import Button from "@/entrypoints/components/common/button";
import { HStack, VStack } from "@/entrypoints/components/common/helperdivs";
import {
  Course,
  PlannableStatus,
  Progress,
  RequirementRule,
} from "@/lib/general-types";
import { CATEGORY_COLORS, cn } from "@/lib/utils";
import {
  CaretDownIcon,
  CaretUpIcon,
  Check,
  Minus,
  PlusIcon,
  X,
} from "@phosphor-icons/react";
import { useState } from "react";
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

const RequirementStatusIcon = ({
  current,
  total,
}: {
  current: number;
  total: number;
}) => {
  const state = getRequirementCompletionState(current, total);

  if (state === "completed") {
    return (
      <div className="flex items-center justify-center w-6 h-6 bg-[#5BA753] rounded shrink-0 mt-0.5">
        <Check className="text-white w-4 h-4" weight="bold" />
      </div>
    );
  }
  if (state === "not-started") {
    return (
      <div className="flex items-center justify-center w-6 h-6 bg-[#4A5568] rounded shrink-0 mt-0.5">
        <X className="text-white w-4 h-4" weight="bold" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center w-6 h-6 bg-[#9CA3AF] rounded shrink-0 mt-0.5">
      <Minus className="text-white w-4 h-4" weight="bold" />
    </div>
  );
};

// Hours badge component
const HoursBadge = ({ current, total }: { current: number; total: number }) => {
  const isComplete = current >= total;
  const formatHours = (h: number) => `${h} hour${h === 1 ? "" : "s"}`;
  return (
    <span className="text-sm text-gray-900 border border-gray-800 rounded-full px-3 py-0.5 font-medium">
      {isComplete
        ? formatHours(total)
        : current === 0
          ? formatHours(0)
          : `${current} / ${formatHours(total)}`}
    </span>
  );
};

const statusIcons = {
  Completed: {
    icon: null,
    color: "bg-[#ECF8D0] border-[#9FCA5B]",
  },
  Planned: {
    icon: null,
    color: "bg-[var(--color-course-applied)] border-gray-200",
  },
  "In Progress": {
    icon: null,
    color: "bg-[var(--color-course-in-progress)] border-gray-200",
  },
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
        "grid grid-cols-[100px_1fr_auto] items-center gap-4 px-4 py-3 rounded-lg text-sm w-full border",
        statusIcons[course.status].color,
      )}
    >
      <span className="font-semibold min-w-[80px]">{course.code}</span>
      <span className="flex-1">{course.name}</span>
      <span className="text-gray-700">
        {isValidSemester ? course.semester : ""}
        {isApplied &&
          course.grade &&
          `${isValidSemester ? " - " : ""}Grade: ${course.grade}`}
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
        className="w-full py-3 px-3 flex items-start gap-3 hover:bg-gray-50 transition-colors bg-white"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <RequirementStatusIcon
          current={requirement.appliedHours}
          total={requirement.requiredHours}
        />
        <VStack gap={0} className="flex-1 text-left">
          <span className="font-bold text-base text-gray-900">{code}</span>
          <span className="text-sm text-gray-600 mt-0.5">{description}</span>
        </VStack>
        <HStack y="middle" gap={3}>
          <HoursBadge
            current={requirement.appliedHours}
            total={requirement.requiredHours}
          />
          {isExpanded ? (
            <CaretUpIcon className="w-5 h-5 text-gray-900" weight="bold" />
          ) : (
            <CaretDownIcon className="w-5 h-5 text-gray-900" weight="bold" />
          )}
        </HStack>
      </button>

      {/* Expanded courses and add button */}
      {isExpanded && (
        <div className="flex flex-col gap-3 pl-12 pr-4 pb-4 bg-white">
          {courses.map((course, idx) => (
            <CoursePill key={`${course.code}-${idx}`} course={course} />
          ))}

          <div className="w-full flex justify-center mt-2">
            <Button
              fill="solid"
              className="bg-[var(--color-dap-orange)] hover:opacity-90 text-white border-none w-max px-[24px] h-[40px] rounded-md font-semibold text-base flex items-center justify-center gap-[16px]"
              onClick={openModal}
            >
              <PlusIcon className="w-5 h-5" weight="bold" />
              Add Planned Course
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

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

  const trackColor = color.rgb.replace("rgb", "rgba").replace(")", ", 0.2)");

  return (
    <div
      className="w-40 h-2 rounded-full overflow-hidden"
      style={{ backgroundColor: trackColor }}
    >
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
      className="w-full bg-white rounded-md border border-gray-200 overflow-hidden border-l-4"
      style={{ borderLeftColor: borderColor.tailwind }}
    >
      {/* Main header */}
      <button
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors bg-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        <VStack gap={2}>
          <span className="font-bold text-base text-gray-900">{title}</span>
          <ProgressBar
            current={hours.current}
            total={hours.total}
            colorIndex={colorIndex}
          />
        </VStack>
        <HStack y="middle" gap={2}>
          <span className="text-gray-900 font-medium text-sm">
            {hours.current.toString().padStart(2, "0")} / {hours.total} hours
          </span>
          {isOpen ? (
            <CaretUpIcon className="w-5 h-5 text-gray-900" weight="bold" />
          ) : (
            <CaretDownIcon className="w-5 h-5 text-gray-900" weight="bold" />
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
