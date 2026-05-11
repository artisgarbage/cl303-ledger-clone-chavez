/**
 * Web Transport Adapter
 *
 * Adapter for Next.js route handlers. Handles request/response formatting.
 */

import { runTurn, type AgentTurnInput, type AgentTurnOutput } from "../loop";

export interface WebChatRequest {
  conversationId: string;
  message: string;
}

export interface WebChatResponse {
  message: string;
  toolCalls: Array<{
    name: string;
    input: unknown;
    output: unknown;
  }>;
}

/**
 * Execute a chat turn for the web surface
 */
export async function handleWebChatTurn(
  request: WebChatRequest,
  companyId: string,
): Promise<WebChatResponse> {
  const input: AgentTurnInput = {
    conversationId: request.conversationId,
    userMessage: request.message,
    companyId,
  };

  const output: AgentTurnOutput = await runTurn(input);

  return {
    message: output.assistantMessage,
    toolCalls: output.toolCalls,
  };
}
