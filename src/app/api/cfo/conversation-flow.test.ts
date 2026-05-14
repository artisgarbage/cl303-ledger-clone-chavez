/**
 * conversation-flow.test.ts
 *
 * End-to-end API test simulating a real multi-turn conversation with Margot.
 * Covers the full request lifecycle:
 *   1. Create conversation
 *   2. Send message → Margot responds with tool use → final text reply
 *   3. Send follow-up → Margot responds with plain text
 *   4. Send third message → Margot calls a different tool
 *   5. Rename conversation (PATCH)
 *   6. Fetch conversation → assert all messages persisted in order
 *   7. IDOR: another user's session cannot read, rename, or delete
 *   8. Delete conversation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── vi.hoisted — refs must exist before vi.mock factories ───────────────────

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));
const { mockExecuteTool } = vi.hoisted(() => ({ mockExecuteTool: vi.fn() }));

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth-helpers", () => ({
  requireSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    message: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

vi.mock("@/lib/cfo-agent/context/builder", () => ({
  buildTurnContext: vi
    .fn()
    .mockResolvedValue({ companyName: "Codelab303 LLC", fiscalYearStart: 1 }),
}));

vi.mock("@/lib/cfo-agent/tools", () => ({
  getToolsForMode: vi.fn().mockReturnValue([]),
  executeTool: mockExecuteTool,
}));

vi.mock("@/lib/cfo-agent", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cfo-agent")>();
  return {
    ...actual,
    generateTitle: vi
      .fn()
      .mockImplementation((msg: string) => msg.slice(0, 60)),
  };
});

import { requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

// ─── Constants ───────────────────────────────────────────────────────────────

const CONV_ID = "cm0conv000000abcdefghijk";
const COMPANY_ID = "codelab303";
const USER_ID = "user-1";

const SESSION = {
  user: {
    id: USER_ID,
    email: "anthony@codelab303.com",
    companyId: COMPANY_ID,
    role: "ADMIN",
  },
};
const OTHER_SESSION = {
  user: {
    id: "user-evil",
    email: "evil@evil.com",
    companyId: "evil-corp",
    role: "MEMBER",
  },
};

// ─── Factories ───────────────────────────────────────────────────────────────

function makeConversation(overrides: Record<string, unknown> = {}) {
  return {
    id: CONV_ID,
    companyId: COMPANY_ID,
    userId: USER_ID,
    surface: "WEB",
    mode: "INTERNAL_CFO",
    title: null,
    createdAt: new Date("2026-01-01T10:00:00Z"),
    updatedAt: new Date("2026-01-01T10:00:00Z"),
    messages: [],
    ...overrides,
  };
}

function makeMessage(
  id: string,
  role: "USER" | "ASSISTANT",
  content: unknown,
  createdAt: string,
) {
  return {
    id,
    conversationId: CONV_ID,
    role,
    content,
    createdAt: new Date(createdAt),
  };
}

/** Anthropic text-only response */
function textResponse(text: string) {
  return {
    id: `msg_${Math.random().toString(36).slice(2)}`,
    type: "message",
    role: "assistant",
    content: [{ type: "text", text }],
    model: "claude-sonnet-4-20250514",
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 120, output_tokens: 60 },
  };
}

/** Anthropic tool_use response followed by final text */
function toolThenTextResponse(
  toolName: string,
  toolId: string,
  input: unknown,
  finalText: string,
) {
  return [
    {
      id: `msg_tool_${toolId}`,
      type: "message",
      role: "assistant",
      content: [{ type: "tool_use", id: toolId, name: toolName, input }],
      model: "claude-sonnet-4-20250514",
      stop_reason: "tool_use",
      stop_sequence: null,
      usage: { input_tokens: 200, output_tokens: 80 },
    },
    {
      id: `msg_final_${toolId}`,
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: finalText }],
      model: "claude-sonnet-4-20250514",
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: { input_tokens: 300, output_tokens: 120 },
    },
  ];
}

function makeReq(method: string, body?: unknown, path = "") {
  return new Request(`http://localhost:3000/api/cfo${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }) as import("next/server").NextRequest;
}

function makeCtx(id = CONV_ID) {
  return { params: Promise.resolve({ id }) };
}

// ─── Simulation state — builds up as the conversation progresses ─────────────

const persistedMessages: ReturnType<typeof makeMessage>[] = [];

function setupPrismaForConversation(title: string | null = null) {
  vi.mocked(prisma.conversation.findUnique).mockImplementation(
    async ({ where }) => {
      if (where.id !== CONV_ID) return null;
      return makeConversation({ title, messages: persistedMessages }) as never;
    },
  );
  vi.mocked(prisma.message.create).mockImplementation(async ({ data }) => {
    const msg = makeMessage(
      `msg-${persistedMessages.length + 1}`,
      data.role as "USER" | "ASSISTANT",
      data.content,
      new Date().toISOString(),
    );
    persistedMessages.push(msg);
    return msg as never;
  });
  vi.mocked(prisma.conversation.update).mockImplementation(
    async ({ data }) =>
      makeConversation({ title: data.title ?? title }) as never,
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Margot — multi-turn conversation flow", () => {
  let chatPOST: (req: import("next/server").NextRequest) => Promise<Response>;
  let convGET: () => Promise<Response>;
  let convPOST: (req: import("next/server").NextRequest) => Promise<Response>;
  let convIdGET: (
    req: import("next/server").NextRequest,
    ctx: { params: Promise<{ id: string }> },
  ) => Promise<Response>;
  let convIdDELETE: (
    req: import("next/server").NextRequest,
    ctx: { params: Promise<{ id: string }> },
  ) => Promise<Response>;
  let convIdPATCH: (
    req: import("next/server").NextRequest,
    ctx: { params: Promise<{ id: string }> },
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    persistedMessages.length = 0;

    vi.mocked(requireSession).mockResolvedValue(SESSION as never);
    vi.mocked(prisma.conversation.create).mockResolvedValue(
      makeConversation() as never,
    );
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.conversation.delete).mockResolvedValue({} as never);

    const chatMod = await import("./chat/route");
    const convMod = await import("./conversations/route");
    const convIdMod = await import("./conversations/[id]/route");

    chatPOST = chatMod.POST;
    convGET = convMod.GET;
    convPOST = convMod.POST;
    convIdGET = convIdMod.GET;
    convIdDELETE = convIdMod.DELETE;
    convIdPATCH = convIdMod.PATCH;
  });

  // ── 1. Create conversation ─────────────────────────────────────────────────

  it("creates a new conversation with no title", async () => {
    const res = await convPOST(
      makeReq(
        "POST",
        { surface: "WEB", mode: "INTERNAL_CFO" },
        "/conversations",
      ),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.conversation.id).toBe(CONV_ID);
    expect(body.conversation.title).toBeNull();
  });

  // ── 2. Turn 1: user asks about gross margin → tool call → final answer ─────

  it("turn 1: user asks about gross margin — Margot calls periods_getPnL then replies", async () => {
    setupPrismaForConversation(null);

    const [toolResp, finalResp] = toolThenTextResponse(
      "periods_getPnL",
      "tool_abc1",
      { periodStart: "2026-01-01", periodEnd: "2026-03-31", basis: "ACCRUAL" },
      "Your gross margin for Q1 2026 was 42.3%, up from 38.1% in Q4 2025. Revenue was $2.1M with COGS of $1.21M.",
    );

    mockCreate.mockResolvedValueOnce(toolResp).mockResolvedValueOnce(finalResp);

    mockExecuteTool.mockResolvedValueOnce({
      _meta: {
        source: "FinancialPeriod",
        period: "2026-01-01 to 2026-03-31",
        basis: "ACCRUAL",
      },
      totalRevenue: 2100000,
      totalCOGS: 1210000,
      grossProfit: 890000,
      grossMargin: 0.423,
      totalOpEx: 340000,
      netIncome: 550000,
      netMargin: 0.262,
    });

    const res = await chatPOST(
      makeReq(
        "POST",
        {
          conversationId: CONV_ID,
          message: "What was our gross margin for Q1 2026?",
        },
        "/chat",
      ),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toContain("42.3%");

    // Both user + assistant messages should be persisted
    expect(prisma.message.create).toHaveBeenCalledTimes(2);
    const calls = vi.mocked(prisma.message.create).mock.calls;
    expect(calls[0][0].data.role).toBe("USER");
    expect(calls[1][0].data.role).toBe("ASSISTANT");
  });

  // ── 3. Turn 2: follow-up — plain text answer, no tool call ────────────────

  it("turn 2: follow-up question — Margot answers from context, no tool call", async () => {
    // Seed history from turn 1
    persistedMessages.push(
      makeMessage(
        "msg-1",
        "USER",
        "What was our gross margin for Q1 2026?",
        "2026-01-01T10:01:00Z",
      ),
      makeMessage(
        "msg-2",
        "ASSISTANT",
        [{ type: "text", text: "Your gross margin for Q1 2026 was 42.3%..." }],
        "2026-01-01T10:01:05Z",
      ),
    );
    setupPrismaForConversation(null);

    mockCreate.mockResolvedValueOnce(
      textResponse(
        "The 42.3% margin was driven primarily by lower contractor costs and a $320K retainer renewal from your top client.",
      ),
    );

    const res = await chatPOST(
      makeReq(
        "POST",
        {
          conversationId: CONV_ID,
          message: "What drove that margin improvement?",
        },
        "/chat",
      ),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toContain("contractor costs");

    // Anthropic was called once (no tool use) with history + new message
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const createArg = mockCreate.mock.calls[0][0];
    expect(createArg.messages[0].role).toBe("user");
    // Loop wraps user content in XML delimiters to prevent prompt injection
    expect(createArg.messages[2].content).toBe(
      "<user_input>What drove that margin improvement?</user_input>",
    );
  });

  // ── 4. Turn 3: asks about a specific project → projects_getProfitability ───

  it("turn 3: asks about a project — Margot calls projects_getProfitability", async () => {
    persistedMessages.push(
      makeMessage(
        "msg-1",
        "USER",
        "What was our gross margin for Q1 2026?",
        "2026-01-01T10:01:00Z",
      ),
      makeMessage(
        "msg-2",
        "ASSISTANT",
        [{ type: "text", text: "42.3%..." }],
        "2026-01-01T10:01:05Z",
      ),
      makeMessage(
        "msg-3",
        "USER",
        "What drove that margin improvement?",
        "2026-01-01T10:02:00Z",
      ),
      makeMessage(
        "msg-4",
        "ASSISTANT",
        [{ type: "text", text: "Contractor costs..." }],
        "2026-01-01T10:02:05Z",
      ),
    );
    setupPrismaForConversation(null);

    const [toolResp, finalResp] = toolThenTextResponse(
      "projects_getProfitability",
      "tool_proj1",
      {
        projectId: "proj-acme",
        periodStart: "2026-01-01",
        periodEnd: "2026-03-31",
        basis: "ACCRUAL",
      },
      "Project ACME had a gross margin of 61% for Q1 2026 — your highest-margin active project. True cost was $84K against $215K in revenue.",
    );

    mockCreate.mockResolvedValueOnce(toolResp).mockResolvedValueOnce(finalResp);

    mockExecuteTool.mockResolvedValueOnce({
      projectName: "ACME Retainer",
      clientName: "ACME Corp",
      status: "ACTIVE",
      revenue: 215000,
      trueCost: 84000,
      grossProfit: 131000,
      grossMargin: 0.61,
      billableHours: 430,
      totalHours: 510,
      effectiveBlendedRate: 500,
    });

    const res = await chatPOST(
      makeReq(
        "POST",
        {
          conversationId: CONV_ID,
          message: "How did project ACME perform in Q1?",
        },
        "/chat",
      ),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toContain("61%");

    // Tool-use loop calls Anthropic twice: first for tool dispatch, second with result
    expect(mockCreate).toHaveBeenCalledTimes(2);

    // Tool was dispatched with the right tool name
    expect(mockExecuteTool).toHaveBeenCalledWith(
      "projects_getProfitability",
      COMPANY_ID,
      expect.objectContaining({ projectId: "proj-acme" }),
    );
  });

  // ── 5. Rename the conversation ─────────────────────────────────────────────

  it("PATCH renames the conversation", async () => {
    setupPrismaForConversation(null);
    vi.mocked(prisma.conversation.update).mockResolvedValueOnce({
      id: CONV_ID,
      title: "Q1 2026 margin analysis",
    } as never);

    const res = await convIdPATCH(
      makeReq("PATCH", { title: "Q1 2026 margin analysis" }),
      makeCtx(),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.conversation.title).toBe("Q1 2026 margin analysis");
    expect(prisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { title: "Q1 2026 margin analysis" } }),
    );
  });

  it("PATCH rejects title longer than 200 chars", async () => {
    setupPrismaForConversation(null);

    const res = await convIdPATCH(
      makeReq("PATCH", { title: "x".repeat(201) }),
      makeCtx(),
    );

    expect(res.status).toBe(400);
  });

  // ── 6. Fetch conversation — all 6 messages in order ───────────────────────

  it("GET returns all 6 messages in chronological order after 3 turns", async () => {
    const fullHistory = [
      makeMessage(
        "msg-1",
        "USER",
        "What was our gross margin for Q1 2026?",
        "2026-01-01T10:01:00Z",
      ),
      makeMessage(
        "msg-2",
        "ASSISTANT",
        [{ type: "text", text: "42.3%..." }],
        "2026-01-01T10:01:05Z",
      ),
      makeMessage(
        "msg-3",
        "USER",
        "What drove that margin improvement?",
        "2026-01-01T10:02:00Z",
      ),
      makeMessage(
        "msg-4",
        "ASSISTANT",
        [{ type: "text", text: "Contractor costs..." }],
        "2026-01-01T10:02:05Z",
      ),
      makeMessage(
        "msg-5",
        "USER",
        "How did project ACME perform in Q1?",
        "2026-01-01T10:03:00Z",
      ),
      makeMessage(
        "msg-6",
        "ASSISTANT",
        [{ type: "text", text: "61% margin..." }],
        "2026-01-01T10:03:08Z",
      ),
    ];

    vi.mocked(prisma.conversation.findUnique).mockResolvedValueOnce(
      makeConversation({
        title: "Q1 2026 margin analysis",
        messages: fullHistory,
      }) as never,
    );

    const res = await convIdGET(makeReq("GET"), makeCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    const msgs = body.conversation.messages;

    expect(msgs).toHaveLength(6);
    expect(msgs[0].role).toBe("USER");
    expect(msgs[1].role).toBe("ASSISTANT");
    expect(msgs[4].role).toBe("USER");
    expect(msgs[5].role).toBe("ASSISTANT");
    // Messages are chronological
    expect(new Date(msgs[0].createdAt) < new Date(msgs[5].createdAt)).toBe(
      true,
    );
  });

  // ── 7. IDOR: other company cannot access ──────────────────────────────────

  it("IDOR: different company cannot read the conversation", async () => {
    vi.mocked(requireSession).mockResolvedValue(OTHER_SESSION as never);
    vi.mocked(prisma.conversation.findUnique).mockResolvedValueOnce(
      makeConversation() as never,
    );

    const res = await convIdGET(makeReq("GET"), makeCtx());
    expect(res.status).toBe(403);
  });

  it("IDOR: different company cannot rename the conversation", async () => {
    vi.mocked(requireSession).mockResolvedValue(OTHER_SESSION as never);
    vi.mocked(prisma.conversation.findUnique).mockResolvedValueOnce(
      makeConversation() as never,
    );

    const res = await convIdPATCH(
      makeReq("PATCH", { title: "STOLEN" }),
      makeCtx(),
    );
    expect(res.status).toBe(403);
  });

  it("IDOR: different company cannot delete the conversation", async () => {
    vi.mocked(requireSession).mockResolvedValue(OTHER_SESSION as never);
    vi.mocked(prisma.conversation.findUnique).mockResolvedValueOnce(
      makeConversation() as never,
    );

    const res = await convIdDELETE(makeReq("DELETE"), makeCtx());
    expect(res.status).toBe(403);
  });

  it("IDOR: different user at same company cannot read the conversation", async () => {
    vi.mocked(requireSession).mockResolvedValue({
      user: {
        id: "user-2",
        email: "colleague@codelab303.com",
        companyId: COMPANY_ID,
        role: "MEMBER",
      },
    } as never);
    vi.mocked(prisma.conversation.findUnique).mockResolvedValueOnce(
      makeConversation() as never,
    );

    const res = await convIdGET(makeReq("GET"), makeCtx());
    expect(res.status).toBe(403);
  });

  // ── 8. Send a message to a non-existent conversation ──────────────────────

  it("chat returns 404 when conversation does not exist", async () => {
    vi.mocked(prisma.conversation.findUnique).mockResolvedValueOnce(null);

    const res = await chatPOST(
      makeReq("POST", { conversationId: CONV_ID, message: "Hello?" }, "/chat"),
    );
    expect(res.status).toBe(404);
  });

  // ── 9. Anthropic API key missing → 503 ───────────────────────────────────

  it("chat returns 503 when ANTHROPIC_API_KEY is missing", async () => {
    setupPrismaForConversation(null);

    mockCreate.mockRejectedValueOnce(
      new Error("ANTHROPIC_API_KEY environment variable not set"),
    );

    const res = await chatPOST(
      makeReq("POST", { conversationId: CONV_ID, message: "Hello?" }, "/chat"),
    );
    expect(res.status).toBe(503);
  });

  // ── 10. Delete conversation ───────────────────────────────────────────────

  it("deletes the conversation and all its messages", async () => {
    vi.mocked(prisma.conversation.findUnique).mockResolvedValueOnce(
      makeConversation() as never,
    );

    const res = await convIdDELETE(makeReq("DELETE"), makeCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(prisma.conversation.delete).toHaveBeenCalledWith({
      where: { id: CONV_ID },
    });
  });
});
