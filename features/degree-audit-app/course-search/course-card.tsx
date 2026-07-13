import type { CourseCode } from "@/domain/course";
import { cn, getColorByCourseCode } from "@/lib/utils";
import { DotsSixVerticalIcon, PlusCircleIcon } from "@phosphor-icons/react";
import { forwardRef } from "react";

export interface CourseCardData {
  code: string;
  name: string;
}

interface CourseCardProps extends React.HTMLAttributes<HTMLDivElement> {
  course: CourseCardData;
  showDots?: boolean;
  type?: "add";
}

const CourseCard = forwardRef<HTMLDivElement, CourseCardProps>(
  ({ course, className, showDots = false, type, ...props }, ref) => (
    <div
      {...props}
      ref={ref}
      className={cn(
        "bg-background rounded-md flex items-stretch overflow-hidden border-2 border-dap-border transition-all duration-200 hover:shadow-md hover:border-gray-300 cursor-pointer",
        className,
      )}
    >
      <div
        className={`w-6 flex items-center justify-center ${getColorByCourseCode(course.code as CourseCode).className} rounded-l-sm border-r-2 border-dap-border`}
      >
        {showDots ? (
          <DotsSixVerticalIcon size={18} weight="bold" className="text-white" />
        ) : null}
      </div>
      <div className="py-3 px-3 flex-1">
        <p className="text-text font-semibold text-sm">{course.name}</p>
        <p className="text-gray-500 text-xs">{course.code}</p>
      </div>
      {type === "add" ? (
        <div className="flex items-center justify-center px-3">
          <PlusCircleIcon size={24} className="text-gray-700" />
        </div>
      ) : null}
    </div>
  ),
);

CourseCard.displayName = "CourseCard";

export default CourseCard;
