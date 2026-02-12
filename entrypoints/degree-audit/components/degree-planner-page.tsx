import Button from "@/entrypoints/components/common/button";
import {
  HStack,
  VStack,
  Wrap,
} from "@/entrypoints/components/common/helperdivs";
import Title from "@/entrypoints/components/common/text";
import { CourseSearchContent } from "@/entrypoints/components/course-add-modal";
import "@/entrypoints/styles/content.css";
import { Course } from "@/lib/general-types";
import { Plus } from "lucide-react";
import { useAuditContext } from "./audit-provider";
import { SimpleDegreeCompletionDonut } from "./degree-completion-donut";
import SemesterCard from "./semester-card";

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

function nextSemester(semester: string): string {
  const [season, year] = semester.split(" ");
  if (season === "Spring") {
    return `Fall ${Number(year) + 1}`;
  }
  if (season === "Fall") {
    return `Spring ${year}`;
  }
  throw new Error(`Invalid semester: ${semester}`);
}

const MainContent = () => {
  const { allCourses } = useAuditContext();
  const [extraEmptySemesters, setExtraEmptySemesters] = useState<string[]>([]);

  const semesters = useMemo(() => {
    return Object.entries(
      allCourses.reduce(
        (acc, course) => {
          acc[course.semester] = [...(acc[course.semester] || []), course];
          return acc;
        },
        {} as Record<string, Course[]>,
      ),
    )
      .concat(extraEmptySemesters.map((semester) => [semester, []]))
      .sort((a, b) => {
        const [yearA, seasonA] = a[0].split(" ");
        const [yearB, seasonB] = b[0].split(" ");
        return Number(yearA) - Number(yearB) || seasonA.localeCompare(seasonB);
      });
  }, [allCourses, extraEmptySemesters]);

  const AddSemesterButton = () => {
    return (
      <Button
        className="w-sm bg-[#579D42] text-white font-bold"
        onClick={() => {
          setExtraEmptySemesters([
            ...extraEmptySemesters,
            nextSemester(semesters[semesters.length - 1][0]),
          ]);
        }}
      >
        <Plus />
        Add Future Semester
      </Button>
    );
  };

  return (
    <VStack fill className="w-full">
      <Title text="Degree Planner" />
      <Wrap maxCols={2}>
        {semesters.map((semester, index) => (
          <SemesterCard
            key={index}
            semester={semester[0]}
            courses={semester[1]}
          />
        ))}
        <AddSemesterButton />
      </Wrap>
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
