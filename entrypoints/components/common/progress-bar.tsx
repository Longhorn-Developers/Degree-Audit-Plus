import { Progress } from "@/lib/general-types";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

const ProgressBar = forwardRef<
	HTMLDivElement,
	Progress & React.HTMLAttributes<HTMLDivElement>
>((props, ref) => {
	const { current, total, className, ...rest } = props;
	return (
		<div
			ref={ref}
			className={cn("w-full h-2 bg-gray-200 rounded-full", className)}
			{...rest}
		>
			<div
				className="h-full bg-blue-500 rounded-full"
				style={{ width: `${(current / total) * 100}%` }}
			></div>
		</div>
	);
});

type Value = {
	ammount: number;
	className?: string;
};

type MultiProgress = {
	total: number;
	values: Value[];
};

export const MultiValueProgressBar = forwardRef<
	HTMLDivElement,
	MultiProgress & React.HTMLAttributes<HTMLDivElement>
>((props, ref) => {
	const { values, total, className, ...rest } = props;
	const sortedValues = [...values].sort((a, b) => b.ammount - a.ammount);

	return (
		<div
			ref={ref}
			className={cn("w-full h-2 bg-gray-200 rounded-full relative", className)}
			{...rest}
		>
			{sortedValues.map((value, index) => {
				// Smallest bar gets highest z-index (last in sorted array)
				return (
					<div
						key={index}
						className={cn(
							"h-full rounded-full absolute left-0 top-0",
							value.className
						)}
						style={{
							width: `${(value.ammount / total) * 100}%`,
						}}
					></div>
				);
			})}
		</div>
	);
});

export default ProgressBar;
