// src/features/mail/components/IconButton.tsx
"use client";

import type { ReactNode } from "react";

type IconButtonProps = {
  label: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
};

export function IconButton({
  label,
  children,
  className,
  onClick,
}: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-[#f1f3f4] ${
        className ?? ""
      }`}
    >
      {children}
    </button>
  );
}
