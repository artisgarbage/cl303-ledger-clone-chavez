import { describe, it, expect } from "vitest";
import { buildSystemPrompt, generateTitle, MARGOT_IDENTITY } from "./persona";

describe("MARGOT_IDENTITY", () => {
  it("has expected display name", () => {
    expect(MARGOT_IDENTITY.displayName).toBe("Margot");
  });
});

describe("generateTitle", () => {
  it("returns short messages unchanged", () => {
    expect(generateTitle("What is our gross margin?")).toBe(
      "What is our gross margin?",
    );
  });

  it("truncates at 60 chars on a word boundary", () => {
    const long =
      "What was our gross margin for full-year 2024 on a cash basis and how does it compare to target?";
    const result = generateTitle(long);
    expect(result.length).toBeLessThanOrEqual(63); // 60 + "..."
    expect(result.endsWith("...")).toBe(true);
    // Should not split mid-word
    const withoutEllipsis = result.slice(0, -3);
    expect(withoutEllipsis.endsWith(" ")).toBe(false);
  });

  it("returns exactly 60-char message without truncation", () => {
    const exactly60 = "a".repeat(60);
    expect(generateTitle(exactly60)).toBe(exactly60);
  });

  it("trims leading/trailing whitespace before measuring", () => {
    expect(generateTitle("  hello world  ")).toBe("hello world");
  });

  it("collapses internal whitespace", () => {
    const msg = "hello   world";
    expect(generateTitle(msg)).toBe("hello world");
  });

  it("appends ellipsis when truncation falls at position ≤30 — hard cuts", () => {
    // If no space found before pos 30, hard-cut with "..."
    const noSpaces = "a".repeat(70);
    const result = generateTitle(noSpaces);
    expect(result.endsWith("...")).toBe(true);
  });
});

describe("buildSystemPrompt", () => {
  it("includes the company name", () => {
    const prompt = buildSystemPrompt("INTERNAL_CFO", "Acme Corp");
    expect(prompt).toContain("Acme Corp");
  });

  it("includes identity section", () => {
    const prompt = buildSystemPrompt("INTERNAL_CFO", "Acme Corp");
    expect(prompt).toContain("Margot Hale");
    expect(prompt).toContain("fractional CFO");
  });

  it("INTERNAL_CFO mode includes leadership audience overlay", () => {
    const prompt = buildSystemPrompt("INTERNAL_CFO", "TestCo");
    expect(prompt).toContain("Internal Leadership");
  });

  it("PROPOSAL_BIZDEV mode includes prospective client warning", () => {
    const prompt = buildSystemPrompt("PROPOSAL_BIZDEV", "TestCo");
    expect(prompt).toContain("PROSPECTIVE CLIENT");
    expect(prompt).toContain("never expose");
  });

  it("BOARD_INVESTOR mode includes formal framing instruction", () => {
    const prompt = buildSystemPrompt("BOARD_INVESTOR", "TestCo");
    expect(prompt).toContain("board");
    expect(prompt).toContain("cash/accrual");
  });

  it("never-use-emoji rule is present in all modes", () => {
    for (const mode of [
      "INTERNAL_CFO",
      "PROPOSAL_BIZDEV",
      "BOARD_INVESTOR",
    ] as const) {
      const prompt = buildSystemPrompt(mode, "TestCo");
      expect(prompt).toContain("emoji");
    }
  });

  it("anti-pattern 'Let me know if you have any other questions' is forbidden", () => {
    const prompt = buildSystemPrompt("INTERNAL_CFO", "TestCo");
    expect(prompt).toContain("Let me know if you have any other questions");
  });

  it("prompt instructs to never invent numbers", () => {
    const prompt = buildSystemPrompt("INTERNAL_CFO", "TestCo");
    expect(prompt.toLowerCase()).toContain("never invent");
  });
});
