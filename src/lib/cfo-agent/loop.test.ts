import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── vi.hoisted ensures these refs are available before vi.mock factories run ─

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

const { mockExecuteTool } = vi.hoisted(() => ({
  mockExecuteTool: vi.fn(),
}));

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    message: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/cfo-agent/context/builder", () => ({
  buildTurnContext: vi
    .fn()
    .mockResolvedValue({ companyName: "codelab303 LLC", fiscalYearStart: 1 }),
}));

vi.mock("@/lib/cfo-agent/tools", () => ({
  getToolsForMode: vi.fn().mockReturnValue([]),
  executeTool: mockExecuteTool,
}));

import { prisma } from "@/lib/prisma";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const COMPANY_ID = "codelab303";
const CONVERSATION_ID = "conv_abc123";
const USER_MSG = "What was our gross margin for 2024?";
function makeConversation(overrides = {}) {
  return {
    id: CONVERSATION_ID,
    companyId: COMPANY_ID,
    userId: "user-1",
    surface: "WEB",
    mode: "INTERNAL_CFO",
    messages: [],
    ...overrides,
  };
}

function makeTextResponse(text: string) {
  return {
    id: "msg_1",
    type: "message",
    role: "assistant",
    content: [{ type: "text", text }],
    model: "claude-sonnet-4-20250514",
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 100, output_tokens: 50 },
  };
}

function makeToolUseResponse(toolName: string, toolId: string, input: unknown) {
  return {
    id: "msg_2",
    type: "message",
    role: "assistant",
    content: [{ type: "tool_use", id: toolId, name: toolName, input }],
    model: "claude-sonnet-4-20250514",
    stop_reason: "tool_use",
    stop_sequence: null,
    usage: { input_tokens: 200, output_tokens: 80 },
  };
}

// ─── runTurn tests ────────────────────────────────────────────────────────────

describe("runTurn", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: conversation found, DB writes succeed
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue(
      makeConversation() as never,
    );
    vi.mocked(prisma.message.create).mockResolvedValue({} as never);
    vi.mocked(prisma.conversation.update).mockResolvedValue({} as never);
    mockExecuteTool.mockResolvedValue({ result: "ok" });
  });

  it("throws when conversation is not found", async () => {
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue(null);

    const { runTurn } = await import("./loop");

    await expect(
      runTurn({
        conversationId: "nonexistent",
        userMessage: USER_MSG,
        companyId: COMPANY_ID,
      }),
    ).rejects.toThrow("nonexistent");
  });

  it("returns assistant message text on a simple non-tool response", async () => {
    const { runTurn } = await import("./loop");
    mockCreate.mockResolvedValueOnce(makeTextResponse("35.4% gross margin."));

    const result = await runTurn({
      conversationId: CONVERSATION_ID,
      userMessage: USER_MSG,
      companyId: COMPANY_ID,
    });

    expect(result.assistantMessage).toBe("35.4% gross margin.");
    expect(result.toolCalls).toHaveLength(0);
  });

  it("persists user + assistant messages after non-tool response", async () => {
    const { runTurn } = await import("./loop");
    mockCreate.mockResolvedValueOnce(makeTextResponse("Done."));

    await runTurn({
      conversationId: CONVERSATION_ID,
      userMessage: USER_MSG,
      companyId: COMPANY_ID,
    });

    expect(vi.mocked(prisma.message.create)).toHaveBeenCalledTimes(2);
    const [userCall, assistantCall] = vi.mocked(prisma.message.create).mock
      .calls;
    expect((userCall[0] as { data: { role: string } }).data.role).toBe("USER");
    expect((assistantCall[0] as { data: { role: string } }).data.role).toBe(
      "ASSISTANT",
    );
  });

  it("executes tool call and returns tool trace in output", async () => {
    const { runTurn } = await import("./loop");

    mockExecuteTool.mockResolvedValueOnce({
      _meta: { source: "FinancialPeriod", period: "2024", basis: "CASH" },
      totalRevenue: 1_811_761,
      grossMargin: 0.354,
    });
    // First call: model uses tool
    mockCreate.mockResolvedValueOnce(
      makeToolUseResponse("periods_getPnL", "tu_001", {
        periodStart: "2024-01-01",
        periodEnd: "2024-12-31",
        basis: "CASH",
      }),
    );
    // Second call: model returns final text
    mockCreate.mockResolvedValueOnce(
      makeTextResponse("35.4% gross margin for 2024."),
    );

    const result = await runTurn({
      conversationId: CONVERSATION_ID,
      userMessage: USER_MSG,
      companyId: COMPANY_ID,
    });

    expect(result.toolCalls.length).toBeGreaterThanOrEqual(1);
    expect(result.toolCalls[0].name).toBe("periods_getPnL");
    expect(result.assistantMessage).toContain("35.4%");
  });

  it("surfaces tool errors as is_error result and continues loop", async () => {
    const { runTurn } = await import("./loop");

    mockExecuteTool.mockRejectedValueOnce(
      new Error("No financial period found"),
    );
    mockCreate.mockResolvedValueOnce(
      makeToolUseResponse("periods_getPnL", "tu_err", {
        periodStart: "2020-01-01",
        periodEnd: "2020-12-31",
        basis: "CASH",
      }),
    );
    // Model sees error and gives a graceful reply
    mockCreate.mockResolvedValueOnce(
      makeTextResponse("No data found for 2020. Import QuickBooks data first."),
    );

    const result = await runTurn({
      conversationId: CONVERSATION_ID,
      userMessage: "What was margin for 2020?",
      companyId: COMPANY_ID,
    });

    // Tool error recorded in toolCalls
    expect(result.toolCalls[0].output).toMatchObject({
      error: "No financial period found",
    });
    // Final message should be present
    expect(result.assistantMessage.length).toBeGreaterThan(0);
  });

  it("stops after MAX_TOOL_ITERATIONS without persisting", async () => {
    const { runTurn } = await import("./loop");

    // Always return tool use (infinite loop scenario)
    mockCreate.mockResolvedValue(
      makeToolUseResponse("periods_getPnL", "tu_loop", {
        periodStart: "2024-01-01",
        periodEnd: "2024-12-31",
        basis: "CASH",
      }),
    );

    await runTurn({
      conversationId: CONVERSATION_ID,
      userMessage: USER_MSG,
      companyId: COMPANY_ID,
    });

    // Anthropic was called exactly MAX_TOOL_ITERATIONS (5) times
    expect(mockCreate).toHaveBeenCalledTimes(5);
    // Messages NOT persisted (loop exhausted without final text)
    expect(vi.mocked(prisma.message.create)).not.toHaveBeenCalled();
  });

  it("includes prior messages in Anthropic API request", async () => {
    const conv = makeConversation({
      messages: [
        {
          id: "m1",
          role: "USER",
          content: [{ type: "text", text: "First question" }],
          modeAtTurn: "INTERNAL_CFO",
          createdAt: new Date(),
        },
        {
          id: "m2",
          role: "ASSISTANT",
          content: [{ type: "text", text: "First answer" }],
          modeAtTurn: "INTERNAL_CFO",
          createdAt: new Date(),
        },
      ],
    });
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue(conv as never);

    const { runTurn } = await import("./loop");
    mockCreate.mockResolvedValueOnce(makeTextResponse("Follow-up answer."));

    await runTurn({
      conversationId: CONVERSATION_ID,
      userMessage: "Follow-up question",
      companyId: COMPANY_ID,
    });

    const messagesArg = mockCreate.mock.calls[0][0].messages as unknown[];
    // prior USER + ASSISTANT + current USER = 3 messages
    expect(messagesArg.length).toBeGreaterThanOrEqual(3);
  });

  it("passes company name to system prompt", async () => {
    const { runTurn } = await import("./loop");
    mockCreate.mockResolvedValueOnce(makeTextResponse("ok"));

    await runTurn({
      conversationId: CONVERSATION_ID,
      userMessage: USER_MSG,
      companyId: COMPANY_ID,
    });

    const systemArg = mockCreate.mock.calls[0][0].system as string;
    expect(systemArg).toContain("codelab303 LLC");
  });
});
