import type { CourseCode, CourseId } from "@/domain/course";
import { cn, getColorByCourseCode } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";
import { DotsSixVerticalIcon } from "@phosphor-icons/react";
import { PlusCircleIcon } from "@phosphor-icons/react";
import { forwardRef } from "react";
import { useAuditContext } from "@/features/audit/audit-provider";

type CourseCardData = {
  code: string;
  name: string;
};

type CourseCardProps = {
  courseId?: CourseId;
  previewCourse?: CourseCardData;
  className?: string;
  showDots?: boolean;
  type?: "add";
};

// Dumb display component: renders whatever course data it is handed. It has no
// knowledge of where the data comes from, so it works outside any provider.
const CourseCardVisual = forwardRef<
  HTMLDivElement,
  {
    course: CourseCardData;
    className?: string;
    showDots?: boolean;
    type?: "add";
  } & React.HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const { course, className, showDots = false, type, ...rest } = props;

  return (
    <div
      {...rest}
      ref={ref}
      className={cn(
        "bg-background rounded-md flex items-stretch overflow-hidden border-2 border-dap-border transition-all duration-200 hover:shadow-md hover:border-gray-300 cursor-pointer",
        className,
      )}
    >
      <div
        className={`w-6 flex items-center justify-center ${getColorByCourseCode(course.code as CourseCode).className} rounded-l-sm border-r-2 border-dap-border`}
      >
        {showDots ? (
          <DotsSixVerticalIcon size={18} weight="bold" className="text-white" />
        ) : null}
      </div>
      <div className="py-3 px-3 flex-1">
        <p className="text-text font-semibold text-sm">{course.name}</p>
        <p className="text-gray-500 text-xs">{course.code}</p>
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

const DraggableCourseCard = ({
  courseId,
  className,
}: {
  courseId: CourseId;
  className?: string;
}) => {
  const { getCourseById } = useAuditContext();
  const { isDragging, attributes, listeners, setNodeRef } = useDraggable({
    id: courseId,
  });

  return (
    <CourseCardVisual
      {...attributes}
      {...listeners}
      course={getCourseById(courseId)}
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

// Resolves a course id via the audit context, then hands pure data to the
// dumb visual. Used for non-draggable, id-based cards (e.g. the drag overlay).
const ResolvedCourseCard = ({
  courseId,
  className,
  showDots,
  type,
}: {
  courseId: CourseId;
  className?: string;
  showDots?: boolean;
  type?: "add";
}) => {
  const { getCourseById } = useAuditContext();
  return (
    <CourseCardVisual
      course={getCourseById(courseId)}
      className={className}
      showDots={showDots}
      type={type}
    />
  );
};

const CourseCard = ({
  courseId,
  previewCourse,
  className,
  draggable,
  showDots = false,
  type,
}: CourseCardProps & { draggable?: boolean }) => {
  if (draggable) {
    return <DraggableCourseCard courseId={courseId!} className={className} />;
  }
  if (previewCourse) {
    return (
      <CourseCardVisual
        course={previewCourse}
        className={className}
        showDots={showDots}
        type={type}
      />
    );
  }
  if (courseId) {
    return (
      <ResolvedCourseCard
        courseId={courseId}
        className={className}
        showDots={showDots}
        type={type}
      />
    );
  }
  return null;
};

export default CourseCard;
