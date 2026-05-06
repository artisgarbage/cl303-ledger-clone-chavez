/**
 * Pure financial projection utilities.
 *
 * All functions are framework-free and unit-testable.
 * Projections use linear regression on normalized monthly revenue,
 * with growth capped at ±5%/month to prevent explosive forecasts.
 */
import { format, getDaysInMonth, startOfMonth } from "date-fns";

// ─── Input / output types ────────────────────────────────────────────────────

export interface ProjectionInput {
  periodStart: Date;
  periodEnd: Date;
  totalRevenue: number;
  grossMargin: number; // decimal, e.g. 0.30 = 30%
  netMargin: number; // decimal
}

export interface ProjectionPoint {
  /** Short human-readable label, e.g. "May 26" */
  month: string;
  periodStart: Date;
  periodEnd: Date;
  /** Projected revenue (monthly equivalent) */
  revenue: number;
  /** Projected gross margin (decimal) */
  grossMargin: number;
  /** Projected net margin (decimal) */
  netMargin: number;
  /** Always true — used by charts to render differently */
  isProjected: true;
  /** Confidence 0–1: decreases the further out we project */
  confidence: number;
}

export interface ProRateResult {
  /** Revenue estimate for days elapsed so far this calendar month */
  estimatedMTD: number;
  /** Full-month revenue projection at current pace */
  projectedFullMonth: number;
  /** Calendar days elapsed in this month (including today) */
  daysElapsed: number;
  /** Total days in the current calendar month */
  daysInMonth: number;
  /** Average daily revenue from recent periods */
  dailyRate: number;
  /** Human-readable label, e.g. "May 2026" */
  monthName: string;
}

export interface EOYProjection {
  /** Sum of actual period revenues that overlap the fiscal year */
  ytdActual: number;
  /** Projected additional revenue for remaining periods in the year */
  projectedRemaining: number;
  /** ytdActual + projectedRemaining */
  total: number;
  /** How many months remain in the year */
  remainingMonths: number;
  /** The year being projected */
  year: number;
}

export interface LinearFit {
  slope: number;
  intercept: number;
  /** R² goodness-of-fit (0–1) */
  r2: number;
}

// ─── Math helpers ─────────────────────────────────────────────────────────────

/** Ordinary least-squares linear regression. x = period index (0, 1, 2, …). */
export function linearRegression(values: number[]): LinearFit {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0 };
  if (n === 1) return { slope: 0, intercept: values[0]!, r2: 1 };

  const xMean = (n - 1) / 2;
  const yMean = values.reduce((s, v) => s + v, 0) / n;

  let ssXY = 0,
    ssXX = 0,
    ssYY = 0;
  for (let i = 0; i < n; i++) {
    const dx = i - xMean;
    const dy = values[i]! - yMean;
    ssXY += dx * dy;
    ssXX += dx * dx;
    ssYY += dy * dy;
  }

  const slope = ssXX === 0 ? 0 : ssXY / ssXX;
  const intercept = yMean - slope * xMean;
  const r2 = ssYY === 0 ? 1 : Math.min(1, (ssXY * ssXY) / (ssXX * ssYY));

  return { slope, intercept, r2 };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Number of calendar days covered by a period (inclusive). */
function periodDays(p: ProjectionInput): number {
  return (
    Math.max(
      1,
      Math.round(
        (p.periodEnd.getTime() - p.periodStart.getTime()) / 86_400_000,
      ),
    ) + 1
  );
}

/** Convert a period's revenue to a monthly equivalent (30.44-day month). */
function monthlyRate(p: ProjectionInput): number {
  return (p.totalRevenue / periodDays(p)) * 30.44;
}

// ─── Projection builders ──────────────────────────────────────────────────────

/**
 * Projects `count` future calendar months using:
 *   – A weighted average of recent monthly revenue rates (exponential weighting)
 *   – A linear trend growth rate (capped at ±5%/month)
 *   – A smoothed margin trend (capped at ±1 pp/month)
 *
 * @param periods  Historical periods sorted ascending by date
 * @param count    Number of future months to project (default 6)
 */
export function buildProjections(
  periods: ProjectionInput[],
  count = 6,
): ProjectionPoint[] {
  if (periods.length === 0) return [];

  // ── Monthly-equivalent revenues ──────────────────────────────────────────
  const monthlyRates = periods.map(monthlyRate);

  // Exponentially weighted average (recent periods have more weight)
  const weights = monthlyRates.map((_, i) =>
    Math.pow(1.6, i - monthlyRates.length + 1),
  );
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const weightedBase =
    monthlyRates.reduce((s, r, i) => s + r * weights[i]!, 0) / totalWeight;

  // Linear trend growth rate, capped to ±5%/month
  const revReg = linearRegression(monthlyRates);
  const meanRev = monthlyRates.reduce((a, b) => a + b, 0) / monthlyRates.length;
  const monthlyGrowth =
    meanRev > 0 ? clamp(revReg.slope / meanRev, -0.05, 0.05) : 0;

  // ── Margin trends ─────────────────────────────────────────────────────────
  const recentSrc = periods.slice(-3);
  const avgGrossMargin =
    recentSrc.reduce((s, p) => s + p.grossMargin, 0) / recentSrc.length;
  const avgNetMargin =
    recentSrc.reduce((s, p) => s + p.netMargin, 0) / recentSrc.length;

  const marginReg = linearRegression(periods.map((p) => p.grossMargin));
  const netMarginReg = linearRegression(periods.map((p) => p.netMargin));
  // Slope capped at ±1 pp per projected period
  const mSlope = clamp(marginReg.slope, -0.01, 0.01);
  const nmSlope = clamp(netMarginReg.slope, -0.01, 0.01);

  // ── Build projected points ────────────────────────────────────────────────
  const last = periods[periods.length - 1]!;
  const result: ProjectionPoint[] = [];

  for (let i = 1; i <= count; i++) {
    const revenue = Math.max(0, weightedBase * Math.pow(1 + monthlyGrowth, i));
    const grossMargin = clamp(avgGrossMargin + mSlope * i, -0.5, 0.95);
    const netMargin = clamp(avgNetMargin + nmSlope * i, -0.5, 0.95);

    // Calendar-month boundaries
    const start = new Date(last.periodEnd);
    start.setDate(start.getDate() + 1);
    start.setMonth(start.getMonth() + (i - 1));
    // First day of the target month
    const cleanStart = new Date(start.getFullYear(), start.getMonth(), 1);
    const end = new Date(
      cleanStart.getFullYear(),
      cleanStart.getMonth() + 1,
      0,
    );

    // Confidence decreases with each future month (from 0.85 to 0.1)
    const confidence = clamp(0.85 - (i - 1) * 0.12, 0.1, 0.85);

    result.push({
      month: format(cleanStart, "MMM yy"),
      periodStart: cleanStart,
      periodEnd: end,
      revenue,
      grossMargin,
      netMargin,
      isProjected: true,
      confidence,
    });
  }

  return result;
}

// ─── Annualized Run Rate ──────────────────────────────────────────────────────

/**
 * Annualizes the most recent period's revenue.
 * Formula: (revenue / periodDays) × 365
 */
export function annualizedRunRate(period: ProjectionInput): number {
  const days = periodDays(period);
  return (period.totalRevenue / days) * 365;
}

// ─── Pro-rated current-month estimate ────────────────────────────────────────

/**
 * Estimates revenue for "today" within the current calendar month,
 * using a weighted-average daily rate from the most recent periods.
 *
 * Returns null if no periods are available.
 */
export function proRatedToDate(
  periods: ProjectionInput[],
  today: Date,
): ProRateResult | null {
  if (periods.length === 0) return null;

  const src = periods.slice(-3);
  const totalRev = src.reduce((s, p) => s + p.totalRevenue, 0);
  const totalDays = src.reduce((s, p) => s + periodDays(p), 0);
  const dailyRate = totalDays > 0 ? totalRev / totalDays : 0;

  const firstOfMonth = startOfMonth(today);
  const daysElapsed =
    Math.floor((today.getTime() - firstOfMonth.getTime()) / 86_400_000) + 1;
  const daysInMonth = getDaysInMonth(today);

  return {
    estimatedMTD: dailyRate * daysElapsed,
    projectedFullMonth: dailyRate * daysInMonth,
    daysElapsed,
    daysInMonth,
    dailyRate,
    monthName: format(today, "MMMM yyyy"),
  };
}

// ─── End-of-Year projection ───────────────────────────────────────────────────

/**
 * Projects full-year revenue for `year` by combining:
 *   – Actual YTD data for that year
 *   – Projected remaining months (via buildProjections)
 *
 * Returns null if no periods are available.
 */
export function projectedEOY(
  periods: ProjectionInput[],
  year: number,
): EOYProjection | null {
  if (periods.length === 0) return null;

  const yearPeriods = periods.filter(
    (p) =>
      new Date(p.periodStart).getFullYear() === year ||
      new Date(p.periodEnd).getFullYear() === year,
  );

  const ytdActual = yearPeriods.reduce((s, p) => s + p.totalRevenue, 0);

  const lastInYear = yearPeriods[yearPeriods.length - 1];
  if (!lastInYear) {
    // No data for this year yet — project all 12 months
    const allProj = buildProjections(periods, 12);
    const thisYearProj = allProj.filter(
      (p) => p.periodStart.getFullYear() === year,
    );
    const projected = thisYearProj.reduce((s, p) => s + p.revenue, 0);
    return {
      ytdActual: 0,
      projectedRemaining: projected,
      total: projected,
      remainingMonths: 12,
      year,
    };
  }

  const lastEnd = new Date(lastInYear.periodEnd);
  const remainingMonths = Math.max(0, 11 - lastEnd.getMonth());

  if (remainingMonths === 0) {
    return {
      ytdActual,
      projectedRemaining: 0,
      total: ytdActual,
      remainingMonths: 0,
      year,
    };
  }

  const proj = buildProjections(periods, remainingMonths);
  const projectedRemaining = proj.reduce((s, p) => s + p.revenue, 0);

  return {
    ytdActual,
    projectedRemaining,
    total: ytdActual + projectedRemaining,
    remainingMonths,
    year,
  };
}

// ─── Revenue velocity ─────────────────────────────────────────────────────────

export interface RevenueVelocity {
  /** Monthly revenue trend: positive = growing, negative = declining */
  monthlyDeltaAbs: number;
  /** Relative monthly change as a decimal (e.g. 0.03 = +3%/month) */
  monthlyDeltaPct: number | null;
  /** Direction label */
  direction: "growing" | "declining" | "flat";
}

/**
 * Computes the revenue velocity (trend slope) from the last `window` periods.
 */
export function revenueVelocity(
  periods: ProjectionInput[],
  window = 4,
): RevenueVelocity {
  const src = periods.slice(-window);
  const rates = src.map(monthlyRate);
  const reg = linearRegression(rates);
  const mean = rates.reduce((a, b) => a + b, 0) / (rates.length || 1);
  const pct = mean > 0 ? reg.slope / mean : null;

  return {
    monthlyDeltaAbs: reg.slope,
    monthlyDeltaPct: pct,
    direction:
      Math.abs(reg.slope) < mean * 0.01
        ? "flat"
        : reg.slope > 0
          ? "growing"
          : "declining",
  };
}
