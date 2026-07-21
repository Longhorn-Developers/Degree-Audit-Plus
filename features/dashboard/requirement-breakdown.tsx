import Button from "@/components/ui/button";
import { HStack, VStack } from "@/components/ui/stack";
import type { RequirementRule } from "@/domain/audit";
import type { Course, PlannableStatus } from "@/domain/course";
import { Progress, RequirementProgressUnit } from "@/domain/progress";
import { CATEGORY_COLORS, cn } from "@/lib/utils";
import {
  CaretDownIcon,
  CaretUpIcon,
  CheckIcon,
  MinusIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import EyeIcon from "@/assets/svgs/Eye.svg";
import { useCourseModalContext } from "@/features/course-search/course-modal-provider";
import { useAuditContext } from "@/features/audit/audit-provider";
import {
  isCoreSection,
  isCreditSection,
} from "@/features/audit/audit-calculations";

type RequirementCompletionState = "completed" | "not-started" | "in-progress";
type ProgressLabelUnit = RequirementProgressUnit | "progress";

const pluralizeUnit = (
  value: number,
  unit: RequirementProgressUnit,
): string => {
  const singular = unit === "courses" ? "course" : "hour";
  return `${value} ${singular}${value === 1 ? "" : "s"}`;
};

const getSharedProgressUnit = (
  requirements: RequirementRule[],
): ProgressLabelUnit => {
  const units = new Set(
    requirements.map((requirement) => requirement.progressUnit ?? "hours"),
  );

  if (units.size === 1) {
    return requirements[0]?.progressUnit ?? "hours";
  }

  return "progress";
};

const formatProgressSummary = (
  current: number,
  total: number,
  unit: ProgressLabelUnit,
): string => {
  if (unit === "progress") {
    return `${current} / ${total} progress`;
  }

  return `${current} / ${pluralizeUnit(total, unit)}`;
};

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
      <div className="flex items-center justify-center w-6 h-6 bg-dap-plan-green-light rounded shrink-0 mt-0.5">
        <CheckIcon className="text-white w-4 h-4" weight="bold" />
      </div>
    );
  }
  if (state === "not-started") {
    return (
      <div className="flex items-center justify-center w-6 h-6 bg-dap-status-slate rounded shrink-0 mt-0.5">
        <XIcon className="text-white w-4 h-4" weight="bold" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center w-6 h-6 bg-dap-gray rounded shrink-0 mt-0.5">
      <MinusIcon className="text-white w-4 h-4" weight="bold" />
    </div>
  );
};

const RequirementBadge = ({
  current,
  total,
  unit,
}: {
  current: number;
  total: number;
  unit: RequirementProgressUnit;
}) => {
  const isComplete = current >= total;
  return (
    <span className="text-sm text-text border border-text rounded-full px-3 py-0.5 font-medium">
      {isComplete
        ? pluralizeUnit(total, unit)
        : current === 0
          ? pluralizeUnit(0, unit)
          : `${current} / ${pluralizeUnit(total, unit)}`}
    </span>
  );
};

const statusColors: Record<PlannableStatus, string> = {
  Completed: "bg-course-completed-bg border-course-completed-border",
  Planned: "bg-course-planned-bg border-course-planned-border",
  "In Progress": "bg-course-in-progress-bg border-course-in-progress-border",
  "Not Started": "bg-course-unknown border-gray-200",
};

// Course pill component matching Figma design
const CoursePill = ({ course }: { course: Course }) => {
  const isApplied = course.status === "Completed";
  const isValidSemester = course.semester && course.semester.length < 30;

  return (
    <div
      className={cn(
        "grid grid-cols-[100px_1fr_auto] items-center gap-4 px-4 py-3 rounded-lg text-sm w-full border text-gray-900",
        statusColors[course.status],
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

const isCoreOrCreditSection = (title: string): boolean =>
  isCoreSection(title) || isCreditSection(title);

// Individual requirement row with expandable courses
const RequirementRow = ({
  requirement,
  requirementTitle,
}: {
  requirement: RequirementRule;
  requirementTitle: string;
}) => {
  const { getCourseById } = useAuditContext();
  const { openModal } = useCourseModalContext();

  const courses = requirement.courses.map((courseId) =>
    getCourseById(courseId),
  );
  const { code, description } = parseRequirementCode(requirement.text);
  const [isExpanded, setIsExpanded] = useState(false);
  const showActionButton = isCoreOrCreditSection(requirementTitle);

  return (
    <div className="border border-gray-200 rounded-lg mb-3 last:mb-0 overflow-hidden">
      {/* Requirement header */}
      <button
        className="w-full py-3 px-3 flex items-start gap-3 hover:bg-hover-bg transition-colors bg-background"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <RequirementStatusIcon
          current={requirement.appliedHours}
          total={requirement.requiredHours}
        />
        <VStack gap={0} className="flex-1 text-left">
          <span className="font-bold text-base text-text">{code}</span>
          <span className="text-sm text-muted mt-0.5">{description}</span>
        </VStack>
        <HStack y="middle" gap={3}>
          <RequirementBadge
            current={requirement.appliedHours}
            total={requirement.requiredHours}
            unit={requirement.progressUnit ?? "hours"}
          />
          {isExpanded ? (
            <CaretUpIcon className="w-5 h-5 text-text" weight="bold" />
          ) : (
            <CaretDownIcon className="w-5 h-5 text-text" weight="bold" />
          )}
        </HStack>
      </button>

      {/* Expanded courses and add button */}
      {isExpanded && (
        <div className="flex flex-col gap-3 pl-12 pr-4 pb-4 bg-background">
          {courses.map((course, idx) => (
            <CoursePill key={`${course.code}-${idx}`} course={course} />
          ))}

          {showActionButton && (
            <div className="w-full flex justify-center mt-2">
              <Button
                fill="solid"
                className="bg-dap-orange hover:opacity-90 text-white border-none w-max px-[24px] h-[40px] rounded-md font-semibold text-base flex items-center justify-center gap-[12px]"
                onClick={() =>
                  openModal({
                    requirementTitle,
                    ruleTitle: requirement.text,
                  })
                }
              >
                <img
                  src={EyeIcon}
                  alt=""
                  className="w-5 h-5"
                  aria-hidden="true"
                />
                See Fufilling Courses
              </Button>
            </div>
          )}
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

type CollapsibleProgressCardProps = {
  title: string;
  current: number;
  total: number;
  unit: ProgressLabelUnit;
  colorIndex?: number;
  children: React.ReactNode;
};

// Shared card shell: colored left border, a collapsible header with title,
// progress bar and summary, plus children rendered only while expanded.
const CollapsibleProgressCard = ({
  title,
  current,
  total,
  unit,
  colorIndex = 0,
  children,
}: CollapsibleProgressCardProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const borderColor = CATEGORY_COLORS[colorIndex % CATEGORY_COLORS.length];

  return (
    <div
      className="w-full bg-background rounded-md border border-gray-200 overflow-hidden border-l-4"
      style={{ borderLeftColor: borderColor.tailwind }}
    >
      <button
        className="w-full p-4 flex items-center justify-between hover:bg-hover-bg transition-colors bg-background"
        onClick={() => setIsOpen(!isOpen)}
      >
        <VStack gap={2}>
          <span className="font-bold text-base text-text">{title}</span>
          <ProgressBar
            current={current}
            total={total}
            colorIndex={colorIndex}
          />
        </VStack>
        <HStack y="middle" gap={2}>
          <span className="text-text font-medium text-sm">
            {formatProgressSummary(current, total, unit)}
          </span>
          {isOpen ? (
            <CaretUpIcon className="w-5 h-5 text-text" weight="bold" />
          ) : (
            <CaretDownIcon className="w-5 h-5 text-text" weight="bold" />
          )}
        </HStack>
      </button>
      {isOpen && children}
    </div>
  );
};

type RequirementBreakdownProps = {
  title: string;
  hours: Progress;
  requirements: RequirementRule[];
  colorIndex?: number;
};
const RequirementBreakdown = ({
  title,
  hours,
  requirements,
  colorIndex = 0,
}: RequirementBreakdownProps) => (
  <CollapsibleProgressCard
    title={title}
    current={hours.current}
    total={hours.total}
    unit={getSharedProgressUnit(requirements)}
    colorIndex={colorIndex}
  >
    <div className="bg-background">
      <div className="px-4 py-4">
        {requirements.map((requirement, idx) => (
          <RequirementRow
            key={`${requirement.text.slice(0, 20)}-${idx}`}
            requirement={requirement}
            requirementTitle={title}
          />
        ))}
      </div>
    </div>
  </CollapsibleProgressCard>
);

export default RequirementBreakdown;

type UnifiedDegreeCardSection = {
  title: string;
  hours: Progress;
  requirements: RequirementRule[];
};

type UnifiedDegreeCardProps = {
  degreeTitle: string;
  sections: UnifiedDegreeCardSection[];
};

export const UnifiedDegreeCard = ({
  degreeTitle,
  sections,
}: UnifiedDegreeCardProps) => {
  const totalCurrent = sections.reduce((sum, s) => sum + s.hours.current, 0);
  const totalTotal = sections.reduce((sum, s) => sum + s.hours.total, 0);
  const totalProgressUnit = getSharedProgressUnit(
    sections.flatMap((section) => section.requirements),
  );
  const greenColor = CATEGORY_COLORS[5]; // green

  return (
    <CollapsibleProgressCard
      title={degreeTitle}
      current={totalCurrent}
      total={totalTotal}
      unit={totalProgressUnit}
      colorIndex={5}
    >
      <div className="bg-background px-4 pt-4 pb-4">
        {sections.map((section, idx) => (
          <div key={section.title || idx} className={idx > 0 ? "mt-4" : ""}>
            <span
              className="text-sm font-semibold mb-4 block"
              style={{ color: greenColor.tailwind }}
            >
              {section.title}
            </span>
            {section.requirements.map((requirement, rIdx) => (
              <RequirementRow
                key={`${requirement.text.slice(0, 20)}-${rIdx}`}
                requirement={requirement}
                requirementTitle={section.title}
              />
            ))}
          </div>
        ))}
      </div>
    </CollapsibleProgressCard>
  );
};
