import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock xlsx before importing the module under test
vi.mock("xlsx", () => ({
  readFile: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
  },
}));

import * as XLSX from "xlsx";
import { parseQuickBooksPL } from "./xlsx-parser";

/**
 * Builds mock sheet_to_json rows that represent a minimal but complete P&L.
 *
 * Depth is encoded via leading spaces (2 spaces per depth level), matching
 * the QuickBooks export format that parseQuickBooksPL expects.
 *
 * Financials:
 *   Revenue:          100,000
 *   COGS - Payroll:    30,000
 *   COGS - Contractors:10,000
 *   COGS - Software:    5,000
 *   Total COGS:        45,000
 *   Gross Profit:      55,000
 *   Expenses:          10,000
 *   Net Income:        45,000
 */
const MOCK_ROWS = [
  ["Profit and Loss", ""],
  ["Test Company LLC", ""],
  ["January 1-December 31, 2024", ""],
  ["", ""],
  ["Category", "Total"],
  // Income
  ["Income", ""],
  ["  Consulting Revenue", 100_000],
  ["Total for Income", 100_000],
  // COGS
  ["Cost of Goods Sold", ""],
  ["  COGS - Payroll Expense", ""],
  ["    Staff Wages", 30_000],
  ["  Total for COGS - Payroll Expense", 30_000],
  ["  Contractors", ""],
  ["    Contract Work", 10_000],
  ["  Total for Contractors", 10_000],
  ["  Essential Software", ""],
  ["    SaaS Tools", 5_000],
  ["  Total for Essential Software", 5_000],
  ["Total for Cost of Goods Sold", 45_000],
  // Gross Profit
  ["Gross Profit", 55_000],
  // OpEx
  ["Expenses", ""],
  ["  Admin", 10_000],
  ["Total Expenses", 10_000],
  // Net Income
  ["Net Income", 45_000],
];

describe("parseQuickBooksPL", () => {
  beforeEach(() => {
    vi.mocked(XLSX.readFile).mockReturnValue({
      SheetNames: ["Sheet1"],
      Sheets: { Sheet1: {} },
    } as ReturnType<typeof XLSX.readFile>);

    vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(
      MOCK_ROWS as ReturnType<typeof XLSX.utils.sheet_to_json>,
    );
  });

  it("extracts company name from row 1", () => {
    const result = parseQuickBooksPL("/fake/path.xlsx");
    expect(result.companyName).toBe("Test Company LLC");
  });

  it("parses the date range into periodStart and periodEnd", () => {
    const result = parseQuickBooksPL("/fake/path.xlsx");
    expect(result.periodStart).toBeInstanceOf(Date);
    expect(result.periodEnd).toBeInstanceOf(Date);
    expect(result.periodStart.getFullYear()).toBe(2024);
    expect(result.periodStart.getMonth()).toBe(0); // January
    expect(result.periodEnd.getMonth()).toBe(11); // December
  });

  it("correctly totals revenue", () => {
    const result = parseQuickBooksPL("/fake/path.xlsx");
    expect(result.totalRevenue).toBe(100_000);
  });

  it("correctly totals COGS", () => {
    const result = parseQuickBooksPL("/fake/path.xlsx");
    expect(result.totalCOGS).toBe(45_000);
  });

  it("sets gross profit", () => {
    const result = parseQuickBooksPL("/fake/path.xlsx");
    expect(result.grossProfit).toBe(55_000);
  });

  it("calculates gross margin", () => {
    const result = parseQuickBooksPL("/fake/path.xlsx");
    expect(result.grossMargin).toBeCloseTo(0.55, 5);
  });

  it("sets total operating expenses", () => {
    const result = parseQuickBooksPL("/fake/path.xlsx");
    expect(result.totalOpEx).toBe(10_000);
  });

  it("sets net income", () => {
    const result = parseQuickBooksPL("/fake/path.xlsx");
    expect(result.netIncome).toBe(45_000);
  });

  it("calculates net margin", () => {
    const result = parseQuickBooksPL("/fake/path.xlsx");
    expect(result.netMargin).toBeCloseTo(0.45, 5);
  });

  it("extracts COGS payroll subtotal", () => {
    const result = parseQuickBooksPL("/fake/path.xlsx");
    expect(result.cogsPayroll).toBe(30_000);
  });

  it("extracts COGS contractors subtotal", () => {
    const result = parseQuickBooksPL("/fake/path.xlsx");
    expect(result.cogsContractors).toBe(10_000);
  });

  it("extracts COGS software subtotal", () => {
    const result = parseQuickBooksPL("/fake/path.xlsx");
    expect(result.cogsSoftware).toBe(5_000);
  });

  it("populates lineItems", () => {
    const result = parseQuickBooksPL("/fake/path.xlsx");
    expect(result.lineItems.length).toBeGreaterThan(0);
  });

  it("handles zero revenue without division errors (grossMargin = 0)", () => {
    vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
      ["Profit and Loss", ""],
      ["Empty Co", ""],
      ["January 1-December 31, 2024", ""],
      ["", ""],
      ["Category", "Total"],
      ["Total for Income", 0],
      ["Total for Cost of Goods Sold", 0],
      ["Gross Profit", 0],
      ["Total Expenses", 0],
      ["Net Income", 0],
    ] as ReturnType<typeof XLSX.utils.sheet_to_json>);

    const result = parseQuickBooksPL("/fake/empty.xlsx");
    expect(result.grossMargin).toBe(0);
    expect(result.netMargin).toBe(0);
  });
});
