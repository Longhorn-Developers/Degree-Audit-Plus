import Dropdown, {
  DropdownContent,
  DropdownHeader,
} from "@/entrypoints/components/common/dropdown";
import { HStack, VStack } from "@/entrypoints/components/common/helperdivs";
import { Course, StringSemester } from "@/lib/general-types";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import DraggableCourseCard from "../planner-view/drag-and-drop/draggable-course-card";

export interface SemesterCardProps {
  semester: StringSemester;
  courses: Course[];
}

const SemesterCard = ({ semester, courses }: SemesterCardProps) => {
  const totalHours = courses.reduce((acc, course) => acc + course.hours, 0);

  return (
    <Dropdown
      className="w-sm p-6 rounded-lg border border-gray-200 bg-[#FAFAF9]"
      gap={6}
    >
      <DropdownHeader>
        <HStack y="middle" x="between" fill>
          <h2 className="text-lg text-dap-orange font-bold">{semester}</h2>
          <h2 className="text-sm">{`${totalHours} hours`}</h2>
        </HStack>
      </DropdownHeader>
      <DropdownContent className="w-full max-h-86 overflow-y-auto">
        <SortableContext
          items={courses.map((course) => course.uniqueNumber)}
          strategy={verticalListSortingStrategy}
        >
          <VStack fill className="w-full" gap={4}>
            {courses.length > 0 ? (
              courses.map((course) => (
                <DraggableCourseCard
                  key={course.code}
                  semester={semester}
                  id={course.uniqueNumber}
                  className="w-full"
                  fullName={course.name}
                  courseName={course.code}
                  color="orange"
                />
              ))
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
        </SortableContext>
      </DropdownContent>
    </Dropdown>
  );
};

export default SemesterCard;
