import { HStack, VStack } from "@/components/ui/stack";
import Title from "@/components/ui/text";
import { CourseSearchPanel } from "@/features/catalog/components/course-add-modal";
import "@/entrypoints/styles/content.css";
import DegreeCompletionDonut from "@/features/audit/components/degree-completion-donut";
import SemesterDropdowns from "./components/semester-dropdowns";

const SidePanel = () => {
  return (
    <VStack
      className="self-start sticky top-0 z-20 bg-background"
      y="stretch"
      x="center"
    >
      <DegreeCompletionDonut size={300} />
      <div className="w-sm mt-10 p-3 rounded-lg border border-gray-200 bg-background">
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
