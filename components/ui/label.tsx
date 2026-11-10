import type { ComponentProps } from "react";
import { cn } from "cn";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-small font-bold", className)} {...props} />;
}
