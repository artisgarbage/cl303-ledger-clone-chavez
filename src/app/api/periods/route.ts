import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountingBasis } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = (session.user as { companyId: string }).companyId;
  const { searchParams } = new URL(req.url);
  const basisParam = searchParams.get("basis") as AccountingBasis | null;

  const where = basisParam ? { companyId, basis: basisParam } : { companyId };

  const periods = await prisma.financialPeriod.findMany({
    where,
    orderBy: { periodStart: "desc" },
    include: {
      import: { select: { filename: true, importedAt: true } },
    },
  });

  return NextResponse.json(periods);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = (session.user as { companyId: string }).companyId;
  const { searchParams } = new URL(req.url);
  const periodId = searchParams.get("id");

  if (!periodId) {
    return NextResponse.json({ error: "Period ID required" }, { status: 400 });
  }

  const period = await prisma.financialPeriod.findFirst({
    where: { id: periodId, companyId },
  });

  if (!period) {
    return NextResponse.json({ error: "Period not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.lineItem.deleteMany({ where: { periodId } }),
    prisma.financialPeriod.delete({ where: { id: periodId } }),
  ]);

  return NextResponse.json({ success: true });
}
