import { describe, it, expect } from "vitest";
import {
  pctDelta,
  selectComparedPeriod,
  computePeriodDeltas,
  type PeriodData,
  type CompareMode,
} from "./comparison";

// Parse date strings as LOCAL time (avoids UTC-midnight → prior day in PDT/PST)
function D(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// ─── Test factories ───────────────────────────────────────────────────────────

function makePeriod(
  overrides: Partial<PeriodData> & {
    periodId: string;
    periodStart: string;
    periodEnd: string;
  },
): PeriodData {
  return {
    totalRevenue: 100_000,
    grossProfit: 30_000,
    grossMargin: 0.3,
    netIncome: 10_000,
    netMargin: 0.1,
    totalOpEx: 20_000,
    ...overrides,
    periodId: overrides.periodId,
    periodStart: D(overrides.periodStart),
    periodEnd: D(overrides.periodEnd),
  };
}

/** Three annual periods: 2023, 2024, 2025 */
const p2023 = makePeriod({
  periodId: "p2023",
  periodStart: "2023-01-01",
  periodEnd: "2023-12-31",
  totalRevenue: 900_000,
  grossMargin: 0.28,
});
const p2024 = makePeriod({
  periodId: "p2024",
  periodStart: "2024-01-01",
  periodEnd: "2024-12-31",
  totalRevenue: 1_200_000,
  grossMargin: 0.31,
});
const p2025 = makePeriod({
  periodId: "p2025",
  periodStart: "2025-01-01",
  periodEnd: "2025-12-31",
  totalRevenue: 1_000_000,
  grossMargin: 0.29,
});

/** Current period: 2026 YTD (Jan–Apr) */
const p2026ytd = makePeriod({
  periodId: "p2026",
  periodStart: "2026-01-01",
  periodEnd: "2026-04-30",
  totalRevenue: 400_000,
  grossProfit: 60_000,
  grossMargin: 0.15,
  netIncome: -10_000,
  netMargin: -0.025,
});

const ALL_PERIODS = [p2023, p2024, p2025, p2026ytd];

// ─── pctDelta ─────────────────────────────────────────────────────────────────

describe("pctDelta", () => {
  it("returns positive fraction for growth", () => {
    expect(pctDelta(120_000, 100_000)).toBeCloseTo(0.2);
  });

  it("returns negative fraction for decline", () => {
    expect(pctDelta(80_000, 100_000)).toBeCloseTo(-0.2);
  });

  it("returns 0 when current equals prior", () => {
    expect(pctDelta(100_000, 100_000)).toBe(0);
  });

  it("returns null when prior is zero", () => {
    expect(pctDelta(50_000, 0)).toBeNull();
  });

  it("handles negative prior → positive current (loss to profit swing)", () => {
    // prior = -100k, current = +50k
    // delta = (50k - (-100k)) / abs(-100k) = 150k / 100k = 1.5
    expect(pctDelta(50_000, -100_000)).toBeCloseTo(1.5);
  });

  it("handles both negative (loss reducing)", () => {
    // prior = -100k, current = -50k → improvement
    // delta = (-50k - (-100k)) / 100k = 50k / 100k = 0.5
    expect(pctDelta(-50_000, -100_000)).toBeCloseTo(0.5);
  });

  it("handles negative current from positive prior (profit to loss)", () => {
    // prior = 100k, current = -20k → delta = (-20k-100k)/100k = -1.2
    expect(pctDelta(-20_000, 100_000)).toBeCloseTo(-1.2);
  });

  it("handles very small prior values without NaN", () => {
    expect(pctDelta(1, 0.001)).toBeCloseTo(999);
  });
});

// ─── selectComparedPeriod ─────────────────────────────────────────────────────

describe("selectComparedPeriod", () => {
  describe('mode: "none"', () => {
    it("always returns null", () => {
      expect(selectComparedPeriod(ALL_PERIODS, p2026ytd, "none")).toBeNull();
    });

    it("returns null even with a fallback provided", () => {
      expect(
        selectComparedPeriod(ALL_PERIODS, p2026ytd, "none", p2025),
      ).toBeNull();
    });
  });

  describe("null / empty-list guards", () => {
    it("returns null when currentPeriod is null", () => {
      expect(
        selectComparedPeriod(ALL_PERIODS, null, "prior_period"),
      ).toBeNull();
    });

    it("returns null when allPeriods has only one entry", () => {
      expect(
        selectComparedPeriod([p2026ytd], p2026ytd, "prior_period"),
      ).toBeNull();
    });

    it("returns null for empty list", () => {
      expect(selectComparedPeriod([], p2026ytd, "prior_period")).toBeNull();
    });
  });

  describe('mode: "prior_period"', () => {
    it("returns the period immediately before currentPeriod in the list", () => {
      const result = selectComparedPeriod(
        ALL_PERIODS,
        p2026ytd,
        "prior_period",
      );
      expect(result?.periodId).toBe("p2025");
    });

    it("returns the period before a middle entry", () => {
      const result = selectComparedPeriod(ALL_PERIODS, p2025, "prior_period");
      expect(result?.periodId).toBe("p2024");
    });

    it("returns fallback when currentPeriod is first in list", () => {
      const fallback = p2024;
      const result = selectComparedPeriod(
        ALL_PERIODS,
        p2023,
        "prior_period",
        fallback,
      );
      expect(result?.periodId).toBe("p2024");
    });

    it("returns fallback when currentPeriod is not found in list", () => {
      const orphan = makePeriod({
        periodId: "orphan",
        periodStart: "2022-01-01",
        periodEnd: "2022-12-31",
      });
      const result = selectComparedPeriod(
        ALL_PERIODS,
        orphan,
        "prior_period",
        p2023,
      );
      expect(result?.periodId).toBe("p2023");
    });

    it("returns null (no fallback) when currentPeriod is first and no fallback given", () => {
      const result = selectComparedPeriod(ALL_PERIODS, p2023, "prior_period");
      expect(result).toBeNull();
    });
  });

  describe('mode: "yoy" (−12 months)', () => {
    it("selects 2025 annual when current is 2026 YTD (Jan 1)", () => {
      // Target: 2026-01-01 − 12m = 2025-01-01 → exact match with p2025
      const result = selectComparedPeriod(ALL_PERIODS, p2026ytd, "yoy");
      expect(result?.periodId).toBe("p2025");
    });

    it("selects 2024 when current is 2025", () => {
      const result = selectComparedPeriod(ALL_PERIODS, p2025, "yoy");
      expect(result?.periodId).toBe("p2024");
    });

    it("selects 2023 when current is 2024", () => {
      const result = selectComparedPeriod(ALL_PERIODS, p2024, "yoy");
      expect(result?.periodId).toBe("p2023");
    });
  });

  describe('mode: "qoq" (−3 months)', () => {
    it("selects the period closest to 3 months ago", () => {
      // Current: 2026-01-01, target = 2025-10-01
      // p2025 starts 2025-01-01 → diff = 273 days
      // p2024 starts 2024-01-01 → diff = 638 days
      // Nearest is p2025
      const result = selectComparedPeriod(ALL_PERIODS, p2026ytd, "qoq");
      expect(result?.periodId).toBe("p2025");
    });

    it("never selects the current period itself", () => {
      const result = selectComparedPeriod(ALL_PERIODS, p2025, "qoq");
      expect(result?.periodId).not.toBe("p2025");
    });
  });

  describe('mode: "mom" (−1 month)', () => {
    it("selects the period closest to 1 month ago", () => {
      // Current: 2026-01-01, target = 2025-12-01
      // p2025 starts 2025-01-01 → 334 days away
      // p2024 starts 2024-01-01 → 700 days away
      const result = selectComparedPeriod(ALL_PERIODS, p2026ytd, "mom");
      expect(result?.periodId).toBe("p2025");
    });
  });

  describe("monthly granularity data", () => {
    const jan25 = makePeriod({
      periodId: "jan25",
      periodStart: "2025-01-01",
      periodEnd: "2025-01-31",
    });
    const feb25 = makePeriod({
      periodId: "feb25",
      periodStart: "2025-02-01",
      periodEnd: "2025-02-28",
    });
    const mar25 = makePeriod({
      periodId: "mar25",
      periodStart: "2025-03-01",
      periodEnd: "2025-03-31",
    });
    const jan26 = makePeriod({
      periodId: "jan26",
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
    });
    const monthly = [jan25, feb25, mar25, jan26];

    it("mom selects the month 1 month before current", () => {
      // jan26 target = 2025-12-01 → closest is mar25 (Dec is absent, Mar is nearest available at 273 days vs jan25's 334)
      // Actually: 2025-12-01 vs mar25 (2025-03-01): |273 days|; vs feb25: |304 days|; vs jan25: |334 days|
      const result = selectComparedPeriod(monthly, jan26, "mom");
      expect(result?.periodId).toBe("mar25");
    });

    it("yoy selects same month last year exactly", () => {
      const result = selectComparedPeriod(monthly, jan26, "yoy");
      expect(result?.periodId).toBe("jan25");
    });

    it("prior_period selects mar25 before jan26 (skips missing months)", () => {
      const result = selectComparedPeriod(monthly, jan26, "prior_period");
      expect(result?.periodId).toBe("mar25");
    });
  });
});

// ─── computePeriodDeltas ──────────────────────────────────────────────────────

describe("computePeriodDeltas", () => {
  it("returns all-null when compared is null", () => {
    const deltas = computePeriodDeltas(p2026ytd, null);
    expect(deltas.revDelta).toBeNull();
    expect(deltas.grossProfitDelta).toBeNull();
    expect(deltas.marginDelta).toBeNull();
    expect(deltas.netDelta).toBeNull();
    expect(deltas.netMarginDelta).toBeNull();
  });

  describe("with valid comparison", () => {
    const current = makePeriod({
      periodId: "cur",
      periodStart: "2026-01-01",
      periodEnd: "2026-04-30",
      totalRevenue: 400_000,
      grossProfit: 60_000,
      grossMargin: 0.15,
      netIncome: -10_000,
      netMargin: -0.025,
    });
    const prior = makePeriod({
      periodId: "pri",
      periodStart: "2025-01-01",
      periodEnd: "2025-12-31",
      totalRevenue: 1_000_000,
      grossProfit: 200_000,
      grossMargin: 0.2,
      netIncome: 50_000,
      netMargin: 0.05,
    });
    const deltas = computePeriodDeltas(current, prior);

    it("revDelta: (400k − 1000k) / 1000k = −0.6", () => {
      expect(deltas.revDelta).toBeCloseTo(-0.6);
    });

    it("grossProfitDelta: (60k − 200k) / 200k = −0.7", () => {
      expect(deltas.grossProfitDelta).toBeCloseTo(-0.7);
    });

    it("marginDelta is absolute pp difference: 0.15 − 0.20 = −0.05", () => {
      expect(deltas.marginDelta).toBeCloseTo(-0.05);
    });

    it("netDelta handles negative current from positive prior", () => {
      // (-10k − 50k) / abs(50k) = -60k / 50k = -1.2
      expect(deltas.netDelta).toBeCloseTo(-1.2);
    });

    it("netMarginDelta is absolute pp: -0.025 − 0.05 = -0.075", () => {
      expect(deltas.netMarginDelta).toBeCloseTo(-0.075);
    });
  });

  it("revDelta is null when prior revenue is zero", () => {
    const zeroRevPrior = makePeriod({
      periodId: "z",
      periodStart: "2024-01-01",
      periodEnd: "2024-12-31",
      totalRevenue: 0,
    });
    const deltas = computePeriodDeltas(p2026ytd, zeroRevPrior);
    expect(deltas.revDelta).toBeNull();
  });

  it("marginDelta is a decimal — +5 pp shows as +0.05", () => {
    const a = makePeriod({
      periodId: "a",
      periodStart: "2026-01-01",
      periodEnd: "2026-04-30",
      grossMargin: 0.2,
    });
    const b = makePeriod({
      periodId: "b",
      periodStart: "2025-01-01",
      periodEnd: "2025-12-31",
      grossMargin: 0.15,
    });
    const { marginDelta } = computePeriodDeltas(a, b);
    expect(marginDelta).toBeCloseTo(0.05); // represents +5 pp
  });

  it("grossProfitDelta is null when prior gross profit is zero", () => {
    const breakeven = makePeriod({
      periodId: "be",
      periodStart: "2024-01-01",
      periodEnd: "2024-12-31",
      grossProfit: 0,
    });
    const { grossProfitDelta } = computePeriodDeltas(p2026ytd, breakeven);
    expect(grossProfitDelta).toBeNull();
  });
});
