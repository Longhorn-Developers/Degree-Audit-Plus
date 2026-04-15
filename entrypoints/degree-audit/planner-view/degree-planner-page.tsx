import { HStack, VStack } from "@/entrypoints/components/common/helperdivs";
import Title from "@/entrypoints/components/common/text";
import { CourseSearchPanel } from "@/entrypoints/components/course-add-modal";
import "@/entrypoints/styles/content.css";
import { SimpleDegreeCompletionDonut } from "../components/degree-completion-donut";
import SemesterDropdowns from "./semester-dropdowns";

const SidePanel = () => {
  return (
    <VStack
      className="self-start sticky top-0 z-20 bg-white"
      y="stretch"
      x="center"
    >
      <SimpleDegreeCompletionDonut size={300} />
      <div className="w-sm mt-10 p-3 rounded-lg border border-gray-200 bg-[#FAFAF9]">
        <CourseSearchPanel />
      </div>
    </VStack>
  );
};

const MainContent = () => {
  return (
    <VStack className="w-full">
      <Title text="Degree Planner" />
      <SemesterDropdowns />
    </VStack>
  );
};

const DegreePlannerPage = () => {
  return (
    <HStack fill x="between">
      <MainContent />
      <SidePanel />
    </HStack>
  );
};

export default DegreePlannerPage;
