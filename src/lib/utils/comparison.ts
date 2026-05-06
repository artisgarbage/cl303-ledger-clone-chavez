/**
 * Pure, framework-free functions for period comparison calculations.
 * These are extracted from DashboardClient so they can be unit-tested
 * without rendering any React components.
 */

// Minimal shape required by the comparison logic — matches PeriodSummary.
export interface PeriodData {
  periodId: string;
  periodStart: Date;
  periodEnd: Date;
  totalRevenue: number;
  grossProfit: number;
  grossMargin: number; // decimal, e.g. 0.167 = 16.7%
  netIncome: number;
  netMargin: number; // decimal
  totalOpEx: number;
}

export type CompareMode = "none" | "prior_period" | "mom" | "qoq" | "yoy";

export const COMPARE_MODE_LABELS: Record<CompareMode, string> = {
  none: "None",
  prior_period: "Prior Period",
  mom: "MoM",
  qoq: "QoQ",
  yoy: "YoY",
};

/** Offset in calendar months for each time-based compare mode. */
const COMPARE_MODE_MONTHS: Partial<Record<CompareMode, number>> = {
  mom: 1,
  qoq: 3,
  yoy: 12,
};

/**
 * Percentage change from `prior` to `current`.
 *
 * Uses Math.abs(prior) in the denominator so that negative-to-positive
 * transitions (e.g. net income swinging from loss to profit) produce an
 * intuitively positive delta.
 *
 * Returns `null` when `prior === 0` (growth rate is undefined).
 */
export function pctDelta(current: number, prior: number): number | null {
  if (prior === 0) return null;
  return (current - prior) / Math.abs(prior);
}

/**
 * Selects the comparison period from `allPeriods` based on `compareMode`.
 *
 * | Mode          | Selection                                                     |
 * |---------------|---------------------------------------------------------------|
 * | none          | null — no comparison                                         |
 * | prior_period  | the period immediately before `currentPeriod` (by index)     |
 * | mom / qoq / yoy | the period whose `periodStart` is closest to               |
 * |               | (currentPeriod.periodStart − N months)                       |
 *
 * `allPeriods` must be sorted chronologically (ascending `periodStart`).
 */
export function selectComparedPeriod<T extends PeriodData>(
  allPeriods: T[],
  currentPeriod: T | null,
  compareMode: CompareMode,
  fallbackPrior?: T | null,
): T | null {
  if (compareMode === "none" || !currentPeriod || allPeriods.length < 2) {
    return null;
  }

  if (compareMode === "prior_period") {
    const idx = allPeriods.findIndex(
      (p) => p.periodId === currentPeriod.periodId,
    );
    if (idx > 0) return allPeriods[idx - 1] ?? null;
    // currentPeriod not found in list, or it is the first element
    return fallbackPrior ?? null;
  }

  const months = COMPARE_MODE_MONTHS[compareMode];
  if (months === undefined) return null; // unknown mode

  const targetStart = new Date(currentPeriod.periodStart);
  targetStart.setMonth(targetStart.getMonth() - months);

  const others = allPeriods.filter(
    (p) => p.periodId !== currentPeriod.periodId,
  );

  return (
    others.reduce<T | null>((best, p) => {
      const diff = Math.abs(
        new Date(p.periodStart).getTime() - targetStart.getTime(),
      );
      const bestDiff = best
        ? Math.abs(new Date(best.periodStart).getTime() - targetStart.getTime())
        : Infinity;
      return diff < bestDiff ? p : best;
    }, null) ?? null
  );
}

export interface PeriodDeltas {
  /** % change in revenue (decimal, null when prior = 0) */
  revDelta: number | null;
  /** % change in gross profit (decimal, null when prior = 0) */
  grossProfitDelta: number | null;
  /** Absolute percentage-point change in gross margin (e.g. +0.05 = +5 pp) */
  marginDelta: number | null;
  /** % change in net income (decimal, null when prior = 0) */
  netDelta: number | null;
  /** Absolute percentage-point change in net margin */
  netMarginDelta: number | null;
}

/**
 * Computes all deltas between `current` and `compared` periods.
 * Returns all-null when `compared` is null (no comparison selected).
 */
export function computePeriodDeltas<T extends PeriodData>(
  current: T,
  compared: T | null,
): PeriodDeltas {
  if (!compared) {
    return {
      revDelta: null,
      grossProfitDelta: null,
      marginDelta: null,
      netDelta: null,
      netMarginDelta: null,
    };
  }
  return {
    revDelta: pctDelta(current.totalRevenue, compared.totalRevenue),
    grossProfitDelta: pctDelta(current.grossProfit, compared.grossProfit),
    marginDelta: current.grossMargin - compared.grossMargin,
    netDelta: pctDelta(current.netIncome, compared.netIncome),
    netMarginDelta: current.netMargin - compared.netMargin,
  };
}
