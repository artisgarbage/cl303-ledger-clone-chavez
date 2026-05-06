import { describe, it, expect } from "vitest";
import { periodLabel, buildChartPoints, type PeriodInput } from "./chart-data";

// Parse date strings as LOCAL time (avoids UTC-midnight → prior day in PDT/PST)
function D(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// ─── Test factories ───────────────────────────────────────────────────────────

function makePeriod(
  id: string,
  start: string,
  end: string,
  revenue = 100_000,
  grossMargin = 0.3,
  netMargin = 0.1,
): PeriodInput {
  return {
    periodId: id,
    periodStart: D(start),
    periodEnd: D(end),
    totalRevenue: revenue,
    grossMargin,
    netMargin,
  };
}

// ─── periodLabel ──────────────────────────────────────────────────────────────

describe("periodLabel", () => {
  it("full calendar year → year string", () => {
    const p = makePeriod("x", "2024-01-01", "2024-12-31");
    expect(periodLabel(p)).toBe("2024");
  });

  it("full calendar year 2025", () => {
    const p = makePeriod("x", "2025-01-01", "2025-12-31");
    expect(periodLabel(p)).toBe("2025");
  });

  it("partial year (same year) → MMM–MMM yy", () => {
    const p = makePeriod("x", "2026-01-01", "2026-04-30");
    expect(periodLabel(p)).toBe("Jan–Apr 26");
  });

  it("single month within year", () => {
    const p = makePeriod("x", "2025-06-01", "2025-06-30");
    expect(periodLabel(p)).toBe("Jun–Jun 25");
  });

  it("cross-year range → MMM yy–MMM yy", () => {
    const p = makePeriod("x", "2024-10-01", "2025-03-31");
    expect(periodLabel(p)).toBe("Oct 24–Mar 25");
  });

  it("cross-year Dec to Jan", () => {
    const p = makePeriod("x", "2024-12-01", "2025-01-31");
    expect(periodLabel(p)).toBe("Dec 24–Jan 25");
  });

  it("partial year ending in December is NOT treated as full year", () => {
    // Jan is month "01" but Dec is month "12" — start month must be "01" too
    const p = makePeriod("x", "2025-06-01", "2025-12-31");
    expect(periodLabel(p)).toBe("Jun–Dec 25");
    expect(periodLabel(p)).not.toBe("2025");
  });

  it("start month 01 end month 12 but different years is cross-year", () => {
    const p = makePeriod("x", "2024-01-01", "2025-12-31");
    expect(periodLabel(p)).toBe("Jan 24–Dec 25");
  });
});

// ─── buildChartPoints ─────────────────────────────────────────────────────────

describe("buildChartPoints", () => {
  it("empty array returns empty array", () => {
    expect(buildChartPoints([])).toEqual([]);
  });

  it("single period has no deltas and no priorLabel", () => {
    const p2024 = makePeriod(
      "p2024",
      "2024-01-01",
      "2024-12-31",
      1_000_000,
      0.3,
      0.1,
    );
    const [point] = buildChartPoints([p2024]);
    expect(point.revenueDelta).toBeNull();
    expect(point.revenueDeltaPct).toBeNull();
    expect(point.grossMarginDelta).toBeNull();
    expect(point.priorLabel).toBeUndefined();
  });

  it("single period has correct revenue and margins", () => {
    const p = makePeriod("p1", "2024-01-01", "2024-12-31", 500_000, 0.25, 0.05);
    const [point] = buildChartPoints([p]);
    expect(point.revenue).toBe(500_000);
    expect(point.grossMargin).toBe(0.25);
    expect(point.netMargin).toBe(0.05);
  });

  it("second period gets delta vs first", () => {
    const p1 = makePeriod(
      "p1",
      "2024-01-01",
      "2024-12-31",
      1_000_000,
      0.3,
      0.1,
    );
    const p2 = makePeriod(
      "p2",
      "2025-01-01",
      "2025-12-31",
      1_200_000,
      0.32,
      0.12,
    );
    const [, point2] = buildChartPoints([p1, p2]);
    expect(point2.revenueDelta).toBe(200_000);
    expect(point2.revenueDeltaPct).toBeCloseTo(0.2);
    expect(point2.grossMarginDelta).toBeCloseTo(0.02);
    expect(point2.priorLabel).toBe("2024");
  });

  it("revenue decline gives negative deltas", () => {
    const p1 = makePeriod(
      "p1",
      "2024-01-01",
      "2024-12-31",
      1_000_000,
      0.3,
      0.1,
    );
    const p2 = makePeriod(
      "p2",
      "2025-01-01",
      "2025-12-31",
      800_000,
      0.28,
      0.05,
    );
    const [, point2] = buildChartPoints([p1, p2]);
    expect(point2.revenueDelta).toBe(-200_000);
    expect(point2.revenueDeltaPct).toBeCloseTo(-0.2);
    expect(point2.grossMarginDelta).toBeCloseTo(-0.02);
  });

  it("revenueDeltaPct is null when prior revenue is zero", () => {
    const p1 = makePeriod("p1", "2024-01-01", "2024-12-31", 0, 0.0, 0.0);
    const p2 = makePeriod("p2", "2025-01-01", "2025-12-31", 500_000, 0.2, 0.05);
    const [, point2] = buildChartPoints([p1, p2]);
    expect(point2.revenueDelta).toBe(500_000); // absolute delta is still valid
    expect(point2.revenueDeltaPct).toBeNull(); // pct is undefined (div by zero)
  });

  it("each subsequent point references only its immediate predecessor", () => {
    const p1 = makePeriod(
      "p1",
      "2023-01-01",
      "2023-12-31",
      900_000,
      0.28,
      0.08,
    );
    const p2 = makePeriod(
      "p2",
      "2024-01-01",
      "2024-12-31",
      1_200_000,
      0.31,
      0.11,
    );
    const p3 = makePeriod(
      "p3",
      "2025-01-01",
      "2025-12-31",
      1_000_000,
      0.29,
      0.09,
    );
    const [point1, point2, point3] = buildChartPoints([p1, p2, p3]);

    // Point 1: no prior
    expect(point1.priorLabel).toBeUndefined();

    // Point 2: prior is p1
    expect(point2.revenueDelta).toBe(300_000);
    expect(point2.priorLabel).toBe("2023");

    // Point 3: prior is p2, NOT p1
    expect(point3.revenueDelta).toBe(-200_000);
    expect(point3.priorLabel).toBe("2024");
  });

  it("produces correct labels", () => {
    const p1 = makePeriod("p1", "2024-01-01", "2024-12-31");
    const p2 = makePeriod("p2", "2025-01-01", "2025-12-31");
    const p3 = makePeriod("p3", "2026-01-01", "2026-04-30");
    const points = buildChartPoints([p1, p2, p3]);

    expect(points[0].month).toBe("2024");
    expect(points[1].month).toBe("2025");
    expect(points[2].month).toBe("Jan–Apr 26");
  });

  it("priorLabel of second point matches label of first point", () => {
    const p1 = makePeriod("p1", "2026-01-01", "2026-04-30");
    const p2 = makePeriod("p2", "2026-05-01", "2026-08-31");
    const [, point2] = buildChartPoints([p1, p2]);
    expect(point2.priorLabel).toBe("Jan–Apr 26");
  });

  it("grossMarginDelta is in decimal (0.05 = +5 pp), not percentage points", () => {
    const p1 = makePeriod("p1", "2024-01-01", "2024-12-31", 1_000_000, 0.2);
    const p2 = makePeriod("p2", "2025-01-01", "2025-12-31", 1_000_000, 0.25);
    const [, point2] = buildChartPoints([p1, p2]);
    // 0.25 − 0.20 = 0.05, which represents 5 pp
    expect(point2.grossMarginDelta).toBeCloseTo(0.05);
    expect(point2.grossMarginDelta).not.toBeCloseTo(5); // NOT 5.0 (common multiply-by-100 bug)
  });
});
