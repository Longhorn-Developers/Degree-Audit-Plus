import { HStack, VStack } from "@/components/ui/stack";
import Title from "@/components/ui/title";
import { CourseSearchPanel } from "@/features/course-search/course-search-panel";
import DegreeSidePanel from "@/features/dashboard/degree-side-panel";
import SemesterDropdowns from "./semester-dropdowns";

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
      <DegreeSidePanel searchPanel={<CourseSearchPanel />} />
    </HStack>
  );
};

export default DegreePlannerPage;
