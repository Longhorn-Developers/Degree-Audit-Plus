import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const Title = forwardRef<
  HTMLParagraphElement,
  { text: string } & Omit<
    React.HTMLAttributes<HTMLParagraphElement>,
    "children"
  >
>(({ text, className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn("text-3xl font-bold w-full my-6", className)}
      {...props}
    >
      {text}
    </p>
  );
});
Title.displayName = "Title";

export default Title;
