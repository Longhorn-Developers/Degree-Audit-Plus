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
        className,
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
  },
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

type ToggleSwitchProps = {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: "small" | "medium" | "large";
  className?: string;
};

export const ToggleSwitch = forwardRef<HTMLButtonElement, ToggleSwitchProps>(
  (props, ref) => {
    const {
      checked = false,
      onChange,
      disabled = false,
      size = "medium",
      className,
    } = props;

    const sizeClasses = {
      small: {
        track: "w-9 h-5",
        thumb: "w-4 h-4",
        translate: checked ? "translate-x-4" : "translate-x-0.5",
      },
      medium: {
        track: "w-11 h-6",
        thumb: "w-5 h-5",
        translate: checked ? "translate-x-5" : "translate-x-0.5",
      },
      large: {
        track: "w-14 h-7",
        thumb: "w-6 h-6",
        translate: checked ? "translate-x-7" : "translate-x-0.5",
      },
    };

    const currentSize = sizeClasses[size];

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          "relative inline-flex items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-dap-primary",
          checked ? "bg-dap-primary" : "bg-gray-300 dark:bg-gray-600",
          disabled && "opacity-50 cursor-not-allowed",
          currentSize.track,
          className,
        )}
      >
        <span
          className={cn(
            "inline-block rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out",
            currentSize.thumb,
            currentSize.translate,
          )}
        />
      </button>
    );
  },
);

ToggleSwitch.displayName = "ToggleSwitch";

export default Button;
