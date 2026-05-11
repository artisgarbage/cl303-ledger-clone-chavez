/**
 * Context Builder
 *
 * Assembles per-turn context: company info, conversation history, relevant data snippets.
 */

import { prisma } from "@/lib/prisma";

export interface TurnContext {
  companyName: string;
  fiscalYearStart: number;
}

/**
 * Build context for a turn
 */
export async function buildTurnContext(
  companyId: string,
): Promise<TurnContext> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      name: true,
      fiscalYearStart: true,
    },
  });

  if (!company) {
    throw new Error(`Company ${companyId} not found`);
  }

  return {
    companyName: company.name,
    fiscalYearStart: company.fiscalYearStart,
  };
}
