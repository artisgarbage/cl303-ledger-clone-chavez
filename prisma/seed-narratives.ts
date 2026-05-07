import { PrismaClient, NarrativeType, AccountingBasis } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";
import { format } from "date-fns";

const prisma = new PrismaClient();

interface NarrativeSeedSpec {
  type: NarrativeType;
  periodStart: Date;
  periodEnd: Date;
  basis: AccountingBasis;
  title: string;
}

const NARRATIVES: NarrativeSeedSpec[] = [
  {
    type: NarrativeType.YEAR_OVER_YEAR,
    periodStart: new Date("2024-01-01"),
    periodEnd: new Date("2024-12-31"),
    basis: AccountingBasis.CASH,
    title: "Full Year 2024 — Year-over-Year Analysis",
  },
  {
    type: NarrativeType.MONTHLY_SUMMARY,
    periodStart: new Date("2024-01-01"),
    periodEnd: new Date("2024-12-31"),
    basis: AccountingBasis.CASH,
    title: "Annual Summary 2024",
  },
  {
    type: NarrativeType.YEAR_OVER_YEAR,
    periodStart: new Date("2025-01-01"),
    periodEnd: new Date("2025-12-31"),
    basis: AccountingBasis.CASH,
    title: "Full Year 2025 — Year-over-Year Analysis",
  },
  {
    type: NarrativeType.MONTHLY_SUMMARY,
    periodStart: new Date("2025-01-01"),
    periodEnd: new Date("2025-12-31"),
    basis: AccountingBasis.CASH,
    title: "Annual Summary 2025",
  },
  {
    type: NarrativeType.MARGIN_ANALYSIS,
    periodStart: new Date("2025-01-01"),
    periodEnd: new Date("2025-12-31"),
    basis: AccountingBasis.CASH,
    title: "2025 Margin Analysis",
  },
  {
    type: NarrativeType.MONTHLY_SUMMARY,
    periodStart: new Date("2026-01-01"),
    periodEnd: new Date("2026-04-15"),
    basis: AccountingBasis.CASH,
    title: "2026 YTD Summary (Cash)",
  },
  {
    type: NarrativeType.CASH_VS_ACCRUAL,
    periodStart: new Date("2026-01-01"),
    periodEnd: new Date("2026-04-15"),
    basis: AccountingBasis.CASH,
    title: "2026 YTD — Cash vs. Accrual Reconciliation",
  },
];

/**
 * Build a simple context string from available FinancialPeriod data
 */
function buildSimpleContext(periods: Array<{
  periodStart: Date;
  periodEnd: Date;
  basis: AccountingBasis;
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  grossMargin: number;
  totalOpEx: number;
  netIncome: number;
  netMargin: number;
}>): string {
  if (periods.length === 0) {
    return "No financial data available for this period.";
  }

  return periods
    .map((p) => {
      const periodLabel = format(p.periodStart, "MMM yyyy");
      return `
Period: ${periodLabel} (${p.basis})
Revenue: $${p.totalRevenue.toFixed(0)}
COGS: $${p.totalCOGS.toFixed(0)}
Gross Profit: $${p.grossProfit.toFixed(0)} (${(p.grossMargin * 100).toFixed(1)}%)
OpEx: $${p.totalOpEx.toFixed(0)}
Net Income: $${p.netIncome.toFixed(0)} (${(p.netMargin * 100).toFixed(1)}%)
`.trim();
    })
    .join("\n\n");
}

/**
 * Build a prompt for the narrative based on available financial data
 */
function buildNarrativePrompt(
  spec: NarrativeSeedSpec,
  context: string,
  companyName: string
): string {
  const periodLabel = `${format(spec.periodStart, "MMM yyyy")} to ${format(spec.periodEnd, "MMM yyyy")}`;
  
  return `You are a fractional CFO writing a financial narrative for the CEO of ${companyName}.

Report Type: ${spec.type.replace(/_/g, " ")}
Period: ${periodLabel}
Basis: ${spec.basis}

Financial Data:
${context}

Write a 3-5 paragraph narrative covering:
1. Overall financial performance for this period
2. Revenue trends and trajectory
3. Cost structure and margin analysis
4. Key insights and concerns
5. One concrete recommendation

Be direct, specific, and honest. Use plain language. Focus on what matters most to the CEO.`;
}

export async function seedNarratives() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn(
      "[seed:narratives] ANTHROPIC_API_KEY not set, skipping narrative generation",
    );
    return;
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const companyId = "codelab303";

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { settings: true },
  });

  if (!company) {
    console.error("[seed:narratives] Company not found");
    return;
  }

  let generatedCount = 0;
  let skippedCount = 0;

  for (const spec of NARRATIVES) {
    const periodKey = `${format(spec.periodStart, "yyyy-MM-dd")}_${format(spec.periodEnd, "yyyy-MM-dd")}`;
    
    // Check if narrative already exists
    const existing = await prisma.narrative.findFirst({
      where: {
        companyId,
        type: spec.type,
        periodStart: spec.periodStart,
        periodEnd: spec.periodEnd,
      },
    });

    if (existing) {
      console.log(
        `[seed:narratives] skipped ${spec.type} ${periodKey} (already exists)`,
      );
      skippedCount++;
      continue;
    }

    // Check if financial data exists for this period
    const periods = await prisma.financialPeriod.findMany({
      where: {
        companyId,
        basis: spec.basis,
        periodStart: {
          gte: spec.periodStart,
        },
        periodEnd: {
          lte: spec.periodEnd,
        },
      },
      orderBy: { periodStart: "asc" },
      select: {
        periodStart: true,
        periodEnd: true,
        basis: true,
        totalRevenue: true,
        totalCOGS: true,
        grossProfit: true,
        grossMargin: true,
        totalOpEx: true,
        netIncome: true,
        netMargin: true,
      },
    });

    if (periods.length === 0) {
      console.warn(
        `[seed:narratives] skipped ${spec.type} ${periodKey} (no financial data found for period)`,
      );
      skippedCount++;
      continue;
    }

    const startTime = Date.now();
    console.log(`[seed:narratives] generating ${spec.type} ${periodKey}…`);

    try {
      const context = buildSimpleContext(periods);
      const prompt = buildNarrativePrompt(spec, context, company.name);

      // Call Anthropic API
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });

      const content =
        response.content[0]?.type === "text" ? response.content[0].text : "";

      if (!content) {
        console.warn(
          `[seed:narratives] skipped ${spec.type} ${periodKey} (empty response from API)`,
        );
        skippedCount++;
        continue;
      }

      // Save narrative
      await prisma.narrative.create({
        data: {
          companyId,
          type: spec.type,
          periodStart: spec.periodStart,
          periodEnd: spec.periodEnd,
          basis: spec.basis,
          content,
          title: spec.title,
          dataSnapshot: {
            type: spec.type,
            periods: periods.length,
            generated: new Date().toISOString(),
          },
        },
      });

      const elapsed = Date.now() - startTime;
      console.log(
        `[seed:narratives] generating ${spec.type} ${periodKey}… done (${elapsed}ms)`,
      );
      generatedCount++;
      
      // Add a small delay between API calls to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(
        `[seed:narratives] failed to generate ${spec.type} ${periodKey}:`,
        error instanceof Error ? error.message : error,
      );
      skippedCount++;
    }
  }

  console.log(
    `[seed:narratives] complete: ${generatedCount} generated, ${skippedCount} skipped`,
  );
}
