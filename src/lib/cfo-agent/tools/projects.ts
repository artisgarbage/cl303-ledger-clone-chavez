/**
 * projects.list — List projects with optional filters
 *
 * Returns project metadata including status, client, dates, and headline financials.
 */

import { prisma } from "@/lib/prisma";
import type { ToolDefinition } from "./index";
import type { ProjectStatus, ProjectClass } from "@prisma/client";

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

export default {
  projectsList,
};
