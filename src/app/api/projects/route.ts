import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectProfitability } from "@/lib/engine/project-profitability";
import { AccountingBasis } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = (session.user as { companyId: string }).companyId;
  const { searchParams } = new URL(req.url);
  const basisParam = (searchParams.get("basis") ?? "CASH") as AccountingBasis;
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  if (!startParam || !endParam) {
    return NextResponse.json(
      { error: "start and end params required" },
      { status: 400 },
    );
  }

  const start = new Date(startParam);
  const end = new Date(endParam);

  const projects = await getProjectProfitability(
    companyId,
    start,
    end,
    basisParam,
  );

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = (session.user as { companyId: string }).companyId;
  const body = (await req.json()) as {
    name: string;
    clientName?: string;
    classification: "FUND" | "FRONTIER";
    status?: string;
    startDate?: string;
    contractValue?: number;
    monthlyRetainer?: number;
  };

  const project = await prisma.project.create({
    data: {
      companyId,
      name: body.name,
      clientName: body.clientName ?? null,
      classification: body.classification,
      status:
        (body.status as "ACTIVE" | "COMPLETED" | "PAUSED" | "LOST") ?? "ACTIVE",
      startDate: body.startDate ? new Date(body.startDate) : null,
      contractValue: body.contractValue ?? null,
      monthlyRetainer: body.monthlyRetainer ?? null,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
