/**
 * Seed plans into the database
 *
 * Idempotent — upserts by slug, safe to run multiple times.
 * Source: src/lib/billing/plans.ts PLAN_DEFINITIONS
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { PLAN_DEFINITIONS } from "../src/lib/billing/plans";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function seedPlans() {
  console.log("Seeding plans...");

  for (const planDef of Object.values(PLAN_DEFINITIONS)) {
    await prisma.plan.upsert({
      where: { slug: planDef.slug },
      update: {
        displayName: planDef.displayName,
        priceUsdCents: planDef.priceUsdCents,
        billingCadence: planDef.billingCadence,
        rail: planDef.rail,
        entitlementsJson: planDef.entitlements,
        isPublic: planDef.isPublic,
        sortOrder: planDef.sortOrder,
      },
      create: {
        slug: planDef.slug,
        displayName: planDef.displayName,
        priceUsdCents: planDef.priceUsdCents,
        billingCadence: planDef.billingCadence,
        rail: planDef.rail,
        entitlementsJson: planDef.entitlements,
        isPublic: planDef.isPublic,
        sortOrder: planDef.sortOrder,
      },
    });

    console.log(`  ✓ ${planDef.slug} (${planDef.displayName})`);
  }

  console.log(`Seeded ${Object.keys(PLAN_DEFINITIONS).length} plans.`);
}

async function main() {
  await seedPlans();
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
