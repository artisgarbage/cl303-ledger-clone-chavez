import { describe, it, expect } from "vitest";
import {
  detectModeFromMessage,
  parseExplicitModeCommand,
  isToolAvailable,
  MODE_DEFINITIONS,
} from "./modes";

describe("MODE_DEFINITIONS", () => {
  it("defines all three ChatMode keys", () => {
    expect(Object.keys(MODE_DEFINITIONS)).toEqual([
      "INTERNAL_CFO",
      "PROPOSAL_BIZDEV",
      "BOARD_INVESTOR",
    ]);
  });

  it("INTERNAL_CFO has no restricted tools", () => {
    expect(MODE_DEFINITIONS.INTERNAL_CFO.restrictedTools).toHaveLength(0);
  });

  it("PROPOSAL_BIZDEV restricts the three sensitive tools", () => {
    expect(MODE_DEFINITIONS.PROPOSAL_BIZDEV.restrictedTools).toContain(
      "people_getTrueCost",
    );
    expect(MODE_DEFINITIONS.PROPOSAL_BIZDEV.restrictedTools).toContain(
      "people_getCompensation",
    );
    expect(MODE_DEFINITIONS.PROPOSAL_BIZDEV.restrictedTools).toContain(
      "projects_getMarginInternal",
    );
  });

  it("PROPOSAL_BIZDEV requires output guard", () => {
    expect(MODE_DEFINITIONS.PROPOSAL_BIZDEV.requiresOutputGuard).toBe(true);
  });

  it("BOARD_INVESTOR requires output guard", () => {
    expect(MODE_DEFINITIONS.BOARD_INVESTOR.requiresOutputGuard).toBe(true);
  });

  it("INTERNAL_CFO does not require output guard", () => {
    expect(MODE_DEFINITIONS.INTERNAL_CFO.requiresOutputGuard).toBe(false);
  });

  it("tool names follow Anthropic naming pattern (no dots)", () => {
    const allRestricted = Object.values(MODE_DEFINITIONS).flatMap(
      (d) => d.restrictedTools,
    );
    const badNames = allRestricted.filter((n) => !/^[a-zA-Z0-9_-]+$/.test(n));
    expect(badNames).toHaveLength(0);
  });
});

describe("detectModeFromMessage", () => {
  it("returns null for a generic financial question", () => {
    expect(
      detectModeFromMessage("What was our gross margin in Q1?"),
    ).toBeNull();
  });

  it("returns PROPOSAL_BIZDEV for 'proposal'", () => {
    expect(detectModeFromMessage("Write a proposal for Acme Corp")).toBe(
      "PROPOSAL_BIZDEV",
    );
  });

  it("returns PROPOSAL_BIZDEV for 'prospective client' (case-insensitive)", () => {
    expect(detectModeFromMessage("Frame this for a Prospective Client")).toBe(
      "PROPOSAL_BIZDEV",
    );
  });

  it("returns PROPOSAL_BIZDEV for 'sow'", () => {
    expect(detectModeFromMessage("draft a sow for this project")).toBe(
      "PROPOSAL_BIZDEV",
    );
  });

  it("returns PROPOSAL_BIZDEV for 'statement of work'", () => {
    expect(detectModeFromMessage("i need a statement of work")).toBe(
      "PROPOSAL_BIZDEV",
    );
  });

  it("returns BOARD_INVESTOR for 'board'", () => {
    expect(detectModeFromMessage("prepare the board deck")).toBe(
      "BOARD_INVESTOR",
    );
  });

  it("returns BOARD_INVESTOR for 'investor'", () => {
    expect(detectModeFromMessage("investor update for Q2")).toBe(
      "BOARD_INVESTOR",
    );
  });

  it("returns BOARD_INVESTOR for 'for the board'", () => {
    expect(detectModeFromMessage("format this for the board")).toBe(
      "BOARD_INVESTOR",
    );
  });

  it("returns BOARD_INVESTOR for 'audit'", () => {
    expect(detectModeFromMessage("run an audit on our numbers")).toBe(
      "BOARD_INVESTOR",
    );
  });

  it("proposal keywords take priority — returns PROPOSAL_BIZDEV", () => {
    // 'proposal' appears before board keyword check
    expect(detectModeFromMessage("proposal for the board")).toBe(
      "PROPOSAL_BIZDEV",
    );
  });
});

describe("parseExplicitModeCommand", () => {
  it("parses /mode proposal", () => {
    expect(parseExplicitModeCommand("/mode proposal")).toBe("PROPOSAL_BIZDEV");
  });

  it("parses /mode board", () => {
    expect(parseExplicitModeCommand("/mode board")).toBe("BOARD_INVESTOR");
  });

  it("parses /mode internal", () => {
    expect(parseExplicitModeCommand("/mode internal")).toBe("INTERNAL_CFO");
  });

  it("is case-insensitive for the command", () => {
    expect(parseExplicitModeCommand("/mode PROPOSAL")).toBe("PROPOSAL_BIZDEV");
    expect(parseExplicitModeCommand("/mode Board")).toBe("BOARD_INVESTOR");
  });

  it("returns null when there is no /mode command", () => {
    expect(parseExplicitModeCommand("what is our margin?")).toBeNull();
  });

  it("returns null for an unknown mode slug", () => {
    expect(parseExplicitModeCommand("/mode executive")).toBeNull();
  });

  it("only matches at the start of the message", () => {
    expect(parseExplicitModeCommand("please switch /mode board")).toBeNull();
  });
});

describe("isToolAvailable", () => {
  it("all M1 tools are available in INTERNAL_CFO", () => {
    for (const tool of [
      "periods_getPnL",
      "projects_list",
      "narrative_recent",
    ]) {
      expect(isToolAvailable(tool, "INTERNAL_CFO")).toBe(true);
    }
  });

  it("M1 data tools are available in PROPOSAL_BIZDEV", () => {
    // M1 tools are NOT in the restricted list
    expect(isToolAvailable("periods_getPnL", "PROPOSAL_BIZDEV")).toBe(true);
    expect(isToolAvailable("projects_list", "PROPOSAL_BIZDEV")).toBe(true);
    expect(isToolAvailable("narrative_recent", "PROPOSAL_BIZDEV")).toBe(true);
  });

  it("restricted tools are blocked in PROPOSAL_BIZDEV", () => {
    expect(isToolAvailable("people_getTrueCost", "PROPOSAL_BIZDEV")).toBe(
      false,
    );
    expect(isToolAvailable("people_getCompensation", "PROPOSAL_BIZDEV")).toBe(
      false,
    );
    expect(
      isToolAvailable("projects_getMarginInternal", "PROPOSAL_BIZDEV"),
    ).toBe(false);
  });

  it("no tools restricted in BOARD_INVESTOR", () => {
    for (const tool of [
      "periods_getPnL",
      "projects_list",
      "narrative_recent",
      "people_getTrueCost",
    ]) {
      expect(isToolAvailable(tool, "BOARD_INVESTOR")).toBe(true);
    }
  });

  it("unknown tool name returns true (not in restricted list)", () => {
    // Not restricted = available; guard at dispatch layer
    expect(isToolAvailable("unknown_tool", "INTERNAL_CFO")).toBe(true);
  });
});
