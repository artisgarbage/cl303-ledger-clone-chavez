import Anthropic from '@anthropic-ai/sdk';
import { NarrativeType } from '@prisma/client';

export interface FinancialSnapshot {
  companyName: string;
  periodStart: string;
  periodEnd: string;
  basis: 'CASH' | 'ACCRUAL';
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  grossMargin: number;
  totalOpEx: number;
  netIncome: number;
  netMargin: number;
  cogsPayroll?: number | null;
  cogsContractors?: number | null;
  cogsSoftware?: number | null;
  revenueTarget?: number | null;
  grossMarginTargetMin?: number | null;
  grossMarginTargetMax?: number | null;
  netProfitTarget?: number | null;
  topLineItems?: Array<{
    category: string;
    name: string;
    amount: number;
  }>;
  priorPeriods?: Array<{
    periodStart: string;
    periodEnd: string;
    totalRevenue: number;
    netIncome: number;
    grossMargin: number;
  }>;
}

export interface NarrativeResult {
  content: string;
  title: string;
  promptUsed: string;
}

/**
 * Generate an AI narrative for financial data using Claude
 */
export async function generateNarrative(
  type: NarrativeType,
  snapshot: FinancialSnapshot
): Promise<NarrativeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const anthropic = new Anthropic({ apiKey });

  // Build the prompt based on narrative type
  const prompt = buildPrompt(type, snapshot);
  const title = generateTitle(type, snapshot);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    return {
      content: content.text,
      title,
      promptUsed: prompt,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate narrative: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Build a structured prompt based on the narrative type
 */
function buildPrompt(type: NarrativeType, snapshot: FinancialSnapshot): string {
  const {
    companyName,
    periodStart,
    periodEnd,
    basis,
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
    revenueTarget,
    grossMarginTargetMin,
    grossMarginTargetMax,
    netProfitTarget,
    topLineItems,
    priorPeriods,
  } = snapshot;

  const baseContext = `
You are a financial analyst writing a narrative summary for ${companyName}.

**Period:** ${periodStart} to ${periodEnd}
**Accounting Basis:** ${basis}

**Financial Summary:**
- Total Revenue: $${formatCurrency(totalRevenue)}
- Total COGS: $${formatCurrency(totalCOGS)}
- Gross Profit: $${formatCurrency(grossProfit)}
- Gross Margin: ${formatPercent(grossMargin)}
- Total Operating Expenses: $${formatCurrency(totalOpEx)}
- Net Income: $${formatCurrency(netIncome)}
- Net Margin: ${formatPercent(netMargin)}

**COGS Breakdown:**
${cogsPayroll ? `- Payroll: $${formatCurrency(cogsPayroll)}` : ''}
${cogsContractors ? `- Contractors: $${formatCurrency(cogsContractors)}` : ''}
${cogsSoftware ? `- Software: $${formatCurrency(cogsSoftware)}` : ''}

${revenueTarget ? `**Revenue Target:** $${formatCurrency(revenueTarget)}` : ''}
${grossMarginTargetMin && grossMarginTargetMax
    ? `**Gross Margin Target:** ${formatPercent(grossMarginTargetMin)} - ${formatPercent(grossMarginTargetMax)}`
    : ''
  }
${netProfitTarget ? `**Net Profit Target:** $${formatCurrency(netProfitTarget)}` : ''}
`;

  let specificInstructions = '';

  switch (type) {
    case 'MONTHLY_SUMMARY':
      specificInstructions = `
Write a concise monthly financial summary (300-400 words) that:
1. Highlights the most important metrics (revenue, gross margin, net income)
2. Compares to targets where available
3. Identifies any concerning trends or positive developments
4. Provides 2-3 actionable insights for the leadership team

Focus on business health and operational efficiency. Use clear, non-technical language.`;
      break;

    case 'QUARTERLY_REVIEW':
      specificInstructions = `
Write a quarterly financial review (500-600 words) that:
1. Summarizes overall performance vs. targets
2. Analyzes trends across the quarter
3. Breaks down COGS composition and efficiency
4. Highlights any significant changes in operating expenses
5. Provides strategic recommendations for the next quarter

Include both quantitative analysis and qualitative insights. Address sustainability of current margins.`;
      break;

    case 'YEAR_OVER_YEAR':
      if (priorPeriods && priorPeriods.length > 0) {
        const priorContext = priorPeriods
          .map(
            (p) =>
              `- ${p.periodStart} to ${p.periodEnd}: Revenue $${formatCurrency(p.totalRevenue)}, Net Income $${formatCurrency(p.netIncome)}, Gross Margin ${formatPercent(p.grossMargin)}`
          )
          .join('\n');

        specificInstructions = `
Write a year-over-year analysis (600-700 words) that:
1. Compares current period to prior year(s)
2. Calculates growth rates for revenue, margin, and profit
3. Identifies structural changes in the business model
4. Analyzes scaling efficiency (how costs grew vs. revenue)
5. Provides long-term strategic recommendations

**Prior Period Data:**
${priorContext}

Focus on trend analysis and strategic insights. What has fundamentally changed?`;
      } else {
        specificInstructions = `
Write a year-over-year analysis (600-700 words) focusing on:
1. Overall annual performance
2. Revenue composition and sustainability
3. Margin health and COGS efficiency
4. Operating leverage and scalability
5. Strategic recommendations for the next year

Note: No prior year data available for comparison. Focus on absolute performance and internal benchmarks.`;
      }
      break;

    case 'MARGIN_ANALYSIS':
      specificInstructions = `
Write a detailed margin analysis (400-500 words) that:
1. Analyzes gross margin health relative to target (${grossMarginTargetMin && grossMarginTargetMax
    ? `${formatPercent(grossMarginTargetMin)} - ${formatPercent(grossMarginTargetMax)}`
    : 'industry standards'
  })
2. Breaks down COGS efficiency (payroll, contractors, software)
3. Identifies margin compression or expansion drivers
4. Calculates contribution margin where possible
5. Recommends specific actions to improve or protect margins

Focus on operational levers the team can pull to optimize profitability.`;
      break;

    case 'CASH_VS_ACCRUAL':
      specificInstructions = `
Write a cash vs. accrual comparison (400-500 words) that:
1. Explains key differences in the reported numbers
2. Highlights timing mismatches (e.g., contractor lag, unbilled revenue)
3. Assesses cash flow health vs. profitability
4. Identifies any red flags (e.g., growing AR, shrinking AP)
5. Recommends cash management improvements

Focus on liquidity and working capital management.`;
      break;

    case 'PROJECT_PROFITABILITY':
      if (topLineItems && topLineItems.length > 0) {
        const itemsContext = topLineItems
          .map((item) => `- ${item.category} / ${item.name}: $${formatCurrency(item.amount)}`)
          .join('\n');

        specificInstructions = `
Write a project profitability analysis (400-500 words) that:
1. Identifies highest revenue and cost drivers
2. Estimates project-level margins where possible
3. Flags any loss-making activities
4. Recommends portfolio optimization

**Key Line Items:**
${itemsContext}

Focus on resource allocation and strategic prioritization.`;
      } else {
        specificInstructions = `
Write a project profitability analysis (400-500 words) focusing on:
1. Overall revenue composition
2. Cost allocation and efficiency
3. Margin sustainability by business line
4. Recommendations for portfolio optimization`;
      }
      break;

    case 'CUSTOM':
    default:
      specificInstructions = `
Write a comprehensive financial summary (400-500 words) that:
1. Highlights key financial metrics
2. Identifies trends and anomalies
3. Provides actionable insights
4. Recommends next steps for leadership

Focus on clarity and decision-support.`;
      break;
  }

  return `${baseContext}

${specificInstructions}

**Output Format:**
- Write in markdown format
- Use clear headings (## for main sections)
- Include bullet points for key insights
- Bold important numbers or metrics
- Write for a business audience (not accounting specialists)
- Be specific and actionable
`;
}

/**
 * Generate a title for the narrative
 */
function generateTitle(type: NarrativeType, snapshot: FinancialSnapshot): string {
  const startDate = new Date(snapshot.periodStart);
  const endDate = new Date(snapshot.periodEnd);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  switch (type) {
    case 'MONTHLY_SUMMARY':
      return `Monthly Summary — ${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`;

    case 'QUARTERLY_REVIEW':
      const quarter = Math.floor(startDate.getMonth() / 3) + 1;
      return `Q${quarter} ${startDate.getFullYear()} Review`;

    case 'YEAR_OVER_YEAR':
      return `Year-over-Year Analysis — ${startDate.getFullYear()}`;

    case 'PROJECT_PROFITABILITY':
      return `Project Profitability — ${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`;

    case 'MARGIN_ANALYSIS':
      return `Margin Analysis — ${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`;

    case 'CASH_VS_ACCRUAL':
      return `Cash vs. Accrual Analysis — ${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`;

    case 'CUSTOM':
    default:
      if (startDate.getFullYear() === endDate.getFullYear() &&
        startDate.getMonth() === endDate.getMonth()) {
        return `Financial Summary — ${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`;
      }
      return `Financial Summary — ${snapshot.periodStart} to ${snapshot.periodEnd}`;
  }
}

/**
 * Format a number as currency
 */
function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a decimal as percentage
 */
function formatPercent(decimal: number): string {
  return `${(decimal * 100).toFixed(1)}%`;
}
