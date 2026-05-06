import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic"; // never cache

export async function GET() {
  let dbStatus: "ok" | "error" = "ok";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    console.error("[healthz] DB ping failed:", err);
    dbStatus = "error";
  }

  const healthy = dbStatus === "ok";

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime() * 10) / 10,
      db: dbStatus,
      version: process.env.npm_package_version ?? "unknown",
    },
    { status: healthy ? 200 : 503 },
  );
}
