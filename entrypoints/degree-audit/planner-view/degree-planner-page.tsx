import { HStack, VStack } from "@/entrypoints/components/common/helperdivs";
import Title from "@/entrypoints/components/common/text";
import { CourseSearchContent } from "@/entrypoints/components/course-add-modal";
import "@/entrypoints/styles/content.css";
import { SimpleDegreeCompletionDonut } from "../components/degree-completion-donut";
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

const MainContent = () => {
  return (
    <VStack fill className="w-full">
      <Title text="Degree Planner" />
      <SemesterDropdowns />
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
