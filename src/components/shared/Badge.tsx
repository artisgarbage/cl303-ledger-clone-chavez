"use client";

import { cn } from "@/lib/utils/cn";

interface BadgeProps {
  variant?:
    | "fund"
    | "frontier"
    | "active"
    | "completed"
    | "paused"
    | "lost"
    | "amber"
    | "red"
    | "green"
    | "default";
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  variant = "default",
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
        variant === "fund" && "bg-blue-500/20 text-blue-400",
        variant === "frontier" && "bg-purple-500/20 text-purple-400",
        variant === "active" &&
          "bg-[var(--accent-green)]/20 text-[var(--accent-green)]",
        variant === "completed" && "bg-[var(--muted)]/20 text-[var(--muted)]",
        variant === "paused" &&
          "bg-[var(--accent-amber)]/20 text-[var(--accent-amber)]",
        variant === "lost" &&
          "bg-[var(--accent-red)]/20 text-[var(--accent-red)]",
        variant === "amber" &&
          "bg-[var(--accent-amber)]/20 text-[var(--accent-amber)]",
        variant === "red" &&
          "bg-[var(--accent-red)]/20 text-[var(--accent-red)]",
        variant === "green" &&
          "bg-[var(--accent-green)]/20 text-[var(--accent-green)]",
        variant === "default" && "bg-[var(--surface-2)] text-[var(--muted)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
