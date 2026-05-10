import { describe, it, expect } from "vitest";
import {
  getPeriodRange,
  getRelativePeriodLabel,
  formatPeriodLabel,
} from "./dates";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a local Date without timezone ambiguity */
function D(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

// ─── getPeriodRange — "custom" preset ────────────────────────────────────────

describe("getPeriodRange", () => {
  describe('preset "custom"', () => {
    it("returns the provided start and end dates", () => {
      const start = D(2025, 1, 1);
      const end = D(2025, 6, 30);
      const result = getPeriodRange("custom", start, end);

      expect(result.start).toEqual(start);
      expect(result.end).toEqual(end);
    });

    it("generates a formatted label from the custom dates", () => {
      const start = D(2025, 1, 1);
      const end = D(2025, 6, 30);
      const result = getPeriodRange("custom", start, end);

      expect(result.label).toBe(formatPeriodLabel(start, end));
      expect(result.label).toContain("2025");
    });

    it("falls back to { start: now, end: now } when custom dates are missing", () => {
      const before = Date.now();
      const result = getPeriodRange("custom");
      const after = Date.now();

      expect(result.start.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.start.getTime()).toBeLessThanOrEqual(after);
      expect(result.end.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.end.getTime()).toBeLessThanOrEqual(after);
      expect(result.label).toBe("Custom Range");
    });

    it("falls back when only customStart is provided", () => {
      const result = getPeriodRange("custom", D(2025, 1, 1));
      expect(result.label).toBe("Custom Range");
    });
  });
});

// ─── getRelativePeriodLabel ───────────────────────────────────────────────────

describe("getRelativePeriodLabel", () => {
  it('returns "Full Year {year}" for Jan 1 – Dec 31 of the same year', () => {
    const start = D(2025, 1, 1);
    const end = D(2025, 12, 31);
    expect(getRelativePeriodLabel(start, end, "MONTHLY_SUMMARY")).toBe(
      "Full Year 2025",
    );
  });

  it('returns "Q{n} {year}" when type is QUARTERLY_REVIEW', () => {
    // Q1 2024
    expect(
      getRelativePeriodLabel(D(2024, 1, 1), D(2024, 3, 31), "QUARTERLY_REVIEW"),
    ).toBe("Q1 2024");

    // Q3 2025
    expect(
      getRelativePeriodLabel(D(2025, 7, 1), D(2025, 9, 30), "QUARTERLY_REVIEW"),
    ).toBe("Q3 2025");
  });

  it('returns "MMMM yyyy" for a single-month range', () => {
    const start = D(2025, 3, 1);
    const end = D(2025, 3, 31);
    expect(getRelativePeriodLabel(start, end, "MONTHLY_SUMMARY")).toBe(
      "March 2025",
    );
  });

  it('returns "{month} {year} YTD" when range starts Jan 1', () => {
    const start = D(2025, 1, 1);
    const end = D(2025, 9, 30);
    expect(getRelativePeriodLabel(start, end, "MONTHLY_SUMMARY")).toBe(
      "September 2025 YTD",
    );
  });

  it("falls back to a formatted date range for arbitrary spans", () => {
    const start = D(2024, 6, 15);
    const end = D(2024, 9, 10);
    const label = getRelativePeriodLabel(start, end, "CUSTOM");
    // Should contain both years/months rather than any of the special formats
    expect(label).toContain("2024");
    expect(label).not.toMatch(/^Full Year|^Q\d|YTD$/);
  });
});
