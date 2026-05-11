/**
 * Output Guards
 *
 * M1: Stub implementations
 * M3: Enforce proposal mode redaction and board mode formatting
 */

import type { ChatMode } from "@prisma/client";

export interface GuardResult {
  content: string;
  redactions: Array<{ type: string; original: string; replacement: string }>;
}

/**
 * Apply output guard for the given mode
 */
export function applyOutputGuard(
  content: string,
  mode: ChatMode,
): GuardResult {
  switch (mode) {
    case "PROPOSAL_BIZDEV":
      // M3: Implement redaction of margin %, true cost, comp figures
      return { content, redactions: [] };

    case "BOARD_INVESTOR":
      // M3: Implement basis/period label auto-append
      return { content, redactions: [] };

    case "INTERNAL_CFO":
    default:
      return { content, redactions: [] };
  }
}
