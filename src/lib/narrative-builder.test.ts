import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// vi.hoisted ensures this is available inside the vi.mock factory,
// which is hoisted to the top of the file before any other code runs.
const { mockMessagesCreate } = vi.hoisted(() => ({
  mockMessagesCreate: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mockMessagesCreate };
  },
}));

import { generateNarrative, type FinancialSnapshot } from "./narrative-builder";

const baseSnapshot: FinancialSnapshot = {
  companyName: "Test Co",
  periodStart: "2024-01-01",
  periodEnd: "2024-01-31",
  basis: "CASH",
  totalRevenue: 100_000,
  totalCOGS: 40_000,
  grossProfit: 60_000,
  grossMargin: 0.6,
  totalOpEx: 20_000,
  netIncome: 40_000,
  netMargin: 0.4,
};

describe("generateNarrative", () => {
  const originalApiKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test-api-key";
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    }
  });

  it("throws when ANTHROPIC_API_KEY is not set", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(
      generateNarrative("MONTHLY_SUMMARY", baseSnapshot),
    ).rejects.toThrow("ANTHROPIC_API_KEY environment variable is not set");
  });

  it("returns content, title, and promptUsed on success", async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [
        { type: "text", text: "## Monthly Summary\n\nRevenue was strong." },
      ],
    });

    const result = await generateNarrative("MONTHLY_SUMMARY", baseSnapshot);

    expect(result.content).toBe("## Monthly Summary\n\nRevenue was strong.");
    expect(typeof result.title).toBe("string");
    expect(result.title.length).toBeGreaterThan(0);
    expect(typeof result.promptUsed).toBe("string");
    expect(result.promptUsed.length).toBeGreaterThan(0);
  });

  it("throws when Claude returns non-text content type", async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: "image", source: {} }],
    });

    await expect(
      generateNarrative("MONTHLY_SUMMARY", baseSnapshot),
    ).rejects.toThrow("Unexpected response type from Claude");
  });

  it("wraps API errors with a descriptive message", async () => {
    mockMessagesCreate.mockRejectedValue(new Error("Rate limit exceeded"));

    await expect(
      generateNarrative("MONTHLY_SUMMARY", baseSnapshot),
    ).rejects.toThrow("Failed to generate narrative: Rate limit exceeded");
  });

  it("calls Claude API with the correct model", async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: "text", text: "Narrative content." }],
    });

    await generateNarrative("QUARTERLY_REVIEW", baseSnapshot);

    expect(mockMessagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.stringContaining("claude"),
        max_tokens: expect.any(Number),
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "user" }),
        ]),
      }),
    );
  });
});
