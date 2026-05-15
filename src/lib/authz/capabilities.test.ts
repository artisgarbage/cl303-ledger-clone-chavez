import { describe, it, expect } from "vitest";
import { ROLE_CAPABILITIES, getCapabilitiesForRole, roleHasCapability, type Capability } from "./capabilities";

describe("capabilities", () => {
  describe("ROLE_CAPABILITIES", () => {
    it("should have entries for all UserRole values", () => {
      const roles = Object.keys(ROLE_CAPABILITIES);
      expect(roles).toContain("VIEWER");
      expect(roles).toContain("MEMBER");
      expect(roles).toContain("ADMIN");
      expect(roles).toHaveLength(3);
    });

    it("should match snapshot (role capability matrix)", () => {
      // Convert Sets to sorted arrays for consistent snapshot
      const snapshot = Object.fromEntries(
        Object.entries(ROLE_CAPABILITIES).map(([role, caps]) => [
          role,
          Array.from(caps).sort(),
        ])
      );
      expect(snapshot).toMatchSnapshot();
    });
  });

  describe("getCapabilitiesForRole", () => {
    it("should return correct capabilities for VIEWER", () => {
      const caps = getCapabilitiesForRole("VIEWER");
      expect(caps.has("narratives.read")).toBe(true);
      expect(caps.has("cfo.chat")).toBe(true);
      expect(caps.has("narratives.generate")).toBe(false);
      expect(caps.has("billing.manage")).toBe(false);
    });

    it("should return correct capabilities for MEMBER", () => {
      const caps = getCapabilitiesForRole("MEMBER");
      expect(caps.has("narratives.read")).toBe(true);
      expect(caps.has("narratives.generate")).toBe(true);
      expect(caps.has("people.write")).toBe(true);
      expect(caps.has("billing.manage")).toBe(false);
      expect(caps.has("admin.users.write")).toBe(false);
    });

    it("should return correct capabilities for ADMIN", () => {
      const caps = getCapabilitiesForRole("ADMIN");
      expect(caps.has("narratives.generate")).toBe(true);
      expect(caps.has("billing.manage")).toBe(true);
      expect(caps.has("admin.users.write")).toBe(true);
      expect(caps.has("members.role.change")).toBe(true);
    });
  });

  describe("roleHasCapability", () => {
    it("should return true for capabilities the role has", () => {
      expect(roleHasCapability("VIEWER", "narratives.read")).toBe(true);
      expect(roleHasCapability("MEMBER", "narratives.generate")).toBe(true);
      expect(roleHasCapability("ADMIN", "billing.manage")).toBe(true);
    });

    it("should return false for capabilities the role lacks", () => {
      expect(roleHasCapability("VIEWER", "narratives.generate")).toBe(false);
      expect(roleHasCapability("MEMBER", "billing.manage")).toBe(false);
      expect(roleHasCapability("VIEWER", "admin.users.write")).toBe(false);
    });
  });

  describe("capability hierarchy constraints", () => {
    it("VIEWER should be strictly read-only for ledger data", () => {
      const viewerCaps = getCapabilitiesForRole("VIEWER");
      const writeCaps: Capability[] = [
        "people.write",
        "projects.write",
        "periods.write",
        "company.settings.write",
      ];
      for (const cap of writeCaps) {
        expect(viewerCaps.has(cap)).toBe(false);
      }
    });

    it("VIEWER should not have narrative generation", () => {
      expect(roleHasCapability("VIEWER", "narratives.generate")).toBe(false);
    });

    it("VIEWER should not have advanced modes", () => {
      expect(roleHasCapability("VIEWER", "cfo.mode.proposal")).toBe(false);
      expect(roleHasCapability("VIEWER", "cfo.mode.board")).toBe(false);
    });

    it("MEMBER should have all modes", () => {
      expect(roleHasCapability("MEMBER", "cfo.mode.internal")).toBe(true);
      expect(roleHasCapability("MEMBER", "cfo.mode.proposal")).toBe(true);
      expect(roleHasCapability("MEMBER", "cfo.mode.board")).toBe(true);
    });

    it("MEMBER should not have billing management", () => {
      expect(roleHasCapability("MEMBER", "billing.read")).toBe(true);
      expect(roleHasCapability("MEMBER", "billing.manage")).toBe(false);
    });

    it("MEMBER should not have team management", () => {
      expect(roleHasCapability("MEMBER", "members.invite")).toBe(false);
      expect(roleHasCapability("MEMBER", "members.remove")).toBe(false);
      expect(roleHasCapability("MEMBER", "members.role.change")).toBe(false);
    });

    it("ADMIN should be a superset of MEMBER", () => {
      const memberCaps = getCapabilitiesForRole("MEMBER");
      const adminCaps = getCapabilitiesForRole("ADMIN");
      
      for (const cap of memberCaps) {
        expect(adminCaps.has(cap)).toBe(true);
      }
    });

    it("ADMIN should have agent identity management", () => {
      expect(roleHasCapability("ADMIN", "agent.identity.issue")).toBe(true);
      expect(roleHasCapability("ADMIN", "agent.identity.revoke")).toBe(true);
    });
  });
});
