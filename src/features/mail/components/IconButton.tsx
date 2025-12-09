// src/features/mail/components/IconButton.tsx
import type { ReactNode } from "react";

/**
 * Small helper for icon buttons so spacing/hover are consistent.
 */
export type IconButtonProps = {
  children: ReactNode;
  label: string;
  className?: string;
};

export function IconButton({ children, label, className }: IconButtonProps) {
  return (
    <button
      type="button"
      className={
        "flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-[#f1f3f4]" +
        (className ? ` ${className}` : "")
      }
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
