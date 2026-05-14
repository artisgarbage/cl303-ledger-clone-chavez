import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ────────────────────────────────────────────────────────────
vi.mock("@/lib/prisma", () => ({
  prisma: {
    financialPeriod: {
      findFirst: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
    },
    narrative: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { executeTool, getToolsForMode, ALL_TOOLS } from "./tools/index";

// ─── Tool Registry ───────────────────────────────────────────────────────────

describe("ALL_TOOLS", () => {
  it("contains all registered tools", () => {
    // periods (3) + projects (3) + narratives (1) + people (4) = 11
    expect(ALL_TOOLS).toHaveLength(11);
  });

  it("tool names comply with Anthropic naming pattern", () => {
    const invalidPattern = /[^a-zA-Z0-9_-]/;
    for (const tool of ALL_TOOLS) {
      expect(tool.name).not.toMatch(invalidPattern);
      expect(tool.name.length).toBeLessThanOrEqual(128);
    }
  });

  it("every tool has a non-empty description", () => {
    for (const tool of ALL_TOOLS) {
      expect(tool.description.trim().length).toBeGreaterThan(0);
    }
  });

  it("every tool input_schema has at least one property", () => {
    for (const tool of ALL_TOOLS) {
      expect(Object.keys(tool.input_schema.properties).length).toBeGreaterThan(
        0,
      );
    }
  });
});

describe("getToolsForMode", () => {
  it("returns all 11 tools for INTERNAL_CFO (no restrictions)", () => {
    const tools = getToolsForMode("INTERNAL_CFO");
    expect(tools).toHaveLength(11);
  });

  it("returns 8 tools for PROPOSAL_BIZDEV (3 restricted: trueCost, compensation, marginInternal)", () => {
    const tools = getToolsForMode("PROPOSAL_BIZDEV");
    expect(tools).toHaveLength(8);
    expect(tools.map((t) => t.name)).not.toContain("people_getTrueCost");
    expect(tools.map((t) => t.name)).not.toContain("people_getCompensation");
    expect(tools.map((t) => t.name)).not.toContain(
      "projects_getMarginInternal",
    );
  });

  it("returns all 11 tools for BOARD_INVESTOR (no restrictions)", () => {
    const tools = getToolsForMode("BOARD_INVESTOR");
    expect(tools).toHaveLength(11);
  });
});

describe("executeTool — registry dispatch", () => {
  it("throws for an unregistered tool name", async () => {
    await expect(executeTool("unknown_tool", "company-1", {})).rejects.toThrow(
      "Unknown tool: unknown_tool",
    );
  });
});

// ─── periods_getPnL ──────────────────────────────────────────────────────────

describe("periods_getPnL tool handler", () => {
  const COMPANY_ID = "codelab303";

  const MOCK_PERIOD = {
    id: "period-1",
    companyId: COMPANY_ID,
    periodStart: new Date("2024-01-01"),
    periodEnd: new Date("2024-12-31"),
    basis: "CASH" as const,
    totalRevenue: 1_811_761.34,
    totalCOGS: 1_170_000,
    grossProfit: 641_761.34,
    grossMargin: 0.354,
    totalOpEx: 468_673.9,
    netIncome: 173_087.44,
    netMargin: 0.0956,
    cogsPayroll: 437_000,
    cogsContractors: 549_000,
    cogsSoftware: 45_000,
    estimatedContractorLag: null,
    adjustedCOGS: null,
    adjustedGrossProfit: null,
    adjustedGrossMargin: null,
    lineItems: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns structured P&L when period is found", async () => {
    vi.mocked(prisma.financialPeriod.findFirst).mockResolvedValue(MOCK_PERIOD);

    const result = (await executeTool("periods_getPnL", COMPANY_ID, {
      periodStart: "2024-01-01",
      periodEnd: "2024-12-31",
      basis: "CASH",
    })) as Record<string, unknown>;

    expect(result._meta).toMatchObject({
      source: "FinancialPeriod",
      basis: "CASH",
    });
    expect(result.totalRevenue).toBe(1_811_761.34);
    expect(result.grossMargin).toBe(0.354);
    expect(result.netIncome).toBe(173_087.44);
  });

  it("includes COGS breakdown when all three fields present", async () => {
    vi.mocked(prisma.financialPeriod.findFirst).mockResolvedValue(MOCK_PERIOD);

    const result = (await executeTool("periods_getPnL", COMPANY_ID, {
      periodStart: "2024-01-01",
      periodEnd: "2024-12-31",
      basis: "CASH",
    })) as { cogsBreakdown?: { payroll?: number; contractors?: number } };

    expect(result.cogsBreakdown?.payroll).toBe(437_000);
    expect(result.cogsBreakdown?.contractors).toBe(549_000);
  });

  it("omits cogsBreakdown when all COGS fields are null", async () => {
    vi.mocked(prisma.financialPeriod.findFirst).mockResolvedValue({
      ...MOCK_PERIOD,
      cogsPayroll: null,
      cogsContractors: null,
      cogsSoftware: null,
    });

    const result = (await executeTool("periods_getPnL", COMPANY_ID, {
      periodStart: "2024-01-01",
      periodEnd: "2024-12-31",
      basis: "CASH",
    })) as { cogsBreakdown?: unknown };

    expect(result.cogsBreakdown).toBeUndefined();
  });

  it("throws when period is not found", async () => {
    vi.mocked(prisma.financialPeriod.findFirst).mockResolvedValue(null);

    await expect(
      executeTool("periods_getPnL", COMPANY_ID, {
        periodStart: "2023-01-01",
        periodEnd: "2023-12-31",
        basis: "CASH",
      }),
    ).rejects.toThrow("No financial period found");
  });

  it("queries with companyId scoped to the caller", async () => {
    vi.mocked(prisma.financialPeriod.findFirst).mockResolvedValue(MOCK_PERIOD);

    await executeTool("periods_getPnL", COMPANY_ID, {
      periodStart: "2024-01-01",
      periodEnd: "2024-12-31",
      basis: "CASH",
    });

    const callArg = vi.mocked(prisma.financialPeriod.findFirst).mock
      .calls[0][0] as { where: { companyId: string } };
    expect(callArg.where.companyId).toBe(COMPANY_ID);
  });

  it("uses date-window query (gte/lt) not exact match", async () => {
    vi.mocked(prisma.financialPeriod.findFirst).mockResolvedValue(MOCK_PERIOD);

    await executeTool("periods_getPnL", COMPANY_ID, {
      periodStart: "2024-01-01",
      periodEnd: "2024-12-31",
      basis: "CASH",
    });

    const callArg = vi.mocked(prisma.financialPeriod.findFirst).mock
      .calls[0][0] as {
      where: {
        periodStart: { gte: Date; lt: Date };
        periodEnd: { gte: Date; lt: Date };
      };
    };
    // Should be range objects, not plain Date values
    expect(callArg.where.periodStart).toHaveProperty("gte");
    expect(callArg.where.periodStart).toHaveProperty("lt");
    expect(callArg.where.periodEnd).toHaveProperty("gte");
    expect(callArg.where.periodEnd).toHaveProperty("lt");
  });

  it("date window spans exactly 24 hours", async () => {
    vi.mocked(prisma.financialPeriod.findFirst).mockResolvedValue(MOCK_PERIOD);

    await executeTool("periods_getPnL", COMPANY_ID, {
      periodStart: "2024-01-01",
      periodEnd: "2024-12-31",
      basis: "CASH",
    });

    const callArg = vi.mocked(prisma.financialPeriod.findFirst).mock
      .calls[0][0] as {
      where: {
        periodStart: { gte: Date; lt: Date };
      };
    };
    const windowMs =
      callArg.where.periodStart.lt.getTime() -
      callArg.where.periodStart.gte.getTime();
    expect(windowMs).toBe(86_400_000); // exactly 24 hours
  });
});

// ─── projects_list ───────────────────────────────────────────────────────────

describe("projects_list tool handler", () => {
  const COMPANY_ID = "codelab303";

  const MOCK_PROJECTS = [
    {
      id: "proj-1",
      name: "Acme Rebuild",
      clientName: "Acme Corp",
      status: "ACTIVE" as const,
      classification: "FUND" as const,
      startDate: new Date("2024-03-01"),
      endDate: null,
      contractValue: 120_000,
      monthlyRetainer: 10_000,
    },
    {
      id: "proj-2",
      name: "Internal Tooling",
      clientName: null,
      status: "COMPLETED" as const,
      classification: "FRONTIER" as const,
      startDate: new Date("2023-06-01"),
      endDate: new Date("2023-12-31"),
      contractValue: null,
      monthlyRetainer: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all projects when no filters provided", async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue(MOCK_PROJECTS);

    const result = (await executeTool("projects_list", COMPANY_ID, {})) as {
      _meta: { count: number };
      projects: unknown[];
    };

    expect(result._meta.count).toBe(2);
    expect(result.projects).toHaveLength(2);
  });

  it("passes companyId to Prisma query", async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([]);

    await executeTool("projects_list", COMPANY_ID, {});

    const callArg = vi.mocked(prisma.project.findMany).mock.calls[0][0] as {
      where: { companyId: string };
    };
    expect(callArg.where.companyId).toBe(COMPANY_ID);
  });

  it("passes status filter to Prisma when provided", async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([MOCK_PROJECTS[0]]);

    await executeTool("projects_list", COMPANY_ID, { status: "ACTIVE" });

    const callArg = vi.mocked(prisma.project.findMany).mock.calls[0][0] as {
      where: { status: string };
    };
    expect(callArg.where.status).toBe("ACTIVE");
  });

  it("passes clientName as case-insensitive contains filter", async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([MOCK_PROJECTS[0]]);

    await executeTool("projects_list", COMPANY_ID, { clientName: "acme" });

    const callArg = vi.mocked(prisma.project.findMany).mock.calls[0][0] as {
      where: { clientName: { contains: string; mode: string } };
    };
    expect(callArg.where.clientName).toEqual({
      contains: "acme",
      mode: "insensitive",
    });
  });

  it("formats dates as YYYY-MM-DD strings", async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([MOCK_PROJECTS[0]]);

    const result = (await executeTool("projects_list", COMPANY_ID, {})) as {
      projects: Array<{ startDate: string | null }>;
    };

    expect(result.projects[0].startDate).toBe("2024-03-01");
  });

  it("sets null for missing endDate", async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([MOCK_PROJECTS[0]]);

    const result = (await executeTool("projects_list", COMPANY_ID, {})) as {
      projects: Array<{ endDate: string | null }>;
    };

    expect(result.projects[0].endDate).toBeNull();
  });

  it("returns empty projects array when none match", async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([]);

    const result = (await executeTool("projects_list", COMPANY_ID, {
      status: "LOST",
    })) as { _meta: { count: number }; projects: unknown[] };

    expect(result._meta.count).toBe(0);
    expect(result.projects).toHaveLength(0);
  });
});

// ─── narrative_recent ────────────────────────────────────────────────────────

describe("narrative_recent tool handler", () => {
  const COMPANY_ID = "codelab303";

  const MOCK_NARRATIVES = [
    {
      id: "narr-1",
      type: "MONTHLY_SUMMARY" as const,
      title: "January 2024 Summary",
      periodStart: new Date("2024-01-01"),
      periodEnd: new Date("2024-01-31"),
      generatedAt: new Date("2024-02-02T10:00:00Z"),
      content: "A".repeat(250),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns narratives with metadata", async () => {
    vi.mocked(prisma.narrative.findMany).mockResolvedValue(MOCK_NARRATIVES);

    const result = (await executeTool("narrative_recent", COMPANY_ID, {})) as {
      _meta: { count: number };
      narratives: unknown[];
    };

    expect(result._meta.count).toBe(1);
    expect(result.narratives).toHaveLength(1);
  });

  it("truncates content to 200 chars for summary", async () => {
    vi.mocked(prisma.narrative.findMany).mockResolvedValue(MOCK_NARRATIVES);

    const result = (await executeTool("narrative_recent", COMPANY_ID, {})) as {
      narratives: Array<{ summary: string }>;
    };

    expect(result.narratives[0].summary.length).toBeLessThanOrEqual(203); // 200 + "..."
    expect(result.narratives[0].summary.endsWith("...")).toBe(true);
  });

  it("does not add ellipsis when content is ≤200 chars", async () => {
    const short = { ...MOCK_NARRATIVES[0], content: "Short narrative." };
    vi.mocked(prisma.narrative.findMany).mockResolvedValue([short]);

    const result = (await executeTool("narrative_recent", COMPANY_ID, {})) as {
      narratives: Array<{ summary: string }>;
    };

    expect(result.narratives[0].summary).toBe("Short narrative.");
  });

  it("defaults limit to 10 when not specified", async () => {
    vi.mocked(prisma.narrative.findMany).mockResolvedValue([]);

    await executeTool("narrative_recent", COMPANY_ID, {});

    const callArg = vi.mocked(prisma.narrative.findMany).mock.calls[0][0] as {
      take: number;
    };
    expect(callArg.take).toBe(10);
  });

  it("respects explicit limit", async () => {
    vi.mocked(prisma.narrative.findMany).mockResolvedValue([]);

    await executeTool("narrative_recent", COMPANY_ID, { limit: 5 });

    const callArg = vi.mocked(prisma.narrative.findMany).mock.calls[0][0] as {
      take: number;
    };
    expect(callArg.take).toBe(5);
  });

  it("passes type filter when provided", async () => {
    vi.mocked(prisma.narrative.findMany).mockResolvedValue([]);

    await executeTool("narrative_recent", COMPANY_ID, {
      type: "QUARTERLY_REVIEW",
    });

    const callArg = vi.mocked(prisma.narrative.findMany).mock.calls[0][0] as {
      where: { type: string };
    };
    expect(callArg.where.type).toBe("QUARTERLY_REVIEW");
  });

  it("scopes query to companyId", async () => {
    vi.mocked(prisma.narrative.findMany).mockResolvedValue([]);

    await executeTool("narrative_recent", COMPANY_ID, {});

    const callArg = vi.mocked(prisma.narrative.findMany).mock.calls[0][0] as {
      where: { companyId: string };
    };
    expect(callArg.where.companyId).toBe(COMPANY_ID);
  });
});
