import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
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
};
export type GraphProps = GraphStyleProps & {
	innerContent?: React.ReactNode;
	children?: React.ReactNode;
	bars: Bar[];
	tooltipContent?: (bar: Bar) => React.ReactNode;
} & GraphStyleProps;

const InnerDonutGraph = ({
	bar,
	radius,
	color,
	animatedProgress,
	animatedPlannedProgress,
	strokeWidth,
	...other
}: {
	bar: Bar;
	index: number;
	radius: number;
	color: `rgb(${number}, ${number}, ${number})`;
	animatedProgress: number;
	animatedPlannedProgress: number;
	strokeWidth: number;
	onMouseEnter: () => void;
	onMouseLeave: () => void;
}) => {
  // Calculate stroke-dasharray for circular progress
  const svgRef = useRef<SVGSVGElement>(null);
  const circumference = 2 * Math.PI * radius;
  const progressLength =
    (animatedProgress / bar.percentage.total) * circumference;
  const dashArray = `${progressLength} ${circumference}`;
  const colorValues = color
    .substring(4, color.length - 1)
    .split(",")
    .map((s) => Number(s.trim()));
  const darkeningFactor = 0.7;
  const bgOpacity = 0.1;
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
				stroke={"#000"}
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				strokeDasharray={dashArray}
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
				strokeLinecap="round"
				strokeDasharray={dashArray}
				transform="rotate(-90 100 100)"
				style={{
					pointerEvents: "none", // Essential to allow mouse events to pass through to the background circle
				}}
			/>
		</svg>
	);
};

const MultiDonutGraph = ({
	bars,
	innerContent,
	children,
	tooltipContent,
	size = 362,
	strokeWidth = 10,
	gap = 1,
	startRadius = 95,
	animationDuration = 750,
}: GraphProps) => {
	const [hoveredBar, setHoveredBar] = useState<Bar | null>(bars[0] || null);
	const ref = useRef<HTMLDivElement>(null);

	// State to track animated progress for each bar
	const [animatedProgress, setAnimatedProgress] = useState<
		{ current: number; planned: number }[]
	>(bars.map(() => ({ current: 0, planned: 0 })));

  useEffect(() => {
    // Animate each bar from 0 to its target value
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);

      // Easing function for smooth animation (ease-out)
      const easedProgress = 1 - Math.pow(1 - progress, 3);

			setAnimatedProgress(
				bars.map((bar) => ({
					current: bar.percentage.current * easedProgress,
					planned: bar.percentage.planned * easedProgress,
				}))
			);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [bars]);

  return (
    <div
      ref={ref}
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
              initial={{ opacity: 0, right: 10 }}
              animate={{ opacity: 1, right: 0 }}
              exit={{ opacity: 0, right: -10 }}
              transition={{ duration: 0.2 }}
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                zIndex: 1000,
                transform: "translate(100%, -50%)",
              }}
            >
              {tooltipContent?.(hoveredBar)}
            </motion.div>

						<motion.div
							initial={{ opacity: 0, right: 10 }}
							animate={{ opacity: 1, right: 0 }}
							exit={{ opacity: 0, right: -10 }}
							transition={{ duration: 0.2 }}
							className="absolute top-0 right-0 w-full h-full pointer-events-none"
							style={{
								zIndex: 800,
							}}
						>
							{/* Dashed line from tooltip box to highlighted circle */}
							{tooltipContent && (
								<svg
									className="pointer-events-none absolute top-0 right-0"
									width="100%"
									height="100%"
									style={{
										overflow: "visible",
										pointerEvents: "none",
										zIndex: 800,
									}}
								>
									{(() => {
										// Parameters used in donut placement
										const svgSize = typeof size === "number" ? size : 200;

										// Find the hovered bar index and its geometry
										const index = bars.findIndex((bar) => bar === hoveredBar);

										// const radius =
										// 	size / 2 - Math.sqrt(2) * (strokeWidth + gap) * index;
										// const displacement = radius / Math.sqrt(2);
										const displacement =
											size / 2 - (strokeWidth + gap) * 2 * index;

										// The center of the circle
										const cx = svgSize / 2;
										const cy = svgSize / 2;

										return (
											<line
												x1={cx + size / 2}
												y1={cy - size / 2}
												x2={cx + displacement / Math.sqrt(2)}
												y2={cy - displacement / Math.sqrt(2)}
												stroke={hoveredBar?.color || "#000"}
												strokeWidth={4}
												strokeLinecap="round"
												strokeDasharray="5,5"
												style={{
													zIndex: 800,
													pointerEvents: "none",
												}}
											/>
										);
									})()}
								</svg>
							)}
						</motion.div>
					</>
				)}
			</AnimatePresence>
			{bars.map((bar, index) => {
				return (
					<InnerDonutGraph
						key={bar.title}
						bar={bar}
						index={index}
						radius={startRadius - index * (strokeWidth + gap)}
						color={bar.color}
						animatedProgress={animatedProgress[index]?.current || 0}
						animatedPlannedProgress={animatedProgress[index]?.planned || 0}
						onMouseEnter={() => setHoveredBar(bar)}
						onMouseLeave={() => setHoveredBar(null)}
						strokeWidth={strokeWidth}
					/>
				);
			})}
			{(innerContent || children) && (
				<div
					style={{
						position: "absolute",
						top: "50%",
						left: "50%",
						transform: "translate(-50%, -50%)",
					}}
				>
					{innerContent || children}
				</div>
			)}
		</div>
	);
};

export default MultiDonutGraph;
