import React from "react";

interface TagProps {
  index: number;
  major: string;
  type: string;
}
const getBackgroundColor = (index: number, type: String): string => {
  if (type == "minor") {
    return "#CFFAFE";
  }
  switch (index) {
    case 0:
      return "#059669";
    case 1:
      return "#4F46E5";
    case 2:
      return "#f97316";
    default:
      return "#ef4444";
  }
};

const getColor = (index: number, type: String): string => {
  if (type == "minor") {
    return "#0369A1";
  } else {
    switch (index) {
      case 0:
        return "#d1fae5";
      case 1:
        return "#e0e7ff";
      case 2:
        return "#ffedd5";
      default:
        return "#fee2e2";
    }
  }
};

const Tag: React.FC<TagProps> = ({ index, major, type }) => {
  return (
    <span
      key={index}
      className="px-3 py-[3px] rounded h-[18px] flex items-center justify-center text-[13px] leading-[12px] font-semibold"
      style={{
        backgroundColor: getBackgroundColor(index, type),
        color: getColor(index, type),
      }}
    >
      {major}
    </span>
  );
};

export default Tag;
