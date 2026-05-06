import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = (session.user as { companyId: string }).companyId;
  if (!companyId) {
    return NextResponse.json(
      { error: "No company associated" },
      { status: 400 },
    );
  }

  const body = (await req.json()) as {
    defaultBurdenRate?: number;
    defaultContractorLag?: number;
    revenueTarget?: number | null;
    grossMarginTargetMin?: number | null;
    grossMarginTargetMax?: number | null;
    netProfitTarget?: number | null;
    harvestAccessToken?: string | null;
    harvestAccountId?: string | null;
    forecastAccountId?: string | null;
  };

  const settings = await prisma.companySettings.upsert({
    where: { companyId },
    update: {
      defaultBurdenRate: body.defaultBurdenRate,
      defaultContractorLag: body.defaultContractorLag,
      revenueTarget: body.revenueTarget,
      grossMarginTargetMin: body.grossMarginTargetMin,
      grossMarginTargetMax: body.grossMarginTargetMax,
      netProfitTarget: body.netProfitTarget,
      harvestAccessToken: body.harvestAccessToken,
      harvestAccountId: body.harvestAccountId,
      forecastAccountId: body.forecastAccountId,
    },
    create: {
      companyId,
      defaultBurdenRate: body.defaultBurdenRate ?? 1.25,
      defaultContractorLag: body.defaultContractorLag ?? 30,
      revenueTarget: body.revenueTarget ?? null,
      grossMarginTargetMin: body.grossMarginTargetMin ?? 0.28,
      grossMarginTargetMax: body.grossMarginTargetMax ?? 0.32,
      netProfitTarget: body.netProfitTarget ?? null,
      harvestAccessToken: body.harvestAccessToken ?? null,
      harvestAccountId: body.harvestAccountId ?? null,
      forecastAccountId: body.forecastAccountId ?? null,
    },
  });

  return NextResponse.json(settings);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = (session.user as { companyId: string }).companyId;

  const settings = await prisma.companySettings.findUnique({
    where: { companyId },
  });

  return NextResponse.json(settings);
}
