import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAccess, extractRequestMetadata } from "@/lib/audit";
import { AccountingBasis } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = (session.user as { companyId: string }).companyId;
  const userId = session.user.id;
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

  // Audit log: financial period bulk read
  if (userId) {
    await logAccess({
      userId,
      companyId,
      action: 'read',
      resource: 'period',
      metadata: {
        ...extractRequestMetadata(req),
        count: periods.length,
        basis: basisParam,
      },
    });
  }

  return NextResponse.json(periods);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = (session.user as { companyId: string }).companyId;
  const userId = session.user.id;
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

  // Audit log: financial period deletion
  if (userId) {
    await logAccess({
      userId,
      companyId,
      action: 'delete',
      resource: 'period',
      resourceId: periodId,
      metadata: {
        ...extractRequestMetadata(req),
        periodStart: period.periodStart.toISOString(),
        periodEnd: period.periodEnd.toISOString(),
        basis: period.basis,
      },
    });
  }

  return NextResponse.json({ success: true });
}
