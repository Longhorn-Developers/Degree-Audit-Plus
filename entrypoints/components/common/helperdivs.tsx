import { createContext, forwardRef, useContext } from "react";
import { cn } from "~/lib/utils";

type Sizings =
	| {
			size?: "fill" | "fit" | "auto";
			fit?: never;
			auto?: never;
			fill?: never;
	  }
	| {
			size?: never;
			fit?: true;
			auto?: never;
			fill?: never;
	  }
	| {
			size?: never;
			fit?: never;
			auto?: true;
			fill?: never;
	  }
	| {
			size?: never;
			fit?: never;
			auto?: never;
			fill?: true;
	  };

type HelperDivProps = React.HTMLAttributes<HTMLDivElement> & {
	gap?: number;
	centered?: boolean;
	x?: "left" | "center" | "right" | "between" | "around";
	y?: "top" | "middle" | "bottom" | "between" | "around";
} & Sizings;

type StackContextValue = {
	type: "v" | "h";
	gap: number;
	centered: boolean;
	size: "fill" | "fit" | "auto";
	x?: "left" | "center" | "right" | "between" | "around";
	y?: "top" | "middle" | "bottom" | "between" | "around";
} & Sizings;

const StackContext = createContext<StackContextValue | null>(null);

const DEFAULT_STACK_PROPS = {
	gap: 4,
	centered: false,
	size: "auto",
	x: "left",
	y: "top",
} satisfies Omit<StackContextValue, "type">;

export const VStack = forwardRef<HTMLDivElement, HelperDivProps>(
	(
		{
			children,
			className,
			gap = DEFAULT_STACK_PROPS.gap,
			centered = DEFAULT_STACK_PROPS.centered,
			size = DEFAULT_STACK_PROPS.size,
			fill = false,
			fit = false,
			auto = false,
			x = DEFAULT_STACK_PROPS.x,
			y = DEFAULT_STACK_PROPS.y,
			...props
		},
		ref
	) => {
		VStack.displayName = "VStack";
		const _xSpacing = centered ? "center" : x;
		const _ySpacing = centered ? "middle" : y;
		const _size = fill ? "fill" : fit ? "fit" : auto ? "auto" : size;
		const contextValue: StackContextValue = {
			type: "v",
			gap,
			centered,
			size: _size,
			x,
			y,
		};
		return (
			<StackContext.Provider value={contextValue}>
				<div
					ref={ref}
					className={cn("flex flex-col", className, {
						"h-full": _size === "fill",
						"h-fit": _size === "fit",
						"h-auto": _size === "auto",
						"items-start": _xSpacing === "left",
						"items-center": _xSpacing === "center",
						"items-end": _xSpacing === "right",
						"items-stretch": _xSpacing === "between",
						"items-baseline": _xSpacing === "around",
						"justify-start": _ySpacing === "top",
						"justify-center": _ySpacing === "middle",
						"justify-end": _ySpacing === "bottom",
						"justify-between": _ySpacing === "between",
						"justify-around": _ySpacing === "around",
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
type UnifiedSubstackProps = HelperDivProps &
	(
		| {
				inherit?: true;
				useDefault?: false;
		  }
		| {
				inherit?: false;
				useDefault?: true;
		  }
	);

//TODO: implement the useDefault logic
export const Substack = forwardRef<HTMLDivElement, UnifiedSubstackProps>(
	(
		{
			children,
			className,
			gap,
			centered,
			size,
			fill = false,
			fit = false,
			auto = false,
			x,
			y,
			inherit = true,
			useDefault = false,
			...props
		},
		ref
	) => {
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

		const referenceContext = useDefault
			? { ...DEFAULT_STACK_PROPS, type: stackContext?.type ?? "v" }
			: stackContext;
		if (!referenceContext) {
			throw new Error("Invalid context");
		}

		// Inherit from reference context, but allow overrides
		const personalGap = gap ?? referenceContext.gap;
		const personalCentered = centered ?? referenceContext.centered;
		const personalSize = fill
			? "fill"
			: fit
			? "fit"
			: auto
			? "auto"
			: size ?? referenceContext.size;
		const personalX = x ?? referenceContext.x;
		const personalY = y ?? referenceContext.y;

		const contextValue: StackContextValue = {
			type: isVStack ? "v" : "h",
			gap: personalGap,
			centered: personalCentered,
			size: personalSize,
			x: personalX,
			y: personalY,
		};

		const _xSpacing = personalCentered ? "center" : personalX;
		const _ySpacing = personalCentered ? "middle" : personalY;
		const classes = isVStack
			? {
					"h-full": personalSize === "fill",
					"h-fit": personalSize === "fit",
					"h-auto": personalSize === "auto",
					"items-start": _xSpacing === "left",
					"items-center": _xSpacing === "center",
					"items-end": _xSpacing === "right",
					"items-stretch": _xSpacing === "between",
					"items-baseline": _xSpacing === "around",
					"justify-start": _ySpacing === "top",
					"justify-center": _ySpacing === "middle",
					"justify-end": _ySpacing === "bottom",
					"justify-between": _ySpacing === "between",
					"justify-around": _ySpacing === "around",
			  }
			: {
					"w-full": personalSize === "fill",
					"w-fit": personalSize === "fit",
					"w-auto": personalSize === "auto",
					"justify-start": _xSpacing === "left",
					"justify-center": _xSpacing === "center",
					"justify-end": _xSpacing === "right",
					"justify-between": _xSpacing === "between",
					"justify-around": _xSpacing === "around",
					"items-start": _ySpacing === "top",
					"items-center": _ySpacing === "middle",
					"items-end": _ySpacing === "bottom",
					"items-stretch": _ySpacing === "between",
					"items-baseline": _ySpacing === "around",
			  };
		return (
			<StackContext.Provider value={contextValue}>
				<div
					ref={ref}
					className={cn(
						"flex",
						isVStack ? "flex-col" : "flex-row",
						className,
						classes
					)}
					style={{ gap: `${personalGap / 4}rem` }}
					{...props}
				>
					{children}
				</div>
			</StackContext.Provider>
		);
	}
);

export const HStack = forwardRef<HTMLDivElement, HelperDivProps>(
	(
		{
			children,
			className,
			gap = DEFAULT_STACK_PROPS.gap,
			size = DEFAULT_STACK_PROPS.size,
			centered = DEFAULT_STACK_PROPS.centered,
			fill = false,
			fit = false,
			auto = false,
			x,
			y,
			...props
		},
		ref
	) => {
		HStack.displayName = "HStack";
		const _xSpacing = centered ? "center" : x;
		const _ySpacing = centered ? "middle" : y;
		const _size = fill ? "fill" : fit ? "fit" : auto ? "auto" : size;
		const contextValue: StackContextValue = {
			type: "h",
			gap,
			centered,
			size: _size,
			x,
			y,
		};

		return (
			<StackContext.Provider value={contextValue}>
				<div
					ref={ref}
					className={cn("flex flex-row", className, {
						"w-full": _size === "fill",
						"w-fit": _size === "fit",
						"w-auto": _size === "auto",
						"justify-start": _xSpacing === "left",
						"justify-center": _xSpacing === "center",
						"justify-end": _xSpacing === "right",
						"justify-between": _xSpacing === "between",
						"justify-around": _xSpacing === "around",
						"items-start": _ySpacing === "top",
						"items-center": _ySpacing === "middle",
						"items-end": _ySpacing === "bottom",
						"items-stretch": _ySpacing === "between",
						"items-baseline": _ySpacing === "around",
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
			gap = DEFAULT_STACK_PROPS.gap,
			centered = false,
			size = DEFAULT_STACK_PROPS.size,
			fill = false,
			fit = false,
			auto = false,
			x = DEFAULT_STACK_PROPS.x,
			y = DEFAULT_STACK_PROPS.y,
			maxCols,
			...props
		},
		ref
	) => {
		Wrap.displayName = "Wrap";
		const _xSpacing = centered ? "center" : x;
		const _ySpacing = centered ? "middle" : y;
		return (
			<div
				ref={ref}
				className={cn("flex flex-row flex-wrap", className, {
					"w-full": size === "fill",
					"w-fit": size === "fit",
					"w-auto": size === "auto",
					"flex-wrap": maxCols !== -1,
					"justify-start": _xSpacing === "left",
					"justify-center": _xSpacing === "center",
					"justify-end": _xSpacing === "right",
					"justify-between": _xSpacing === "between",
					"justify-around": _xSpacing === "around",
					"items-start": _ySpacing === "top",
					"items-center": _ySpacing === "middle",
					"items-end": _ySpacing === "bottom",
					"items-stretch": _ySpacing === "between",
					"items-baseline": _ySpacing === "around",
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
