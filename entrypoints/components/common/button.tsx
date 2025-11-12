import { XIcon } from "@phosphor-icons/react";
import { forwardRef } from "react";
import { cn } from "~/lib/utils";

type ButtonProps = {
	color?: "orange" | "white" | "black";
	fill?: "solid" | "outline" | "none";
	size?: "icon" | "small" | "med" | "large";
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const styleMap: Record<
	NonNullable<ButtonProps["color"]>,
	Record<NonNullable<ButtonProps["fill"]>, string>
> = {
	orange: {
		solid: "bg-dap-primary text-white border-transparent",
		outline: "bg-transparent text-dap-primary border-dap-primary",
		none: "bg-transparent text-dap-primary border-transparent",
	},
	white: {
		solid: "bg-white text-black border-transparent",
		outline: "bg-transparent text-white border-white",
		none: "bg-transparent text-white border-transparent",
	},
	black: {
		solid: "bg-gray-800 text-white border-transparent",
		outline: "bg-transparent text-gray-800 border-gray-800",
		none: "bg-transparent text-gray-800 border-transparent",
	},
};

const sizeMap: Record<NonNullable<ButtonProps["size"]>, string> = {
	icon: "w-8 h-8 p-0",
	small: "px-2 py-1 text-sm",
	med: "px-4 py-2 text-base",
	large: "px-6 py-3 text-lg",
};
const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
	const {
		color = "orange",
		fill = "solid",
		size = null,
		className,
		...rest
	} = props;

	return (
		<button
			ref={ref}
			className={cn(
				"px-4 py-2 rounded-lg whitespace-nowrap w-fit flex flex-row items-center justify-center gap-2 border hover:opacity-80 cursor-pointer transition-all duration-300",
				styleMap[color][fill],
				size && sizeMap[size],
				className
			)}
			{...rest}
		>
			{rest.children}
		</button>
	);
});

export const CloseButton = forwardRef<HTMLButtonElement, ButtonProps>(
	(props, ref) => {
		const { color = "white", fill = "none", className, ...rest } = props;

		return (
			<Button
				ref={ref}
				className={cn("w-8 h-8 p-0", className)}
				color={color}
				fill={fill}
				{...rest}
			>
				<XIcon size={24} />
			</Button>
		);
	}
);

export const IconButton = forwardRef<
	HTMLButtonElement,
	Omit<ButtonProps, "children"> & { icon: React.ReactNode; label?: string }
>((props, ref) => {
	return (
		<Button ref={ref} {...props}>
			{props.icon}
			{props.label && <span className="text-sm">{props.label}</span>}
		</Button>
	);
});

export default Button;
