import { CourseId } from "@/lib/general-types";
import { cn, getColorByCourseCode } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";
import { DotsSixVerticalIcon } from "@phosphor-icons/react";
import { PlusCircleIcon } from "lucide-react";
import { forwardRef } from "react";
import { useAuditContext } from "../degree-audit/providers/audit-provider";

export type CourseCardProps = {
  courseId: CourseId;
  className?: string;
  showDots?: boolean;
  type?: "add";
};

const CourseCardVisual = forwardRef<
  HTMLDivElement,
  CourseCardProps & React.HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const { courseId, className, showDots = false, type, ...rest } = props;
  const { name: fullName, code: courseName } =
    useAuditContext().getCourseById(courseId);

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
        className={`w-6 flex items-center justify-center ${getColorByCourseCode(courseName).className} rounded-l-sm border-r-2 border-dap-border`}
      >
        {showDots ? (
          <DotsSixVerticalIcon size={18} weight="bold" className="text-white" />
        ) : null}
      </div>
      <div className="py-3 px-3 flex-1">
        <p className="text-gray-900 font-semibold text-sm">{fullName}</p>
        <p className="text-gray-500 text-xs">{courseName}</p>
      </div>
      {type === "add" && (
        <div className="flex items-center justify-center px-3">
          <PlusCircleIcon size={24} className="text-gray-700" />
        </div>
      )}
    </div>
  );
});

CourseCardVisual.displayName = "CourseCardVisual";

const DraggableCourseCard = ({ courseId, className }: CourseCardProps) => {
  const { isDragging, attributes, listeners, setNodeRef } = useDraggable({
    id: courseId,
  });

  return (
    <CourseCardVisual
      {...attributes}
      {...listeners}
      courseId={courseId}
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
  draggable,
  showDots = false,
  type,
}: CourseCardProps & { draggable?: boolean }) => {
  return draggable ? (
    <DraggableCourseCard
      courseId={courseId}
      className={className}
      showDots={showDots}
      type={type}
    />
  ) : (
    <CourseCardVisual
      courseId={courseId}
      className={className}
      showDots={showDots}
      type={type}
    />
  );
};

export default CourseCard;
