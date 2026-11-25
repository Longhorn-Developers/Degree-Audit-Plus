import type { CourseId } from "@/domain/course";
import { cn } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";
import { isDeletableCourse } from "@/domain/course";
import CourseCard from "@/features/course-search/course-card";
import { useAuditContext } from "@/features/audit/audit-provider";

interface PlannerCourseCardProps {
  courseId: CourseId;
  className?: string;
  draggable?: boolean;
  showDots?: boolean;
  onRemove?: () => void;
}

function DraggablePlannerCourseCard({
  courseId,
  className,
  onRemove,
}: PlannerCourseCardProps) {
  const { getCourseById } = useAuditContext();
  const course = getCourseById(courseId);
  const { isDragging, attributes, listeners, setNodeRef } = useDraggable({
    id: courseId,
  });

  return (
    <CourseCard
      {...attributes}
      {...listeners}
      ref={setNodeRef}
      course={course}
      showDots
      dashed
      onRemove={onRemove}
      className={cn(
        isDragging ? "opacity-50" : "opacity-100",
        "cursor-grab",
        className,
      )}
    />
  );
}

function ResolvedPlannerCourseCard({
  courseId,
  className,
  showDots,
}: PlannerCourseCardProps) {
  const { getCourseById } = useAuditContext();
  const course = getCourseById(courseId);

  return (
    <CourseCard
      course={course}
      colored={!isDeletableCourse(course) && !course?.future}
      className={className}
      showDots={showDots}
    />
  );
}

export default function PlannerCourseCard(props: PlannerCourseCardProps) {
  return props.draggable ? (
    <DraggablePlannerCourseCard {...props} />
  ) : (
    <ResolvedPlannerCourseCard {...props} />
  );
}
