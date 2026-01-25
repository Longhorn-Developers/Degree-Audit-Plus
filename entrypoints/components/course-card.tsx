import { DotsSixVertical } from "@phosphor-icons/react";

type CourseCardProps = {
  fullName: string;
  courseName: string;
  color?: "orange" | "indigo";
};

const colorMap = {
  orange: "bg-dap-orange",
  indigo: "bg-dap-indigo",
};

export default function CourseCard({
  fullName,
  courseName,
  color = "orange",
}: CourseCardProps) {
  return (
    <div className="bg-white rounded-md flex items-stretch overflow-hidden border-2 border-dap-border transition-all duration-200 hover:shadow-md hover:border-gray-300 cursor-pointer">
      <div
        className={`w-6 flex items-center justify-center ${colorMap[color]} rounded-l-sm border-r-2 border-dap-border`}
      >
        <DotsSixVertical size={18} weight="bold" className="text-white" />
      </div>
      <div className="py-3 px-3">
        <p className="text-gray-900 font-semibold text-sm">{fullName}</p>
        <p className="text-gray-500 text-xs">{courseName}</p>
      </div>
    </div>
  );
}
