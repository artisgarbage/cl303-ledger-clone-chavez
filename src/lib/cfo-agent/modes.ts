/**
 * Mode/Lens System
 *
 * Margot has three lenses that shift:
 * - System prompt overlay
 * - Which tools are exposed
 * - Output guard that runs over the final response
 */

import { ChatMode } from "@prisma/client";

export interface ModeDefinition {
  key: ChatMode;
  label: string;
  description: string;
  restrictedTools: string[]; // Tool names hidden in this mode
  requiresOutputGuard: boolean;
}

export const MODE_DEFINITIONS: Record<ChatMode, ModeDefinition> = {
  INTERNAL_CFO: {
    key: "INTERNAL_CFO",
    label: "Internal CFO",
    description: "Full access to all internal numbers for leadership.",
    restrictedTools: [],
    requiresOutputGuard: false,
  },

  PROPOSAL_BIZDEV: {
    key: "PROPOSAL_BIZDEV",
    label: "Proposal / Bizdev",
    description:
      "Framing for prospective clients. No internal cost, margin %, or comp data.",
    restrictedTools: [
      "people_getTrueCost",
      "people_getCompensation",
      "projects_getMarginInternal",
    ],
    requiresOutputGuard: true,
  },

  BOARD_INVESTOR: {
    key: "BOARD_INVESTOR",
    label: "Board / Investor",
    description:
      "Formal reporting. Auto-appends basis (cash/accrual) and period labels.",
    restrictedTools: [],
    requiresOutputGuard: true,
  },
};

/**
 * Detect mode from user message intent
 *
 * M1: Rule-based fallback (simple keyword matching)
 * M3: Replace with single-shot Haiku classifier
 */
export function detectModeFromMessage(message: string): ChatMode | null {
  const lower = message.toLowerCase();

  // Proposal/bizdev triggers
  const proposalKeywords = [
    "proposal",
    "prospective client",
    "for the client",
    "for acme",
    "frame this for",
    "sow",
    "statement of work",
  ];
  if (proposalKeywords.some((kw) => lower.includes(kw))) {
    return "PROPOSAL_BIZDEV";
  }

  // Board/investor triggers
  const boardKeywords = [
    "board",
    "investor",
    "formal report",
    "audit",
    "for the board",
  ];
  if (boardKeywords.some((kw) => lower.includes(kw))) {
    return "BOARD_INVESTOR";
  }

  // Default: no auto-switch
  return null;
}

/**
 * Parse explicit mode command from message
 *
 * Examples: "/mode proposal", "/mode board", "/mode internal"
 */
export function parseExplicitModeCommand(message: string): ChatMode | null {
  const modePattern = /^\/mode\s+(proposal|board|internal)/i;
  const match = message.match(modePattern);
  if (!match) return null;

  const cmd = match[1].toLowerCase();
  if (cmd === "proposal") return "PROPOSAL_BIZDEV";
  if (cmd === "board") return "BOARD_INVESTOR";
  if (cmd === "internal") return "INTERNAL_CFO";

  return null;
}

/**
 * Should a tool be available in the given mode?
 */
export function isToolAvailable(toolName: string, mode: ChatMode): boolean {
  const def = MODE_DEFINITIONS[mode];
  return !def.restrictedTools.includes(toolName);
}
