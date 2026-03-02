import { cn } from "@/lib/utils";
import { DotsSixVerticalIcon } from "@phosphor-icons/react";
import { forwardRef } from "react";

export type CourseCardProps = {
  fullName: string;
  courseName: string;
  color?: "orange" | "indigo";
};

const colorMap = {
  orange: "bg-dap-orange",
  indigo: "bg-dap-indigo",
};

const CourseCard = forwardRef<
  HTMLDivElement,
  CourseCardProps & React.HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const { fullName, courseName, color = "orange", className, ...rest } = props;

  return (
    <div
      {...rest}
      ref={ref}
      className={cn(
        "bg-white rounded-md flex items-stretch overflow-hidden border-2 border-dap-border transition-all duration-200 hover:shadow-md hover:border-gray-300 cursor-pointer",
        className,
      )}
    >
      <div
        className={`w-6 flex items-center justify-center ${colorMap[color]} rounded-l-sm border-r-2 border-dap-border`}
      >
        <DotsSixVerticalIcon size={18} weight="bold" className="text-white" />
      </div>
      <div className="py-3 px-3">
        <p className="text-gray-900 font-semibold text-sm">{fullName}</p>
        <p className="text-gray-500 text-xs">{courseName}</p>
      </div>
    </div>
  );
});

CourseCard.displayName = "CourseCard";

export default CourseCard;
