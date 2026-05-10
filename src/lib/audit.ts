/**
 * Structured audit logging for financial data access/mutations.
 *
 * Rules:
 *  - Log WHO, WHEN, WHAT action, on WHICH entity, with a request-id
 *  - NEVER log row contents, PII beyond user id, or raw financial values
 *  - All output goes to stdout as structured JSON (captured by Cloud Logging)
 */

type AuditAction =
  | "ingest.start"
  | "ingest.success"
  | "ingest.failed"
  | "financial.read"
  | "financial.list"
  | "narrative.generate"
  | "narrative.read"
  | "user.invite"
  | "user.roleChange"
  | "settings.update";

interface AuditEntry {
  level: "AUDIT";
  action: AuditAction;
  userId: string;
  companyId: string;
  entity?: string;
  entityId?: string;
  requestId?: string;
  /** Safe metadata only — no row contents */
  meta?: Record<string, string | number | boolean>;
}

export function auditLog(entry: AuditEntry): void {
  const record = {
    ...entry,
    timestamp: new Date().toISOString(),
  };
  // Cloud Logging picks up structured JSON on stdout
  process.stdout.write(JSON.stringify(record) + "\n");
}
