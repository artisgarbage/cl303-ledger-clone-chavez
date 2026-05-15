/**
 * Unit tests for entitlement resolution and usage tracking
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { PlanSlug, UsageKind } from "@prisma/client";
import {
  getActivePlan,
  assertEntitlement,
  assertMode,
  checkQuota,
  recordUsage,
  computeOverage,
} from "./entitlements";
import { PlanUpgradeRequired, QuotaExceeded } from "./errors";

// Mock the prisma module
vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
    },
    usageEvent: {
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock date-fns to control time
const mockNow = new Date("2026-05-15T12:00:00Z");
vi.setSystemTime(mockNow);

import { prisma } from "@/lib/prisma";

describe("getActivePlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns FREE plan when no subscription exists", async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);

    const result = await getActivePlan("company-123");

    expect(result.plan).toBe("FREE");
    expect(result.displayName).toBe("Free");
    expect(result.entitlements.narrativesPerMonth).toBe(5);
    expect(result.entitlements.cfoTurnsPerMonth).toBe(25);
    expect(result.subscription?.status).toBe("ACTIVE");
  });

  it("returns actual plan when subscription exists", async () => {
    const mockSubscription = {
      id: "sub-123",
      companyId: "company-123",
      planId: "plan-123",
      status: "ACTIVE",
      currentPeriodStart: new Date("2026-05-01"),
      currentPeriodEnd: new Date("2026-05-31"),
      cancelAtPeriodEnd: false,
      trialEndsAt: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      plan: {
        id: "plan-123",
        slug: "STUDIO" as PlanSlug,
        displayName: "Studio",
        priceUsdCents: 19900,
        billingCadence: "MONTHLY",
        rail: "HUMAN",
        entitlementsJson: {
          maxEntities: 3,
          narrativesPerMonth: 500,
          cfoTurnsPerMonth: 2000,
          modes: ["INTERNAL_CFO", "PROPOSAL_BIZDEV", "BOARD_INVESTOR"],
          seats: 10,
          imports: ["CSV", "QB", "BANK"],
          apiReadEnabled: false,
          agentRailEnabled: false,
          overage: {
            narrative: { unitPriceCents: 50 },
            cfoTurn: { unitPriceCents: 5 },
          },
          support: "EMAIL",
          sso: false,
          auditLogExport: false,
          whiteLabel: false,
        },
        isPublic: true,
        sortOrder: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription as any);

    const result = await getActivePlan("company-123");

    expect(result.plan).toBe("STUDIO");
    expect(result.displayName).toBe("Studio");
    expect(result.entitlements.narrativesPerMonth).toBe(500);
    expect(result.subscription?.id).toBe("sub-123");
  });
});

describe("assertEntitlement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows INTERNAL mode on FREE plan", async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);

    await expect(
      assertEntitlement("company-123", "cfo.mode.internal")
    ).resolves.toBeUndefined();
  });

  it("denies PROPOSAL mode on FREE plan", async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);

    await expect(
      assertEntitlement("company-123", "cfo.mode.proposal")
    ).rejects.toThrow(PlanUpgradeRequired);
  });

  it("denies BOARD mode on FREE plan", async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);

    await expect(
      assertEntitlement("company-123", "cfo.mode.board")
    ).rejects.toThrow(PlanUpgradeRequired);
  });

  it("allows PROPOSAL mode on STUDIO plan", async () => {
    const mockSubscription = {
      id: "sub-123",
      companyId: "company-123",
      planId: "plan-123",
      status: "ACTIVE",
      currentPeriodStart: new Date("2026-05-01"),
      currentPeriodEnd: new Date("2026-05-31"),
      plan: {
        slug: "STUDIO" as PlanSlug,
        displayName: "Studio",
        entitlementsJson: {
          modes: ["INTERNAL_CFO", "PROPOSAL_BIZDEV", "BOARD_INVESTOR"],
        },
      },
    };

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription as any);

    await expect(
      assertEntitlement("company-123", "cfo.mode.proposal")
    ).resolves.toBeUndefined();
  });

  it("denies QuickBooks import on FREE plan", async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);

    await expect(
      assertEntitlement("company-123", "imports.qb")
    ).rejects.toThrow(PlanUpgradeRequired);
  });
});

describe("assertMode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps mode enum to entitlement key correctly", async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);

    await expect(assertMode("company-123", "INTERNAL_CFO")).resolves.toBeUndefined();
    await expect(assertMode("company-123", "PROPOSAL_BIZDEV")).rejects.toThrow(
      PlanUpgradeRequired
    );
  });
});

describe("checkQuota", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unlimited for ENTERPRISE plan", async () => {
    const mockSubscription = {
      id: "sub-123",
      status: "ACTIVE",
      currentPeriodStart: new Date("2026-05-01"),
      currentPeriodEnd: new Date("2026-05-31"),
      plan: {
        slug: "ENTERPRISE" as PlanSlug,
        entitlementsJson: {
          narrativesPerMonth: "unlimited",
          cfoTurnsPerMonth: "unlimited",
        },
      },
    };

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription as any);
    vi.mocked(prisma.usageEvent.count).mockResolvedValue(100);

    const result = await checkQuota("company-123", "NARRATIVE_GENERATED");

    expect(result.cap).toBe("unlimited");
    expect(result.remaining).toBe("unlimited");
  });

  it("calculates remaining quota correctly", async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.usageEvent.count).mockResolvedValue(3);

    const result = await checkQuota("company-123", "NARRATIVE_GENERATED");

    expect(result.used).toBe(3);
    expect(result.cap).toBe(5);
    expect(result.remaining).toBe(2);
    expect(result.overageAvailable).toBe(false);
  });

  it("indicates overage availability on STARTER+ plans", async () => {
    const mockSubscription = {
      status: "ACTIVE",
      currentPeriodStart: new Date("2026-05-01"),
      currentPeriodEnd: new Date("2026-05-31"),
      plan: {
        slug: "STARTER" as PlanSlug,
        entitlementsJson: {
          narrativesPerMonth: 50,
          overage: {
            narrative: { unitPriceCents: 50 },
          },
        },
      },
    };

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription as any);
    vi.mocked(prisma.usageEvent.count).mockResolvedValue(45);

    const result = await checkQuota("company-123", "NARRATIVE_GENERATED");

    expect(result.overageAvailable).toBe(true);
    expect(result.overageUnitPriceCents).toBe(50);
  });
});

describe("recordUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws QuotaExceeded when FREE plan hits cap", async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.usageEvent.count).mockResolvedValue(5); // At cap

    await expect(
      recordUsage("company-123", "NARRATIVE_GENERATED", 1)
    ).rejects.toThrow(QuotaExceeded);

    expect(prisma.usageEvent.create).not.toHaveBeenCalled();
  });

  it("records usage when under cap", async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.usageEvent.count).mockResolvedValue(3);
    vi.mocked(prisma.usageEvent.create).mockResolvedValue({} as any);

    const result = await recordUsage(
      "company-123",
      "NARRATIVE_GENERATED",
      1,
      { test: "metadata" },
      "user-123"
    );

    expect(result.runningTotal).toBe(4);
    expect(result.withinCap).toBe(true);
    expect(result.overageUnits).toBe(0);
    expect(prisma.usageEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: "company-123",
        kind: "NARRATIVE_GENERATED",
        units: 1,
        userId: "user-123",
        metadata: { test: "metadata" },
      }),
    });
  });

  it("allows overage on STARTER+ plans", async () => {
    const mockSubscription = {
      status: "ACTIVE",
      currentPeriodStart: new Date("2026-05-01"),
      currentPeriodEnd: new Date("2026-05-31"),
      plan: {
        slug: "STARTER" as PlanSlug,
        entitlementsJson: {
          narrativesPerMonth: 50,
          overage: {
            narrative: { unitPriceCents: 50 },
          },
        },
      },
    };

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription as any);
    vi.mocked(prisma.usageEvent.count).mockResolvedValue(51); // Over cap
    vi.mocked(prisma.usageEvent.create).mockResolvedValue({} as any);

    const result = await recordUsage("company-123", "NARRATIVE_GENERATED", 1);

    expect(result.runningTotal).toBe(52);
    expect(result.withinCap).toBe(false);
    expect(result.overageUnits).toBe(2);
    expect(prisma.usageEvent.create).toHaveBeenCalled();
  });
});

describe("computeOverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when under cap", async () => {
    const mockSubscription = {
      status: "ACTIVE",
      plan: {
        slug: "STARTER" as PlanSlug,
        entitlementsJson: {
          narrativesPerMonth: 50,
          cfoTurnsPerMonth: 250,
          overage: {
            narrative: { unitPriceCents: 50 },
            cfoTurn: { unitPriceCents: 5 },
          },
        },
      },
    };

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription as any);
    vi.mocked(prisma.usageEvent.count).mockResolvedValue(30);

    const result = await computeOverage(
      "company-123",
      new Date("2026-05-01"),
      new Date("2026-05-31")
    );

    expect(result).toEqual([]);
  });

  it("computes narrative overage correctly", async () => {
    const mockSubscription = {
      status: "ACTIVE",
      plan: {
        slug: "STARTER" as PlanSlug,
        entitlementsJson: {
          narrativesPerMonth: 50,
          cfoTurnsPerMonth: 250,
          overage: {
            narrative: { unitPriceCents: 50 },
            cfoTurn: { unitPriceCents: 5 },
          },
        },
      },
    };

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription as any);

    // Mock different counts for different kinds
    vi.mocked(prisma.usageEvent.count).mockImplementation((args: any) => {
      if (args.where.kind === "NARRATIVE_GENERATED") {
        return Promise.resolve(75); // 25 over cap
      }
      return Promise.resolve(200); // CFO turns under cap
    });

    const result = await computeOverage(
      "company-123",
      new Date("2026-05-01"),
      new Date("2026-05-31")
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      kind: "NARRATIVE_GENERATED",
      units: 25,
      unitPriceCents: 50,
      totalCents: 1250, // 25 * 50
    });
  });

  it("computes multiple overage kinds", async () => {
    const mockSubscription = {
      status: "ACTIVE",
      plan: {
        slug: "STARTER" as PlanSlug,
        entitlementsJson: {
          narrativesPerMonth: 50,
          cfoTurnsPerMonth: 250,
          overage: {
            narrative: { unitPriceCents: 50 },
            cfoTurn: { unitPriceCents: 5 },
          },
        },
      },
    };

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription as any);

    vi.mocked(prisma.usageEvent.count).mockImplementation((args: any) => {
      if (args.where.kind === "NARRATIVE_GENERATED") {
        return Promise.resolve(60); // 10 over
      }
      return Promise.resolve(300); // 50 over
    });

    const result = await computeOverage(
      "company-123",
      new Date("2026-05-01"),
      new Date("2026-05-31")
    );

    expect(result).toHaveLength(2);
    expect(result.find((r) => r.kind === "NARRATIVE_GENERATED")).toEqual({
      kind: "NARRATIVE_GENERATED",
      units: 10,
      unitPriceCents: 50,
      totalCents: 500,
    });
    expect(result.find((r) => r.kind === "CFO_TURN")).toEqual({
      kind: "CFO_TURN",
      units: 50,
      unitPriceCents: 5,
      totalCents: 250,
    });
  });
});
