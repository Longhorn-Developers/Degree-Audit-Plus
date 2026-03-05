import Button from "@/entrypoints/components/common/button";
import { HStack, VStack } from "@/entrypoints/components/common/helperdivs";
import Title from "@/entrypoints/components/common/text";
import { CourseSearchContent } from "@/entrypoints/components/course-add-modal";
import "@/entrypoints/styles/content.css";
import { CourseId } from "@/lib/general-types";
import { SimpleDegreeCompletionDonut } from "../components/degree-completion-donut";
import { useAuditContext } from "../providers/audit-provider";
import SemesterDropdowns from "./semester-dropdowns";

const SidePanel = () => {
  return (
    <VStack fill className="h-full" y="stretch" x="center">
      <SimpleDegreeCompletionDonut size={300} />
      <div className="w-sm mt-10 p-3 rounded-lg border border-gray-200 bg-[#FAFAF9]">
        <CourseSearchContent />
      </div>
    </VStack>
  );
};

const DumbyButton = () => {
  const {
    addPlannedCourse,
    removePlannedCourse,
    wipeAllPlannedCourses,
    sections,
  } = useAuditContext();
  const [courseIds, setCourseIds] = useState<CourseId[]>([]);

  return (
    <>
      <Button
        className="bg-red-500 text-white"
        onClick={async () => {
          const newCourseId = await addPlannedCourse(
            {
              code: Math.random().toString(36).substring(2, 15),
              name: "123",
              hours: 1,
              semester: "Fall 2026",
              status: "Planned",
              type: "In-Residence",
            },
            "Major",
            sections.find((section) => section.title === "Major")?.rules[0]
              .text ?? "",
          );
          if (newCourseId) {
            setCourseIds((prev) => [...prev, newCourseId]);
            console.log("Course added successfully");
          } else {
            console.error("Failed to add course");
          }
        }}
      >
        Add Course
      </Button>
      <Button
        className="bg-blue-500 text-white"
        onClick={async () => {
          console.log("trying to remove course", courseIds[0]);
          if (!courseIds[0]) {
            console.error("Course ID is null");
            return;
          }
          const success = await removePlannedCourse(courseIds[0]);
          if (success) {
            setCourseIds((prev) => prev.filter((id) => id !== courseIds[0]));
          } else {
            console.error("Failed to remove course");
          }
        }}
      >
        Remove Course
      </Button>
      <Button
        className="bg-green-500 text-white"
        onClick={async () => {
          console.log("trying to wipe all planned courses");
          const numRemoved = await wipeAllPlannedCourses();
          console.log("Number of courses removed:", numRemoved);
          setCourseIds([]);
        }}
      >
        Wipe All Planned Courses
      </Button>
    </>
  );
};

const MainContent = () => {
  return (
    <VStack fill className="w-full">
      <Title text="Degree Planner" />
      <SemesterDropdowns />
      <DumbyButton />
    </VStack>
  );
};

const DegreePlannerPage = () => {
  return (
    <HStack fill x="between" className="h-full">
      <MainContent />
      <SidePanel />
    </HStack>
  );
};

export default DegreePlannerPage;
