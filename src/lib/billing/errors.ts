/**
 * Billing & entitlement error types
 *
 * All errors extend Error and carry structured data for API responses.
 * Used by entitlement guards in src/lib/billing/entitlements.ts
 */

import { PlanSlug, UsageKind } from "@prisma/client";

/**
 * Thrown when a company needs to upgrade to access a feature
 *
 * Maps to HTTP 402 Payment Required
 */
export class PlanUpgradeRequired extends Error {
  constructor(
    public requiredPlanSlug: PlanSlug,
    public reason: string,
    public upgradeUrl?: string
  ) {
    super(reason);
    this.name = "PlanUpgradeRequired";
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      code: "PLAN_UPGRADE_REQUIRED",
      requiredPlanSlug: this.requiredPlanSlug,
      upgradeUrl: this.upgradeUrl || "/account/billing",
    };
  }
}

/**
 * Thrown when usage quota is exceeded
 *
 * Maps to HTTP 429 Too Many Requests (for hard caps)
 * or HTTP 402 (for soft caps with overage prompts)
 */
export class QuotaExceeded extends Error {
  constructor(
    public kind: UsageKind,
    public used: number,
    public cap: number,
    public overageAvailable: boolean
  ) {
    const verb = overageAvailable ? "You've reached" : "You've exceeded";
    super(
      `${verb} the ${cap} ${kind.toLowerCase()} limit. ${
        overageAvailable
          ? "Additional usage will be billed as overage."
          : "Upgrade to continue."
      }`
    );
    this.name = "QuotaExceeded";
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      code: this.overageAvailable ? "QUOTA_EXCEEDED_OVERAGE" : "QUOTA_EXCEEDED_HARD_CAP",
      kind: this.kind,
      used: this.used,
      cap: this.cap,
      overageAvailable: this.overageAvailable,
      upgradeUrl: this.overageAvailable ? undefined : "/account/billing",
    };
  }
}

/**
 * Generic entitlement denial (fallback)
 *
 * Maps to HTTP 403 Forbidden
 */
export class EntitlementDenied extends Error {
  constructor(
    public entitlementKey: string,
    public reason?: string
  ) {
    super(reason || `Access denied: missing entitlement '${entitlementKey}'`);
    this.name = "EntitlementDenied";
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      code: "ENTITLEMENT_DENIED",
      entitlementKey: this.entitlementKey,
    };
  }
}
