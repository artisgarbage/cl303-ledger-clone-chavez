import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseQuickBooksXLSX } from "@/lib/parsers/quickbooks";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = (session.user as { companyId: string }).companyId;
  if (!companyId) {
    return NextResponse.json(
      { error: "No company associated with account" },
      { status: 400 },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return NextResponse.json(
        { error: "File must be an Excel file (.xlsx or .xls)" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Create import record
    const dataImport = await prisma.dataImport.create({
      data: {
        companyId,
        source: "quickbooks",
        filename: file.name,
        status: "PROCESSING",
      },
    });

    let parsed;
    try {
      parsed = await parseQuickBooksXLSX(buffer);
    } catch (parseErr) {
      await prisma.dataImport.update({
        where: { id: dataImport.id },
        data: {
          status: "FAILED",
          errorLog:
            parseErr instanceof Error ? parseErr.message : String(parseErr),
        },
      });
      return NextResponse.json(
        {
          error: `Parse error: ${parseErr instanceof Error ? parseErr.message : "Unknown error"}`,
        },
        { status: 422 },
      );
    }

    // Check for duplicate period+basis
    const existing = await prisma.financialPeriod.findFirst({
      where: {
        companyId,
        basis: parsed.basis,
        periodStart: parsed.periodStart,
        periodEnd: parsed.periodEnd,
      },
    });

    if (existing) {
      await prisma.dataImport.update({
        where: { id: dataImport.id },
        data: { status: "FAILED", errorLog: "Period already imported" },
      });
      return NextResponse.json(
        {
          error: `A ${parsed.basis} import for this period already exists. Delete it first if you want to reimport.`,
        },
        { status: 409 },
      );
    }

    // Create FinancialPeriod and LineItems in a transaction
    const period = await prisma.$transaction(async (tx) => {
      const fp = await tx.financialPeriod.create({
        data: {
          companyId,
          periodStart: parsed.periodStart,
          periodEnd: parsed.periodEnd,
          basis: parsed.basis,
          importId: dataImport.id,
          totalRevenue: parsed.totalRevenue,
          totalCOGS: parsed.totalCOGS,
          grossProfit: parsed.grossProfit,
          grossMargin: parsed.grossMargin,
          totalOpEx: parsed.totalOpEx,
          netIncome: parsed.netIncome,
          netMargin: parsed.netMargin,
          cogsPayroll: parsed.cogsPayroll,
          cogsContractors: parsed.cogsContractors,
          cogsSoftware: parsed.cogsSoftware,
        },
      });

      if (parsed.lineItems.length > 0) {
        await tx.lineItem.createMany({
          data: parsed.lineItems.map((li) => ({
            periodId: fp.id,
            category: li.category,
            subcategory: li.subcategory,
            name: li.name,
            amount: li.amount,
            depth: li.depth,
            isTotal: li.isTotal,
            parentName: li.parentName,
          })),
        });
      }

      return fp;
    });

    await prisma.dataImport.update({
      where: { id: dataImport.id },
      data: {
        status: "COMPLETED",
        periodStart: parsed.periodStart,
        periodEnd: parsed.periodEnd,
        basis: parsed.basis,
        rawData: { summary: { rows: parsed.rawRows.length } },
      },
    });

    return NextResponse.json({
      success: true,
      periodId: period.id,
      importId: dataImport.id,
      period: {
        start: parsed.periodStart,
        end: parsed.periodEnd,
        basis: parsed.basis,
        revenue: parsed.totalRevenue,
        grossMargin: parsed.grossMargin,
        netIncome: parsed.netIncome,
      },
    });
  } catch (err) {
    console.error("QuickBooks import error:", err);
    return NextResponse.json(
      { error: "Internal server error during import" },
      { status: 500 },
    );
  }
}
