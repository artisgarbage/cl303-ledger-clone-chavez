/**
 * Audit logging for financial data access and mutations.
 * 
 * Every read, create, update, or delete of sensitive financial resources
 * is logged to the AccessAudit table for compliance (SOC 2, GDPR) and
 * forensic investigation.
 * 
 * @module lib/audit
 */

import { prisma } from "./prisma";

export type AuditAction = "read" | "create" | "update" | "delete";

export type AuditResource =
  | "narrative"
  | "period"
  | "project"
  | "people"
  | "import"
  | "user";

export interface LogAccessParams {
  userId: string;
  companyId: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an access event to the audit trail.
 * 
 * This function is fire-and-forget — it does not throw or return errors.
 * Audit failures are logged to console but do not block the operation.
 * 
 * @param params - Audit log parameters
 */
export async function logAccess(params: LogAccessParams): Promise<void> {
  try {
    await prisma.accessAudit.create({
      data: {
        userId: params.userId,
        companyId: params.companyId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        metadata: params.metadata,
      },
    });
  } catch (error) {
    // Audit failures must not block the operation. Log and continue.
    console.error("[audit] Failed to log access:", error);
  }
}

/**
 * Helper: extract metadata from NextRequest for audit logs.
 * 
 * @param req - Next.js request object
 * @returns Metadata object with routePath, method, ipAddress, userAgent
 */
export function extractRequestMetadata(req: {
  nextUrl?: { pathname: string };
  method?: string;
  headers?: Headers;
  url?: string;
}): Record<string, string> {
  const pathname =
    req.nextUrl?.pathname || (req.url ? new URL(req.url).pathname : "unknown");
  const method = req.method || "GET";

  // Note: req.ip is not reliably available in Next.js 14+.
  // Use X-Forwarded-For or X-Real-IP headers if behind a proxy.
  const ipAddress =
    req.headers?.get("x-forwarded-for")?.split(",")[0] ||
    req.headers?.get("x-real-ip") ||
    "unknown";

  const userAgent = req.headers?.get("user-agent") || "unknown";

  return {
    routePath: pathname,
    method,
    ipAddress,
    userAgent,
  };
}
