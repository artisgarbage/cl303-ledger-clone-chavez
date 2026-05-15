/**
 * Plan definitions and entitlement shapes
 *
 * Source of truth: strategy/PRICING_AND_GTM.md §4
 * Do not modify prices or caps without updating the strategy doc first.
 */

import { PlanSlug, BillingCadence, PricingRail } from "@prisma/client";

export type Entitlements = {
  /** Maximum number of entities (companies) allowed */
  maxEntities: number | "unlimited";

  /** Narratives generation quota per calendar month */
  narrativesPerMonth: number | "unlimited";

  /** CFO chat turns quota per calendar month */
  cfoTurnsPerMonth: number | "unlimited";

  /** Available modes */
  modes: ("INTERNAL_CFO" | "PROPOSAL_BIZDEV" | "BOARD_INVESTOR")[];

  /** Team seats */
  seats: number | "unlimited";

  /** Available import sources */
  imports: ("CSV" | "QB" | "BANK" | "ALL")[];

  /** Read-only API access enabled (Rail A only) */
  apiReadEnabled: boolean;

  /** Agent rail enabled (Rail B plans only) */
  agentRailEnabled: boolean;

  /** Overage pricing */
  overage: {
    narrative: { unitPriceCents: number } | null;
    cfoTurn: { unitPriceCents: number } | null;
  };

  /** Support tier */
  support: "COMMUNITY" | "EMAIL" | "PRIORITY" | "DEDICATED";

  /** SSO/SAML enabled */
  sso: boolean;

  /** Audit log export enabled */
  auditLogExport: boolean;

  /** White-label enabled */
  whiteLabel: boolean;
};

export type PlanDefinition = {
  slug: PlanSlug;
  displayName: string;
  priceUsdCents: number;
  billingCadence: BillingCadence;
  rail: PricingRail;
  entitlements: Entitlements;
  isPublic: boolean;
  sortOrder: number;
};

/**
 * Plan catalog — source of truth for pricing and entitlements
 *
 * Rail A (HUMAN): For agency owners and finance teams
 * Rail B (AGENT): For AI platforms and developers
 */
export const PLAN_DEFINITIONS: Record<PlanSlug, PlanDefinition> = {
  // -------------------------------------------------------------------------
  // Rail A — Margot for Humans
  // -------------------------------------------------------------------------

  FREE: {
    slug: "FREE",
    displayName: "Free",
    priceUsdCents: 0,
    billingCadence: "MONTHLY",
    rail: "HUMAN",
    entitlements: {
      maxEntities: 1,
      narrativesPerMonth: 5,
      cfoTurnsPerMonth: 25,
      modes: ["INTERNAL_CFO"],
      seats: 1,
      imports: ["CSV"],
      apiReadEnabled: false,
      agentRailEnabled: false,
      overage: {
        narrative: null, // No overage — hard cap
        cfoTurn: null, // No overage — hard cap
      },
      support: "COMMUNITY",
      sso: false,
      auditLogExport: false,
      whiteLabel: false,
    },
    isPublic: true,
    sortOrder: 10,
  },

  STARTER: {
    slug: "STARTER",
    displayName: "Starter",
    priceUsdCents: 4900, // $49/mo
    billingCadence: "MONTHLY",
    rail: "HUMAN",
    entitlements: {
      maxEntities: 1,
      narrativesPerMonth: 50,
      cfoTurnsPerMonth: 250,
      modes: ["INTERNAL_CFO"],
      seats: 3,
      imports: ["CSV", "QB"],
      apiReadEnabled: false,
      agentRailEnabled: false,
      overage: {
        narrative: { unitPriceCents: 50 }, // $0.50 per narrative
        cfoTurn: { unitPriceCents: 5 }, // $0.05 per turn
      },
      support: "EMAIL",
      sso: false,
      auditLogExport: false,
      whiteLabel: false,
    },
    isPublic: true,
    sortOrder: 20,
  },

  STUDIO: {
    slug: "STUDIO",
    displayName: "Studio",
    priceUsdCents: 19900, // $199/mo
    billingCadence: "MONTHLY",
    rail: "HUMAN",
    entitlements: {
      maxEntities: 3,
      narrativesPerMonth: 500,
      cfoTurnsPerMonth: 2000,
      modes: ["INTERNAL_CFO", "PROPOSAL_BIZDEV", "BOARD_INVESTOR"],
      seats: 10,
      imports: ["CSV", "QB", "BANK"],
      apiReadEnabled: false,
      agentRailEnabled: false,
      overage: {
        narrative: { unitPriceCents: 50 }, // $0.50 per narrative
        cfoTurn: { unitPriceCents: 5 }, // $0.05 per turn
      },
      support: "EMAIL",
      sso: false,
      auditLogExport: false,
      whiteLabel: false,
    },
    isPublic: true,
    sortOrder: 30,
  },

  PRACTICE: {
    slug: "PRACTICE",
    displayName: "Practice",
    priceUsdCents: 59900, // $599/mo
    billingCadence: "MONTHLY",
    rail: "HUMAN",
    entitlements: {
      maxEntities: 10,
      narrativesPerMonth: 2500,
      cfoTurnsPerMonth: 10000,
      modes: ["INTERNAL_CFO", "PROPOSAL_BIZDEV", "BOARD_INVESTOR"],
      seats: 25,
      imports: ["ALL"],
      apiReadEnabled: true, // Read-only API for org's own data
      agentRailEnabled: false,
      overage: {
        narrative: { unitPriceCents: 50 }, // $0.50 per narrative
        cfoTurn: { unitPriceCents: 5 }, // $0.05 per turn
      },
      support: "PRIORITY",
      sso: false,
      auditLogExport: true,
      whiteLabel: false,
    },
    isPublic: true,
    sortOrder: 40,
  },

  ENTERPRISE: {
    slug: "ENTERPRISE",
    displayName: "Enterprise",
    priceUsdCents: 250000, // $2,500/mo starting (custom pricing)
    billingCadence: "CUSTOM",
    rail: "HUMAN",
    entitlements: {
      maxEntities: "unlimited",
      narrativesPerMonth: "unlimited",
      cfoTurnsPerMonth: "unlimited",
      modes: ["INTERNAL_CFO", "PROPOSAL_BIZDEV", "BOARD_INVESTOR"],
      seats: "unlimited",
      imports: ["ALL"],
      apiReadEnabled: true,
      agentRailEnabled: false,
      overage: {
        narrative: null, // No overage — unlimited
        cfoTurn: null, // No overage — unlimited
      },
      support: "DEDICATED",
      sso: true,
      auditLogExport: true,
      whiteLabel: true,
    },
    isPublic: true,
    sortOrder: 50,
  },

  // -------------------------------------------------------------------------
  // Rail B — Margot for Agents
  // -------------------------------------------------------------------------

  AGENT_DEV: {
    slug: "AGENT_DEV",
    displayName: "Agent Dev (Free)",
    priceUsdCents: 0,
    billingCadence: "MONTHLY",
    rail: "AGENT",
    entitlements: {
      maxEntities: 1,
      narrativesPerMonth: 25,
      cfoTurnsPerMonth: 1000, // 1K reads/mo
      modes: ["INTERNAL_CFO"], // Sandboxed data only
      seats: 0, // Not applicable for agent rail
      imports: [],
      apiReadEnabled: true,
      agentRailEnabled: true,
      overage: {
        narrative: null, // Hard cap on free tier
        cfoTurn: null, // Hard cap on free tier
      },
      support: "COMMUNITY",
      sso: false,
      auditLogExport: false,
      whiteLabel: false,
    },
    isPublic: true,
    sortOrder: 60,
  },

  AGENT_PRO: {
    slug: "AGENT_PRO",
    displayName: "Agent Pro",
    priceUsdCents: 0, // Usage-based, not subscription
    billingCadence: "USAGE",
    rail: "AGENT",
    entitlements: {
      maxEntities: "unlimited",
      narrativesPerMonth: "unlimited",
      cfoTurnsPerMonth: "unlimited",
      modes: ["INTERNAL_CFO", "PROPOSAL_BIZDEV", "BOARD_INVESTOR"],
      seats: 0,
      imports: [],
      apiReadEnabled: true,
      agentRailEnabled: true,
      overage: {
        // Usage pricing (not overage, but using same shape):
        narrative: { unitPriceCents: 5 }, // $0.05 per narrative
        cfoTurn: { unitPriceCents: 0.2 }, // $0.002 per read (stored as 0.2 cents)
      },
      support: "EMAIL",
      sso: false,
      auditLogExport: false,
      whiteLabel: false,
    },
    isPublic: true,
    sortOrder: 70,
  },

  AGENT_SCALE: {
    slug: "AGENT_SCALE",
    displayName: "Agent Scale",
    priceUsdCents: 200000, // $2K/mo committed use starting point
    billingCadence: "CUSTOM",
    rail: "AGENT",
    entitlements: {
      maxEntities: "unlimited",
      narrativesPerMonth: "unlimited",
      cfoTurnsPerMonth: "unlimited",
      modes: ["INTERNAL_CFO", "PROPOSAL_BIZDEV", "BOARD_INVESTOR"],
      seats: 0,
      imports: [],
      apiReadEnabled: true,
      agentRailEnabled: true,
      overage: {
        // Volume rates (30-50% off list)
        narrative: { unitPriceCents: 3 }, // ~$0.03 per narrative
        cfoTurn: { unitPriceCents: 0.1 }, // ~$0.001 per read
      },
      support: "PRIORITY",
      sso: false,
      auditLogExport: true,
      whiteLabel: false,
    },
    isPublic: true,
    sortOrder: 80,
  },

  LLM_FEDERATION: {
    slug: "LLM_FEDERATION",
    displayName: "LLM Federation",
    priceUsdCents: 0, // Revenue share, not direct pricing
    billingCadence: "CUSTOM",
    rail: "AGENT",
    entitlements: {
      maxEntities: "unlimited",
      narrativesPerMonth: "unlimited",
      cfoTurnsPerMonth: "unlimited",
      modes: ["INTERNAL_CFO", "PROPOSAL_BIZDEV", "BOARD_INVESTOR"],
      seats: 0,
      imports: [],
      apiReadEnabled: true,
      agentRailEnabled: true,
      overage: {
        narrative: null, // Rev share model
        cfoTurn: null, // Rev share model
      },
      support: "DEDICATED",
      sso: true,
      auditLogExport: true,
      whiteLabel: true,
    },
    isPublic: false, // Partnership tier, not self-serve
    sortOrder: 90,
  },
};
