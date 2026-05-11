/**
 * Agent Loop
 *
 * Core tool-use loop using Anthropic SDK. For M1, this is synchronous (no streaming).
 * M2 will add SSE streaming.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, Tool, TextBlock, ToolUseBlock } from "@anthropic-ai/sdk/resources/messages";
import { prisma } from "@/lib/prisma";
import { buildSystemPrompt } from "./persona";
import { getToolsForMode } from "./tools";
import { executeTool } from "./tools";
import { buildTurnContext } from "./context/builder";
import type { ChatMode } from "@prisma/client";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOOL_ITERATIONS = 5; // Prevent infinite loops

export interface AgentTurnInput {
  conversationId: string;
  userMessage: string;
  companyId: string;
}

export interface AgentTurnOutput {
  assistantMessage: string;
  toolCalls: Array<{
    name: string;
    input: unknown;
    output: unknown;
  }>;
}

/**
 * Execute one turn of the conversation
 */
export async function runTurn(
  input: AgentTurnInput,
): Promise<AgentTurnOutput> {
  const { conversationId, userMessage, companyId } = input;

  // Fetch conversation and messages
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation) {
    throw new Error(`Conversation ${conversationId} not found`);
  }

  // Build context
  const context = await buildTurnContext(companyId);

  // Build system prompt
  const systemPrompt = buildSystemPrompt(conversation.mode, context.companyName);

  // Get tools for current mode
  const tools = getToolsForMode(conversation.mode);

  // Build message history
  const messages: MessageParam[] = [];

  // Add prior messages
  for (const msg of conversation.messages) {
    if (msg.role === "USER") {
      messages.push({
        role: "user",
        content: extractTextContent(msg.content as unknown[]),
      });
    } else if (msg.role === "ASSISTANT") {
      messages.push({
        role: "assistant",
        content: msg.content as Anthropic.Messages.ContentBlock[],
      });
    }
    // TOOL and SYSTEM messages are encoded in content blocks, not separate messages
  }

  // Add current user message — wrap in XML delimiter to prevent prompt injection
  // (Anthropic best practice: https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-prompt-injections)
  messages.push({
    role: "user",
    content: `<user_input>${userMessage}</user_input>`,
  });

  // Execute loop
  const toolCalls: Array<{ name: string; input: unknown; output: unknown }> = [];
  let iterations = 0;
  let finalText = "";

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      tools: tools as Tool[],
      messages,
    });

    // Extract content blocks
    const contentBlocks = response.content;
    let hasToolUse = false;

    for (const block of contentBlocks) {
      if (block.type === "text") {
        finalText += block.text;
      } else if (block.type === "tool_use") {
        hasToolUse = true;
        const toolUseBlock = block as ToolUseBlock;

        try {
          // Execute tool
          const toolOutput = await executeTool(
            toolUseBlock.name,
            companyId,
            toolUseBlock.input,
          );

          // Record tool call
          toolCalls.push({
            name: toolUseBlock.name,
            input: toolUseBlock.input,
            output: toolOutput,
          });

          // Append tool result to messages
          messages.push({
            role: "assistant",
            content: [toolUseBlock],
          });

          messages.push({
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: toolUseBlock.id,
                content: JSON.stringify(toolOutput),
              },
            ],
          });
        } catch (error) {
          // Tool execution error - return as is_error
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          messages.push({
            role: "assistant",
            content: [toolUseBlock],
          });

          messages.push({
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: toolUseBlock.id,
                content: errorMessage,
                is_error: true,
              },
            ],
          });

          toolCalls.push({
            name: toolUseBlock.name,
            input: toolUseBlock.input,
            output: { error: errorMessage },
          });
        }
      }
    }

    if (!hasToolUse) {
      // No more tool use - we're done
      // Persist the final turn
      await persistTurn(conversationId, userMessage, response.content, conversation.mode);
      break;
    }

    // Continue loop (model will see tool results and potentially call more tools)
  }

  return {
    assistantMessage: finalText.trim(),
    toolCalls,
  };
}

/**
 * Persist a turn to the database
 */
async function persistTurn(
  conversationId: string,
  userMessage: string,
  assistantContent: Anthropic.Messages.ContentBlock[],
  mode: ChatMode,
): Promise<void> {
  // Create user message
  await prisma.message.create({
    data: {
      conversationId,
      role: "USER",
      content: [{ type: "text", text: userMessage }],
      modeAtTurn: mode,
    },
  });

  // Create assistant message
  await prisma.message.create({
    data: {
      conversationId,
      role: "ASSISTANT",
      content: assistantContent as unknown as Record<string, unknown>,
      modeAtTurn: mode,
    },
  });

  // Update conversation timestamp
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });
}

/**
 * Extract text content from message content blocks
 */
function extractTextContent(content: unknown[]): string {
  if (!Array.isArray(content)) return "";

  const textBlocks = content.filter(
    (block): block is TextBlock =>
      typeof block === "object" &&
      block !== null &&
      "type" in block &&
      block.type === "text",
  );

  return textBlocks.map((block) => block.text).join("\n");
}
