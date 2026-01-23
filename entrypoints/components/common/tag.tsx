import React from "react";

interface TagProps {
  index: number;
  major: string;
  type: string;
}
// Uses CSS variables from content.css @theme
const getBackgroundColor = (index: number, type: String): string => {
  if (type == "minor") {
    return "var(--color-dap-minor-bg)";
  }
  switch (index) {
    case 0:
      return "var(--color-dap-green)";
    case 1:
      return "var(--color-dap-purple)";
    case 2:
      return "var(--color-dap-orange-accent)";
    default:
      return "var(--color-dap-red)";
  }
};

const getColor = (index: number, type: String): string => {
  if (type == "minor") {
    return "var(--color-dap-minor-text)";
  } else {
    switch (index) {
      case 0:
        return "var(--color-dap-green-bg)";
      case 1:
        return "var(--color-dap-purple-bg)";
      case 2:
        return "var(--color-dap-orange-accent-bg)";
      default:
        return "var(--color-dap-red-bg)";
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
