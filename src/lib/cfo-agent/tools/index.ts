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
import {
  periodsGetPnLTool,
  type PeriodsGetPnLInput,
} from "./periods";
import {
  projectsListTool,
  type ProjectsListInput,
} from "./projects";
import {
  narrativeRecentTool,
  type NarrativeRecentInput,
} from "./narrative";

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

export const ALL_TOOLS: ToolDefinition[] = [
  periodsGetPnLTool,
  projectsListTool,
  narrativeRecentTool,
];

export const TOOL_HANDLERS: Record<string, ToolHandler> = {
  "periods_getPnL": async (companyId: string, input: unknown) => {
    const { default: handler } = await import("./periods");
    return handler.periodsGetPnL(companyId, input as PeriodsGetPnLInput);
  },
  "projects_list": async (companyId: string, input: unknown) => {
    const { default: handler } = await import("./projects");
    return handler.projectsList(companyId, input as ProjectsListInput);
  },
  "narrative_recent": async (companyId: string, input: unknown) => {
    const { default: handler } = await import("./narrative");
    return handler.narrativeRecent(companyId, input as NarrativeRecentInput);
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
