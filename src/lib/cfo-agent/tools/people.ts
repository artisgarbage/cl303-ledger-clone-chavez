/**
 * people.* — Tools for team roster, utilization, cost basis, and compensation
 */

import type { ToolDefinition } from "./index";
import {
  listPeople,
  getUtilization,
  getTrueCostForPerson,
  getCompensation,
  type PersonListItem,
  type PersonUtilization,
  type CompensationInfo,
} from "../queries/people";

// ============================================================================
// people.list
// ============================================================================

export const peopleListTool: ToolDefinition = {
  name: "people_list",
  description:
    "List all team members (employees and contractors) with their role, type, and active status. Use filters to narrow down by employment type or activity status.",
  input_schema: {
    type: "object",
    properties: {
      isActive: {
        type: "boolean",
        description:
          "Filter by active status. true = active team members only, false = inactive only. Omit to include all.",
      },
      type: {
        type: "string",
        enum: ["SALARIED", "PARTNER", "CONTRACTOR"],
        description: "Filter by employment type. Omit to include all types.",
      },
      role: {
        type: "string",
        description:
          "Filter by role (case-insensitive substring match). Example: 'engineer', 'designer', 'manager'.",
      },
    },
  },
};

export interface PeopleListInput {
  isActive?: boolean;
  type?: "SALARIED" | "PARTNER" | "CONTRACTOR";
  role?: string;
}

export interface PeopleListOutput {
  _meta: {
    source: string;
    totalCount: number;
  };
  people: Array<{
    id: string;
    name: string;
    email: string;
    role: string | null;
    type: "SALARIED" | "PARTNER" | "CONTRACTOR";
    isActive: boolean;
  }>;
}

async function peopleList(
  companyId: string,
  input: PeopleListInput
): Promise<PeopleListOutput> {
  const people = await listPeople(companyId, input);

  return {
    _meta: {
      source: "Person",
      totalCount: people.length,
    },
    people,
  };
}

// ============================================================================
// people.getUtilization
// ============================================================================

export const peopleGetUtilizationTool: ToolDefinition = {
  name: "people_getUtilization",
  description:
    "Get utilization metrics for team members over a period. Returns billable vs non-billable hours, utilization rate (billable %), and effective rate (revenue per billable hour). Use to identify under-utilized team members or capacity issues.",
  input_schema: {
    type: "object",
    properties: {
      periodStart: {
        type: "string",
        description:
          "Start date of the period in ISO 8601 format (YYYY-MM-DD). Example: 2026-01-01.",
      },
      periodEnd: {
        type: "string",
        description:
          "End date of the period in ISO 8601 format (YYYY-MM-DD). Example: 2026-01-31.",
      },
      personId: {
        type: "string",
        description:
          "Optional: specific person ID to get utilization for. Omit to get all active team members.",
      },
    },
    required: ["periodStart", "periodEnd"],
  },
};

export interface PeopleGetUtilizationInput {
  periodStart: string;
  periodEnd: string;
  personId?: string;
}

export interface PeopleGetUtilizationOutput {
  _meta: {
    source: string;
    period: string;
  };
  utilization: Array<{
    personId: string;
    personName: string;
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    utilizationRate: number; // 0-1 (e.g., 0.65 = 65%)
    effectiveRate: number | null; // Revenue / billable hours
  }>;
  summary: {
    avgUtilization: number;
    underUtilizedCount: number; // < 65%
    threshold: number; // 0.65
  };
}

async function peopleGetUtilization(
  companyId: string,
  input: PeopleGetUtilizationInput
): Promise<PeopleGetUtilizationOutput> {
  const { periodStart, periodEnd, personId } = input;

  const utilization = await getUtilization(
    companyId,
    new Date(periodStart),
    new Date(periodEnd),
    personId
  );

  const threshold = 0.65;
  const avgUtilization =
    utilization.length > 0
      ? utilization.reduce((sum, u) => sum + u.utilizationRate, 0) /
        utilization.length
      : 0;
  const underUtilizedCount = utilization.filter(
    (u) => u.utilizationRate < threshold
  ).length;

  return {
    _meta: {
      source: "TimeEntry",
      period: `${periodStart} to ${periodEnd}`,
    },
    utilization,
    summary: {
      avgUtilization,
      underUtilizedCount,
      threshold,
    },
  };
}

// ============================================================================
// people.getTrueCost
// ============================================================================

export const peopleGetTrueCostTool: ToolDefinition = {
  name: "people_getTrueCost",
  description:
    "Get the true cost basis for a specific person over a period. For salaried employees, returns monthly compensation, hours worked, and effective hourly rate (variable based on hours). For contractors, returns hourly rate, hours, and total cost. This is INTERNAL DATA — never share in proposal or client-facing contexts.",
  input_schema: {
    type: "object",
    properties: {
      personId: {
        type: "string",
        description: "The ID of the person to get cost basis for.",
      },
      periodStart: {
        type: "string",
        description:
          "Start date of the period in ISO 8601 format (YYYY-MM-DD).",
      },
      periodEnd: {
        type: "string",
        description:
          "End date of the period in ISO 8601 format (YYYY-MM-DD).",
      },
    },
    required: ["personId", "periodStart", "periodEnd"],
  },
};

export interface PeopleGetTrueCostInput {
  personId: string;
  periodStart: string;
  periodEnd: string;
}

export interface PeopleGetTrueCostOutput {
  _meta: {
    source: string;
    period: string;
    personId: string;
  };
  costBases: Array<{
    month: string;
    personName: string;
    annualSalary?: number;
    burdenRate?: number;
    totalMonthlyCompensation?: number;
    hourlyRate?: number;
    totalHoursWorked: number;
    effectiveHourlyRate?: number;
    totalCost?: number;
    billableHours?: number;
    nonBillableHours?: number;
    utilizationRate?: number;
  }>;
  totalCost: number;
}

async function peopleGetTrueCost(
  companyId: string,
  input: PeopleGetTrueCostInput
): Promise<PeopleGetTrueCostOutput> {
  const { personId, periodStart, periodEnd } = input;

  const costBases = await getTrueCostForPerson(
    companyId,
    personId,
    new Date(periodStart),
    new Date(periodEnd)
  );

  const totalCost = costBases.reduce((sum, basis) => {
    if ("totalMonthlyCompensation" in basis) {
      return sum + basis.totalMonthlyCompensation;
    } else {
      return sum + basis.totalCost;
    }
  }, 0);

  return {
    _meta: {
      source: "CompensationRecord + TimeEntry",
      period: `${periodStart} to ${periodEnd}`,
      personId,
    },
    costBases: costBases.map((basis) => {
      if ("annualSalary" in basis) {
        // MonthlyCostBasis
        return {
          month: basis.month,
          personName: basis.personName,
          annualSalary: basis.annualSalary,
          burdenRate: basis.burdenRate,
          totalMonthlyCompensation: basis.totalMonthlyCompensation,
          totalHoursWorked: basis.totalHoursWorked,
          effectiveHourlyRate: basis.effectiveHourlyRate,
          billableHours: basis.billableHours,
          nonBillableHours: basis.nonBillableHours,
          utilizationRate: basis.utilizationRate,
        };
      } else {
        // ContractorCostBasis
        return {
          month: basis.month,
          personName: basis.personName,
          hourlyRate: basis.hourlyRate,
          totalHoursWorked: basis.totalHoursWorked,
          totalCost: basis.totalCost,
        };
      }
    }),
    totalCost,
  };
}

// ============================================================================
// people.getCompensation
// ============================================================================

export const peopleGetCompensationTool: ToolDefinition = {
  name: "people_getCompensation",
  description:
    "Get the current compensation record for a specific person (annual salary, hourly rate, burden rate). This is INTERNAL DATA — never share in proposal or client-facing contexts. Hidden in PROPOSAL_BIZDEV mode.",
  input_schema: {
    type: "object",
    properties: {
      personId: {
        type: "string",
        description: "The ID of the person to get compensation for.",
      },
    },
    required: ["personId"],
  },
};

export interface PeopleGetCompensationInput {
  personId: string;
}

export interface PeopleGetCompensationOutput {
  _meta: {
    source: string;
    personId: string;
  };
  compensation: {
    personName: string;
    type: "SALARIED" | "PARTNER" | "CONTRACTOR";
    annualSalary?: number;
    hourlyRate?: number;
    burdenRate?: number;
    effectiveDate: string;
    endDate?: string | null;
  } | null;
}

async function peopleGetCompensation(
  companyId: string,
  input: PeopleGetCompensationInput
): Promise<PeopleGetCompensationOutput> {
  const { personId } = input;

  const comp = await getCompensation(companyId, personId);

  return {
    _meta: {
      source: "CompensationRecord",
      personId,
    },
    compensation: comp
      ? {
          personName: comp.personName,
          type: comp.type,
          annualSalary: comp.annualSalary,
          hourlyRate: comp.hourlyRate,
          burdenRate: comp.burdenRate,
          effectiveDate: comp.effectiveDate.toISOString().split("T")[0],
          endDate: comp.endDate
            ? comp.endDate.toISOString().split("T")[0]
            : null,
        }
      : null,
  };
}

export default {
  peopleList,
  peopleGetUtilization,
  peopleGetTrueCost,
  peopleGetCompensation,
};
