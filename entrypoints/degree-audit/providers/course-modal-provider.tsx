import type { CatalogCourse } from "@/lib/general-types";
import { createContext, useContext, useState } from "react";
import CourseAddModal from "@/entrypoints/components/course-add-modal";

// Context for sharing audit data betw sidebar and main
interface CourseModalContextType {
  isOpen: boolean;
  recommendedCourses: CatalogCourse[];
  toggleModal: () => void;
  openModal: () => void;
  closeModal: () => void;
  setRecommendedCourses: (courses: CatalogCourse[]) => void;
}

const CourseModalContext = createContext<CourseModalContextType | null>(null);

export const CourseModalContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [recommendedCourses, setRecommendedCourses] = useState<CatalogCourse[]>(
    [],
  );

  return (
    <CourseModalContext.Provider
      value={{
        isOpen,
        recommendedCourses,
        toggleModal: () => setIsOpen(!isOpen),
        openModal: () => setIsOpen(true),
        closeModal: () => setIsOpen(false),
        setRecommendedCourses,
      }}
    >
      {children}

      <CourseAddModal
        isOpen={isOpen}
        recommendedCourses={recommendedCourses}
        onClose={() => setIsOpen(false)}
        onSearch={(searchData) => {
          console.log("Search data:", searchData);
        }}
      />
    </CourseModalContext.Provider>
  );
};

export function useCourseModalContext(): CourseModalContextType {
  const context = useContext(CourseModalContext);
  if (!context) {
    throw new Error(
      "useCourseModalContext must be used within a CourseModalProvider",
    );
  }
  return context;
}

export default CourseModalContextProvider;
