/**
 * Pure chart-data builder for the financial dashboard.
 * Extracted from dashboard/page.tsx so it can be unit-tested independently.
 */
import { format } from "date-fns";
import type { ProjectionPoint } from "./projection";

export interface PeriodInput {
  periodId: string;
  periodStart: Date;
  periodEnd: Date;
  totalRevenue: number;
  grossMargin: number; // decimal
  netMargin: number; // decimal
}

export interface ChartPoint {
  month: string;
  revenue: number;
  /** Absolute $ change from the previous period (null for first point) */
  revenueDelta: number | null;
  /** % change from the previous period as a decimal (null for first or zero-prior) */
  revenueDeltaPct: number | null;
  /** Label of the prior period, used in tooltip (undefined for first point) */
  priorLabel: string | undefined;
  /**
   * Actual gross margin for actual periods; null for projected-only points.
   * The last actual point also sets grossMarginProjected so the chart line
   * connects smoothly into the dashed projection.
   */
  grossMargin: number | null;
  /** Absolute pp change in gross margin from prior period (null for first or projected) */
  grossMarginDelta: number | null;
  /** Projected gross margin — null for actual-only points except the bridge point. */
  grossMarginProjected: number | null;
  /** Actual net margin; null for projected-only points. */
  netMargin: number | null;
  /** Projected net margin — null for actual-only points except the bridge point. */
  netMarginProjected: number | null;
  /** True for projection points; false/undefined for actuals. */
  isProjected?: boolean;
  /** Confidence level 0–1 for projection points. */
  confidence?: number;
}

/**
 * Generates a human-readable label for a period:
 *   - Full calendar year   →  "2024"
 *   - Within same year     →  "Jan–Apr 26"
 *   - Cross-year range     →  "Dec 24–Mar 25"
 */
export function periodLabel(p: { periodStart: Date; periodEnd: Date }): string {
  const startMonth = format(p.periodStart, "MM");
  const endMonth = format(p.periodEnd, "MM");
  const startYear = format(p.periodStart, "yyyy");
  const endYear = format(p.periodEnd, "yyyy");
  const isFullYear =
    startMonth === "01" && endMonth === "12" && startYear === endYear;

  if (isFullYear) return startYear;
  if (startYear === endYear) {
    return `${format(p.periodStart, "MMM")}–${format(p.periodEnd, "MMM yy")}`;
  }
  return `${format(p.periodStart, "MMM yy")}–${format(p.periodEnd, "MMM yy")}`;
}

/**
 * Builds chart data points from an array of periods (sorted ascending by date).
 * Optionally appends projected future points.
 *
 * The last actual point acts as a "bridge" — it sets both grossMargin (actual)
 * and grossMarginProjected (same value) so the dashed projected line visually
 * connects from the end of the solid actual line.
 */
export function buildChartPoints(
  periods: PeriodInput[],
  projections?: ProjectionPoint[],
): ChartPoint[] {
  const hasProjections = (projections ?? []).length > 0;

  const actuals: ChartPoint[] = periods.map((p, i) => {
    const prev = i > 0 ? periods[i - 1] : null;
    const revDelta = prev !== null ? p.totalRevenue - prev.totalRevenue : null;
    const revDeltaPct =
      prev !== null && prev.totalRevenue !== 0
        ? (p.totalRevenue - prev.totalRevenue) / Math.abs(prev.totalRevenue)
        : null;
    const marginDelta = prev !== null ? p.grossMargin - prev.grossMargin : null;
    const isLast = i === periods.length - 1;

    return {
      month: periodLabel(p),
      revenue: p.totalRevenue,
      revenueDelta: revDelta,
      revenueDeltaPct: revDeltaPct,
      priorLabel: prev !== null ? periodLabel(prev) : undefined,
      grossMargin: p.grossMargin,
      grossMarginDelta: marginDelta,
      // Bridge to projected line at the last actual point
      grossMarginProjected: isLast && hasProjections ? p.grossMargin : null,
      netMargin: p.netMargin,
      netMarginProjected: isLast && hasProjections ? p.netMargin : null,
      isProjected: false,
    };
  });

  const projPoints: ChartPoint[] = (projections ?? []).map((proj) => ({
    month: proj.month,
    revenue: proj.revenue,
    revenueDelta: null,
    revenueDeltaPct: null,
    priorLabel: undefined,
    grossMargin: null,
    grossMarginDelta: null,
    grossMarginProjected: proj.grossMargin,
    netMargin: null,
    netMarginProjected: proj.netMargin,
    isProjected: true,
    confidence: proj.confidence,
  }));

  return [...actuals, ...projPoints];
}
