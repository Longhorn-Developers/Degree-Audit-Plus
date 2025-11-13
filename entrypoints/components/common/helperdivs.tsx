import { createContext, forwardRef, useContext } from "react";
import { cn } from "~/lib/utils";

type HelperDivProps = React.HTMLAttributes<HTMLDivElement> & {
	gap?: number;
	centered?: boolean;
	fill?: boolean;
	x?: "left" | "center" | "right" | "between" | "around";
	y?: "top" | "middle" | "bottom" | "stretch" | "baseline";
};

type StackContextValue = {
	type: "v" | "h";
	gap: number;
	centered: boolean;
	fill: boolean;
	x?: "left" | "center" | "right" | "between" | "around";
	y?: "top" | "middle" | "bottom" | "stretch" | "baseline";
};

const StackContext = createContext<StackContextValue | null>(null);

export const VStack = forwardRef<HTMLDivElement, HelperDivProps>(
	(
		{
			children,
			className,
			gap = 4,
			centered = false,
			fill = false,
			x,
			y,
			...props
		},
		ref
	) => {
		VStack.displayName = "VStack";
		const _xSpacing = centered ? "center" : x ?? "left";
		const _ySpacing = centered ? "middle" : y ?? "top";
		const contextValue: StackContextValue = {
			type: "v",
			gap,
			centered,
			fill,
			x,
			y,
		};
		return (
			<StackContext.Provider value={contextValue}>
				<div
					ref={ref}
					className={cn("flex flex-col", className, {
						"h-full": fill,
						"items-start": _xSpacing === "left",
						"items-center": _xSpacing === "center",
						"items-end": _xSpacing === "right",
						"items-stretch": _xSpacing === "between",
						"items-baseline": _xSpacing === "around",
						"justify-start": _ySpacing === "top",
						"justify-center": _ySpacing === "middle",
						"justify-end": _ySpacing === "bottom",
						"justify-between": _ySpacing === "stretch",
						"justify-around": _ySpacing === "baseline",
					})}
					style={{ gap: `${gap / 4}rem` }}
					{...props}
				>
					{children}
				</div>
			</StackContext.Provider>
		);
	}
);

// Unified props type that accepts both VStack and HStack prop types
type UnifiedSubstackProps = HelperDivProps & {
	x?:
		| "left"
		| "center"
		| "right"
		| "space-between"
		| "space-around"
		| "between"
		| "around";
	y?: "top" | "middle" | "bottom" | "stretch" | "baseline";
};

export const Substack = forwardRef<HTMLDivElement, UnifiedSubstackProps>(
	({ children, className, gap, centered, fill, x, y, ...props }, ref) => {
		Substack.displayName = "Substack";
		const stackContext = useContext(StackContext);

		// Determine which parent context we're in
		// Prioritize the most immediate parent (VStack takes precedence if both exist)
		const isVStack = stackContext?.type === "v";
		const isHStack = stackContext?.type === "h";

		if (!isVStack && !isHStack) {
			throw new Error(
				"Substack must be used as a child of a VStack or HStack component"
			);
		}

		const parentContext = stackContext;
		if (!parentContext) {
			throw new Error("Invalid context");
		}

		// Inherit from parent, but allow overrides
		const inheritedGap = gap ?? parentContext.gap;
		const inheritedCentered = centered ?? parentContext.centered;
		const inheritedFill = fill ?? parentContext.fill;
		const inheritedX = x ?? parentContext.x;
		const inheritedY = y ?? parentContext.y;

		if (isVStack) {
			// VStack: x controls items, y controls justify, flex-col
			const _xSpacing = inheritedCentered ? "center" : inheritedX ?? "left";
			const _ySpacing = inheritedCentered ? "middle" : inheritedY ?? "top";

			return (
				<div
					ref={ref}
					className={cn("flex flex-col", className, {
						"h-full": inheritedFill,
						"items-start": _xSpacing === "left",
						"items-center": _xSpacing === "center",
						"items-end": _xSpacing === "right",
						"items-stretch": _xSpacing === "between",
						"items-baseline": _xSpacing === "around",
						"justify-start": _ySpacing === "top",
						"justify-center": _ySpacing === "middle",
						"justify-end": _ySpacing === "bottom",
						"justify-between": _ySpacing === "stretch",
						"justify-around": _ySpacing === "baseline",
					})}
					style={{ gap: `${inheritedGap / 4}rem` }}
					{...props}
				>
					{children}
				</div>
			);
		} else {
			// HStack: x controls justify, y controls items, flex-row
			const _xSpacing = inheritedCentered ? "center" : inheritedX ?? "left";
			const _ySpacing = inheritedCentered ? "middle" : inheritedY ?? "top";

			// Map "space-between" and "space-around" to "between" and "around" for HStack
			const normalizedX: "left" | "center" | "right" | "between" | "around" =
				_xSpacing === "between"
					? "between"
					: _xSpacing === "around"
					? "around"
					: (_xSpacing as "left" | "center" | "right" | "between" | "around");

			return (
				<div
					ref={ref}
					className={cn("flex flex-row", className, {
						"w-full": inheritedFill,
						"justify-start": normalizedX === "left",
						"justify-center": normalizedX === "center",
						"justify-end": normalizedX === "right",
						"justify-between": normalizedX === "between",
						"justify-around": normalizedX === "around",
						"items-start": _ySpacing === "top",
						"items-center": _ySpacing === "middle",
						"items-end": _ySpacing === "bottom",
						"items-stretch": _ySpacing === "stretch",
						"items-baseline": _ySpacing === "baseline",
					})}
					style={{ gap: `${inheritedGap / 4}rem` }}
					{...props}
				>
					{children}
				</div>
			);
		}
	}
);

export const HStack = forwardRef<HTMLDivElement, HelperDivProps>(
	(
		{
			children,
			className,
			gap = 4,
			fill = false,
			centered = false,
			x: xSpacing,
			y: ySpacing,
			...props
		},
		ref
	) => {
		HStack.displayName = "HStack";
		const _xSpacing = centered ? "center" : xSpacing ?? "left";
		const _ySpacing = centered ? "middle" : ySpacing ?? "top";
		const contextValue: StackContextValue = {
			type: "h",
			gap,
			centered,
			fill,
			x: xSpacing,
			y: ySpacing,
		};

		return (
			<StackContext.Provider value={contextValue}>
				<div
					ref={ref}
					className={cn("flex flex-row", className, {
						"w-full": fill,
						"justify-start": _xSpacing === "left",
						"justify-center": _xSpacing === "center",
						"justify-end": _xSpacing === "right",
						"justify-between": _xSpacing === "between",
						"justify-around": _xSpacing === "around",
						"items-start": _ySpacing === "top",
						"items-center": _ySpacing === "middle",
						"items-end": _ySpacing === "bottom",
						"items-stretch": _ySpacing === "stretch",
						"items-baseline": _ySpacing === "baseline",
					})}
					style={{ gap: `${gap / 4}rem` }}
					{...props}
				>
					{children}
				</div>
			</StackContext.Provider>
		);
	}
);

export const Wrap = forwardRef<
	HTMLDivElement,
	HelperDivProps & { maxCols?: number }
>(
	(
		{
			children,
			className,
			gap = 4,
			centered = false,
			fill = false,
			x: xSpacing,
			y: ySpacing,
			maxCols,
			...props
		},
		ref
	) => {
		Wrap.displayName = "Wrap";
		const _xSpacing = centered ? "center" : xSpacing ?? "left";
		const _ySpacing = centered ? "middle" : ySpacing ?? "top";
		return (
			<div
				ref={ref}
				className={cn("flex flex-row flex-wrap", className, {
					"w-full": fill,
					"flex-wrap": maxCols !== -1,
					"justify-start": _xSpacing === "left",
					"justify-center": _xSpacing === "center",
					"justify-end": _xSpacing === "right",
					"justify-between": _xSpacing === "between",
					"justify-around": _xSpacing === "around",
					"items-start": _ySpacing === "top",
					"items-center": _ySpacing === "middle",
					"items-end": _ySpacing === "bottom",
					"items-stretch": _ySpacing === "stretch",
					"items-baseline": _ySpacing === "baseline",
				})}
				style={{ gap: `${gap / 4}rem` }}
				{...props}
			>
				{children}
			</div>
		);
	}
);

type GridProps = React.HTMLAttributes<HTMLDivElement> & {
	maxCols?: number;
	xGap?: number;
	yGap?: number;
	direction?: "row" | "column";
	xSpacing?:
		| "center"
		| "left"
		| "right"
		| "space-between"
		| "space-around"
		| "space-evenly";
	ySpacing?:
		| "middle"
		| "top"
		| "bottom"
		| "space-between"
		| "space-around"
		| "space-evenly";
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
			...props
		},
		ref
	) => {
		Grid.displayName = "Grid";
		return (
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
				}}
				{...props}
			>
				{children}
			</div>
		);
	}
);
