/**
 * Typed errors for authorization failures.
 * 
 * These errors are thrown by guards and capability checks, and are caught
 * by route handlers to return appropriate HTTP status codes.
 */

import type { Capability } from "./capabilities";

/**
 * Thrown when a user attempts an action they don't have permission for.
 * 
 * Maps to HTTP 403.
 */
export class AuthorizationDenied extends Error {
  constructor(
    public readonly capability: Capability,
    public readonly reason?: string
  ) {
    super(reason || `Missing required capability: ${capability}`);
    this.name = "AuthorizationDenied";
  }
}

/**
 * Thrown when a session is required but not present.
 * 
 * Maps to HTTP 401.
 */
export class Unauthenticated extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "Unauthenticated";
  }
}

/**
 * Thrown when a user attempts to access a resource belonging to another company.
 * 
 * This is a security-critical error. Log it with full context.
 * Maps to HTTP 404 (NOT 403 — don't leak existence).
 */
export class TenantMismatch extends Error {
  constructor(
    public readonly requestedCompanyId: string,
    public readonly userCompanyId: string
  ) {
    super("Resource not found");
    this.name = "TenantMismatch";
  }
}
