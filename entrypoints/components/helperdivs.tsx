import { forwardRef } from "react";
import { cn } from "~/lib/utils";

type DivProps = React.HTMLAttributes<HTMLDivElement> & {
	xSpacing?: "left" | "center" | "right" | "baseline" | "stretch";
	ySpacing?: "top" | "middle" | "bottom" | "space-between" | "space-around";
	gap?: number;
	centered?: boolean;
};

export const VStack = forwardRef<HTMLDivElement, DivProps>(
	(
		{
			children,
			className,
			gap = 4,
			centered = false,
			xSpacing,
			ySpacing,
			...props
		},
		ref
	) => {
		VStack.displayName = "VStack";
		const _xSpacing = centered ? "center" : xSpacing ?? "left";
		const _ySpacing = centered ? "middle" : ySpacing ?? "top";
		return (
			<div
				ref={ref}
				className={cn("flex flex-col", className, {
					"items-center": _xSpacing === "center",
					"items-left": _xSpacing === "left",
					"items-right": _xSpacing === "right",
					"justify-center": _ySpacing === "middle",
					"justify-start": _ySpacing === "top",
					"justify-end": _ySpacing === "bottom",
					"justify-between": _ySpacing === "space-between",
					"justify-around": _ySpacing === "space-around",
				})}
				style={{ gap: `${gap / 4}rem` }}
				{...props}
			>
				{children}
			</div>
		);
	}
);

export const HStack = forwardRef<HTMLDivElement, DivProps>(
	(
		{
			children,
			className,
			gap = 4,
			centered = false,
			xSpacing,
			ySpacing,
			...props
		},
		ref
	) => {
		HStack.displayName = "HStack";
		const _xSpacing = centered ? "center" : xSpacing ?? "left";
		const _ySpacing = centered ? "middle" : ySpacing ?? "top";
		return (
			<div
				ref={ref}
				className={cn("flex flex-row", className, {
					"items-center": _xSpacing === "center",
					"items-left": _xSpacing === "left",
					"items-right": _xSpacing === "right",
					"justify-start": _ySpacing === "top",
					"justify-center": _ySpacing === "middle",
					"justify-end": _ySpacing === "bottom",
					"justify-between": _ySpacing === "space-between",
					"justify-around": _ySpacing === "space-around",
				})}
				style={{ gap: `${gap / 4}rem` }}
				{...props}
			>
				{children}
			</div>
		);
	}
);

export const Wrap = forwardRef<HTMLDivElement, DivProps & { maxCols?: number }>(
	(
		{
			children,
			className,
			gap = 4,
			centered = false,
			xSpacing,
			ySpacing,
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
					"flex-wrap": maxCols !== -1,
					"items-center": _xSpacing === "center",
					"items-left": _xSpacing === "left",
					"items-right": _xSpacing === "right",
					"justify-center": _ySpacing === "middle",
					"justify-start": _ySpacing === "top",
					"justify-end": _ySpacing === "bottom",
					"justify-between": _ySpacing === "space-between",
					"justify-around": _ySpacing === "space-around",
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
			...props
		},
		ref
	) => {
		Grid.displayName = "Grid";
		return (
			<div
				ref={ref}
				className={cn("grid", className, {
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
