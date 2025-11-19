import React from "react";
import Tag from "./common/tag";
import type { DegreeAuditCardProps } from "@/lib/general-types";

const DegreeAuditCard: React.FC<DegreeAuditCardProps> = ({
  title = "Degree Audit 1",
  majors = ["Informatics", "Design"],
  minors = ["Business"],
  percentage = 90,
}) => {
  return (
    <div className="bg-white rounded border-[1.5px] border-[#333f48] px-4 py-3 w-full transition-all duration-200 hover:shadow-md hover:border-dap-primary hover:-translate-y-0.5 cursor-pointer">
      <div className="flex flex-col gap-3">
        {/* Title */}
        <div className="font-bold text-[15px] leading-[18px] text-[#1a2024] tracking-[0.13px] overflow-hidden text-ellipsis whitespace-nowrap">
          {title}
        </div>
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            {/* Majors */}
            <div className="flex gap-2 items-center">
              <span className="text-[13px] leading-[12px] text-black">
                Major:
              </span>
              <div className="flex gap-1">
                {majors.map((major, index) => (
                  <Tag key={index} index={index} major={major} type="major" />
                ))}
              </div>
            </div>

            {/* Minors/Certs */}
            {minors && minors.length > 0 && (
              <div className="flex gap-2 items-center">
                <span className="text-[13px] leading-[12px] text-black">
                  Minor/cert:
                </span>
                <div className="flex gap-1">
                  {minors.map((minor, index) => (
                    <Tag key={index} index={index} major={minor} type="minor" />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/*Percentage */}
          <div className="bg-dap-primary px-2 py-1 rounded h-[30px] flex items-center justify-center">
            <span className="text-white text-base font-bold leading-[22px]">
              {percentage}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DegreeAuditCard;
