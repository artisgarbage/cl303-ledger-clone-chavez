/**
 * Capability-based authorization for Margot.
 * 
 * A capability is a granular permission to perform a specific action.
 * Capabilities are assigned to roles, and roles are assigned to users.
 * 
 * This module defines the complete capability catalog and the mapping from
 * UserRole to capabilities. Tests snapshot the mapping so changes require
 * explicit review.
 */

import type { UserRole } from "@prisma/client";

/**
 * All capabilities in the system.
 * 
 * Naming convention: `resource.operation` or `resource.feature.operation`.
 * Examples:
 * - `company.settings.read` — read company settings
 * - `narratives.generate` — trigger narrative generation
 * - `admin.users.write` — create/update/delete users (admin panel)
 */
export type Capability =
  // Company settings
  | "company.settings.read"
  | "company.settings.write"
  // People (team members tracked in the ledger, not system users)
  | "people.read"
  | "people.write"
  // Projects
  | "projects.read"
  | "projects.write"
  // Financial periods
  | "periods.read"
  | "periods.write"
  // Imports (QuickBooks, CSV, bank feeds)
  | "imports.run"
  // Narratives
  | "narratives.read"
  | "narratives.generate"
  // CFO chat (Margot)
  | "cfo.chat"
  | "cfo.mode.internal"
  | "cfo.mode.proposal"
  | "cfo.mode.board"
  // Billing
  | "billing.read"
  | "billing.manage"
  // Team management (User accounts, not ledger People)
  | "members.invite"
  | "members.remove"
  | "members.role.change"
  // Agent identities (Rail B)
  | "agent.identity.issue"
  | "agent.identity.revoke"
  // Admin panel
  | "admin.users.read"
  | "admin.users.write"
  | "admin.ingest.run";

/**
 * Role → Capability mapping.
 * 
 * This is the single source of truth for what each role can do.
 * Changes to this mapping affect authorization everywhere in the app.
 * 
 * Design notes:
 * - VIEWER: read-only ledger access, can chat with Margot (Internal mode only)
 * - MEMBER: can write to the ledger (people, projects, periods), generate narratives
 * - ADMIN: full access including billing, team management, and agent identities
 */
export const ROLE_CAPABILITIES: Record<UserRole, Set<Capability>> = {
  VIEWER: new Set([
    "company.settings.read",
    "people.read",
    "projects.read",
    "periods.read",
    "narratives.read",
    "cfo.chat",
    "cfo.mode.internal",
    "billing.read",
  ]),

  MEMBER: new Set([
    "company.settings.read",
    "people.read",
    "people.write",
    "projects.read",
    "projects.write",
    "periods.read",
    "periods.write",
    "imports.run",
    "narratives.read",
    "narratives.generate",
    "cfo.chat",
    "cfo.mode.internal",
    "cfo.mode.proposal",
    "cfo.mode.board",
    "billing.read",
  ]),

  ADMIN: new Set([
    "company.settings.read",
    "company.settings.write",
    "people.read",
    "people.write",
    "projects.read",
    "projects.write",
    "periods.read",
    "periods.write",
    "imports.run",
    "narratives.read",
    "narratives.generate",
    "cfo.chat",
    "cfo.mode.internal",
    "cfo.mode.proposal",
    "cfo.mode.board",
    "billing.read",
    "billing.manage",
    "members.invite",
    "members.remove",
    "members.role.change",
    "agent.identity.issue",
    "agent.identity.revoke",
    "admin.users.read",
    "admin.users.write",
    "admin.ingest.run",
  ]),
};

/**
 * Get all capabilities for a role.
 */
export function getCapabilitiesForRole(role: UserRole): Set<Capability> {
  return ROLE_CAPABILITIES[role];
}

/**
 * Check if a role has a specific capability.
 */
export function roleHasCapability(role: UserRole, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role].has(capability);
}
