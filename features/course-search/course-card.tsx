import type { CourseCode } from "@/domain/course";
import { cn, getColorByCourseCode } from "@/lib/utils";
import {
  CircleNotchIcon,
  DotsSixVerticalIcon,
  PlusCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { forwardRef } from "react";

export interface CourseCardData {
  code: string;
  name: string;
}

interface CourseCardProps extends React.HTMLAttributes<HTMLDivElement> {
  course: CourseCardData;
  showDots?: boolean;
  /** Tint the card with the course's color (taken, in-progress or registered). */
  colored?: boolean;
  /** Dashed outline for courses that can still be moved or removed. */
  dashed?: boolean;
  type?: "add";
  loading?: boolean;
  onRemove?: () => void;
}

const CourseCard = forwardRef<HTMLDivElement, CourseCardProps>(
  (
    {
      course,
      className,
      showDots = false,
      colored = false,
      dashed = false,
      type,
      loading,
      onRemove,
      style,
      ...props
    },
    ref,
  ) => {
    const color = getColorByCourseCode(course.code as CourseCode);
    return (
      <div
        {...props}
        ref={ref}
        style={
          colored
            ? {
                backgroundColor: `color-mix(in srgb, ${color.tailwind} 10%, white)`,
                ...style,
              }
            : style
        }
        aria-disabled={loading || undefined}
        className={cn(
          "group relative bg-background rounded-md flex items-stretch overflow-hidden border-2 border-dap-border transition-all duration-200 hover:shadow-md hover:border-gray-300 cursor-pointer",
          dashed && "border-dashed",
          className,
          loading &&
            "opacity-50 cursor-not-allowed border-dap-border hover:shadow-none hover:border-dap-border",
        )}
      >
        <div
          className={`w-6 flex items-center justify-center ${color.className} rounded-l-sm border-r-2 border-dap-border`}
        >
          {showDots ? (
            <DotsSixVerticalIcon
              size={18}
              weight="bold"
              className="text-white"
            />
          ) : null}
        </div>
        <div className="py-3 px-3 flex-1">
          <p className="text-text font-semibold text-sm">{course.name}</p>
          <p className="text-gray-500 text-xs">{course.code}</p>
        </div>
        {type === "add" ? (
          <div className="flex items-center justify-center px-3">
            {loading ? (
              <CircleNotchIcon size={24} className="text-text animate-spin" />
            ) : (
              <PlusCircleIcon size={24} className="text-700" />
            )}
          </div>
        ) : null}
        {onRemove ? (
          <button
            type="button"
            aria-label={`Remove ${course.code}`}
            title="Remove course"
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            className="absolute top-1.5 right-1.5 rounded p-0.5 text-gray-500 opacity-0 transition-opacity hover:bg-black/5 hover:text-text focus-visible:opacity-100 group-hover:opacity-100 cursor-pointer"
          >
            <XIcon size={14} weight="bold" />
          </button>
        ) : null}
      </div>
    );
  },
);

CourseCard.displayName = "CourseCard";

export default CourseCard;
