import * as ExcelJS from "exceljs";
import { AccountingBasis } from "@prisma/client";

export interface ParsedLineItem {
  category: string;
  subcategory: string | null;
  name: string;
  amount: number;
  depth: number;
  isTotal: boolean;
  parentName: string | null;
}

export interface ParsedQBPeriod {
  periodStart: Date;
  periodEnd: Date;
  basis: AccountingBasis;
  companyName: string;
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  totalOpEx: number;
  netIncome: number;
  grossMargin: number;
  netMargin: number;
  cogsPayroll: number | null;
  cogsContractors: number | null;
  cogsSoftware: number | null;
  lineItems: ParsedLineItem[];
  rawRows: Array<{ name: string; amount: number | null; depth: number }>;
}

const MONTH_MAP: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

function parseDateRange(rangeStr: string): { start: Date; end: Date } {
  // Handles many QB date range formats
  const cleaned = rangeStr.trim();

  // "Month Day-Month Day, Year"  e.g. "January 1-December 31, 2024"
  const fullPattern = /^(\w+)\s+(\d+)-(\w+)\s+(\d+),\s*(\d{4})$/;
  // "Month Day-Day, Year"  e.g. "January 1-31, 2026"
  const sameMonthPattern = /^(\w+)\s+(\d+)-(\d+),\s*(\d{4})$/;
  // "Month Day, Year - Month Day, Year"  cross-year
  const yearSpanPattern =
    /^(\w+)\s+(\d+),?\s*(\d{4})\s*-\s*(\w+)\s+(\d+),?\s*(\d{4})$/;
  // "Month-Month, Year"  e.g. "January-December, 2025"  (no day numbers)
  const monthRangePattern = /^(\w+)-(\w+),\s*(\d{4})$/;
  // "Month, Year"  single month  e.g. "January, 2025"
  const singleMonthPattern = /^(\w+),\s*(\d{4})$/;

  let match = cleaned.match(fullPattern);
  if (match) {
    const [, startMonth, startDay, endMonth, endDay, year] = match;
    const yr = parseInt(year);
    return {
      start: new Date(
        yr,
        MONTH_MAP[startMonth.toLowerCase()],
        parseInt(startDay),
      ),
      end: new Date(yr, MONTH_MAP[endMonth.toLowerCase()], parseInt(endDay)),
    };
  }

  match = cleaned.match(sameMonthPattern);
  if (match) {
    const [, month, startDay, endDay, year] = match;
    const yr = parseInt(year);
    const mo = MONTH_MAP[month.toLowerCase()];
    return {
      start: new Date(yr, mo, parseInt(startDay)),
      end: new Date(yr, mo, parseInt(endDay)),
    };
  }

  match = cleaned.match(yearSpanPattern);
  if (match) {
    const [, sm, sd, sy, em, ed, ey] = match;
    return {
      start: new Date(parseInt(sy), MONTH_MAP[sm.toLowerCase()], parseInt(sd)),
      end: new Date(parseInt(ey), MONTH_MAP[em.toLowerCase()], parseInt(ed)),
    };
  }

  // "January-December, 2025" → Jan 1 to Dec 31 of that year
  match = cleaned.match(monthRangePattern);
  if (match) {
    const [, startMonth, endMonth, year] = match;
    const yr = parseInt(year);
    const startMo = MONTH_MAP[startMonth.toLowerCase()];
    const endMo = MONTH_MAP[endMonth.toLowerCase()];
    // Last day of endMonth: day 0 of the next month
    const lastDay = new Date(yr, endMo + 1, 0).getDate();
    return {
      start: new Date(yr, startMo, 1),
      end: new Date(yr, endMo, lastDay),
    };
  }

  // "January, 2025" → first to last day of that month
  match = cleaned.match(singleMonthPattern);
  if (match) {
    const [, month, year] = match;
    const yr = parseInt(year);
    const mo = MONTH_MAP[month.toLowerCase()];
    const lastDay = new Date(yr, mo + 1, 0).getDate();
    return {
      start: new Date(yr, mo, 1),
      end: new Date(yr, mo, lastDay),
    };
  }

  throw new Error(`Could not parse date range from: "${rangeStr}"`);
}

function detectBasis(footerText: string): AccountingBasis {
  if (footerText.toLowerCase().includes("accrual"))
    return AccountingBasis.ACCRUAL;
  return AccountingBasis.CASH;
}

function getCellValue(
  ws: ExcelJS.Worksheet,
  row: number,
  col: number,
): string | number | null {
  const cell = ws.getRow(row + 1).getCell(col + 1); // ExcelJS is 1-indexed
  if (!cell || cell.value === null || cell.value === undefined) return null;
  
  // Handle different value types
  if (typeof cell.value === 'object') {
    // Rich text or formula
    if ('richText' in cell.value) {
      return cell.value.richText.map(t => t.text).join('');
    }
    if ('result' in cell.value) {
      return cell.value.result as string | number;
    }
    return null;
  }
  
  return cell.value as string | number;
}

function getCellIndent(ws: ExcelJS.Worksheet, row: number, col: number): number {
  const cell = ws.getRow(row + 1).getCell(col + 1);
  if (!cell || !cell.style || !cell.style.alignment) return 0;
  return cell.style.alignment.indent ?? 0;
}

function parseAmount(raw: string | number | null): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") return raw;
  const cleaned = raw.toString().replace(/[$,\s]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function findTotalRow(
  rows: Array<{ name: string; amount: number | null; depth: number }>,
  label: string,
): number | null {
  const needle = label.toLowerCase();
  for (const row of rows) {
    if (row.name.toLowerCase().trim() === needle && row.amount !== null) {
      return row.amount;
    }
  }
  return null;
}

const SKIP_CATEGORIES = new Set([
  "unapplied cash payment income",
  "unapplied cash bill payment expense",
]);

export async function parseQuickBooksXLSX(buffer: Buffer): Promise<ParsedQBPeriod> {
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any);
  
  const ws = workbook.worksheets[0];
  if (!ws) throw new Error("No worksheet found in file");

  const maxRow = ws.rowCount;

  // Row 1 = index 0: "Profit and Loss"
  // Row 2 = index 1: Company name
  // Row 3 = index 2: Date range
  const companyName = String(getCellValue(ws, 1, 0) ?? "");
  const dateRangeStr = String(getCellValue(ws, 2, 0) ?? "");

  let periodStart: Date;
  let periodEnd: Date;
  try {
    const parsed = parseDateRange(dateRangeStr);
    periodStart = parsed.start;
    periodEnd = parsed.end;
  } catch {
    throw new Error(`Could not parse date range from: "${dateRangeStr}"`);
  }

  // Find the footer row (last populated row with basis info)
  let basis: AccountingBasis = AccountingBasis.CASH;
  let lastPopulatedRow = 5;

  for (let r = maxRow - 1; r >= 5; r--) {
    const cellA = getCellValue(ws, r, 0);
    if (cellA && typeof cellA === "string" && cellA.trim() !== "") {
      const text = cellA.toLowerCase();
      if (text.includes("basis")) {
        basis = detectBasis(cellA);
      }
      lastPopulatedRow = r;
      break;
    }
  }

  // Parse all data rows (rows 6+ = index 5+)
  const rawRows: Array<{ name: string; amount: number | null; depth: number }> =
    [];

  for (let r = 5; r <= lastPopulatedRow; r++) {
    const nameVal = getCellValue(ws, r, 0);
    const amountVal = getCellValue(ws, r, 1);
    const depth = getCellIndent(ws, r, 0);

    if (!nameVal || typeof nameVal !== "string" || nameVal.trim() === "")
      continue;
    const name = nameVal.trim();

    // Skip the footer row and column header row
    if (name.toLowerCase().includes("basis") || name.toLowerCase() === "total")
      continue;
    if (SKIP_CATEGORIES.has(name.toLowerCase())) continue;

    rawRows.push({
      name,
      amount: parseAmount(amountVal),
      depth,
    });
  }

  // Extract key P&L totals
  const totalRevenue =
    findTotalRow(rawRows, "total income") ??
    findTotalRow(rawRows, "total for income") ??
    0;

  const totalCOGS =
    findTotalRow(rawRows, "total cost of goods sold") ??
    findTotalRow(rawRows, "total for cost of goods sold") ??
    0;

  const grossProfitRow =
    findTotalRow(rawRows, "gross profit") ?? totalRevenue - totalCOGS;

  const totalOpEx =
    findTotalRow(rawRows, "total expenses") ??
    findTotalRow(rawRows, "total for expenses") ??
    0;

  const netIncome =
    findTotalRow(rawRows, "net income") ??
    findTotalRow(rawRows, "net operating income") ??
    grossProfitRow - totalOpEx;

  // COGS sub-components
  const cogsPayroll =
    findTotalRow(rawRows, "total cogs - payroll expense") ??
    findTotalRow(rawRows, "total payroll expense") ??
    findTotalRow(rawRows, "total for cogs - payroll expense");

  const cogsContractors =
    findTotalRow(rawRows, "total contractors") ??
    findTotalRow(rawRows, "total for contractors");

  const cogsSoftware =
    findTotalRow(rawRows, "total essential software") ??
    findTotalRow(rawRows, "total for essential software");

  // Build structured line items
  const lineItems: ParsedLineItem[] = [];
  let currentCategory = "";
  let currentSubcategory: string | null = null;
  const categoryStack: string[] = [];

  for (const row of rawRows) {
    const isTotal =
      row.name.startsWith("Total for ") || row.name.startsWith("Total ");
    const depth = row.depth;

    if (depth === 0 && !isTotal) {
      currentCategory = row.name;
      currentSubcategory = null;
      categoryStack.length = 0;
      categoryStack.push(row.name);
    } else if (depth === 1 && !isTotal) {
      currentSubcategory = row.name;
    }

    if (row.amount === null) continue;

    lineItems.push({
      category: currentCategory,
      subcategory: depth > 1 ? currentSubcategory : null,
      name: row.name,
      amount: row.amount,
      depth,
      isTotal,
      parentName: depth > 0 ? (categoryStack[depth - 1] ?? null) : null,
    });

    if (!isTotal) {
      categoryStack[depth] = row.name;
    }
  }

  const grossMargin = totalRevenue !== 0 ? grossProfitRow / totalRevenue : 0;
  const netMargin = totalRevenue !== 0 ? netIncome / totalRevenue : 0;

  return {
    periodStart,
    periodEnd,
    basis,
    companyName,
    totalRevenue,
    totalCOGS,
    grossProfit: grossProfitRow,
    totalOpEx,
    netIncome,
    grossMargin,
    netMargin,
    cogsPayroll: cogsPayroll !== null ? cogsPayroll : null,
    cogsContractors: cogsContractors !== null ? cogsContractors : null,
    cogsSoftware: cogsSoftware !== null ? cogsSoftware : null,
    lineItems,
    rawRows,
  };
}

/**
 * Parse a QuickBooks XLSX file from disk (convenience wrapper for seed scripts)
 */
export async function parseQuickBooksXLSXFile(filePath: string): Promise<ParsedQBPeriod> {
  const fs = await import('fs/promises');
  const buffer = await fs.readFile(filePath);
  return parseQuickBooksXLSX(buffer);
}
