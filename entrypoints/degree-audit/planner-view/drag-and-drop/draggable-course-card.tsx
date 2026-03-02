import CourseCard from "@/entrypoints/components/course-card";
import { StringSemester } from "@/lib/general-types";
import { cn } from "@/lib/utils";
import { UniqueIdentifier } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type DraggableCourseCardProps = {
  id: UniqueIdentifier;
  className?: string;
  fullName: string;
  courseName: string;
  color: "orange" | "indigo";
  semester: StringSemester;
};

const DraggableCourseCard = ({
  id,
  className,
  semester,
  fullName = "",
  courseName = "",
  color = "orange",
}: DraggableCourseCardProps) => {
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id,
    data: {
      semester: semester,
    },
    transition: {
      duration: 200,
      easing: "cubic-bezier(0.4, 1.21, 0.83, 1.16)",
    },
  });

  return (
    <CourseCard
      fullName={fullName}
      courseName={courseName}
      color={color}
      className={cn(isDragging ? "opacity-50" : "opacity-100", className)}
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        transition: transition,
      }}
    />
  );
};

export default DraggableCourseCard;
