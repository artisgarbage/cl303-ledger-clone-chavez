"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { getPeriodRange, type PeriodPreset } from "@/lib/utils/dates";
import { AccountingBasis } from "@prisma/client";
import { ChevronDown, RefreshCw } from "lucide-react";

const PRESETS: Array<{ value: PeriodPreset; label: string }> = [
  { value: "current_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "current_quarter", label: "This Quarter" },
  { value: "last_quarter", label: "Last Quarter" },
  { value: "ytd", label: "Year to Date" },
  { value: "trailing_12", label: "Trailing 12M" },
  { value: "last_year", label: "Last Year" },
];

interface PeriodSelectorProps {
  preset: PeriodPreset;
  basis: AccountingBasis;
  onPresetChange: (preset: PeriodPreset) => void;
  onBasisChange: (basis: AccountingBasis) => void;
  lastUpdated?: Date | null;
}

export function PeriodSelector({
  preset,
  basis,
  onPresetChange,
  onBasisChange,
  lastUpdated,
}: PeriodSelectorProps) {
  const [open, setOpen] = useState(false);
  const range = getPeriodRange(preset);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Period picker */}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-sm hover:border-[var(--accent-blue)] transition-colors"
        >
          <span className="text-[var(--foreground)]">{range.label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-[var(--muted)]" />
        </button>
        {open && (
          <div className="absolute top-full mt-1 left-0 z-50 rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-xl min-w-44">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => {
                  onPresetChange(p.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-2)] transition-colors",
                  preset === p.value && "text-[var(--accent-blue)]",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Basis toggle */}
      <div className="flex rounded-md border border-[var(--border)] overflow-hidden">
        {(["CASH", "ACCRUAL"] as AccountingBasis[]).map((b) => (
          <button
            key={b}
            onClick={() => onBasisChange(b)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-colors",
              basis === b
                ? "bg-[var(--accent-blue)] text-white"
                : "text-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            {b}
          </button>
        ))}
      </div>

      {/* Last updated */}
      {lastUpdated && (
        <span className="text-xs text-[var(--muted)]">
          Updated {lastUpdated.toLocaleDateString()}
        </span>
      )}
    </div>
  );
}
