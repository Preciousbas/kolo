import Image from "next/image";
import { cn } from "cn";

const SRC = {
  lockup: "/brand/kolo_lockup_light.svg",
  mark: "/brand/kolo_mark.svg",
} as const;

export function KoloLogo({
  variant,
  className,
  priority,
}: {
  variant: "lockup" | "mark";
  className?: string;
  priority?: boolean;
}) {
  const lockup = variant === "lockup";
  return (
    <Image
      src={SRC[variant]}
      alt="Kolo"
      width={lockup ? 160 : 32}
      height={lockup ? 40 : 32}
      className={cn(lockup ? "h-8 w-auto" : "h-8 w-8", className)}
      priority={priority}
    />
  );
}
