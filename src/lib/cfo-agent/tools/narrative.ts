/**
 * narrative.recent — List recent AI-generated narratives
 *
 * Allows Margot to reference existing narratives instead of regenerating them.
 */

import { prisma } from "@/lib/prisma";
import type { ToolDefinition } from "./index";
import type { NarrativeType } from "@prisma/client";

export const narrativeRecentTool: ToolDefinition = {
  name: "narrative_recent",
  description:
    "List recently generated financial narratives. Returns titles, types (MONTHLY_SUMMARY, QUARTERLY_REVIEW, etc.), periods covered, and generation dates. Use this to see if a question has already been analyzed in a prior narrative rather than starting from scratch.",
  input_schema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: [
          "MONTHLY_SUMMARY",
          "QUARTERLY_REVIEW",
          "YEAR_OVER_YEAR",
          "PROJECT_PROFITABILITY",
          "MARGIN_ANALYSIS",
          "CASH_VS_ACCRUAL",
          "CUSTOM",
        ],
        description: "Filter by narrative type. Omit to return all types.",
      },
      limit: {
        type: "number",
        description: "Maximum number of narratives to return. Default is 10.",
      },
    },
  },
};

export interface NarrativeRecentInput {
  type?: NarrativeType;
  limit?: number;
}

export interface NarrativeRecentOutput {
  _meta: {
    source: string;
    count: number;
    filters: {
      type?: NarrativeType;
      limit: number;
    };
  };
  narratives: Array<{
    id: string;
    type: NarrativeType;
    title: string | null;
    periodStart: string;
    periodEnd: string;
    generatedAt: string;
    summary: string; // First 200 chars of content
  }>;
}

async function narrativeRecent(
  companyId: string,
  input: NarrativeRecentInput,
): Promise<NarrativeRecentOutput> {
  const { type, limit = 10 } = input;

  // Build where clause
  const where: {
    companyId: string;
    type?: NarrativeType;
  } = {
    companyId,
  };
  if (type) where.type = type;

  // Fetch narratives
  const narratives = await prisma.narrative.findMany({
    where,
    orderBy: { generatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      periodStart: true,
      periodEnd: true,
      generatedAt: true,
      content: true,
    },
  });

  return {
    _meta: {
      source: "Narrative",
      count: narratives.length,
      filters: {
        type,
        limit,
      },
    },
    narratives: narratives.map((n) => {
      // Extract first 200 chars as summary
      const summary =
        n.content.length > 200
          ? n.content.slice(0, 200) + "..."
          : n.content;

      return {
        id: n.id,
        type: n.type,
        title: n.title,
        periodStart: n.periodStart.toISOString().split("T")[0],
        periodEnd: n.periodEnd.toISOString().split("T")[0],
        generatedAt: n.generatedAt.toISOString(),
        summary,
      };
    }),
  };
}

export default {
  narrativeRecent,
};
