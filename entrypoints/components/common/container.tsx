import { forwardRef } from "react";
import { cn } from "~/lib/utils";

const Container = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const { children, className, ...rest } = props;
  return (
    <div
      ref={ref}
      className={cn(
        "w-full h-full p-4 border-2 border-gray-700 rounded-md",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});

export default Container;
