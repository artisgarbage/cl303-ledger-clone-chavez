/**
 * Entitlement resolution, quota tracking, and usage recording
 *
 * Core billing primitives. All metered features gate through this module.
 *
 * Key design decisions:
 * - Companies without a Subscription row default to FREE plan (no DB write on read)
 * - Period boundaries: use subscription's currentPeriodStart/End if present; else calendar month UTC
 * - FREE plan: hard cap (throw QuotaExceeded)
 * - STARTER+: soft cap (allow overage, OverageCharge rows written at period close)
 * - Usage recording: fire-and-forget after successful work, never before
 */

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { PlanSlug, UsageKind, ChatMode } from "@prisma/client";
import { PLAN_DEFINITIONS, type Entitlements } from "./plans";
import { PlanUpgradeRequired, QuotaExceeded, EntitlementDenied } from "./errors";
import { startOfMonth, endOfMonth } from "date-fns";

// -----------------------------------------------------------------
// Types
// -----------------------------------------------------------------

export type EntitlementKey =
  | "narratives.generate"
  | "cfo.chat"
  | "cfo.mode.internal"
  | "cfo.mode.proposal"
  | "cfo.mode.board"
  | "imports.qb"
  | "imports.bank"
  | "api.read";

export type ResolvedPlan = {
  plan: PlanSlug;
  displayName: string;
  entitlements: Entitlements;
  subscription: {
    id: string;
    status: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
  } | null;
};

export type QuotaStatus = {
  kind: UsageKind;
  used: number;
  cap: number | "unlimited";
  remaining: number | "unlimited";
  overageAvailable: boolean;
  overageUnitPriceCents: number | null;
};

export type UsageRecordResult = {
  runningTotal: number;
  withinCap: boolean;
  overageUnits: number;
};

// -----------------------------------------------------------------
// Plan resolution — cached per request
// -----------------------------------------------------------------

/**
 * Get the active plan and entitlements for a company
 *
 * Returns FREE plan if no subscription exists (implicit fallback, no DB write).
 * Caches the result per request to avoid repeated DB hits.
 */
export const getActivePlan = cache(
  async (companyId: string): Promise<ResolvedPlan> => {
    const subscription = await prisma.subscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });

    if (subscription) {
      return {
        plan: subscription.plan.slug,
        displayName: subscription.plan.displayName,
        entitlements: subscription.plan
          .entitlementsJson as unknown as Entitlements,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
        },
      };
    }

    // No subscription → FREE plan (implicit)
    const freePlan = PLAN_DEFINITIONS.FREE;
    const now = new Date();
    const periodStart = startOfMonth(now);
    const periodEnd = endOfMonth(now);

    return {
      plan: "FREE",
      displayName: freePlan.displayName,
      entitlements: freePlan.entitlements,
      subscription: {
        id: "implicit-free",
        status: "ACTIVE",
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    };
  }
);

// -----------------------------------------------------------------
// Entitlement checks
// -----------------------------------------------------------------

/**
 * Assert that a company has a specific entitlement
 *
 * Throws PlanUpgradeRequired or EntitlementDenied if missing.
 */
export async function assertEntitlement(
  companyId: string,
  key: EntitlementKey
): Promise<void> {
  const { plan, entitlements } = await getActivePlan(companyId);

  switch (key) {
    case "cfo.mode.internal":
      // Always available on all plans
      return;

    case "cfo.mode.proposal":
      if (!entitlements.modes.includes("PROPOSAL_BIZDEV")) {
        throw new PlanUpgradeRequired(
          "STUDIO",
          "Proposal mode is part of Studio.",
          "/account/billing?upgrade=STUDIO"
        );
      }
      return;

    case "cfo.mode.board":
      if (!entitlements.modes.includes("BOARD_INVESTOR")) {
        throw new PlanUpgradeRequired(
          "STUDIO",
          "Board mode is part of Studio.",
          "/account/billing?upgrade=STUDIO"
        );
      }
      return;

    case "imports.qb":
      if (
        !entitlements.imports.includes("QB") &&
        !entitlements.imports.includes("ALL")
      ) {
        throw new PlanUpgradeRequired(
          "STARTER",
          "QuickBooks import requires Starter or higher.",
          "/account/billing?upgrade=STARTER"
        );
      }
      return;

    case "imports.bank":
      if (
        !entitlements.imports.includes("BANK") &&
        !entitlements.imports.includes("ALL")
      ) {
        throw new PlanUpgradeRequired(
          "STUDIO",
          "Bank import requires Studio or higher.",
          "/account/billing?upgrade=STUDIO"
        );
      }
      return;

    case "api.read":
      if (!entitlements.apiReadEnabled) {
        throw new PlanUpgradeRequired(
          "PRACTICE",
          "Read-only API access requires Practice or higher.",
          "/account/billing?upgrade=PRACTICE"
        );
      }
      return;

    case "narratives.generate":
    case "cfo.chat":
      // Quota-based entitlements — check via checkQuota() instead
      return;

    default:
      throw new EntitlementDenied(
        key,
        `Unknown entitlement key: ${key}`
      );
  }
}

/**
 * Check entitlement for a specific mode
 *
 * Convenience wrapper around assertEntitlement for mode-checking.
 */
export async function assertMode(
  companyId: string,
  mode: ChatMode
): Promise<void> {
  const keyMap: Record<ChatMode, EntitlementKey> = {
    INTERNAL_CFO: "cfo.mode.internal",
    PROPOSAL_BIZDEV: "cfo.mode.proposal",
    BOARD_INVESTOR: "cfo.mode.board",
  };

  await assertEntitlement(companyId, keyMap[mode]);
}

// -----------------------------------------------------------------
// Quota checking
// -----------------------------------------------------------------

/**
 * Check current usage against quota for a given kind
 *
 * Pure read — does NOT record usage.
 * Returns usage status and overage availability.
 */
export async function checkQuota(
  companyId: string,
  kind: UsageKind
): Promise<QuotaStatus> {
  const { plan, entitlements, subscription } = await getActivePlan(companyId);

  // Determine period boundaries
  const periodStart = subscription?.currentPeriodStart || startOfMonth(new Date());
  const periodEnd = subscription?.currentPeriodEnd || endOfMonth(new Date());

  // Count usage in current period
  const usageCount = await prisma.usageEvent.count({
    where: {
      companyId,
      kind,
      occurredAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
  });

  // Determine cap based on kind
  let cap: number | "unlimited";
  let overageUnitPriceCents: number | null = null;

  if (kind === "NARRATIVE_GENERATED") {
    cap = entitlements.narrativesPerMonth;
    overageUnitPriceCents = entitlements.overage?.narrative?.unitPriceCents ?? null;
  } else if (kind === "CFO_TURN") {
    cap = entitlements.cfoTurnsPerMonth;
    overageUnitPriceCents = entitlements.overage?.cfoTurn?.unitPriceCents ?? null;
  } else {
    // Other kinds (agent-specific) not metered in M1
    cap = "unlimited";
  }

  const overageAvailable = overageUnitPriceCents !== null;

  if (cap === "unlimited") {
    return {
      kind,
      used: usageCount,
      cap: "unlimited",
      remaining: "unlimited",
      overageAvailable: false,
      overageUnitPriceCents: null,
    };
  }

  const remaining = Math.max(0, cap - usageCount);

  return {
    kind,
    used: usageCount,
    cap,
    remaining,
    overageAvailable,
    overageUnitPriceCents,
  };
}

// -----------------------------------------------------------------
// Usage recording
// -----------------------------------------------------------------

/**
 * Record a usage event and return running period total
 *
 * Call AFTER successful work completion, never before.
 * Enforces quota on FREE plan (hard cap).
 * Allows overage on STARTER+ (soft cap).
 *
 * @throws QuotaExceeded if FREE plan hits cap
 * @returns running total and overage status
 */
export async function recordUsage(
  companyId: string,
  kind: UsageKind,
  units: number = 1,
  metadata?: Record<string, unknown>,
  userId?: string,
  agentIdentityId?: string
): Promise<UsageRecordResult> {
  const quota = await checkQuota(companyId, kind);

  // Hard cap on FREE plan (no overage)
  if (!quota.overageAvailable && quota.used >= (quota.cap as number)) {
    throw new QuotaExceeded(kind, quota.used, quota.cap as number, false);
  }

  // Record the event
  await prisma.usageEvent.create({
    data: {
      companyId,
      kind,
      units,
      userId,
      agentIdentityId,
      metadata: metadata || {},
      occurredAt: new Date(),
    },
  });

  const newTotal = quota.used + units;
  const cap = quota.cap as number;
  const withinCap = newTotal <= cap;
  const overageUnits = withinCap ? 0 : newTotal - cap;

  return {
    runningTotal: newTotal,
    withinCap,
    overageUnits,
  };
}

// -----------------------------------------------------------------
// Overage computation (for period-close billing)
// -----------------------------------------------------------------

/**
 * Compute overage charges for a given period
 *
 * Pure function — does NOT write OverageCharge rows.
 * Called by period-close job (deferred to M3).
 */
export async function computeOverage(
  companyId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<
  Array<{
    kind: UsageKind;
    units: number;
    unitPriceCents: number;
    totalCents: number;
  }>
> {
  const { entitlements } = await getActivePlan(companyId);
  const charges: Array<{
    kind: UsageKind;
    units: number;
    unitPriceCents: number;
    totalCents: number;
  }> = [];

  // Narrative overage
  if (
    entitlements.narrativesPerMonth !== "unlimited" &&
    entitlements.overage.narrative
  ) {
    const narrativeCount = await prisma.usageEvent.count({
      where: {
        companyId,
        kind: "NARRATIVE_GENERATED",
        occurredAt: { gte: periodStart, lte: periodEnd },
      },
    });

    const cap = entitlements.narrativesPerMonth as number;
    const overageUnits = Math.max(0, narrativeCount - cap);

    if (overageUnits > 0) {
      const unitPrice = entitlements.overage.narrative.unitPriceCents;
      charges.push({
        kind: "NARRATIVE_GENERATED",
        units: overageUnits,
        unitPriceCents: unitPrice,
        totalCents: overageUnits * unitPrice,
      });
    }
  }

  // CFO turn overage
  if (
    entitlements.cfoTurnsPerMonth !== "unlimited" &&
    entitlements.overage.cfoTurn
  ) {
    const turnCount = await prisma.usageEvent.count({
      where: {
        companyId,
        kind: "CFO_TURN",
        occurredAt: { gte: periodStart, lte: periodEnd },
      },
    });

    const cap = entitlements.cfoTurnsPerMonth as number;
    const overageUnits = Math.max(0, turnCount - cap);

    if (overageUnits > 0) {
      const unitPrice = entitlements.overage.cfoTurn.unitPriceCents;
      charges.push({
        kind: "CFO_TURN",
        units: overageUnits,
        unitPriceCents: unitPrice,
        totalCents: overageUnits * unitPrice,
      });
    }
  }

  return charges;
}
