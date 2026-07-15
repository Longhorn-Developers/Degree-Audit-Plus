import Dropdown, {
  DropdownContent,
  DropdownHeader,
} from "@/components/ui/dropdown";
import { HStack, VStack } from "@/components/ui/stack";
import { getCurrentSemester, sortSemesters } from "@/domain/course";
import type { Course, StringSemester } from "@/domain/course";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import { forwardRef } from "react";
import PlannerCourseCard from "./planner-course-card";

interface SemesterCardProps {
  semester: StringSemester;
  courses: Course[];
}

function sortCoursesByDepartment(a: Course, b: Course) {
  const [aDepartment, aNumber] = a.code.split(" ");
  const [bDepartment, bNumber] = b.code.split(" ");
  if (aDepartment !== bDepartment) {
    return aDepartment.localeCompare(bDepartment);
  }
  return Number(aNumber) - Number(bNumber);
}

const SemesterCardVisual = forwardRef<
  HTMLDivElement,
  SemesterCardProps & React.HTMLAttributes<HTMLDivElement>
>(({ semester, courses, className, ...props }, ref) => {
  return (
    <Dropdown
      {...props}
      ref={ref}
      className={cn(
        "w-full h-fit min-w-[250px] p-6 rounded-lg border border-gray-200 bg-background",
        className,
      )}
      gap={6}
    >
      <DropdownHeader>
        <HStack y="middle" x="between" fill>
          <h2 className="text-lg text-dap-orange font-bold">{semester}</h2>
        </HStack>
      </DropdownHeader>
      <DropdownContent className="w-full max-h-86 overflow-y-auto">
        <VStack fill className="w-full" gap={4}>
          {courses.length > 0 ? (
            courses
              .sort(sortCoursesByDepartment)
              .map((course) => (
                <PlannerCourseCard
                  key={course.code}
                  draggable={course.status !== "Completed"}
                  courseId={course.id}
                  className="w-full"
                />
              ))
          ) : (
            <VStack
              centered
              className="max-h-[16.5rem] text-ut-charcoal/50 h-[16.5rem] text-lg font-bold border-dashed border border-black rounded-md py-4 px-6 bg-background"
              fillWidth
            >
              Drag and drop courses here
            </VStack>
          )}
        </VStack>
      </DropdownContent>
    </Dropdown>
  );
});
SemesterCardVisual.displayName = "SemesterCardVisual";

const SemesterCard = ({ semester, courses }: SemesterCardProps) => {
  // If the semester is in the past, make it non-droppable
  if (sortSemesters(semester, getCurrentSemester()) < 0) {
    return <SemesterCardVisual semester={semester} courses={courses} />;
  }
  return <DroppableSemesterCard semester={semester} courses={courses} />;
};

const DroppableSemesterCard = ({ semester, courses }: SemesterCardProps) => {
  const { isOver, setNodeRef: droppableRef } = useDroppable({ id: semester });

  return (
    <SemesterCardVisual
      ref={droppableRef}
      semester={semester}
      courses={courses}
      className={cn(isOver ? "opacity-35" : "opacity-100")}
    />
  );
};

export default SemesterCard;
