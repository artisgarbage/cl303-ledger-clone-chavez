/**
 * plans.test.ts
 *
 * Snapshot tests for PLAN_DEFINITIONS.
 * Ensures that plan prices, entitlements, and structure remain stable.
 * Any change to pricing or caps requires updating this test (price drift detection).
 */

import { describe, it, expect } from "vitest";
import { PLAN_DEFINITIONS } from "./plans";
import { PlanSlug } from "@prisma/client";

describe("PLAN_DEFINITIONS", () => {
  it("contains all 9 plan slugs", () => {
    const expectedSlugs: PlanSlug[] = [
      "FREE",
      "STARTER",
      "STUDIO",
      "PRACTICE",
      "ENTERPRISE",
      "AGENT_DEV",
      "AGENT_PRO",
      "AGENT_SCALE",
      "LLM_FEDERATION",
    ];

    const actualSlugs = Object.keys(PLAN_DEFINITIONS);

    expect(actualSlugs.sort()).toEqual(expectedSlugs.sort());
  });

  it("Rail A plans (HUMAN) have correct structure", () => {
    const humanPlans = [
      "FREE",
      "STARTER",
      "STUDIO",
      "PRACTICE",
      "ENTERPRISE",
    ] as const;

    for (const slug of humanPlans) {
      const plan = PLAN_DEFINITIONS[slug];

      expect(plan).toMatchObject({
        displayName: expect.any(String),
        priceUsdCents: expect.any(Number),
        billingCadence: expect.stringMatching(
          /^(MONTHLY|ANNUAL|USAGE|CUSTOM)$/,
        ),
        rail: "HUMAN",
        entitlements: expect.objectContaining({
          maxEntities: expect.anything(),
          narrativesPerMonth: expect.anything(),
          cfoTurnsPerMonth: expect.anything(),
          modes: expect.arrayContaining([expect.any(String)]),
          seats: expect.anything(),
          imports: expect.arrayContaining([expect.any(String)]),
          apiReadEnabled: expect.any(Boolean),
          agentRailEnabled: expect.any(Boolean),
          overage: expect.objectContaining({
            narrative: expect.anything(),
            cfoTurn: expect.anything(),
          }),
          support: expect.stringMatching(
            /^(COMMUNITY|EMAIL|PRIORITY|DEDICATED)$/,
          ),
          sso: expect.any(Boolean),
          auditLogExport: expect.any(Boolean),
          whiteLabel: expect.any(Boolean),
        }),
      });
    }
  });

  it("Rail B plans (AGENT) have correct structure", () => {
    const agentPlans = [
      "AGENT_DEV",
      "AGENT_PRO",
      "AGENT_SCALE",
      "LLM_FEDERATION",
    ] as const;

    for (const slug of agentPlans) {
      const plan = PLAN_DEFINITIONS[slug];

      expect(plan).toMatchObject({
        displayName: expect.any(String),
        priceUsdCents: expect.any(Number),
        billingCadence: expect.stringMatching(
          /^(MONTHLY|ANNUAL|USAGE|CUSTOM)$/,
        ),
        rail: "AGENT",
        entitlements: expect.objectContaining({
          agentRailEnabled: true, // All agent plans must have this
        }),
      });
    }
  });

  it("FREE plan has expected constraints", () => {
    const free = PLAN_DEFINITIONS.FREE;

    expect(free).toMatchObject({
      priceUsdCents: 0,
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
          narrative: null,
          cfoTurn: null,
        },
        support: "COMMUNITY",
        sso: false,
        auditLogExport: false,
        whiteLabel: false,
      },
    });
  });

  it("STARTER plan has expected constraints", () => {
    const starter = PLAN_DEFINITIONS.STARTER;

    expect(starter).toMatchObject({
      priceUsdCents: 4900, // $49/mo
      rail: "HUMAN",
      entitlements: {
        maxEntities: 1,
        narrativesPerMonth: 50,
        cfoTurnsPerMonth: 250,
        modes: ["INTERNAL_CFO"],
        seats: 3,
        imports: ["QB", "CSV"],
        apiReadEnabled: false,
        agentRailEnabled: false,
        overage: {
          narrative: { unitPriceCents: 50 }, // $0.50/narrative
          cfoTurn: { unitPriceCents: 5 }, // $0.05/turn
        },
        support: "EMAIL",
        sso: false,
        auditLogExport: false,
        whiteLabel: false,
      },
    });
  });

  it("STUDIO plan has expected constraints", () => {
    const studio = PLAN_DEFINITIONS.STUDIO;

    expect(studio).toMatchObject({
      priceUsdCents: 19900, // $199/mo
      rail: "HUMAN",
      entitlements: {
        maxEntities: 3,
        narrativesPerMonth: 500,
        cfoTurnsPerMonth: 2000,
        modes: ["INTERNAL_CFO", "PROPOSAL_BIZDEV", "BOARD_INVESTOR"], // All three modes
        seats: 10,
        imports: ["QB", "CSV", "BANK"],
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
    });
  });

  it("PRACTICE plan has unlimited narratives and turns", () => {
    const practice = PLAN_DEFINITIONS.PRACTICE;

    expect(practice).toMatchObject({
      priceUsdCents: 59900, // $599/mo
      rail: "HUMAN",
      entitlements: {
        maxEntities: 10,
        narrativesPerMonth: "unlimited",
        cfoTurnsPerMonth: "unlimited",
        modes: ["INTERNAL_CFO", "PROPOSAL_BIZDEV", "BOARD_INVESTOR"],
        seats: 25,
        imports: ["ALL"],
        apiReadEnabled: true,
        agentRailEnabled: false,
        overage: {
          narrative: null, // No overage on unlimited
          cfoTurn: null,
        },
        support: "PRIORITY",
        sso: false,
        auditLogExport: true,
        whiteLabel: false,
      },
    });
  });

  it("ENTERPRISE plan has unlimited everything", () => {
    const enterprise = PLAN_DEFINITIONS.ENTERPRISE;

    expect(enterprise).toMatchObject({
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
          narrative: null,
          cfoTurn: null,
        },
        support: "DEDICATED",
        sso: true,
        auditLogExport: true,
        whiteLabel: true,
      },
    });
  });

  it("AGENT_DEV plan is free with limits", () => {
    const agentDev = PLAN_DEFINITIONS.AGENT_DEV;

    expect(agentDev).toMatchObject({
      priceUsdCents: 0,
      rail: "AGENT",
      entitlements: {
        agentRailEnabled: true,
        narrativesPerMonth: 25,
        cfoTurnsPerMonth: 1000,
        overage: {
          narrative: null,
          cfoTurn: null,
        },
      },
    });
  });

  it("AGENT_PRO plan uses usage-based pricing", () => {
    const agentPro = PLAN_DEFINITIONS.AGENT_PRO;

    expect(agentPro).toMatchObject({
      priceUsdCents: 0, // Usage-based, no base fee
      billingCadence: "USAGE",
      rail: "AGENT",
      entitlements: {
        agentRailEnabled: true,
        narrativesPerMonth: "unlimited",
        cfoTurnsPerMonth: "unlimited",
        overage: {
          narrative: { unitPriceCents: 5 }, // $0.05/narrative
          cfoTurn: { unitPriceCents: 10 }, // $0.10/synthesis call
        },
      },
    });
  });

  it("snapshot: full PLAN_DEFINITIONS object", () => {
    // This snapshot will fail if any price, cap, or structure changes
    // Intentional — forces review of pricing changes
    expect(PLAN_DEFINITIONS).toMatchSnapshot();
  });
});
