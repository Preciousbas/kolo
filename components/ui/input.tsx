import { forwardRef, type ComponentProps } from "react";
import { cn } from "cn";

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-xl border-2 border-border bg-card px-4 text-body font-semibold outline-none focus-visible:border-ring",
        className,
      )}
      {...props}
    />
  );
});
