"use client";

import type { ReactNode } from "react";

export function KoloSheet({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-foreground/55"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="kolo-sheet-title"
        className="relative z-10 w-full max-w-xl rounded-t-[28px] bg-card px-5 pb-8 pt-3 shadow-lg"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />
        <div className="mb-3 flex items-center justify-between">
          <h2 id="kolo-sheet-title" className="text-h2 font-bold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-full bg-secondary"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
