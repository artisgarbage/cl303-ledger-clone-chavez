import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, AccountingBasis } from "@prisma/client";
import path from "path";
import { parseQuickBooksXLSXFile } from "./../src/lib/parsers/quickbooks";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface FileConfig {
  filename: string;
  basis: AccountingBasis;
}

const FILES_TO_IMPORT: FileConfig[] = [
  {
    filename: "codelab303 LLC_Profit and Loss - 2024 - Cash.xlsx",
    basis: "CASH",
  },
  {
    filename: "codelab303 LLC_Profit and Loss - 2025 - Cash.xlsx",
    basis: "CASH",
  },
  {
    filename: "codelab303 LLC_Profit and Loss - 2026 YTD - Cash.xlsx",
    basis: "CASH",
  },
  {
    filename: "codelab303 LLC_Profit and Loss - 2026 YTD - Accrual.xlsx",
    basis: "ACCRUAL",
  },
];

export async function seedFinancialData(): Promise<void> {
  console.log("\n📊 Seeding financial data from XLSX files...");

  // Ensure codelab303 company exists
  const company = await prisma.company.findUnique({
    where: { id: "codelab303" },
  });

  if (!company) {
    throw new Error("Company codelab303 not found. Run main seed first.");
  }

  for (const fileConfig of FILES_TO_IMPORT) {
    const filePath = path.join(
      process.cwd(),
      "setup_data",
      fileConfig.filename,
    );

    console.log(`\n  Parsing ${fileConfig.filename}...`);

    try {
      const data = await parseQuickBooksXLSXFile(filePath);

      console.log(
        `    Period: ${data.periodStart.toISOString().split("T")[0]} → ${data.periodEnd.toISOString().split("T")[0]}`,
      );
      console.log(`    Basis: ${fileConfig.basis}`);
      console.log(`    Revenue: $${data.totalRevenue.toLocaleString()}`);
      console.log(`    Net Income: $${data.netIncome.toLocaleString()}`);

      // Create or update DataImport record
      const dataImport = await prisma.dataImport.upsert({
        where: {
          // Use a composite unique key based on filename + company
          id: `seed-${fileConfig.filename.replace(/\s+/g, "-").toLowerCase()}`,
        },
        update: {
          status: "COMPLETED",
          importedAt: new Date(),
        },
        create: {
          id: `seed-${fileConfig.filename.replace(/\s+/g, "-").toLowerCase()}`,
          companyId: company.id,
          source: "QUICKBOOKS_XLSX",
          filename: fileConfig.filename,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
          basis: fileConfig.basis,
          status: "COMPLETED",
          rawData: {
            lineItemCount: data.lineItems.length,
            parsedAt: new Date().toISOString(),
          },
        },
      });

      // Create or update FinancialPeriod
      // Use a unique constraint based on company + periodStart + periodEnd + basis
      const periodId = `period-${company.id}-${data.periodStart.toISOString().split("T")[0]}-${data.periodEnd.toISOString().split("T")[0]}-${fileConfig.basis}`;

      const period = await prisma.financialPeriod.upsert({
        where: { id: periodId },
        update: {
          totalRevenue: data.totalRevenue,
          totalCOGS: data.totalCOGS,
          grossProfit: data.grossProfit,
          grossMargin: data.grossMargin,
          totalOpEx: data.totalOpEx,
          netIncome: data.netIncome,
          netMargin: data.netMargin,
          cogsPayroll: data.cogsPayroll,
          cogsContractors: data.cogsContractors,
          cogsSoftware: data.cogsSoftware,
        },
        create: {
          id: periodId,
          companyId: company.id,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
          basis: fileConfig.basis,
          importId: dataImport.id,
          totalRevenue: data.totalRevenue,
          totalCOGS: data.totalCOGS,
          grossProfit: data.grossProfit,
          grossMargin: data.grossMargin,
          totalOpEx: data.totalOpEx,
          netIncome: data.netIncome,
          netMargin: data.netMargin,
          cogsPayroll: data.cogsPayroll,
          cogsContractors: data.cogsContractors,
          cogsSoftware: data.cogsSoftware,
        },
      });

      // Delete existing line items for this period (to handle re-runs)
      await prisma.lineItem.deleteMany({
        where: { periodId: period.id },
      });

      // Insert line items (filter out totals as per spec)
      const lineItemsToInsert = data.lineItems
        .filter((item) => !item.isTotal)
        .map((item) => ({
          periodId: period.id,
          category: item.category,
          subcategory: item.subcategory,
          name: item.name,
          amount: item.amount,
          depth: item.depth,
          isTotal: item.isTotal,
          parentName: item.parentName,
        }));

      if (lineItemsToInsert.length > 0) {
        await prisma.lineItem.createMany({
          data: lineItemsToInsert,
        });
      }

      console.log(
        `    ✅ Created period ${period.id} with ${lineItemsToInsert.length} line items`,
      );
    } catch (error) {
      console.error(`    ❌ Error processing ${fileConfig.filename}:`, error);
      throw error;
    }
  }

  console.log("\n✅ Financial data seeding complete!\n");
}

// Allow running this script directly
if (require.main === module) {
  seedFinancialData()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
