import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type StackProps = React.HTMLAttributes<HTMLDivElement> & {
  gap?: number;
  centered?: boolean;
  fill?: boolean;
  fillHeight?: boolean;
  fillWidth?: boolean;
  x?: "left" | "center" | "right" | "between" | "around";
  y?: "top" | "middle" | "bottom" | "stretch" | "baseline";
};

export const VStack = forwardRef<HTMLDivElement, StackProps>(
  (
    {
      children,
      className,
      gap = 4,
      centered = false,
      fill = false,
      fillHeight = false,
      fillWidth = false,
      x,
      y,
      style,
      ...props
    },
    ref,
  ) => {
    const xSpacing = centered ? "center" : (x ?? "left");
    const ySpacing = centered ? "middle" : (y ?? "top");

    return (
      <div
        ref={ref}
        className={cn("flex flex-col", className, {
          "h-full": fill || fillHeight,
          "w-full": fillWidth,
          "items-start": xSpacing === "left",
          "items-center": xSpacing === "center",
          "items-end": xSpacing === "right",
          "items-stretch": xSpacing === "between",
          "items-baseline": xSpacing === "around",
          "justify-start": ySpacing === "top",
          "justify-center": ySpacing === "middle",
          "justify-end": ySpacing === "bottom",
          "justify-between": ySpacing === "stretch",
          "justify-around": ySpacing === "baseline",
        })}
        style={{ gap: `${gap / 4}rem`, ...style }}
        {...props}
      >
        {children}
      </div>
    );
  },
);
VStack.displayName = "VStack";

export const HStack = forwardRef<HTMLDivElement, StackProps>(
  (
    {
      children,
      className,
      gap = 4,
      centered = false,
      fill = false,
      fillHeight = false,
      fillWidth = false,
      x,
      y,
      style,
      ...props
    },
    ref,
  ) => {
    const xSpacing = centered ? "center" : (x ?? "left");
    const ySpacing = centered ? "middle" : (y ?? "top");

    return (
      <div
        ref={ref}
        className={cn("flex flex-row", className, {
          "w-full": fill || fillWidth,
          "h-full": fillHeight,
          "justify-start": xSpacing === "left",
          "justify-center": xSpacing === "center",
          "justify-end": xSpacing === "right",
          "justify-between": xSpacing === "between",
          "justify-around": xSpacing === "around",
          "items-start": ySpacing === "top",
          "items-center": ySpacing === "middle",
          "items-end": ySpacing === "bottom",
          "items-stretch": ySpacing === "stretch",
          "items-baseline": ySpacing === "baseline",
        })}
        style={{ gap: `${gap / 4}rem`, ...style }}
        {...props}
      >
        {children}
      </div>
    );
  },
);
HStack.displayName = "HStack";

type GridProps = React.HTMLAttributes<HTMLDivElement> & {
  maxCols?: number;
  xGap?: number;
  yGap?: number;
  direction?: "row" | "column";
  xSpacing?: "center" | "left" | "right";
  ySpacing?: "middle" | "top" | "bottom" | "space-between" | "space-around";
  fill?: boolean;
};

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  (
    {
      children,
      className,
      maxCols = -1,
      xGap = 4,
      yGap = 4,
      direction = "row",
      xSpacing = "left",
      ySpacing = "top",
      fill = false,
      style,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn("grid", className, {
        "w-full": fill,
        "grid-cols-1": direction === "column",
        "grid-cols-2": direction === "row",
        "items-center": xSpacing === "center",
        "items-left": xSpacing === "left",
        "items-right": xSpacing === "right",
        "justify-center": ySpacing === "middle",
        "justify-start": ySpacing === "top",
        "justify-end": ySpacing === "bottom",
        "justify-between": ySpacing === "space-between",
        "justify-around": ySpacing === "space-around",
      })}
      style={{
        gap: `${yGap / 4}rem ${xGap / 4}rem`,
        gridTemplateColumns: `repeat(${maxCols}, 1fr)`,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  ),
);
Grid.displayName = "Grid";
