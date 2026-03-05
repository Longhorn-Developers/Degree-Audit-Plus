import Dropdown, {
  DropdownContent,
  DropdownHeader,
} from "@/entrypoints/components/common/dropdown";
import { HStack, VStack } from "@/entrypoints/components/common/helperdivs";
import CourseCard from "@/entrypoints/components/course-card";
import { getCurrentSemester } from "@/lib/backend/audit-scraper";
import { Course, StringSemester } from "@/lib/general-types";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import { forwardRef } from "react";
import DraggableCourseCard from "../planner-view/drag-and-drop/draggable-course-card";
import { sortSemesters } from "../planner-view/semester-dropdowns";

export interface SemesterCardProps {
  semester: StringSemester;
  courses: Course[];
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
        "w-sm p-6 rounded-lg border border-gray-200 bg-[#FAFAF9]",
        className,
      )}
      gap={6}
    >
      <DropdownHeader>
        <HStack y="middle" x="between" fill>
          <h2 className="text-lg text-dap-orange font-bold">
            {semester} | {courses.length}
          </h2>
        </HStack>
      </DropdownHeader>
      <DropdownContent className="w-full max-h-86 overflow-y-auto">
        {/* <SortableContext
          items={courses.map((course) => course.id)}
          strategy={verticalListSortingStrategy}
        > */}
        <VStack fill className="w-full" gap={4}>
          {courses.length > 0 ? (
            courses.map((course) =>
              course.status !== "Completed" ? (
                <DraggableCourseCard
                  key={course.code}
                  semester={semester}
                  id={course.id}
                  className="w-full"
                />
              ) : (
                <CourseCard
                  key={course.code}
                  courseId={course.id}
                  className="w-full"
                />
              ),
            )
          ) : (
            <VStack
              centered
              className="max-h-[16.5rem] text-ut-charcoal/50 h-[16.5rem] text-lg font-bold border-dashed border border-black rounded-md py-4 px-6 bg-white"
              fillWidth
            >
              Drag and drop courses here
            </VStack>
          )}
        </VStack>
        {/* </SortableContext> */}
      </DropdownContent>
    </Dropdown>
  );
});
SemesterCardVisual.displayName = "SemesterCardVisual";

const SemesterCard = ({ semester, courses }: SemesterCardProps) => {
  // If the semester is in the past, make it non-droppable
  console.log("[semester]", semester, getCurrentSemester());
  if (sortSemesters(semester, getCurrentSemester()) < 0) {
    return (
      <SemesterCardVisual
        semester={semester}
        courses={courses}
        className="bg-black/20"
      />
    );
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
