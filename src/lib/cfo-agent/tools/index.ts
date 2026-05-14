/**
 * Tool Registry
 *
 * All tools available to Margot. Each tool has:
 * - name: unique identifier
 * - description: for the model
 * - input_schema: JSON Schema for parameters
 * - handler: async function that executes the tool
 */

import { ChatMode } from "@prisma/client";
import { isToolAvailable } from "../modes";

// Import tool definitions
import {
  periodsListTool,
  periodsGetPnLTool,
  periodsCompareTool,
  type PeriodsListInput,
  type PeriodsGetPnLInput,
  type PeriodsCompareInput,
} from "./periods";
import {
  projectsListTool,
  projectsGetProfitabilityTool,
  projectsGetMarginInternalTool,
  type ProjectsListInput,
  type ProjectsGetProfitabilityInput,
  type ProjectsGetMarginInternalInput,
} from "./projects";
import { narrativeRecentTool, type NarrativeRecentInput } from "./narrative";
import {
  peopleListTool,
  peopleGetUtilizationTool,
  peopleGetTrueCostTool,
  peopleGetCompensationTool,
  type PeopleListInput,
  type PeopleGetUtilizationInput,
  type PeopleGetTrueCostInput,
  type PeopleGetCompensationInput,
} from "./people";

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export type ToolHandler = (
  companyId: string,
  input: unknown,
) => Promise<unknown>;

// M1 + M2 tools (10 total in M2 partial delivery)
export const ALL_TOOLS: ToolDefinition[] = [
  // Periods (3)
  periodsListTool,
  periodsGetPnLTool,
  periodsCompareTool,
  // Projects (3)
  projectsListTool,
  projectsGetProfitabilityTool,
  projectsGetMarginInternalTool,
  // Narratives (1)
  narrativeRecentTool,
  // People (4)
  peopleListTool,
  peopleGetUtilizationTool,
  peopleGetTrueCostTool,
  peopleGetCompensationTool,
];

export const TOOL_HANDLERS: Record<string, ToolHandler> = {
  // Periods
  periods_list: async (companyId: string, input: unknown) => {
    const { default: handler } = await import("./periods");
    return handler.periodsList(companyId, input as PeriodsListInput);
  },
  periods_getPnL: async (companyId: string, input: unknown) => {
    const { default: handler } = await import("./periods");
    return handler.periodsGetPnL(companyId, input as PeriodsGetPnLInput);
  },
  periods_compare: async (companyId: string, input: unknown) => {
    const { default: handler } = await import("./periods");
    return handler.periodsCompare(companyId, input as PeriodsCompareInput);
  },
  // Projects
  projects_list: async (companyId: string, input: unknown) => {
    const { default: handler } = await import("./projects");
    return handler.projectsList(companyId, input as ProjectsListInput);
  },
  projects_getProfitability: async (companyId: string, input: unknown) => {
    const { default: handler } = await import("./projects");
    return handler.projectsGetProfitability(
      companyId,
      input as ProjectsGetProfitabilityInput,
    );
  },
  projects_getMarginInternal: async (companyId: string, input: unknown) => {
    const { default: handler } = await import("./projects");
    return handler.projectsGetMarginInternal(
      companyId,
      input as ProjectsGetMarginInternalInput,
    );
  },
  // Narratives
  narrative_recent: async (companyId: string, input: unknown) => {
    const { default: handler } = await import("./narrative");
    return handler.narrativeRecent(companyId, input as NarrativeRecentInput);
  },
  // People
  people_list: async (companyId: string, input: unknown) => {
    const { default: handler } = await import("./people");
    return handler.peopleList(companyId, input as PeopleListInput);
  },
  people_getUtilization: async (companyId: string, input: unknown) => {
    const { default: handler } = await import("./people");
    return handler.peopleGetUtilization(
      companyId,
      input as PeopleGetUtilizationInput,
    );
  },
  people_getTrueCost: async (companyId: string, input: unknown) => {
    const { default: handler } = await import("./people");
    return handler.peopleGetTrueCost(
      companyId,
      input as PeopleGetTrueCostInput,
    );
  },
  people_getCompensation: async (companyId: string, input: unknown) => {
    const { default: handler } = await import("./people");
    return handler.peopleGetCompensation(
      companyId,
      input as PeopleGetCompensationInput,
    );
  },
};

/**
 * Get tools available in the given mode
 */
export function getToolsForMode(mode: ChatMode): ToolDefinition[] {
  return ALL_TOOLS.filter((tool) => isToolAvailable(tool.name, mode));
}

/**
 * Execute a tool by name
 */
export async function executeTool(
  toolName: string,
  companyId: string,
  input: unknown,
): Promise<unknown> {
  const handler = TOOL_HANDLERS[toolName];
  if (!handler) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  return handler(companyId, input);
}
