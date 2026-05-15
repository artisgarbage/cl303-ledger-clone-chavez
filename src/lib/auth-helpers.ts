import { auth } from "@/lib/auth";
import type { Session } from "next-auth";
import type { UserRole } from "@prisma/client";

/**
 * Require an authenticated session with admin role.
 * Returns session or throws with 403.
 * 
 * After SEC-03, session.user.companyId is guaranteed to be non-null.
 */
export async function requireAdmin(): Promise<Session & { user: { companyId: string; role: string } }> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") {
    throw new Error("Forbidden: Admin role required");
  }

  // SEC-03: companyId is now non-null at schema level
  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId) {
    throw new Error("Invalid session: companyId missing");
  }

  return session as Session & { user: { companyId: string; role: string } };
}

/**
 * Require an authenticated session with one of the specified roles.
 * Returns session or throws with 403.
 * 
 * @param allowedRoles - Single role or array of roles that are permitted
 * 
 * @example
 * ```ts
 * // Require admin only
 * const session = await requireRole("ADMIN");
 * 
 * // Allow admin or member
 * const session = await requireRole(["ADMIN", "MEMBER"]);
 * ```
 */
export async function requireRole(
  allowedRoles: UserRole | UserRole[]
): Promise<Session & { user: { companyId: string; role: UserRole } }> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const role = (session.user as { role?: string }).role as UserRole | undefined;
  const companyId = (session.user as { companyId?: string }).companyId;

  if (!role || !companyId) {
    throw new Error("Invalid session");
  }

  const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!allowed.includes(role)) {
    throw new Error(`Forbidden: One of these roles required: ${allowed.join(", ")}`);
  }

  return session as Session & { user: { companyId: string; role: UserRole } };
}

/**
 * Require an authenticated session (any role).
 * Returns session or throws with 401.
 * 
 * After SEC-03, session.user.companyId is guaranteed to be non-null.
 */
export async function requireSession(): Promise<Session & { user: { companyId: string } }> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // SEC-03: companyId is now non-null at schema level
  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId) {
    throw new Error("Invalid session: companyId missing");
  }

  return session as Session & { user: { companyId: string } };
}

/**
 * Get the authenticated user's companyId or throw.
 * 
 * After SEC-03, this is guaranteed to be a non-null string.
 */
export async function requireTenant(): Promise<string> {
  const session = await requireSession();
  return session.user.companyId;
}
