import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { PlanableProgress } from "../../../lib/general-types";

export type Bar = {
  title: string;
  color: `rgb(${number}, ${number}, ${number})`;
  percentage: PlanableProgress;
};

export type GraphStyleProps = {
  size?: number;
  strokeWidth?: number;
  gap?: number;
  startRadius?: number;
  animationDuration?: number;
  barEndRounding?: "round" | "square";
  darkeningFactor?: number;
  plannedOpacity?: number;
  bgOpacity?: number;
  tooltipCorner?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
};
export type GraphProps = GraphStyleProps & {
  innerContent?: React.ReactNode;
  children?: React.ReactNode;
  bars: Bar[];
  tooltipContent?: (bar: Bar) => React.ReactNode;
} & GraphStyleProps;

function lowerOpacityColor(
  color: `rgb(${number}, ${number}, ${number})`,
  opacity: number,
): `rgb(${number}, ${number}, ${number}, ${number})` {
  const colorValues = color
    .substring(4, color.length - 1)
    .split(",")
    .map((s) => Number(s.trim()));
  return `rgb(${colorValues[0]}, ${colorValues[1]}, ${colorValues[2]}, ${opacity})`;
}

type InnerDonutGraphStylingProps = {
  barEndRounding: "round" | "square";
  color: `rgb(${number}, ${number}, ${number})`;
  strokeWidth: number;
  radius: number;
  darkeningFactor: number;
  plannedOpacity: number;
  bgOpacity: number;
};

type InnerDonutGraphProps = {
  bar: Bar;
  index: number;
  animatedProgress: number;
  animatedPlannedProgress: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
} & InnerDonutGraphStylingProps;

function getInitialTooltipPositionX(
  tooltipCorner: "top-right" | "top-left" | "bottom-right" | "bottom-left",
  amount: number,
) {
  return {
    right: tooltipCorner.split("-")[1] === "right" ? amount : undefined,
    left: tooltipCorner.split("-")[1] === "left" ? amount : undefined,
  };
}

function getInitialTooltipPositionY(
  tooltipCorner: "top-right" | "top-left" | "bottom-right" | "bottom-left",
  amount: number,
) {
  return {
    top: tooltipCorner.split("-")[0] === "top" ? amount : undefined,
    bottom: tooltipCorner.split("-")[0] === "bottom" ? amount : undefined,
  };
}

function getInitialTooltipPosition(
  tooltipCorner: "top-right" | "top-left" | "bottom-right" | "bottom-left",
  amount: number,
) {
  return {
    ...getInitialTooltipPositionX(tooltipCorner, amount),
    ...getInitialTooltipPositionY(tooltipCorner, amount),
  };
}

type TooltipCorner = NonNullable<GraphStyleProps["tooltipCorner"]>;

/** Slide distance (px) for tooltip enter/exit, along the diagonal from the corner. */
const TOOLTIP_SLIDE = 12;

function getTooltipSlideMotion(corner: TooltipCorner) {
  switch (corner) {
    case "top-right":
      return { x: TOOLTIP_SLIDE, y: -TOOLTIP_SLIDE };
    case "top-left":
      return { x: -TOOLTIP_SLIDE, y: -TOOLTIP_SLIDE };
    case "bottom-right":
      return { x: TOOLTIP_SLIDE, y: TOOLTIP_SLIDE };
    case "bottom-left":
      return { x: -TOOLTIP_SLIDE, y: TOOLTIP_SLIDE };
  }
}

/** Places the tooltip outside the graph at the given corner (anchor is graph corner). */
function getTooltipBoxTransform(corner: TooltipCorner): string {
  switch (corner) {
    case "top-right":
      return "translate(100%, -100%)";
    case "top-left":
      return "translate(-100%, -100%)";
    case "bottom-right":
      return "translate(100%, 100%)";
    case "bottom-left":
      return "translate(-100%, 100%)";
  }
}

/** Line from ring (toward corner) to outer corner; coords in container pixels (SVG user space). */
function getTooltipLineCoords(
  corner: TooltipCorner,
  size: number,
  ringRadiusPx: number,
): { x1: number; y1: number; x2: number; y2: number } {
  const cx = size / 2;
  const cy = size / 2;
  const r = ringRadiusPx;
  const k = r / Math.SQRT2;

  switch (corner) {
    case "top-right":
      return {
        x1: cx + k,
        y1: cy - k,
        x2: size,
        y2: 0,
      };
    case "top-left":
      return {
        x1: cx - k,
        y1: cy - k,
        x2: 0,
        y2: 0,
      };
    case "bottom-right":
      return {
        x1: cx + k,
        y1: cy + k,
        x2: size,
        y2: size,
      };
    case "bottom-left":
      return {
        x1: cx - k,
        y1: cy + k,
        x2: 0,
        y2: size,
      };
  }
}

const InnerDonutGraph = (props: InnerDonutGraphProps) => {
  const {
    bar,
    radius,
    barEndRounding,
    color,
    animatedProgress,
    animatedPlannedProgress,
    strokeWidth,
    darkeningFactor = 0.6,
    plannedOpacity = 0.4,
    bgOpacity = 0.1,
    ...other
  } = props;
  // Calculate stroke-dasharray for circular progress
  const svgRef = useRef<SVGSVGElement>(null);
  const circumference = 2 * Math.PI * radius;
  const progressLength =
    (animatedProgress / bar.percentage.total) * circumference;
  const plannedProgressLength =
    ((animatedPlannedProgress + animatedProgress) / bar.percentage.total) *
    circumference;
  const dashArray = `${progressLength} ${circumference}`;
  const plannedDashArray = `${plannedProgressLength} ${circumference}`;
  const colorValues = color
    .substring(4, color.length - 1)
    .split(",")
    .map((s) => Number(s.trim()));
  const backgroundColor = `rgba(${colorValues[0] * darkeningFactor}, ${
    colorValues[1] * darkeningFactor
  }, ${colorValues[2] * darkeningFactor}, ${bgOpacity})`;

  return (
    <svg
      ref={svgRef}
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "100%",
        height: "100%",
        pointerEvents: "none", // Essential to allow mouse events to pass through to the background circle
      }}
      viewBox="0 0 200 200"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Background circle (track) */}
      <circle
        cx="100"
        cy="100"
        r={radius}
        fill="none"
        stroke={backgroundColor}
        strokeWidth={strokeWidth}
        style={{
          pointerEvents: "stroke",
          cursor: "pointer",
        }}
        onMouseEnter={other.onMouseEnter}
        onMouseLeave={other.onMouseLeave}
      />

      {/* Planned circle */}
      <circle
        cx="100"
        cy="100"
        r={radius}
        fill="none"
        stroke={lowerOpacityColor(color, plannedOpacity)}
        strokeWidth={strokeWidth}
        strokeLinecap={barEndRounding}
        strokeDasharray={plannedDashArray}
        transform="rotate(-90 100 100)"
        style={{
          pointerEvents: "none", // Essential to allow mouse events to pass through to the background circle
        }}
      />

      {/* Progress circle */}
      <circle
        cx="100"
        cy="100"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap={barEndRounding}
        strokeDasharray={dashArray}
        transform="rotate(-90 100 100)"
        style={{
          pointerEvents: "none", // Essential to allow mouse events to pass through to the background circle
        }}
      />
    </svg>
  );
};

const MultiDonutGraph = (props: GraphProps) => {
  const {
    size = 362,
    strokeWidth = 10,
    gap = 1,
    startRadius = 95,
    animationDuration = 750,
    darkeningFactor = 0.6,
    plannedOpacity = 0.4,
    bgOpacity = 0.1,
    tooltipCorner = "top-right",
    ...extraProps
  } = props;
  const [hoveredBar, setHoveredBar] = useState<Bar | null>(null);

  // State to track animated progress for each bar
  const [animatedProgress, setAnimatedProgress] = useState<
    { current: number; planned: number }[]
  >(extraProps.bars.map(() => ({ current: 0, planned: 0 })));

  useEffect(() => {
    // Animate each bar from its current displayed value to the new target
    const startValues = animatedProgress.map((p) => ({ ...p }));
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);

      // Easing function for smooth animation (ease-out)
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      setAnimatedProgress(
        extraProps.bars.map((bar, i) => {
          const start = startValues[i] ?? { current: 0, planned: 0 };
          const targetCurrent = bar.percentage.current;
          const targetPlanned = bar.percentage.planned;
          return {
            current:
              start.current + (targetCurrent - start.current) * easedProgress,
            planned:
              start.planned + (targetPlanned - start.planned) * easedProgress,
          };
        }),
      );

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [extraProps.bars]);

  const tooltipSlide = getTooltipSlideMotion(tooltipCorner);

  return (
    <div
      style={{
        height: size,
        aspectRatio: "1",
        position: "relative",
      }}
    >
      <AnimatePresence>
        {hoveredBar && (
          <>
            <motion.div
              initial={{
                opacity: 0,
                x: tooltipSlide.x,
                y: tooltipSlide.y,
              }}
              animate={{
                opacity: 1,
                x: 0,
                y: 0,
              }}
              exit={{
                opacity: 0,
                x: tooltipSlide.x,
                y: tooltipSlide.y,
              }}
              transition={{ duration: 0.2 }}
              style={{
                position: "absolute",
                ...getInitialTooltipPosition(tooltipCorner, 0),
                zIndex: 1000,
              }}
              className="pointer-events-none"
            >
              <div
                style={{
                  transform: getTooltipBoxTransform(tooltipCorner),
                }}
              >
                {extraProps.tooltipContent?.(hoveredBar)}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 pointer-events-none"
              style={{
                zIndex: 800,
              }}
            >
              {/* Dashed line from highlighted ring toward the chosen corner (tooltip sits at corner) */}
              {extraProps.tooltipContent && (
                <svg
                  className="pointer-events-none absolute inset-0"
                  width="100%"
                  height="100%"
                  viewBox={`0 0 ${size} ${size}`}
                  preserveAspectRatio="xMidYMid meet"
                  style={{
                    overflow: "visible",
                    pointerEvents: "none",
                  }}
                >
                  {(() => {
                    const index = extraProps.bars.findIndex(
                      (bar) => bar === hoveredBar,
                    );
                    const ringRadiusView =
                      startRadius - index * (strokeWidth + gap);
                    const ringRadiusPx = (ringRadiusView / 200) * size;
                    const { x1, y1, x2, y2 } = getTooltipLineCoords(
                      tooltipCorner,
                      size,
                      ringRadiusPx,
                    );

                    return (
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={hoveredBar?.color || "#000"}
                        strokeWidth={4}
                        strokeLinecap="round"
                        strokeDasharray="5,5"
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })()}
                </svg>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {extraProps.bars.map((bar, index) => {
        return (
          <InnerDonutGraph
            key={index}
            bar={bar}
            index={index}
            radius={startRadius - index * (strokeWidth + gap)}
            color={bar.color}
            animatedProgress={animatedProgress[index]?.current || 0}
            animatedPlannedProgress={animatedProgress[index]?.planned || 0}
            onMouseEnter={() => setHoveredBar(bar)}
            onMouseLeave={() => setHoveredBar(null)}
            strokeWidth={strokeWidth}
            barEndRounding={extraProps.barEndRounding ?? "round"}
            darkeningFactor={darkeningFactor}
            plannedOpacity={plannedOpacity}
            bgOpacity={bgOpacity}
          />
        );
      })}
      {(extraProps.innerContent || extraProps.children) && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          {extraProps.innerContent || extraProps.children}
        </div>
      )}
    </div>
  );
};

export default MultiDonutGraph;
