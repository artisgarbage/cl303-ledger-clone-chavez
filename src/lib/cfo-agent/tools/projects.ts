/**
 * projects.list — List projects with optional filters
 *
 * Returns project metadata including status, client, dates, and headline financials.
 */

import { prisma } from "@/lib/prisma";
import type { ToolDefinition } from "./index";
import type {
  ProjectStatus,
  ProjectClass,
  AccountingBasis,
} from "@prisma/client";
import {
  getProjectProfitability,
  type ProjectProfitability,
} from "@/lib/engine/project-profitability";
import { getProjectTrueCost } from "@/lib/engine/cost-basis";

export const projectsListTool: ToolDefinition = {
  name: "projects_list",
  description:
    "List projects with optional filters. Returns project names, client names, status (ACTIVE, COMPLETED, PAUSED, LOST), classification (FUND or FRONTIER), and key dates. Use this to explore what projects exist before diving into profitability details.",
  input_schema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["ACTIVE", "COMPLETED", "PAUSED", "LOST"],
        description: "Filter by project status. Omit to return all statuses.",
      },
      classification: {
        type: "string",
        enum: ["FUND", "FRONTIER"],
        description:
          "Filter by classification. FUND = repeatable client work, FRONTIER = selective high-leverage projects. Omit to return all classifications.",
      },
      clientName: {
        type: "string",
        description:
          "Filter by client name (case-insensitive partial match). Omit to return all clients.",
      },
    },
  },
};

export interface ProjectsListInput {
  status?: ProjectStatus;
  classification?: ProjectClass;
  clientName?: string;
}

export interface ProjectsListOutput {
  _meta: {
    source: string;
    count: number;
    filters: {
      status?: ProjectStatus;
      classification?: ProjectClass;
      clientName?: string;
    };
  };
  projects: Array<{
    id: string;
    name: string;
    clientName: string | null;
    status: ProjectStatus;
    classification: ProjectClass;
    startDate: string | null;
    endDate: string | null;
    contractValue: number | null;
    monthlyRetainer: number | null;
  }>;
}

async function projectsList(
  companyId: string,
  input: ProjectsListInput,
): Promise<ProjectsListOutput> {
  const { status, classification, clientName } = input;

  // Build where clause
  const where: {
    companyId: string;
    status?: ProjectStatus;
    classification?: ProjectClass;
    clientName?: { contains: string; mode: "insensitive" };
  } = {
    companyId,
  };

  if (status) where.status = status;
  if (classification) where.classification = classification;
  if (clientName) {
    where.clientName = { contains: clientName, mode: "insensitive" };
  }

  // Fetch projects
  const projects = await prisma.project.findMany({
    where,
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      clientName: true,
      status: true,
      classification: true,
      startDate: true,
      endDate: true,
      contractValue: true,
      monthlyRetainer: true,
    },
  });

  return {
    _meta: {
      source: "Project",
      count: projects.length,
      filters: {
        status,
        classification,
        clientName,
      },
    },
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      clientName: p.clientName,
      status: p.status,
      classification: p.classification,
      startDate: p.startDate ? p.startDate.toISOString().split("T")[0] : null,
      endDate: p.endDate ? p.endDate.toISOString().split("T")[0] : null,
      contractValue: p.contractValue,
      monthlyRetainer: p.monthlyRetainer,
    })),
  };
}

// ============================================================================
// projects.getProfitability
// ============================================================================

export const projectsGetProfitabilityTool: ToolDefinition = {
  name: "projects_getProfitability",
  description:
    "Get full P&L for a specific project: revenue, true cost (including variable employee cost and contractor expenses), gross profit, gross margin, hours breakdown, effective blended rate, and top contributors by cost. Use this for deep-dive project profitability analysis.",
  input_schema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "The ID of the project to analyze.",
      },
      periodStart: {
        type: "string",
        description:
          "Start date for the analysis period in ISO 8601 format (YYYY-MM-DD).",
      },
      periodEnd: {
        type: "string",
        description:
          "End date for the analysis period in ISO 8601 format (YYYY-MM-DD).",
      },
      basis: {
        type: "string",
        enum: ["CASH", "ACCRUAL"],
        description: "Accounting basis. Use CASH or ACCRUAL.",
      },
    },
    required: ["projectId", "periodStart", "periodEnd"],
  },
};

export interface ProjectsGetProfitabilityInput {
  projectId: string;
  periodStart: string;
  periodEnd: string;
  basis?: "CASH" | "ACCRUAL";
}

export interface ProjectsGetProfitabilityOutput {
  _meta: {
    source: string;
    projectId: string;
    period: string;
    basis: "CASH" | "ACCRUAL";
  };
  projectName: string;
  clientName: string | null;
  status: string;
  classification: string;
  contractValue: number | null;
  revenue: number;
  trueCost: number;
  grossProfit: number;
  grossMargin: number; // Decimal 0-1
  billableHours: number;
  totalHours: number;
  effectiveBlendedRate: number;
  contributors?: Array<{
    personName: string;
    hours: number;
    cost: number;
  }>;
}

async function projectsGetProfitability(
  companyId: string,
  input: ProjectsGetProfitabilityInput,
): Promise<ProjectsGetProfitabilityOutput> {
  const { projectId, periodStart, periodEnd, basis = "CASH" } = input;

  const start = new Date(periodStart);
  const end = new Date(periodEnd);

  // Get profitability via engine
  const profitability = await getProjectProfitability(
    companyId,
    start,
    end,
    basis as AccountingBasis,
  );

  const project = profitability.find((p) => p.projectId === projectId);
  if (!project) {
    throw new Error(
      `No profitability data found for project ${projectId} in the period ${periodStart} to ${periodEnd}. The project may not have revenue or time entries in this period.`,
    );
  }

  // Get detailed cost breakdown by contributor
  const projectData = await prisma.project.findUnique({
    where: { id: projectId, companyId },
    include: {
      timeEntries: {
        where: {
          date: { gte: start, lte: end },
        },
        include: {
          person: true,
        },
      },
    },
  });

  const contributors: Array<{
    personName: string;
    hours: number;
    cost: number;
  }> = [];

  if (projectData) {
    // Group by person
    const personMap = new Map<
      string,
      { name: string; hours: number; cost: number }
    >();

    for (const entry of projectData.timeEntries) {
      const existing = personMap.get(entry.personId) || {
        name: entry.person.name,
        hours: 0,
        cost: 0,
      };
      existing.hours += entry.hours;
      personMap.set(entry.personId, existing);
    }

    // Calculate cost per person (simplified: true cost / total hours * person hours)
    // A more accurate model would use actual comp records per person
    for (const [personId, data] of personMap.entries()) {
      const personCostRatio = data.hours / project.totalHours;
      const personCost = project.trueCost * personCostRatio;
      contributors.push({
        personName: data.name,
        hours: data.hours,
        cost: personCost,
      });
    }

    contributors.sort((a, b) => b.cost - a.cost);
  }

  return {
    _meta: {
      source: "Project + TimeEntry + CompensationRecord",
      projectId,
      period: `${periodStart} to ${periodEnd}`,
      basis: basis as "CASH" | "ACCRUAL",
    },
    projectName: project.projectName,
    clientName: project.clientName,
    status: project.status,
    classification: project.classification,
    contractValue: project.contractValue,
    revenue: project.revenue,
    trueCost: project.trueCost,
    grossProfit: project.grossProfit,
    grossMargin: project.grossMargin,
    billableHours: project.billableHours,
    totalHours: project.totalHours,
    effectiveBlendedRate: project.effectiveBlendedRate,
    contributors: contributors.length > 0 ? contributors : undefined,
  };
}

// ============================================================================
// projects.getMarginInternal
// ============================================================================

export const projectsGetMarginInternalTool: ToolDefinition = {
  name: "projects_getMarginInternal",
  description:
    "Get internal margin metrics for a project: gross margin %, true cost breakdown by person, and utilization. This is INTERNAL DATA — never share margin percentages, individual cost, or utilization in proposal or client-facing contexts. Hidden in PROPOSAL_BIZDEV mode.",
  input_schema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "The ID of the project to get margin data for.",
      },
      periodStart: {
        type: "string",
        description: "Start date in ISO 8601 format (YYYY-MM-DD).",
      },
      periodEnd: {
        type: "string",
        description: "End date in ISO 8601 format (YYYY-MM-DD).",
      },
      basis: {
        type: "string",
        enum: ["CASH", "ACCRUAL"],
        description: "Accounting basis.",
      },
    },
    required: ["projectId", "periodStart", "periodEnd"],
  },
};

export interface ProjectsGetMarginInternalInput {
  projectId: string;
  periodStart: string;
  periodEnd: string;
  basis?: "CASH" | "ACCRUAL";
}

export interface ProjectsGetMarginInternalOutput {
  _meta: {
    source: string;
    projectId: string;
    period: string;
  };
  projectName: string;
  grossMarginPct: number; // e.g., 35.2
  trueCost: number;
  contributors: Array<{
    personName: string;
    hours: number;
    cost: number;
    utilizationOnProject: number; // hours / total billable hours for person in period
  }>;
}

async function projectsGetMarginInternal(
  companyId: string,
  input: ProjectsGetMarginInternalInput,
): Promise<ProjectsGetMarginInternalOutput> {
  // Reuse getProfitability
  const profData = await projectsGetProfitability(companyId, {
    ...input,
    basis: input.basis || "CASH",
  });

  return {
    _meta: {
      source: "Project + TimeEntry + CompensationRecord",
      projectId: input.projectId,
      period: `${input.periodStart} to ${input.periodEnd}`,
    },
    projectName: profData.projectName,
    grossMarginPct: profData.grossMargin * 100,
    trueCost: profData.trueCost,
    contributors:
      profData.contributors?.map((c) => ({
        personName: c.personName,
        hours: c.hours,
        cost: c.cost,
        utilizationOnProject:
          profData.totalHours > 0 ? c.hours / profData.totalHours : 0,
      })) || [],
  };
}

export default {
  projectsList,
  projectsGetProfitability,
  projectsGetMarginInternal,
};
