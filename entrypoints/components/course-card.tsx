import { CourseId } from "@/lib/general-types";
import { cn } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";
import { DotsSixVerticalIcon } from "@phosphor-icons/react";
import { forwardRef } from "react";
import { useAuditContext } from "../degree-audit/providers/audit-provider";

export type CourseCardProps = {
  courseId: CourseId;
  color?: "orange" | "indigo";
  className?: string;
  showDots?: boolean;
};

const colorMap = {
  orange: "bg-dap-orange",
  indigo: "bg-dap-indigo",
};

const CourseCardVisual = forwardRef<
  HTMLDivElement,
  CourseCardProps & React.HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const {
    courseId,
    color = "orange",
    className,
    showDots = false,
    ...rest
  } = props;
  const {
    name: fullName,
    code: courseName,
    status,
  } = useAuditContext().getCourseById(courseId);

  return (
    <div
      {...rest}
      ref={ref}
      className={cn(
        "bg-white rounded-md flex items-stretch overflow-hidden border-2 border-dap-border transition-all duration-200 hover:shadow-md hover:border-gray-300 cursor-pointer",
        className,
      )}
    >
      <div
        className={`w-6 flex items-center justify-center ${colorMap[color]} rounded-l-sm border-r-2 border-dap-border`}
      >
        {showDots ? (
          <DotsSixVerticalIcon size={18} weight="bold" className="text-white" />
        ) : null}
      </div>
      <div className="py-3 px-3">
        <p className="text-gray-900 font-semibold text-sm">{fullName}</p>
        <p className="text-gray-500 text-xs">{courseName}</p>
      </div>
    </div>
  );
});

CourseCardVisual.displayName = "CourseCardVisual";

const DraggableCourseCard = ({
  courseId,
  color,
  className,
}: CourseCardProps) => {
  const { isDragging, attributes, listeners, setNodeRef } = useDraggable({
    id: courseId,
  });

  return (
    <CourseCardVisual
      {...attributes}
      {...listeners}
      courseId={courseId}
      color={color}
      showDots
      className={cn(
        isDragging ? "opacity-50" : "opacity-100",
        "cursor-grab",
        className,
      )}
      ref={setNodeRef}
    />
  );
};

const CourseCard = ({
  courseId,
  className,
  color,
  draggable,
  showDots = false,
}: CourseCardProps & { draggable?: boolean }) => {
  return draggable ? (
    <DraggableCourseCard
      courseId={courseId}
      color={color}
      className={className}
      showDots={showDots}
    />
  ) : (
    <CourseCardVisual
      courseId={courseId}
      className={className}
      color={color}
      showDots={showDots}
    />
  );
};

export default CourseCard;
