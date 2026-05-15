/**
 * Core authorization primitives: can() and assertCan().
 * 
 * These functions are the entry point for all capability-based authorization
 * in the app. They enforce tenant isolation, role-based capabilities, and
 * audit all authorization decisions.
 */

import type { Session } from "next-auth";
import type { Capability } from "./capabilities";
import { roleHasCapability } from "./capabilities";
import { AuthorizationDenied, TenantMismatch } from "./errors";
import { logAccess } from "@/lib/audit";

/**
 * Resource with optional company ownership for tenant checks.
 */
export type Resource = {
  companyId?: string;
  id?: string;
  type?: string;
};

/**
 * Check if the session holder can perform a capability.
 * 
 * Returns true if authorized, false otherwise.
 * Does NOT throw — use this for UI conditional rendering.
 * Does NOT audit — only assertCan() writes audit logs.
 * 
 * @param session - NextAuth session with user.role and user.companyId
 * @param capability - The capability to check
 * @param resource - Optional resource to check tenant isolation against
 */
export async function can(
  session: Session | null,
  capability: Capability,
  resource?: Resource
): Promise<boolean> {
  if (!session?.user) {
    return false;
  }

  const user = session.user as { role?: string; companyId?: string };
  const role = user.role;
  const userCompanyId = user.companyId;

  if (!role || !userCompanyId) {
    return false;
  }

  // Tenant isolation — if resource has a companyId, it must match
  if (resource?.companyId && resource.companyId !== userCompanyId) {
    return false;
  }

  // Check role capability
  return roleHasCapability(role as "ADMIN" | "MEMBER" | "VIEWER", capability);
}

/**
 * Assert that the session holder can perform a capability.
 * 
 * Throws AuthorizationDenied or TenantMismatch if not authorized.
 * Writes an AccessAudit log for every call (success or failure).
 * 
 * Use this in route handlers and server actions where authorization is
 * required for the request to proceed.
 * 
 * @param session - NextAuth session with user.role and user.companyId
 * @param capability - The capability to check
 * @param resource - Optional resource to check tenant isolation against
 */
export async function assertCan(
  session: Session | null,
  capability: Capability,
  resource?: Resource
): Promise<void> {
  if (!session?.user) {
    throw new AuthorizationDenied(capability, "No authenticated session");
  }

  const user = session.user as { id?: string; role?: string; companyId?: string };
  const userId = user.id;
  const role = user.role;
  const userCompanyId = user.companyId;

  if (!role || !userCompanyId || !userId) {
    throw new AuthorizationDenied(capability, "Invalid session");
  }

  // Tenant isolation check FIRST — fail fast before role check
  if (resource?.companyId && resource.companyId !== userCompanyId) {
    // Log the attempt
    await logAccess({
      userId,
      companyId: userCompanyId,
      action: "denied",
      resource: resource.type || "unknown",
      resourceId: resource.id,
      metadata: {
        reason: "tenant_mismatch",
        requestedCompanyId: resource.companyId,
        capability,
      },
    });

    // Return 404, not 403 — don't leak existence of the resource
    throw new TenantMismatch(resource.companyId, userCompanyId);
  }

  // Check role capability
  const hasCapability = roleHasCapability(
    role as "ADMIN" | "MEMBER" | "VIEWER",
    capability
  );

  if (!hasCapability) {
    // Log the denial
    await logAccess({
      userId,
      companyId: userCompanyId,
      action: "denied",
      resource: resource?.type || "unknown",
      resourceId: resource?.id,
      metadata: {
        reason: "missing_capability",
        capability,
        role,
      },
    });

    throw new AuthorizationDenied(capability);
  }

  // Log the successful authorization
  await logAccess({
    userId,
    companyId: userCompanyId,
    action: "authorized",
    resource: resource?.type || "unknown",
    resourceId: resource?.id,
    metadata: {
      capability,
      role,
    },
  });
}
