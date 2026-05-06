"use client";

import { cn } from "@/lib/utils/cn";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils/currency";

interface StatTileProps {
  label: string;
  value: number;
  format?: "currency" | "percent" | "number";
  delta?: number | null;
  deltaLabel?: string;
  size?: "sm" | "md" | "lg";
  highlight?: "positive" | "negative" | "neutral";
  className?: string;
}

export function StatTile({
  label,
  value,
  format = "currency",
  delta,
  deltaLabel,
  size = "md",
  highlight,
  className,
}: StatTileProps) {
  const formatted =
    format === "currency"
      ? formatCurrency(value)
      : format === "percent"
        ? formatPercent(value)
        : value.toLocaleString();

  const deltaPct = delta !== null && delta !== undefined ? delta * 100 : null;
  const deltaPositive = deltaPct !== null && deltaPct > 0;
  const deltaNegative = deltaPct !== null && deltaPct < 0;

  const accentColor =
    highlight === "positive"
      ? "var(--accent-green)"
      : highlight === "negative"
        ? "var(--accent-red)"
        : null;

  return (
    <div
      className={cn(
        "relative rounded-xl border overflow-hidden",
        "bg-[var(--surface)] transition-all",
        highlight === "positive" && "border-[var(--accent-green)]/25",
        highlight === "negative" && "border-[var(--accent-red)]/25",
        highlight === "neutral" && "border-[var(--border)]",
        !highlight && "border-[var(--border)]",
        className,
      )}
    >
      {/* Top accent line */}
      {accentColor && (
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${accentColor} 50%, transparent 100%)`,
            opacity: 0.6,
          }}
        />
      )}

      {/* Subtle glow behind value on highlight */}
      {accentColor && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 30% 40%, ${accentColor}08 0%, transparent 70%)`,
          }}
        />
      )}

      <div className="relative p-4">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: "var(--muted)" }}
        >
          {label}
        </p>
        <p
          className={cn(
            "tabular-nums font-mono font-semibold mt-1.5 leading-none",
            size === "sm" ? "text-xl" : size === "lg" ? "text-4xl" : "text-2xl",
          )}
          style={{
            color: accentColor ?? "var(--foreground)",
          }}
        >
          {formatted}
        </p>
        {deltaPct !== null && (
          <div className="flex items-center gap-1 mt-2.5">
            {deltaPositive ? (
              <TrendingUp
                className="h-3 w-3"
                style={{ color: "var(--accent-green)" }}
              />
            ) : deltaNegative ? (
              <TrendingDown
                className="h-3 w-3"
                style={{ color: "var(--accent-red)" }}
              />
            ) : (
              <Minus className="h-3 w-3" style={{ color: "var(--muted)" }} />
            )}
            <span
              className="text-xs tabular-nums font-medium"
              style={{
                color: deltaPositive
                  ? "var(--accent-green)"
                  : deltaNegative
                    ? "var(--accent-red)"
                    : "var(--muted)",
              }}
            >
              {deltaPositive ? "+" : ""}
              {deltaPct.toFixed(1)}%{deltaLabel ? ` ${deltaLabel}` : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
