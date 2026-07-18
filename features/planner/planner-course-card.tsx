import type { CourseId } from "@/domain/course";
import { cn } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";
import CourseCard from "@/features/course-search/course-card";
import { useAuditContext } from "@/features/audit/audit-provider";

interface PlannerCourseCardProps {
  courseId: CourseId;
  className?: string;
  draggable?: boolean;
  showDots?: boolean;
}

function DraggablePlannerCourseCard({
  courseId,
  className,
}: PlannerCourseCardProps) {
  const { getCourseById } = useAuditContext();
  const { isDragging, attributes, listeners, setNodeRef } = useDraggable({
    id: courseId,
  });

  return (
    <CourseCard
      {...attributes}
      {...listeners}
      ref={setNodeRef}
      course={getCourseById(courseId)}
      showDots
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

  return (
    <CourseCard
      course={getCourseById(courseId)}
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
