import { forwardRef } from "react";
import { cn } from "../../../lib/utils";

export const Title = forwardRef<
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

export const Subtitle = forwardRef<
  HTMLParagraphElement,
  { text: string } & Omit<
    React.HTMLAttributes<HTMLParagraphElement>,
    "children"
  >
>(({ text, className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn("text-gray-700 font-bold", className)}
      {...props}
    >
      {text}
    </p>
  );
});
Subtitle.displayName = "Subtitle";

export default Title;
