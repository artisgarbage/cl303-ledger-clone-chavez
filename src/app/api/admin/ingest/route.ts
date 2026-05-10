/**
 * POST /api/admin/ingest
 *
 * Admin-only endpoint. Reads a financial XLSX from the locked-down GCS
 * financials bucket (never from a local file upload) and imports it.
 *
 * Flow:
 *   1. Verify caller is authenticated + has ADMIN role
 *   2. Validate the GCS URI parameter (must be within the allowed bucket)
 *   3. Stream the file from GCS via the pod's Workload Identity credential
 *   4. Parse with the existing quickbooks parser
 *   5. Upsert financial periods into the DB
 *   6. Write an IngestAudit row (file hash, row count, outcome)
 *   7. Return summary — never the raw data
 *
 * The raw file is never logged, echoed in a response, or stored locally.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

const ALLOWED_BUCKET = process.env.FINANCIALS_BUCKET_NAME ?? "";

/** Fetch an object from GCS using the ambient Workload Identity credential. */
async function fetchFromGcs(gcsUri: string): Promise<Buffer> {
  // gcsUri format: gs://bucket-name/path/to/file.xlsx
  const match = gcsUri.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!match) throw new Error("Invalid GCS URI format");
  const [, bucket, object] = match;
  const encodedObject = encodeURIComponent(object);

  // Use the metadata server token (available inside GKE with Workload Identity)
  const tokenRes = await fetch(
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
    { headers: { "Metadata-Flavor": "Google" } },
  );
  if (!tokenRes.ok) {
    throw new Error("Failed to obtain access token from metadata server");
  }
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  const url = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodedObject}?alt=media`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!res.ok) {
    throw new Error(`GCS fetch failed: ${res.status} ${res.statusText}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // --- Auth ---
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as { id: string; role: string; companyId: string };
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!user.companyId) {
    return NextResponse.json(
      { error: "No company associated" },
      { status: 400 },
    );
  }

  // --- Input validation ---
  let gcsUri: string;
  let basis: "CASH" | "ACCRUAL";
  try {
    const body = await req.json();
    gcsUri = String(body.gcsUri ?? "");
    basis = body.basis === "ACCRUAL" ? "ACCRUAL" : "CASH";
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  if (!gcsUri.startsWith(`gs://${ALLOWED_BUCKET}/`)) {
    return NextResponse.json(
      { error: "gcsUri must be within the allowed financials bucket" },
      { status: 400 },
    );
  }

  const fileName = gcsUri.split("/").pop() ?? "unknown";
  const requestId = crypto.randomUUID();

  auditLog({
    level: "AUDIT",
    action: "ingest.start",
    userId: user.id,
    companyId: user.companyId,
    entity: "DataImport",
    requestId,
    meta: { fileName, gcsUri, basis },
  });

  // Create a pending audit record
  const audit = await prisma.ingestAudit.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      fileName,
      fileHash: "pending",
      gcsUri,
      status: "PENDING",
    },
  });

  try {
    // --- Fetch from GCS ---
    const fileBuffer = await fetchFromGcs(gcsUri);
    const fileHash = createHash("sha256").update(fileBuffer).digest("hex");

    // --- Parse ---
    const { parseQuickBooksXLSX } = await import("@/lib/parsers/quickbooks");
    const period = await parseQuickBooksXLSX(fileBuffer);
    // Wrap single-period result in array for consistent handling
    const parsed = { periods: [{ ...period, basis }] };

    if (!parsed || !parsed.periods?.length) {
      throw new Error("Parser returned no periods");
    }

    // --- Upsert DataImport ---
    const dataImport = await prisma.dataImport.create({
      data: {
        companyId: user.companyId,
        source: "gcs_ingest",
        filename: fileName,
        basis,
        status: "PROCESSING",
        periodStart: parsed.periods[0]?.periodStart,
        periodEnd: parsed.periods[parsed.periods.length - 1]?.periodEnd,
      },
    });

    // --- Upsert financial periods (delegate to existing import logic) ---
    let rowCount = 0;
    for (const period of parsed.periods) {
      await prisma.financialPeriod.create({
        data: {
          companyId: user.companyId,
          importId: dataImport.id,
          periodStart: period.periodStart,
          periodEnd: period.periodEnd,
          basis,
          totalRevenue: period.totalRevenue,
          totalCOGS: period.totalCOGS,
          grossProfit: period.grossProfit,
          grossMargin: period.grossMargin,
          totalOpEx: period.totalOpEx,
          netIncome: period.netIncome,
          netMargin: period.netMargin,
          lineItems: {
            create: period.lineItems.map((li) => ({
              category: li.category,
              subcategory: li.subcategory ?? null,
              name: li.name,
              amount: li.amount,
              depth: li.depth,
              isTotal: li.isTotal,
              parentName: li.parentName ?? null,
            })),
          },
        },
      });
      rowCount += period.lineItems.length;
    }

    await prisma.dataImport.update({
      where: { id: dataImport.id },
      data: { status: "COMPLETED" },
    });

    await prisma.ingestAudit.update({
      where: { id: audit.id },
      data: { fileHash, rowCount, status: "SUCCESS" },
    });

    auditLog({
      level: "AUDIT",
      action: "ingest.success",
      userId: user.id,
      companyId: user.companyId,
      entity: "DataImport",
      entityId: dataImport.id,
      requestId,
      meta: { fileName, fileHash, rowCount, periods: parsed.periods.length },
    });

    return NextResponse.json({
      ok: true,
      importId: dataImport.id,
      rowCount,
      periods: parsed.periods.length,
      fileHash,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await prisma.ingestAudit.update({
      where: { id: audit.id },
      data: { status: "FAILED", errorMsg: msg },
    });

    auditLog({
      level: "AUDIT",
      action: "ingest.failed",
      userId: user.id,
      companyId: user.companyId,
      requestId,
      meta: { fileName, error: msg },
    });

    return NextResponse.json(
      { error: "Ingest failed", detail: msg },
      { status: 500 },
    );
  }
}
