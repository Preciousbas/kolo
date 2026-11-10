import type { ComponentProps, ReactNode } from "react";

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`rounded-xl border border-zinc-300 bg-zinc-50 text-zinc-900 ${className}`}
      {...props}
    />
  );
}

export function CardHeader({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`flex flex-col gap-1 p-6 ${className}`} {...props} />;
}

export function CardTitle({ className = "", ...props }: ComponentProps<"h1">) {
  return <h1 className={`text-2xl font-semibold tracking-tight ${className}`} {...props} />;
}

export function CardContent({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`flex flex-col gap-4 px-6 pb-6 ${className}`} {...props} />;
}

export function Button({ className = "", ...props }: ComponentProps<"button">) {
  return (
    <button
      className={`inline-flex items-center rounded-md border border-zinc-400 bg-zinc-800 px-3 py-2 text-sm text-zinc-50 transition-transform hover:scale-95 ${className}`}
      {...props}
    />
  );
}

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return (
    <input
      className={`rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm ${className}`}
      {...props}
    />
  );
}

export function Badge({
  className = "",
  children,
}: {
  className?: string;
  variant?: string;
  children: ReactNode;
}) {
  return (
    <span className={`inline-flex rounded-full border border-zinc-300 px-2 py-0.5 text-xs ${className}`}>
      {children}
    </span>
  );
}
