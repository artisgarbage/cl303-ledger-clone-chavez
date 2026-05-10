import {
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subMonths,
  subYears,
  format,
  parseISO,
  isValid,
} from "date-fns";

export type PeriodPreset =
  | "current_month"
  | "current_quarter"
  | "ytd"
  | "trailing_12"
  | "last_month"
  | "last_quarter"
  | "last_year"
  | "custom";

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export function getPeriodRange(
  preset: PeriodPreset,
  customStart?: Date,
  customEnd?: Date,
): DateRange {
  const now = new Date();

  switch (preset) {
    case "current_month":
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
        label: format(now, "MMMM yyyy"),
      };
    case "current_quarter":
      return {
        start: startOfQuarter(now),
        end: endOfQuarter(now),
        label: `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`,
      };
    case "ytd":
      return {
        start: startOfYear(now),
        end: now,
        label: `YTD ${now.getFullYear()}`,
      };
    case "trailing_12":
      return {
        start: startOfMonth(subMonths(now, 11)),
        end: endOfMonth(now),
        label: "Trailing 12 Months",
      };
    case "last_month": {
      const lm = subMonths(now, 1);
      return {
        start: startOfMonth(lm),
        end: endOfMonth(lm),
        label: format(lm, "MMMM yyyy"),
      };
    }
    case "last_quarter": {
      const lq = subMonths(now, 3);
      return {
        start: startOfQuarter(lq),
        end: endOfQuarter(lq),
        label: `Q${Math.ceil((lq.getMonth() + 1) / 3)} ${lq.getFullYear()}`,
      };
    }
    case "last_year": {
      const ly = subYears(now, 1);
      return {
        start: startOfYear(ly),
        end: endOfYear(ly),
        label: `${ly.getFullYear()}`,
      };
    }
    case "custom": {
      if (!customStart || !customEnd) {
        return {
          start: now,
          end: now,
          label: "Custom Range",
        };
      }
      return {
        start: customStart,
        end: customEnd,
        label: formatPeriodLabel(customStart, customEnd),
      };
    }
  }
}

export function formatPeriodLabel(start: Date, end: Date): string {
  const startFmt = format(start, "MMM d, yyyy");
  const endFmt = format(end, "MMM d, yyyy");
  if (startFmt === endFmt) return startFmt;
  return `${startFmt} – ${endFmt}`;
}

export function parseMonthKey(monthKey: string): Date {
  return parseISO(`${monthKey}-01`);
}

export function toMonthKey(date: Date): string {
  return format(date, "yyyy-MM");
}

export function getDataAgeWarning(
  updatedAt: Date | null,
): "none" | "amber" | "red" {
  if (!updatedAt) return "red";
  const daysSince = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince > 30) return "red";
  if (daysSince > 7) return "amber";
  return "none";
}

/**
 * Returns a human-readable label for a period based on its date range and
 * narrative type. Handles five patterns:
 *   1. Full year  (Jan 1 – Dec 31, same year)
 *   2. Quarter    (when type === QUARTERLY_REVIEW)
 *   3. Single month (same month & year)
 *   4. YTD       (starts Jan 1)
 *   5. Fallback  (formatted date range)
 */
export function getRelativePeriodLabel(
  start: Date,
  end: Date,
  type: string,
): string {
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  // Full year
  if (
    start.getMonth() === 0 &&
    start.getDate() === 1 &&
    end.getMonth() === 11 &&
    end.getDate() === 31 &&
    startYear === endYear
  ) {
    return `Full Year ${startYear}`;
  }

  // Quarter
  if (type === "QUARTERLY_REVIEW") {
    const quarter = Math.ceil((start.getMonth() + 1) / 3);
    return `Q${quarter} ${startYear}`;
  }

  // Single month
  if (start.getMonth() === end.getMonth() && startYear === endYear) {
    return format(start, "MMMM yyyy");
  }

  // YTD
  if (start.getMonth() === 0 && start.getDate() === 1) {
    return `${format(end, "MMMM yyyy")} YTD`;
  }

  // Fallback to formatted range
  return formatPeriodLabel(start, end);
}

export {
  format,
  parseISO,
  isValid,
  startOfMonth,
  endOfMonth,
  subMonths,
  subYears,
};
