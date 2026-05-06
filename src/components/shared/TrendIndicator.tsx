"use client";

import { cn } from "@/lib/utils/cn";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TrendIndicatorProps {
  value: number; // as decimal e.g. 0.15 for +15%
  size?: "sm" | "md";
  invert?: boolean; // for costs, positive delta is bad
  className?: string;
}

export function TrendIndicator({
  value,
  size = "sm",
  invert = false,
  className,
}: TrendIndicatorProps) {
  const pct = value * 100;
  const isPositive = invert ? value < 0 : value > 0;
  const isNegative = invert ? value > 0 : value < 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-mono tabular-nums",
        size === "sm" ? "text-xs" : "text-sm",
        isPositive
          ? "text-[var(--accent-green)]"
          : isNegative
            ? "text-[var(--accent-red)]"
            : "text-[var(--muted)]",
        className,
      )}
    >
      {isPositive ? (
        <TrendingUp
          className={cn("inline", size === "sm" ? "h-3 w-3" : "h-4 w-4")}
        />
      ) : isNegative ? (
        <TrendingDown
          className={cn("inline", size === "sm" ? "h-3 w-3" : "h-4 w-4")}
        />
      ) : (
        <Minus
          className={cn("inline", size === "sm" ? "h-3 w-3" : "h-4 w-4")}
        />
      )}
      {value > 0 ? "+" : ""}
      {pct.toFixed(1)}%
    </span>
  );
}
