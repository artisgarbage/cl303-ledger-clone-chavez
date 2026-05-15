/**
 * overage.test.ts
 *
 * Tests for overage computation logic.
 * Verifies that computeOverage() correctly calculates overage charges
 * based on usage events and plan entitlements.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeOverage } from "./entitlements";
import { PLAN_DEFINITIONS } from "./plans";
import { UsageKind } from "@prisma/client";

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
    },
    usageEvent: {
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

// ─── Test data ──────────────────────────────────────────────────────────────

const COMPANY_ID = "test-company";
const PERIOD_START = new Date("2026-01-01T00:00:00Z");
const PERIOD_END = new Date("2026-01-31T23:59:59Z");

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("computeOverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zero overage when under cap (STARTER plan, 40/50 narratives)", async () => {
    const starterPlan = PLAN_DEFINITIONS.STARTER;

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      id: "sub-1",
      companyId: COMPANY_ID,
      planId: "plan-starter",
      status: "ACTIVE",
      currentPeriodStart: PERIOD_START,
      currentPeriodEnd: PERIOD_END,
      cancelAtPeriodEnd: false,
      trialEndsAt: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      plan: {
        id: "plan-starter",
        slug: "STARTER",
        displayName: starterPlan.displayName,
        priceUsdCents: starterPlan.priceUsdCents,
        billingCadence: starterPlan.billingCadence,
        rail: starterPlan.rail,
        entitlementsJson: starterPlan.entitlements as never,
        isPublic: true,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as never);

    // 40 narratives used (cap is 50)
    vi.mocked(prisma.usageEvent.count)
      .mockResolvedValueOnce(40) // NARRATIVE_GENERATED
      .mockResolvedValueOnce(150); // CFO_TURN

    const charges = await computeOverage(
      COMPANY_ID,
      PERIOD_START,
      PERIOD_END,
    );

    expect(charges).toHaveLength(0);
  });

  it("returns zero overage when exactly at cap (STARTER plan, 50/50 narratives)", async () => {
    const starterPlan = PLAN_DEFINITIONS.STARTER;

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      id: "sub-1",
      companyId: COMPANY_ID,
      planId: "plan-starter",
      status: "ACTIVE",
      currentPeriodStart: PERIOD_START,
      currentPeriodEnd: PERIOD_END,
      cancelAtPeriodEnd: false,
      trialEndsAt: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      plan: {
        id: "plan-starter",
        slug: "STARTER",
        displayName: starterPlan.displayName,
        priceUsdCents: starterPlan.priceUsdCents,
        billingCadence: starterPlan.billingCadence,
        rail: starterPlan.rail,
        entitlementsJson: starterPlan.entitlements as never,
        isPublic: true,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as never);

    // Exactly at cap
    vi.mocked(prisma.usageEvent.count)
      .mockResolvedValueOnce(50) // NARRATIVE_GENERATED
      .mockResolvedValueOnce(250); // CFO_TURN

    const charges = await computeOverage(
      COMPANY_ID,
      PERIOD_START,
      PERIOD_END,
    );

    expect(charges).toHaveLength(0);
  });

  it("computes correct overage for narratives (STARTER plan, 65/50)", async () => {
    const starterPlan = PLAN_DEFINITIONS.STARTER;

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      id: "sub-1",
      companyId: COMPANY_ID,
      planId: "plan-starter",
      status: "ACTIVE",
      currentPeriodStart: PERIOD_START,
      currentPeriodEnd: PERIOD_END,
      cancelAtPeriodEnd: false,
      trialEndsAt: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      plan: {
        id: "plan-starter",
        slug: "STARTER",
        displayName: starterPlan.displayName,
        priceUsdCents: starterPlan.priceUsdCents,
        billingCadence: starterPlan.billingCadence,
        rail: starterPlan.rail,
        entitlementsJson: starterPlan.entitlements as never,
        isPublic: true,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as never);

    // 65 narratives used (cap is 50, overage is 15)
    vi.mocked(prisma.usageEvent.count)
      .mockResolvedValueOnce(65) // NARRATIVE_GENERATED
      .mockResolvedValueOnce(250); // CFO_TURN (within cap)

    const charges = await computeOverage(
      COMPANY_ID,
      PERIOD_START,
      PERIOD_END,
    );

    expect(charges).toHaveLength(1);
    expect(charges[0]).toMatchObject({
      kind: "NARRATIVE_GENERATED" as UsageKind,
      units: 15,
      unitPriceCents: 50, // STARTER overage rate
      totalCents: 750, // 15 * 50 = $7.50
    });
  });

  it("computes correct overage for both narratives and CFO turns (STUDIO plan)", async () => {
    const studioPlan = PLAN_DEFINITIONS.STUDIO;

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      id: "sub-1",
      companyId: COMPANY_ID,
      planId: "plan-studio",
      status: "ACTIVE",
      currentPeriodStart: PERIOD_START,
      currentPeriodEnd: PERIOD_END,
      cancelAtPeriodEnd: false,
      trialEndsAt: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      plan: {
        id: "plan-studio",
        slug: "STUDIO",
        displayName: studioPlan.displayName,
        priceUsdCents: studioPlan.priceUsdCents,
        billingCadence: studioPlan.billingCadence,
        rail: studioPlan.rail,
        entitlementsJson: studioPlan.entitlements as never,
        isPublic: true,
        sortOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as never);

    // 550 narratives used (cap 500, overage 50)
    // 2100 CFO turns used (cap 2000, overage 100)
    vi.mocked(prisma.usageEvent.count)
      .mockResolvedValueOnce(550) // NARRATIVE_GENERATED
      .mockResolvedValueOnce(2100); // CFO_TURN

    const charges = await computeOverage(
      COMPANY_ID,
      PERIOD_START,
      PERIOD_END,
    );

    expect(charges).toHaveLength(2);

    const narrativeCharge = charges.find(
      (c) => c.kind === "NARRATIVE_GENERATED",
    );
    expect(narrativeCharge).toMatchObject({
      units: 50,
      unitPriceCents: 50, // STUDIO overage rate
      totalCents: 2500, // 50 * 50 = $25.00
    });

    const cfoTurnCharge = charges.find((c) => c.kind === "CFO_TURN");
    expect(cfoTurnCharge).toMatchObject({
      units: 100,
      unitPriceCents: 5, // STUDIO overage rate
      totalCents: 500, // 100 * 5 = $5.00
    });
  });

  it("returns empty array for PRACTICE plan (unlimited entitlements)", async () => {
    const practicePlan = PLAN_DEFINITIONS.PRACTICE;

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      id: "sub-1",
      companyId: COMPANY_ID,
      planId: "plan-practice",
      status: "ACTIVE",
      currentPeriodStart: PERIOD_START,
      currentPeriodEnd: PERIOD_END,
      cancelAtPeriodEnd: false,
      trialEndsAt: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      plan: {
        id: "plan-practice",
        slug: "PRACTICE",
        displayName: practicePlan.displayName,
        priceUsdCents: practicePlan.priceUsdCents,
        billingCadence: practicePlan.billingCadence,
        rail: practicePlan.rail,
        entitlementsJson: practicePlan.entitlements as never,
        isPublic: true,
        sortOrder: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as never);

    // High usage, but PRACTICE has unlimited entitlements
    vi.mocked(prisma.usageEvent.count)
      .mockResolvedValueOnce(10000) // NARRATIVE_GENERATED
      .mockResolvedValueOnce(50000); // CFO_TURN

    const charges = await computeOverage(
      COMPANY_ID,
      PERIOD_START,
      PERIOD_END,
    );

    expect(charges).toHaveLength(0);
  });

  it("handles FREE plan (no overage, would hit hard cap)", async () => {
    const freePlan = PLAN_DEFINITIONS.FREE;

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null); // No subscription = FREE

    // Usage above cap, but FREE has no overage pricing
    vi.mocked(prisma.usageEvent.count)
      .mockResolvedValueOnce(10) // NARRATIVE_GENERATED (cap is 5)
      .mockResolvedValueOnce(30); // CFO_TURN (cap is 25)

    const charges = await computeOverage(
      COMPANY_ID,
      PERIOD_START,
      PERIOD_END,
    );

    // FREE plan has no overage.narrative or overage.cfoTurn defined
    // computeOverage should skip creating charges
    expect(charges).toHaveLength(0);
  });
});
