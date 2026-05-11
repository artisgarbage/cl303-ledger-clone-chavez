/**
 * CFO Agent (Margot Hale) - Public API
 *
 * This is the main entry point for the CFO agent library.
 */

export { runTurn, type AgentTurnInput, type AgentTurnOutput } from "./loop";
export { handleWebChatTurn, type WebChatRequest, type WebChatResponse } from "./transports/web";
export { buildSystemPrompt, generateTitle, MARGOT_IDENTITY } from "./persona";
export { MODE_DEFINITIONS, detectModeFromMessage, parseExplicitModeCommand } from "./modes";
export { getToolsForMode, executeTool } from "./tools";
