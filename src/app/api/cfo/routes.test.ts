import { describe, it, expect, vi, beforeEach } from "vitest";

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
      delete: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    usageEvent: {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("@/lib/cfo-agent", () => ({
  handleWebChatTurn: vi.fn(),
  generateTitle: vi.fn().mockImplementation((msg: string) => msg.slice(0, 60)),
}));

import { requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { handleWebChatTurn, generateTitle } from "@/lib/cfo-agent";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SESSION = {
  user: {
    id: "user-1",
    email: "anthony@codelab303.com",
    companyId: "codelab303",
    role: "ADMIN",
  },
};

const OTHER_SESSION = {
  user: {
    id: "user-2",
    email: "other@evil.com",
    companyId: "evil-corp",
    role: "MEMBER",
  },
};

function mockSession(overrides = {}) {
  vi.mocked(requireSession).mockResolvedValue({
    ...SESSION,
    ...overrides,
  } as never);
}

function makeRequest(body: unknown, path = "/api/cfo/chat") {
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as import("next/server").NextRequest;
}

function makeGetRequest(path = "/api/cfo/conversations") {
  return new Request(`http://localhost:3000${path}`, {
    method: "GET",
  }) as import("next/server").NextRequest;
}

const VALID_CUID = "cm0abc12300000abcdefghijk";
const ANOTHER_CUID = "cm0xyz99900000xyzabcdefgh";

// ─── POST /api/cfo/chat ───────────────────────────────────────────────────────

describe("POST /api/cfo/chat", () => {
  let POST: (req: import("next/server").NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.usageEvent.count).mockResolvedValue(0);
    vi.mocked(prisma.usageEvent.create).mockResolvedValue({} as never);
    const mod = await import("./chat/route");
    POST = mod.POST;
  });

  it("returns 500 when session throws (no specific 401 handler in chat route)", async () => {
    vi.mocked(requireSession).mockRejectedValue(new Error("Unauthorized"));

    const req = makeRequest({
      conversationId: VALID_CUID,
      message: "hello",
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("returns 400 for invalid request body (missing message)", async () => {
    mockSession();
    const req = makeRequest({ conversationId: VALID_CUID });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid request");
  });

  it("returns 400 when conversationId is not a valid CUID", async () => {
    mockSession();
    const req = makeRequest({
      conversationId: "not-a-cuid",
      message: "hello",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when message exceeds 10000 chars", async () => {
    mockSession();
    const req = makeRequest({
      conversationId: VALID_CUID,
      message: "x".repeat(10001),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when conversation not found", async () => {
    mockSession();
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue(null);

    const req = makeRequest({
      conversationId: VALID_CUID,
      message: "hello",
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns 403 when conversation belongs to another company (IDOR)", async () => {
    vi.mocked(requireSession).mockResolvedValue({
      ...OTHER_SESSION,
    } as never);
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue({
      companyId: "codelab303", // belongs to codelab303
      userId: "user-1",
    } as never);

    const req = makeRequest({
      conversationId: VALID_CUID,
      message: "hello",
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("company");
  });

  it("returns 403 when conversation belongs to another user (IDOR)", async () => {
    // Session user-2 at same company trying to access user-1's conversation
    vi.mocked(requireSession).mockResolvedValue({
      user: { id: "user-2", companyId: "codelab303", role: "MEMBER" },
    } as never);
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue({
      companyId: "codelab303",
      userId: "user-1", // belongs to user-1
    } as never);

    const req = makeRequest({
      conversationId: VALID_CUID,
      message: "hello",
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("user");
  });

  it("returns 200 with agent response on valid request", async () => {
    mockSession();
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue({
      companyId: "codelab303",
      userId: "user-1",
      mode: "INTERNAL_CFO",
    } as never);
    vi.mocked(handleWebChatTurn).mockResolvedValue({
      message: "35.4% gross margin",
      toolCalls: [],
    });

    const req = makeRequest({
      conversationId: VALID_CUID,
      message: "What is our gross margin?",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("35.4% gross margin");
  });

  it("returns 503 when Anthropic API key is missing", async () => {
    mockSession();
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue({
      companyId: "codelab303",
      userId: "user-1",
      mode: "INTERNAL_CFO",
    } as never);
    vi.mocked(handleWebChatTurn).mockRejectedValue(
      new Error("ANTHROPIC_API_KEY"),
    );

    const req = makeRequest({
      conversationId: VALID_CUID,
      message: "hello",
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
  });
});

// ─── GET /api/cfo/conversations ───────────────────────────────────────────────

describe("GET /api/cfo/conversations", () => {
  // GET handler takes no request argument
  let GET: (() => Promise<Response>) & ((req?: unknown) => Promise<Response>);

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("./conversations/route");
    GET = mod.GET as typeof GET;
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireSession).mockRejectedValue(new Error("Unauthorized"));
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns conversations scoped to authenticated user", async () => {
    mockSession();
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([
      {
        id: VALID_CUID,
        surface: "WEB",
        mode: "INTERNAL_CFO",
        title: "Test",
        updatedAt: new Date(),
        createdAt: new Date(),
        messages: [],
      } as never,
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.conversations).toHaveLength(1);
  });

  it("queries with both companyId and userId", async () => {
    mockSession();
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([]);

    await GET();

    const callArg = vi.mocked(prisma.conversation.findMany).mock
      .calls[0][0] as { where: { companyId: string; userId: string } };
    expect(callArg.where.companyId).toBe("codelab303");
    expect(callArg.where.userId).toBe("user-1");
  });

  it("limits to 50 conversations", async () => {
    mockSession();
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([]);

    await GET();

    const callArg = vi.mocked(prisma.conversation.findMany).mock
      .calls[0][0] as { take: number };
    expect(callArg.take).toBe(50);
  });
});

// ─── POST /api/cfo/conversations ──────────────────────────────────────────────

describe("POST /api/cfo/conversations", () => {
  let POST: (req: import("next/server").NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("./conversations/route");
    POST = mod.POST;
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireSession).mockRejectedValue(new Error("Unauthorized"));
    const req = makeRequest({ surface: "WEB" }, "/api/cfo/conversations");
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid surface", async () => {
    mockSession();
    const req = makeRequest({ surface: "TELEGRAM" }, "/api/cfo/conversations");
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 201 with created conversation", async () => {
    mockSession();
    vi.mocked(prisma.conversation.create).mockResolvedValue({
      id: VALID_CUID,
      surface: "WEB",
      mode: "INTERNAL_CFO",
      title: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const req = makeRequest(
      { surface: "WEB", mode: "INTERNAL_CFO" },
      "/api/cfo/conversations",
    );
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.conversation.id).toBe(VALID_CUID);
  });

  it("creates conversation scoped to session companyId + userId", async () => {
    mockSession();
    vi.mocked(prisma.conversation.create).mockResolvedValue({
      id: VALID_CUID,
      surface: "WEB",
      mode: "INTERNAL_CFO",
      title: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const req = makeRequest({ surface: "WEB" }, "/api/cfo/conversations");
    await POST(req);

    const callArg = vi.mocked(prisma.conversation.create).mock.calls[0][0] as {
      data: { companyId: string; userId: string };
    };
    expect(callArg.data.companyId).toBe("codelab303");
    expect(callArg.data.userId).toBe("user-1");
  });

  it("defaults mode to INTERNAL_CFO when not provided", async () => {
    mockSession();
    vi.mocked(prisma.conversation.create).mockResolvedValue({
      id: VALID_CUID,
      surface: "WEB",
      mode: "INTERNAL_CFO",
      title: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const req = makeRequest({ surface: "WEB" }, "/api/cfo/conversations");
    await POST(req);

    const callArg = vi.mocked(prisma.conversation.create).mock.calls[0][0] as {
      data: { mode: string };
    };
    expect(callArg.data.mode).toBe("INTERNAL_CFO");
  });

  it("generates title from initialMessage when provided", async () => {
    mockSession();
    vi.mocked(generateTitle).mockReturnValue("What is our gross margin?");
    vi.mocked(prisma.conversation.create).mockResolvedValue({
      id: VALID_CUID,
      surface: "WEB",
      mode: "INTERNAL_CFO",
      title: "What is our gross margin?",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const req = makeRequest(
      { surface: "WEB", initialMessage: "What is our gross margin?" },
      "/api/cfo/conversations",
    );
    await POST(req);

    expect(vi.mocked(generateTitle)).toHaveBeenCalledWith(
      "What is our gross margin?",
    );
    const callArg = vi.mocked(prisma.conversation.create).mock.calls[0][0] as {
      data: { title: string | null };
    };
    expect(callArg.data.title).toBeTruthy();
  });
});

// ─── GET /api/cfo/conversations/[id] ─────────────────────────────────────────

describe("GET /api/cfo/conversations/[id]", () => {
  let GET: (
    req: import("next/server").NextRequest,
    ctx: { params: Promise<{ id: string }> },
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("./conversations/[id]/route");
    GET = mod.GET;
  });

  function makeCtx(id: string) {
    return { params: Promise.resolve({ id }) };
  }

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireSession).mockRejectedValue(new Error("Unauthorized"));
    const req = makeGetRequest(`/api/cfo/conversations/${VALID_CUID}`);
    const res = await GET(req, makeCtx(VALID_CUID));
    expect(res.status).toBe(401);
  });

  it("returns 404 when conversation not found", async () => {
    mockSession();
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue(null);

    const req = makeGetRequest(`/api/cfo/conversations/${VALID_CUID}`);
    const res = await GET(req, makeCtx(VALID_CUID));
    expect(res.status).toBe(404);
  });

  it("returns 403 when conversation belongs to another company (IDOR)", async () => {
    vi.mocked(requireSession).mockResolvedValue(OTHER_SESSION as never);
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue({
      id: VALID_CUID,
      companyId: "codelab303",
      userId: "user-1",
      messages: [],
    } as never);

    const req = makeGetRequest(`/api/cfo/conversations/${VALID_CUID}`);
    const res = await GET(req, makeCtx(VALID_CUID));
    expect(res.status).toBe(403);
  });

  it("returns 403 when conversation belongs to another user at same company", async () => {
    vi.mocked(requireSession).mockResolvedValue({
      user: { id: "user-2", companyId: "codelab303", role: "MEMBER" },
    } as never);
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue({
      id: VALID_CUID,
      companyId: "codelab303",
      userId: "user-1",
      messages: [],
    } as never);

    const req = makeGetRequest(`/api/cfo/conversations/${VALID_CUID}`);
    const res = await GET(req, makeCtx(VALID_CUID));
    expect(res.status).toBe(403);
  });

  it("returns 200 with conversation when authorized", async () => {
    mockSession();
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue({
      id: VALID_CUID,
      companyId: "codelab303",
      userId: "user-1",
      messages: [],
    } as never);

    const req = makeGetRequest(`/api/cfo/conversations/${VALID_CUID}`);
    const res = await GET(req, makeCtx(VALID_CUID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.conversation.id).toBe(VALID_CUID);
  });
});

// ─── DELETE /api/cfo/conversations/[id] ──────────────────────────────────────

describe("DELETE /api/cfo/conversations/[id]", () => {
  let DELETE: (
    req: import("next/server").NextRequest,
    ctx: { params: Promise<{ id: string }> },
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("./conversations/[id]/route");
    DELETE = mod.DELETE;
  });

  function makeDeleteRequest(id: string) {
    return new Request(`http://localhost:3000/api/cfo/conversations/${id}`, {
      method: "DELETE",
    }) as import("next/server").NextRequest;
  }

  function makeCtx(id: string) {
    return { params: Promise.resolve({ id }) };
  }

  it("returns 404 when conversation not found", async () => {
    mockSession();
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue(null);

    const req = makeDeleteRequest(VALID_CUID);
    const res = await DELETE(req, makeCtx(VALID_CUID));
    expect(res.status).toBe(404);
  });

  it("returns 403 when conversation belongs to another user (IDOR)", async () => {
    vi.mocked(requireSession).mockResolvedValue({
      user: { id: "user-2", companyId: "codelab303", role: "MEMBER" },
    } as never);
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue({
      companyId: "codelab303",
      userId: "user-1",
    } as never);

    const req = makeDeleteRequest(VALID_CUID);
    const res = await DELETE(req, makeCtx(VALID_CUID));
    expect(res.status).toBe(403);
  });

  it("deletes and returns 200 when authorized", async () => {
    mockSession();
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue({
      companyId: "codelab303",
      userId: "user-1",
    } as never);
    vi.mocked(prisma.conversation.delete).mockResolvedValue({} as never);

    const req = makeDeleteRequest(VALID_CUID);
    const res = await DELETE(req, makeCtx(VALID_CUID));
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.conversation.delete)).toHaveBeenCalledWith({
      where: { id: VALID_CUID },
    });
  });

  it("does not delete conversation belonging to a different company", async () => {
    vi.mocked(requireSession).mockResolvedValue(OTHER_SESSION as never);
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue({
      companyId: "codelab303",
      userId: "user-1",
    } as never);

    const req = makeDeleteRequest(VALID_CUID);
    await DELETE(req, makeCtx(VALID_CUID));

    expect(vi.mocked(prisma.conversation.delete)).not.toHaveBeenCalled();
  });
});
