import * as XLSX from 'xlsx';

export interface ParsedLineItem {
  category: string;
  subcategory: string | null;
  name: string;
  amount: number;
  depth: number;
  isTotal: boolean;
  parentName: string | null;
}

export interface ParsedFinancialData {
  companyName: string;
  periodStart: Date;
  periodEnd: Date;
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  grossMargin: number;
  totalOpEx: number;
  netIncome: number;
  netMargin: number;
  cogsPayroll: number | null;
  cogsContractors: number | null;
  cogsSoftware: number | null;
  lineItems: ParsedLineItem[];
}

/**
 * Parse a QuickBooks Profit & Loss XLSX export
 * 
 * Expected format:
 * - Row 0: "Profit and Loss"
 * - Row 1: Company name
 * - Row 2: Date range (e.g., "January 1-December 31, 2024")
 * - Row 4: Header row (category, Total)
 * - Row 5+: Line items with indentation indicating depth
 */
export function parseQuickBooksPL(filePath: string): ParsedFinancialData {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<[string, number | string]>(sheet, {
    header: 1,
    defval: '',
  });

  // Extract metadata
  const companyName = (data[1]?.[0] as string) || '';
  const dateRangeStr = (data[2]?.[0] as string) || '';
  const { periodStart, periodEnd } = parseDateRange(dateRangeStr);

  // Parse line items
  const lineItems: ParsedLineItem[] = [];
  let currentCategory = '';
  let currentSubcategory: string | null = null;
  let totalRevenue = 0;
  let totalCOGS = 0;
  let grossProfit = 0;
  let totalOpEx = 0;
  let netIncome = 0;
  let cogsPayroll: number | null = null;
  let cogsContractors: number | null = null;
  let cogsSoftware: number | null = null;

  // Start parsing from row 5 (after headers)
  for (let i = 5; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const label = (row[0] as string).trim();
    const value = row[1];
    
    if (!label) continue;

    // Detect depth by counting leading spaces in the original label
    const originalLabel = row[0] as string;
    const leadingSpaces = originalLabel.match(/^(\s*)/)?.[1].length || 0;
    const depth = Math.floor(leadingSpaces / 2); // QuickBooks uses 2 spaces per level

    // Check if this is a total row
    const isTotal = label.startsWith('Total for ');

    // Parse amount
    const amount = typeof value === 'number' ? value : 0;

    // Track top-level categories for context
    if (depth === 0 && !isTotal) {
      currentCategory = label;
      currentSubcategory = null;
    } else if (depth === 1 && !isTotal) {
      currentSubcategory = label;
    }

    // Track key totals
    if (label === 'Total for Income') {
      totalRevenue = amount;
    } else if (label === 'Total for Cost of Goods Sold') {
      totalCOGS = amount;
    } else if (label === 'Gross Profit') {
      grossProfit = amount;
    } else if (label === 'Total Expenses') {
      totalOpEx = amount;
    } else if (label === 'Net Income') {
      netIncome = amount;
    }

    // Track COGS subcategories
    if (currentCategory === 'Cost of Goods Sold') {
      if (label === 'Total for COGS - Payroll Expense') {
        cogsPayroll = amount;
      } else if (label === 'Total for Contractors') {
        cogsContractors = amount;
      } else if (label === 'Total for Essential Software') {
        cogsSoftware = amount;
      }
    }

    // Build line item
    const lineItem: ParsedLineItem = {
      category: currentCategory,
      subcategory: currentSubcategory,
      name: label,
      amount,
      depth,
      isTotal,
      parentName: depth > 0 ? (currentSubcategory || currentCategory) : null,
    };

    lineItems.push(lineItem);
  }

  // Calculate derived metrics
  const grossMargin = totalRevenue > 0 ? grossProfit / totalRevenue : 0;
  const netMargin = totalRevenue > 0 ? netIncome / totalRevenue : 0;

  return {
    companyName,
    periodStart,
    periodEnd,
    totalRevenue,
    totalCOGS,
    grossProfit,
    grossMargin,
    totalOpEx,
    netIncome,
    netMargin,
    cogsPayroll,
    cogsContractors,
    cogsSoftware,
    lineItems,
  };
}

/**
 * Parse a QuickBooks date range string
 * Examples:
 * - "January 1-December 31, 2024"
 * - "January - April 2026"
 */
function parseDateRange(dateRangeStr: string): {
  periodStart: Date;
  periodEnd: Date;
} {
  // Clean up the string
  const cleaned = dateRangeStr.trim();

  // Try to extract year
  const yearMatch = cleaned.match(/(\d{4})/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

  // Try to extract months
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  let startMonth = 0; // January
  let endMonth = 11; // December
  let startDay = 1;
  let endDay = 31;

  // Pattern: "January 1-December 31, 2024"
  const fullPattern = /(\w+)\s+(\d+)-(\w+)\s+(\d+),?\s+(\d{4})/;
  const fullMatch = cleaned.match(fullPattern);

  if (fullMatch) {
    const [, startMonthName, startDayStr, endMonthName, endDayStr] = fullMatch;
    startMonth = monthNames.indexOf(startMonthName);
    endMonth = monthNames.indexOf(endMonthName);
    startDay = parseInt(startDayStr, 10);
    endDay = parseInt(endDayStr, 10);
  } else {
    // Pattern: "January - April 2026"
    const rangePattern = /(\w+)\s*-\s*(\w+)\s+(\d{4})/;
    const rangeMatch = cleaned.match(rangePattern);

    if (rangeMatch) {
      const [, startMonthName, endMonthName] = rangeMatch;
      startMonth = monthNames.indexOf(startMonthName);
      endMonth = monthNames.indexOf(endMonthName);
      startDay = 1;
      // Get last day of end month
      endDay = new Date(year, endMonth + 1, 0).getDate();
    }
  }

  const periodStart = new Date(year, startMonth, startDay);
  const periodEnd = new Date(year, endMonth, endDay);

  return { periodStart, periodEnd };
}
