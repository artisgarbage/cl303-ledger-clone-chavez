import { formatCurrency, formatPercent } from "@/lib/utils/currency";

export interface MonthlyDataPackage {
  companyName: string;
  periodLabel: string;
  basis: string;
  revenue: number;
  revenueDelta: number | null;
  revenueYoY: number | null;
  cogs: number;
  cogsPayroll: number;
  cogsContractors: number;
  cogsSoftware: number;
  grossProfit: number;
  grossMargin: number;
  opex: number;
  netIncome: number;
  netMargin: number;
  cashRevenue?: number;
  accrualRevenue?: number;
  cashAccrualDelta?: number;
  contractorLag: number;
  adjustedCogs: number;
  adjustedGrossMargin: number;
  projects: Array<{
    name: string;
    revenue: number;
    trueCost: number;
    margin: number;
  }>;
  utilizationByPerson: Array<{
    name: string;
    utilization: number;
    billableHours: number;
    totalHours: number;
    effectiveRate: number;
  }>;
  avgUtilization: number;
  revenueTarget: number | null;
  grossMarginTarget: string | null;
  netProfitTarget: number | null;
  /** e.g. "yoy", "mom", "qoq", "prior_period" */
  compareMode?: string;
  /** Pre-formatted comparison block injected into the prompt */
  comparisonContext?: string;
}

export function buildMonthlyPrompt(data: MonthlyDataPackage): string {
  const deltaStr = (v: number | null) =>
    v === null ? "N/A" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;

  const cashAccrualBlock =
    data.cashAccrualDelta !== undefined && data.cashAccrualDelta !== 0
      ? `
CASH VS ACCRUAL DELTA:
Cash Revenue: ${formatCurrency(data.cashRevenue ?? 0)}
Accrual Revenue: ${formatCurrency(data.accrualRevenue ?? 0)}
Delta: ${formatCurrency(data.cashAccrualDelta ?? 0)} (primarily A/R timing)
`
      : "";

  const projectLines = data.projects
    .map(
      (p) =>
        `- ${p.name}: Revenue ${formatCurrency(p.revenue)}, True Cost ${formatCurrency(p.trueCost)}, Margin ${formatPercent(p.margin)}`,
    )
    .join("\n");

  const utilizationLines = data.utilizationByPerson
    .map(
      (p) =>
        `- ${p.name}: ${formatPercent(p.utilization)} (${p.billableHours}h billable / ${p.totalHours}h total, effective rate $${p.effectiveRate.toFixed(2)}/hr)`,
    )
    .join("\n");

  const targetsBlock = [
    data.revenueTarget
      ? `Revenue Target: ${formatCurrency(data.revenueTarget)}`
      : "",
    data.grossMarginTarget
      ? `Gross Margin Target: ${data.grossMarginTarget}`
      : "",
    data.netProfitTarget
      ? `Net Profit Target: ${formatCurrency(data.netProfitTarget)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const comparisonBlock = data.comparisonContext
    ? `\n${data.comparisonContext}\n`
    : "";

  const comparisonInstruction =
    data.compareMode && data.comparisonContext
      ? `\nIMPORTANT: Your analysis MUST explicitly reference the ${data.compareMode.toUpperCase()} comparison data above. For each key metric, call out the specific change between periods and explain what is driving the delta.`
      : "";

  return `You are a fractional CFO writing a monthly financial summary for the CEO of a professional services company. Be direct, specific, and honest. Do not use em-dashes. Use plain language, not accounting jargon. When numbers tell a story, lead with the story and support with the numbers.

COMPANY: ${data.companyName}
PERIOD: ${data.periodLabel}
BASIS: ${data.basis}

INCOME STATEMENT:
Revenue: ${formatCurrency(data.revenue)}
  vs. Prior Month: ${deltaStr(data.revenueDelta)}
  vs. Same Month Last Year: ${deltaStr(data.revenueYoY)}
COGS: ${formatCurrency(data.cogs)}
  Payroll: ${formatCurrency(data.cogsPayroll)}
  Contractors: ${formatCurrency(data.cogsContractors)}
  Software: ${formatCurrency(data.cogsSoftware)}
Gross Profit: ${formatCurrency(data.grossProfit)} (${formatPercent(data.grossMargin)})
OpEx: ${formatCurrency(data.opex)}
Net Income: ${formatCurrency(data.netIncome)} (${formatPercent(data.netMargin)})
${cashAccrualBlock}${comparisonBlock}
CONTRACTOR LAG ESTIMATE:
Estimated uninvoiced contractor cost: ${formatCurrency(data.contractorLag)}
Adjusted COGS (including lag): ${formatCurrency(data.adjustedCogs)}
Adjusted Gross Margin: ${formatPercent(data.adjustedGrossMargin)}

PROJECT PROFITABILITY (sorted by margin):
${projectLines || "No project data available."}

UTILIZATION:
Team Average: ${formatPercent(data.avgUtilization)}
${utilizationLines || "No utilization data available."}

${targetsBlock ? `TARGETS:\n${targetsBlock}` : ""}

Write a 3-5 paragraph narrative covering:
1. The headline: what is the single most important thing about this month's numbers?
2. Revenue trajectory: are we on track for annual targets? What is the run rate?
3. Margin health: what is driving margin up or down? Call out specific projects or cost drivers.
4. The honest assessment: what should the CEO be worried about, and what is going well?
5. One concrete recommendation for next month.
${comparisonInstruction}
Do not sugarcoat. Do not hedge excessively. Be the CFO who tells the truth.`;
}

export interface CustomQueryPackage {
  companyName: string;
  question: string;
  context: string;
}

export function buildCustomPrompt(data: CustomQueryPackage): string {
  return `You are a fractional CFO analyzing financial data for ${data.companyName}. Answer the following question using only the data provided. Be direct and specific. Do not use em-dashes. Cite actual numbers.

QUESTION: ${data.question}

FINANCIAL DATA:
${data.context}

Provide a concise, direct answer. If the data is insufficient to fully answer the question, say so clearly and explain what additional data would be needed.`;
}
